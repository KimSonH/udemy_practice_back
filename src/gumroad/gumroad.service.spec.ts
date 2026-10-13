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
});
