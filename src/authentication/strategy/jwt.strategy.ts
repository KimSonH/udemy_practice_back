import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from 'src/users/users.service';
import { assertUserActive } from 'src/users/user-status';
import { TokenPayload } from '../tokenPayload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_ACCESS_TOKEN_SECRET'),
    });
  }

  async validate(payload: TokenPayload) {
    const user = await this.userService.getById(payload.userId);
    // Every authenticated request lands here and the row is already read, so
    // a lock costs no extra query and bites on the very next call.
    assertUserActive(user);
    return user;
  }
}
