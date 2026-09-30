import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { UsersService } from 'src/users/users.service';
import { assertUserActive } from 'src/users/user-status';
import { TokenPayload } from '../tokenPayload.interface';

@Injectable()
export class JwtRefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh-token',
) {
  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get('JWT_REFRESH_TOKEN_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(request: Request, payload: TokenPayload) {
    const user = await this.userService.getUserIfRefreshTokenMatches(
      request.cookies?.Refresh,
      payload.userId,
    );
    // getUserIfRefreshTokenMatches yields undefined when the token does not
    // match. Keep that a 401, as passport produced before the lock check.
    if (!user) {
      throw new UnauthorizedException();
    }
    assertUserActive(user);
    return user;
  }
}
