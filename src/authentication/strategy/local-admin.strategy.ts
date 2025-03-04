import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { Admin } from 'src/admin/admin.entity';
import { AuthenticationAdminService } from '../authentication.admin.service';

@Injectable()
export class LocalAdminStrategy extends PassportStrategy(
  Strategy,
  'local-admin',
) {
  constructor(private authenticationAdminService: AuthenticationAdminService) {
    super({
      usernameField: 'email',
    });
  }
  async validate(email: string, password: string): Promise<Admin> {
    return this.authenticationAdminService.getAuthenticatedAdmin(
      email,
      password,
    );
  }
}
