import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class IpnGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authorizationHeader = request.headers['x-secret-key'];

    if (!authorizationHeader) {
      return false;
    }

    const expectedSecretKey = this.configService.get('SEPAY_IPN_SECRET_KEY');

    return authorizationHeader === expectedSecretKey;
  }
}
