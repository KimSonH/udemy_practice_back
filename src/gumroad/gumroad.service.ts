import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import axios from 'axios';
import { createHash } from 'crypto';
import { createReadStream, promises as fs } from 'fs';

const GUMROAD_API = 'https://api.gumroad.com/v2';
// Where Gumroad serves public blobs; the existing course videos live here too.
export const PUBLIC_FILES_URL = 'https://public-files.gumroad.com';
const TICKET_SCOPE = 'gumroad-upload';

@Injectable()
export class GumroadService {
  private logger = new Logger(GumroadService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * The admin's bearer token never leaves the admin server, so the browser
   * gets this short-lived, upload-only ticket to send the video straight here.
   */
  issueTicket() {
    const ticket = this.jwtService.sign(
      { scope: TICKET_SCOPE },
      {
        secret: this.configService.get('JWT_ADMIN_ACCESS_TOKEN_SECRET'),
        expiresIn: '15m',
      },
    );
    return { ticket };
  }

  verifyTicket(ticket: unknown) {
    try {
      const payload = this.jwtService.verify(String(ticket ?? ''), {
        secret: this.configService.get('JWT_ADMIN_ACCESS_TOKEN_SECRET'),
      });
      if (payload?.scope === TICKET_SCOPE) return;
    } catch {
      // fall through
    }
    throw new UnauthorizedException('Invalid upload ticket');
  }

  /** Uploads a video multer stored on disk to Gumroad, returns its public URL. */
  async upload(file: Express.Multer.File) {
    try {
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
