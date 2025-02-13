import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { TokenPayload } from './tokenPayload.interface';
import { AdminService } from 'src/admin/admin.service';

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
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          return request?.cookies?.ARefresh;
        },
      ]),
      secretOrKey: configService.get('JWT_ADMIN_REFRESH_TOKEN_SECRET'),
      passReqToCallback: true,
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
