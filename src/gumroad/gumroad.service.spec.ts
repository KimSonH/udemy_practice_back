import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import axios from 'axios';
import { existsSync, mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { GumroadService } from './gumroad.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const env: Record<string, string> = {
  JWT_ADMIN_ACCESS_TOKEN_SECRET: 'admin-secret',
  GUMROAD_ACCESS_TOKEN: 'gumroad-token',
};
const config = { get: (key: string) => env[key] } as ConfigService;
const jwt = new JwtService();
const uploads = {
  query: jest.fn<Promise<unknown[]>, [string, unknown[]]>(async () => []),
  count: jest.fn(async () => 0),
  find: jest.fn(async () => [] as { url: string }[]),
  insert: jest.fn(async () => ({})),
};
const service = new GumroadService(config, jwt, uploads as never);

describe('GumroadService', () => {
  it('accepts its own ticket and rejects anything else', () => {
    const { ticket } = service.issueTicket();
    expect(() => service.verifyTicket(ticket)).not.toThrow();

    expect(() => service.verifyTicket(undefined)).toThrow(
      'Invalid upload ticket',
    );
    // A real admin access token is signed with the same secret but has no scope.
    const adminToken = jwt.sign({ id: 1 }, { secret: 'admin-secret' });
    expect(() => service.verifyTicket(adminToken)).toThrow(
      'Invalid upload ticket',
    );
    const forged = jwt.sign({ scope: 'gumroad-upload' }, { secret: 'other' });
    expect(() => service.verifyTicket(forged)).toThrow('Invalid upload ticket');
  });

  it('uploads to Gumroad, returns the public URL and removes the temp file', async () => {
    const path = join(mkdtempSync(join(tmpdir(), 'gumroad-')), 'v.mp4');
    writeFileSync(path, 'video bytes');
    mockedAxios.post.mockResolvedValue({
      data: {
        key: 'abc123',
        direct_upload: {
          url: 'https://s3/put',
          headers: { 'Content-MD5': 'x' },
        },
      },
    });
    mockedAxios.put.mockResolvedValue({});
    mockedAxios.head.mockResolvedValue({
      status: 200,
      headers: { 'content-length': '11' },
    });

    const result = await service.upload({
      path,
      size: 11,
      originalname: 'lesson 1.mp4',
      mimetype: 'video/mp4',
    } as Express.Multer.File);

    expect(result).toEqual({ url: 'https://public-files.gumroad.com/abc123' });
    const [, body, options] = mockedAxios.post.mock.calls[0];
    expect(body).toEqual({
      blob: {
        filename: 'lesson 1.mp4',
        byte_size: 11,
        // base64 MD5 of "video bytes"
        checksum: expect.any(String),
        content_type: 'video/mp4',
      },
    });
    expect(options).toEqual({
      headers: { Authorization: 'Bearer gumroad-token' },
    });
    expect(mockedAxios.put.mock.calls[0][0]).toBe('https://s3/put');
    expect(mockedAxios.head.mock.calls[0][0]).toBe(
      'https://public-files.gumroad.com/abc123',
    );
    expect(existsSync(path)).toBe(false);
  });

  it('refuses to return a URL that does not serve the whole video', async () => {
    const path = join(mkdtempSync(join(tmpdir(), 'gumroad-')), 'v.mp4');
    writeFileSync(path, 'video bytes');
    mockedAxios.head.mockReset();
    mockedAxios.head.mockResolvedValue({ status: 403, headers: {} });

    await expect(
      service.upload({
        path,
        size: 11,
        originalname: 'v.mp4',
        mimetype: 'video/mp4',
      } as Express.Multer.File),
    ).rejects.toThrow('the video URL does not work yet');
    expect(mockedAxios.head).toHaveBeenCalledTimes(3);
    expect(existsSync(path)).toBe(false);
  }, 10_000);

  it('carries the learner on their ticket, and none on an admin one', () => {
    expect(service.verifyTicket(service.issueTicket(5).ticket)).toEqual({
      userId: 5,
    });
    expect(service.verifyTicket(service.issueTicket().ticket)).toEqual({});
  });

  it('caps learner uploads by size and by count per day', async () => {
    await expect(
      service.assertLearnerMayUpload(5, 3 * 1024 ** 3),
    ).rejects.toThrow('at most 2 GB');
    uploads.count.mockResolvedValueOnce(30);
    await expect(service.assertLearnerMayUpload(5, 1000)).rejects.toThrow(
      'At most 30 video uploads a day',
    );
    uploads.count.mockResolvedValueOnce(29);
    await expect(
      service.assertLearnerMayUpload(5, 1000),
    ).resolves.toBeUndefined();
  });

  it("lets a learner course use only its owner's uploads, or what it already had", async () => {
    const mine = 'https://public-files.gumroad.com/mine';
    const theirs = 'https://public-files.gumroad.com/theirs';
    uploads.find.mockResolvedValue([{ url: mine }]);

    await expect(
      service.assertUploadsOwnedBy(5, [mine]),
    ).resolves.toBeUndefined();
    await expect(
      service.assertUploadsOwnedBy(5, [mine, theirs]),
    ).rejects.toThrow();
    await expect(
      service.assertUploadsOwnedBy(5, [mine, theirs], [theirs]),
    ).resolves.toBeUndefined();
  });

  it('records who uploaded each video', async () => {
    const path = join(mkdtempSync(join(tmpdir(), 'gumroad-')), 'v.mp4');
    writeFileSync(path, 'video bytes');
    uploads.insert.mockClear();
    mockedAxios.head.mockResolvedValue({
      status: 200,
      headers: { 'content-length': '11' },
    });
    await service.upload(
      {
        path,
        size: 11,
        originalname: 'v.mp4',
        mimetype: 'video/mp4',
      } as Express.Multer.File,
      { userId: 5 },
    );
    expect(uploads.insert).toHaveBeenCalledWith({
      userId: 5,
      url: 'https://public-files.gumroad.com/abc123',
      size: '11',
    });
  });

  it('checks only Gumroad links and reports the broken ones', async () => {
    mockedAxios.head.mockReset();
    mockedAxios.head
      .mockResolvedValueOnce({
        status: 200,
        headers: { 'content-type': 'video/mp4' },
      })
      .mockResolvedValueOnce({
        status: 403,
        headers: { 'content-type': 'application/xml' },
      });

    const results = await service.checkLinks([
      'https://public-files.gumroad.com/good',
      'https://public-files.gumroad.com/gone',
      'http://169.254.169.254/latest/meta-data',
    ]);

    expect(results).toEqual([
      { url: 'https://public-files.gumroad.com/good', ok: true, status: 200 },
      { url: 'https://public-files.gumroad.com/gone', ok: false, status: 403 },
      { url: 'http://169.254.169.254/latest/meta-data', ok: null },
    ]);
    // The non-Gumroad URL was never fetched.
    expect(mockedAxios.head).toHaveBeenCalledTimes(2);
  });

  it('lists videos with who uploaded them and where they are used', async () => {
    uploads.query.mockResolvedValueOnce([{ total: 2 }]).mockResolvedValueOnce([
      {
        url: 'https://public-files.gumroad.com/a',
        upload_id: 1,
        user_id: 5,
        size: '100',
        created_at: 'd',
        uploader_name: 'Creator A',
        uploader_email: 'a@x',
        used_in: [{ courseId: 66 }],
        last_used_in: null,
      },
      {
        url: 'https://public-files.gumroad.com/b',
        upload_id: null,
        user_id: null,
        size: null,
        created_at: null,
        used_in: null,
        last_used_in: { courseId: 60 },
      },
    ]);

    const result = await service.listVideos({
      page: '2' as never,
      usage: 'unused',
      source: 'learner',
    });

    expect(result.total).toBe(2);
    expect(result.items[0]).toMatchObject({
      tracked: true,
      size: 100,
      uploader: { kind: 'learner', userId: 5, name: 'Creator A' },
      usedIn: [{ courseId: 66 }],
    });
    expect(result.items[1]).toMatchObject({
      tracked: false,
      uploader: null,
      usedIn: [],
      lastUsedIn: { courseId: 60 },
    });
    const [sql, params] = uploads.query.mock.calls[1];
    expect(sql).toContain('v.used_in IS NULL');
    expect(sql).toContain('v.user_id IS NOT NULL');
    // Page 2 of 20: the strings a query string carries are coerced.
    expect(params.slice(-2)).toEqual([20, 20]);
  });
});
