import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Like JwtAuthenticationGuard, but does NOT reject the request when the token
 * is missing or invalid. A valid token still populates req.user; otherwise
 * req.user stays undefined and the request continues. Used by endpoints that
 * serve both anonymous visitors (public) and signed-in users (logged_in/paid).
 */
@Injectable()
export default class JwtOptionalAuthenticationGuard extends AuthGuard('jwt') {
  handleRequest<TUser>(err: unknown, user: TUser): TUser {
    if (err || !user) {
      return undefined as unknown as TUser;
    }
    return user;
  }
}
