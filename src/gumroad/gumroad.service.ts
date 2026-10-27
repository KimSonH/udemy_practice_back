import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, MoreThan, Not, Repository } from 'typeorm';
import { GumroadUpload } from './gumroad-upload.entity';
import { GumroadVideoStatus } from './gumroad-video-status.entity';
import { GumroadVideoQuery } from './dto/gumroad-video-query.dto';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import axios from 'axios';
import { createHash } from 'crypto';
import { createReadStream, promises as fs } from 'fs';

const GUMROAD_API = 'https://api.gumroad.com/v2';
// Where Gumroad serves public blobs; the existing course videos live here too.
export const PUBLIC_FILES_URL = 'https://public-files.gumroad.com';

/** Every lesson video URL of a video course payload. */
export function lessonUrls(course: {
  courseSessions?: { courseContents?: { uploadUrl?: string }[] }[];
}) {
  return (course.courseSessions ?? []).flatMap((session) =>
    (session.courseContents ?? [])
      .map((content) => content.uploadUrl)
      .filter((url): url is string => !!url),
  );
}
const TICKET_SCOPE = 'gumroad-upload';

/**
 * Learner limits. Any signed-in learner can upload, to the platform's own
 * Gumroad account, so without these it doubles as free video hosting. Admin
 * uploads keep Gumroad's 20 GB cap and no daily count.
 */
export const LEARNER_MAX_VIDEO_BYTES = 2 * 1024 ** 3;
export const LEARNER_DAILY_UPLOADS = 30;

/** Who a ticket was issued to: a learner's id, or none for an admin. */
export type UploadTicket = { userId?: number };

@Injectable()
export class GumroadService {
  private logger = new Logger(GumroadService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    @InjectRepository(GumroadUpload)
    private readonly uploads: Repository<GumroadUpload>,
    @InjectRepository(GumroadVideoStatus)
    private readonly statuses: Repository<GumroadVideoStatus>,
  ) {}

  /**
   * The admin's bearer token never leaves the admin server, so the browser
   * gets this short-lived, upload-only ticket to send the video straight here.
   */
  issueTicket(userId?: number) {
    const ticket = this.jwtService.sign(
      { scope: TICKET_SCOPE, ...(userId ? { uid: userId } : {}) },
      {
        secret: this.configService.get('JWT_ADMIN_ACCESS_TOKEN_SECRET'),
        expiresIn: '15m',
      },
    );
    return { ticket };
  }

  verifyTicket(ticket: unknown): UploadTicket {
    try {
      const payload = this.jwtService.verify(String(ticket ?? ''), {
        secret: this.configService.get('JWT_ADMIN_ACCESS_TOKEN_SECRET'),
      });
      if (payload?.scope === TICKET_SCOPE) {
        return typeof payload.uid === 'number' ? { userId: payload.uid } : {};
      }
    } catch {
      // fall through
    }
    throw new UnauthorizedException('Invalid upload ticket');
  }

