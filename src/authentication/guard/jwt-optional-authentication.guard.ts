import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Giống JwtAuthenticationGuard nhưng KHÔNG chặn request khi thiếu/không hợp lệ
 * token. Nếu có token hợp lệ thì req.user được gán; nếu không thì req.user =
 * undefined và request vẫn đi tiếp. Dùng cho endpoint vừa phục vụ khách vãng
 * lai (public) vừa phục vụ user đã đăng nhập (logged_in/paid).
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
