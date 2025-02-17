import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AdminService } from 'src/admin/admin.service';
import { TokenPayload } from '../tokenPayload.interface';

@Injectable()
export class JwtAdminRefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh-admin-token',
) {
  constructor(
    private readonly configService: ConfigService,
    private readonly adminService: AdminService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_ADMIN_REFRESH_TOKEN_SECRET'),
    });
  }

  async validate(request: Request, payload: TokenPayload) {
    const refreshToken = request.cookies?.ARefresh;
    return this.adminService.getAdminIfRefreshTokenMatches(
      refreshToken,
      payload.userId,
    );
  }
}