  /**
   * Refuses a learner upload before any bytes are stored: over the size cap
   * (by the declared length; upload() re-checks the real one), or past the
   * daily count. A ticket lives 15 minutes and can be reused, so the count is
   * checked per upload, not when the ticket is issued.
   */
  async assertLearnerMayUpload(userId: number, declaredBytes: number) {
    if (declaredBytes > LEARNER_MAX_VIDEO_BYTES) {
      throw new PayloadTooLargeException('A video can be at most 2 GB');
    }
    const recent = await this.uploads.count({
      where: {
        userId,
        createdAt: MoreThan(new Date(Date.now() - 24 * 60 * 60 * 1000)),
      },
    });
    if (recent >= LEARNER_DAILY_UPLOADS) {
      throw new HttpException(
        `At most ${LEARNER_DAILY_UPLOADS} video uploads a day. Try again tomorrow.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /**
   * A learner course may only use videos its owner uploaded here, plus any it
   * already had (courses saved before uploads were recorded).
   */
  async assertUploadsOwnedBy(
    userId: number,
    urls: string[],
    alreadyInCourse: string[] = [],
  ) {
    const kept = new Set(alreadyInCourse);
    const toCheck = [...new Set(urls)].filter((url) => !kept.has(url));
    if (!toCheck.length) return;
    const owned = await this.uploads.find({
      select: { url: true },
      where: { userId, url: In(toCheck) },
    });
    const ownedUrls = new Set(owned.map((row) => row.url));
    if (toCheck.some((url) => !ownedUrls.has(url))) {
      throw new BadRequestException([
        {
          field: 'courseSessions',
          message: 'Each lesson video must be one you uploaded here',
        },
      ]);
    }
  }

  /** Uploads a video multer stored on disk to Gumroad, returns its public URL. */
  async upload(file: Express.Multer.File, ticket: UploadTicket = {}) {
    try {
      if (ticket.userId && file.size > LEARNER_MAX_VIDEO_BYTES) {
        throw new PayloadTooLargeException('A video can be at most 2 GB');
      }
      const token = this.configService.get('GUMROAD_ACCESS_TOKEN');
      if (!token) {
        throw new InternalServerErrorException(
          'GUMROAD_ACCESS_TOKEN is not set',
        );
      }

      const { data: blob } = await axios.post(
        `${GUMROAD_API}/direct_uploads`,
        {
          blob: {
            filename: file.originalname,
            byte_size: file.size,
            checksum: await md5Base64(file.path),
            content_type: file.mimetype,
          },
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      await axios.put(blob.direct_upload.url, createReadStream(file.path), {
        headers: {
          ...blob.direct_upload.headers,
          'Content-Length': file.size,
        },
        maxBodyLength: Infinity,
      });

      const url = `${PUBLIC_FILES_URL}/${blob.key}`;
      await this.assertPlayable(url, file.size);
      await this.uploads.insert({
        userId: ticket.userId ?? null,
        url,
        size: String(file.size),
      });
      return { url };
    } catch (error) {
      if (!axios.isAxiosError(error)) throw error;
      const detail = error.response?.data?.message ?? error.message;
      this.logger.error(`Gumroad upload failed: ${JSON.stringify(detail)}`);
      throw new BadGatewayException(`Gumroad upload failed: ${detail}`);
    } finally {
      await fs.rm(file.path, { force: true });
    }
  }

  /**
   * Every Gumroad video the site knows about, for the admin to manage: the
   * ones uploaded through this API (with who uploaded them) and the ones only
   * pasted into lessons. Each comes with the live lessons that use it, or the
   * last lesson that did, so an unused video can be traced before it goes.
   */
  async listVideos(query: GumroadVideoQuery) {
    const { search, usage, source } = query;
    // The global ValidationPipe validates but does not transform: numbers
    // arrive as strings, and defaults are not applied.
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const where: string[] = [];
    const params: unknown[] = [`${PUBLIC_FILES_URL}/%`];
    if (search) {
      params.push(`%${search}%`);
      where.push(
        `(v.url ILIKE $${params.length} OR v.used_in::text ILIKE $${params.length})`,
      );
    }
    if (usage === 'used') where.push('v.used_in IS NOT NULL');
    // Unused means waiting for a decision: retired ones are listed apart.
    if (usage === 'unused') {
      where.push('v.used_in IS NULL AND v.retired_at IS NULL');
    }
    if (usage === 'retired') where.push('v.retired_at IS NOT NULL');
    if (query.health === 'broken') where.push('v.check_ok = false');
    if (query.health === 'unchecked') where.push('v.checked_at IS NULL');
    if (source === 'untracked') where.push('v.upload_id IS NULL');
    if (source === 'admin') {
      where.push('v.upload_id IS NOT NULL AND v.user_id IS NULL');
    }
    if (source === 'learner') where.push('v.user_id IS NOT NULL');

    // A lesson counts as live only when it, its section and its course are
    // all undeleted: saving a video course soft-deletes every old lesson.
    const lessonsOf = (live: boolean) => `
      SELECT json_build_object('courseId', c.id, 'courseName', c.name,
               'lessonName', cc.name, 'kind', 'video') AS item,
             cc.created_at
      FROM course_content cc
      JOIN course_session s ON s.id = cc.course_session_id
      JOIN course c ON c.id = s.course_id
      WHERE cc.upload_url = u.url AND ${
        live
          ? 'cc.deleted_at IS NULL AND s.deleted_at IS NULL AND c.deleted_at IS NULL'
          : '(cc.deleted_at IS NOT NULL OR s.deleted_at IS NOT NULL OR c.deleted_at IS NOT NULL)'
      }`;
    const base = `
      WITH urls AS (
        SELECT url FROM gumroad_upload
        UNION
        SELECT upload_url FROM course_content WHERE upload_url LIKE $1
      ),
      v AS (
        SELECT u.url, g.id AS upload_id, g.user_id, g.size, g.created_at,
               concat_ws(' ', usr.first_name, usr.last_name) AS uploader_name,
               usr.email AS uploader_email,
               (SELECT json_agg(l.item ORDER BY l.created_at)
                  FROM (${lessonsOf(true)}) l) AS used_in,
               (SELECT l.item FROM (${lessonsOf(false)}) l
                  ORDER BY l.created_at DESC LIMIT 1) AS last_used_in,
               st.retired_at, st.checked_at, st.check_ok, st.check_status,
               st.check_content_type
        FROM urls u
        LEFT JOIN gumroad_upload g ON g.url = u.url
        LEFT JOIN gumroad_video_status st ON st.url = u.url
        LEFT JOIN "user" usr ON usr.id = g.user_id
      )
      SELECT * FROM v ${where.length ? `WHERE ${where.join(' AND ')}` : ''}`;

    const [{ total }] = await this.uploads.query(
      `SELECT count(*)::int AS total FROM (${base}) t`,
      params,
    );
    const rows = await this.uploads.query(
      `${base} ORDER BY v.created_at DESC NULLS LAST, v.url
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, (page - 1) * limit],
    );
    return {
      items: rows.map((row) => ({
        url: row.url,
        tracked: row.upload_id !== null,
        size: row.size === null ? null : Number(row.size),
        uploadedAt: row.created_at,
        uploader:
          row.upload_id === null
            ? null
            : row.user_id === null
              ? { kind: 'admin' }
              : {
                  kind: 'learner',
                  userId: row.user_id,
                  name: row.uploader_name,
                  email: row.uploader_email,
                },
        usedIn: row.used_in ?? [],
        lastUsedIn: row.last_used_in,
        retiredAt: row.retired_at,
        check:
          row.checked_at === null
            ? null
            : {
                ok: row.check_ok,
                status: row.check_status,
                contentType: row.check_content_type,
                checkedAt: row.checked_at,
              },
      })),
      total,
      page,
      limit,
    };
  }

