import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'crypto';

@Injectable()
export class WebhookGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authorizationHeader = request.headers['authorization'];

    if (!authorizationHeader) {
      return false;
    }

    // SePay sends: "Authorization": "Apikey API_KEY_CUA_BAN"
    const apikeyPrefix = 'Apikey ';
    if (!authorizationHeader.startsWith(apikeyPrefix)) {
      return false;
    }

    const receivedApiKey = authorizationHeader.substring(apikeyPrefix.length);
    const expectedApiKey = this.configService.get<string>(
      'SEPAY_WEBHOOK_SECRET_KEY',
    );

    // Refuse rather than accept when the key is not configured: a plain
    // comparison of two empty values would let every caller through.
    if (!expectedApiKey) {
      return false;
    }

    return this.safeCompare(receivedApiKey, expectedApiKey);
  }

  /**
   * Constant-time comparison. `===` returns as soon as two bytes differ, which
   * leaks how much of the key a caller has already guessed.
   *
   * Both sides are hashed first because timingSafeEqual throws on a length
   * mismatch: comparing the raw strings would mean an early return that
   * reveals the expected key length. SHA-256 digests are always 32 bytes.
   */
  private safeCompare(received: string, expected: string): boolean {
    const digest = (value: string) =>
      createHash('sha256').update(value, 'utf8').digest();

    return timingSafeEqual(digest(received), digest(expected));
  }
}
