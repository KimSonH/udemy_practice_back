import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AdminService } from 'src/admin/admin.service';
import * as bcrypt from 'bcrypt';
import { TokenPayload } from './tokenPayload.interface';

@Injectable()
export class AuthenticationAdminService {
  constructor(
    private readonly adminService: AdminService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private async verifyPassword(
    plainTextPassword: string,
    hashedPassword: string,
  ) {
    const isPasswordMatching = await bcrypt.compare(
      plainTextPassword,
      hashedPassword,
    );
    if (!isPasswordMatching) {
      throw new BadRequestException('Wrong credentials provided');
    }
  }

  public async getAuthenticatedAdmin(email: string, hashedPassword: string) {
    try {
      const admin = await this.adminService.getByEmail(email);
      await this.verifyPassword(hashedPassword, admin.password);
      admin.password = undefined;
      return admin;
    } catch {
      throw new BadRequestException('Wrong credentials provided');
    }
  }

  public getCookieWithJwtAdminAccessToken(userId: number) {
    const payload: TokenPayload = { userId };
    const expiresIn: string = this.configService.get(
      'JWT_ADMIN_ACCESS_TOKEN_EXPIRATION_TIME',
    );
    const token = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_ADMIN_ACCESS_TOKEN_SECRET'),
      expiresIn: `${expiresIn}s`,
    });
    const cookie = `AAuthentication=${token}; HttpOnly; Path=/; Max-Age=${expiresIn}; SameSite=strict; Secure=${this.configService.get('NODE_ENV') === 'production'}`;
    return {
      cookie,
      token,
      expiresIn,
    };
  }

  public getCookieWithJwtAdminRefreshToken(userId: number) {
    const payload: TokenPayload = { userId };
    const expiresIn: string = this.configService.get(
      'JWT_ADMIN_REFRESH_TOKEN_EXPIRATION_TIME',
    );
    const token = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_ADMIN_REFRESH_TOKEN_SECRET'),
      expiresIn: `${expiresIn}s`,
    });
    return {
      cookie: `ARefresh=${token}; HttpOnly; Path=/; Max-Age=${expiresIn}; SameSite=strict; Secure=${this.configService.get('NODE_ENV') === 'production'}`,
      token,
      expiresIn,
    };
  }

  public removeRefreshToken(userId: number) {
    return this.adminService.removeRefreshToken(userId);
  }

  public getCookiesForLogOutAdmin() {
    return [
      'AAuthentication=; HttpOnly; Path=/; Max-Age=0',
      'ARefresh=; HttpOnly; Path=/; Max-Age=0',
    ];
  }
}