  /** Every Gumroad URL the site knows: uploaded here or pasted in a lesson. */
  private async knownUrls(): Promise<string[]> {
    const rows: { url: string }[] = await this.uploads.query(
      `SELECT url FROM gumroad_upload
       UNION SELECT upload_url FROM course_content WHERE upload_url LIKE $1`,
      [`${PUBLIC_FILES_URL}/%`],
    );
    return rows.map((row) => row.url);
  }

  /**
   * Marks an unused video as retired, so no lesson can use it again. Gumroad's
   * API has no way to delete an uploaded file; this is the part we control.
   */
  async retire(url: string) {
    if (!(await this.knownUrls()).includes(url)) {
      throw new NotFoundException('Video not found');
    }
    const [{ count }] = await this.uploads.query(
      `SELECT count(*)::int AS count
       FROM course_content cc
       JOIN course_session s ON s.id = cc.course_session_id
       JOIN course c ON c.id = s.course_id
       WHERE cc.upload_url = $1 AND cc.deleted_at IS NULL
         AND s.deleted_at IS NULL AND c.deleted_at IS NULL`,
      [url],
    );
    if (count > 0) {
      throw new ConflictException(
        `Still used in ${count} lesson${count === 1 ? '' : 's'}; replace it there first`,
      );
    }
    await this.upsertStatus(url, { retiredAt: new Date() });
    return { url, retired: true };
  }

