import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

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
    const expectedApiKey = this.configService.get('SEPAY_WEBHOOK_SECRET_KEY');

    return receivedApiKey === expectedApiKey;
  }
}
