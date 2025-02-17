import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export default class JwtRefreshAdminGuard extends AuthGuard(
  'jwt-refresh-admin-token',
) {}