  async restore(url: string) {
    await this.statuses.update({ url }, { retiredAt: null });
    return { url, retired: false };
  }

  /** Checks every known video and keeps the result for the Videos page. */
  async checkAllLinks() {
    const results = await this.checkLinks(await this.knownUrls());
    const checkedAt = new Date();
    for (const result of results) {
      await this.upsertStatus(result.url, {
        checkedAt,
        checkOk: result.ok,
        checkStatus: result.status ?? null,
        checkContentType: result.contentType ?? null,
      });
    }
    return {
      checked: results.length,
      broken: results.filter((result) => result.ok === false).length,
    };
  }

  /** Refuses a course save that would put a retired video back in a lesson. */
  async assertNotRetired(urls: string[]) {
    if (urls.length === 0) return;
    const retired = await this.statuses.find({
      where: { url: In(urls), retiredAt: Not(IsNull()) },
      select: { url: true },
    });
    if (retired.length) {
      throw new BadRequestException([
        {
          field: 'courseSessions',
          message: `This video was retired and cannot be used again: ${retired[0].url}`,
        },
      ]);
    }
  }

  private async upsertStatus(url: string, fields: Partial<GumroadVideoStatus>) {
    await this.statuses.upsert({ url, ...fields }, ['url']);
  }

  /**
   * Which of a course's video URLs still play. Only Gumroad public files are
   * fetched, so the endpoint cannot be pointed at arbitrary hosts; anything
   * else comes back unchecked (ok: null).
   */
  async checkLinks(urls: string[]) {
    const unique = [...new Set(urls)].slice(0, 500);
    const results: {
      url: string;
      ok: boolean | null;
      status?: number;
      contentType?: string;
    }[] = [];
    // ponytail: 8 at a time keeps a 500-lesson course under a minute.
    for (let i = 0; i < unique.length; i += 8) {
      const batch = unique.slice(i, i + 8).map(async (url) => {
        if (!url.startsWith(`${PUBLIC_FILES_URL}/`)) return { url, ok: null };
        const res = await axios
          .head(url, { validateStatus: () => true, timeout: 15000 })
          .catch(() => null);
        const status = res?.status;
        const contentType = res?.headers['content-type'];
        return {
          url,
          ok: status === 200 && /^video\//.test(contentType),
          status,
          contentType,
        };
      });
      results.push(...(await Promise.all(batch)));
    }
    return results;
  }

  /**
   * Only hand back a URL the player can actually open: the upload succeeding
   * does not prove the public link serves it. Retried briefly, since the CDN
   * in front of the bucket may not see a brand-new object at once.
   */
  private async assertPlayable(url: string, size: number, attempts = 3) {
    let last = '';
    for (let i = 0; i < attempts; i++) {
      if (i) await new Promise((r) => setTimeout(r, 1000 * i));
      const res = await axios.head(url, { validateStatus: () => true });
      const length = Number(res.headers['content-length']);
      if (res.status === 200 && length === size) return;
      last = `HTTP ${res.status}, ${length} of ${size} bytes`;
    }
    this.logger.error(`Uploaded video is not reachable at ${url}: ${last}`);
    throw new BadGatewayException(
      `Uploaded, but the video URL does not work yet (${last}). Try again.`,
    );
  }
}

function md5Base64(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('md5');
    createReadStream(path)
      .on('data', (chunk) => hash.update(chunk))
      .on('end', () => resolve(hash.digest('base64')))
      .on('error', reject);
  });
}
