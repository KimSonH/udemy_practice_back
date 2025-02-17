import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { PostgresErrorCode } from '../database/postgresErrorCodes.enum';
import { RegisterDto } from './dto/register.dto';
import { TokenPayload } from './tokenPayload.interface';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AdminService } from 'src/admin/admin.service';

@Injectable()
export class AuthenticationService {
  constructor(
    private readonly userService: UsersService,
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
      throw new HttpException(
        'Wrong credentials provided',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  public getCookieWithJwtAccessToken(userId: number) {
    const payload: TokenPayload = { userId };
    const token = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_ACCESS_TOKEN_SECRET'),
      expiresIn: `${this.configService.get('JWT_ACCESS_TOKEN_EXPIRATION_TIME')}s`,
    });
    return {
      cookie: `Authentication=${token}; HttpOnly; Path=/; Max-Age=${this.configService.get('JWT_ACCESS_TOKEN_EXPIRATION_TIME')}; SameSite=strict; Secure=${this.configService.get('NODE_ENV') === 'production'}`,
      token,
    };
  }

  public getCookieWithJwtAdminAccessToken(userId: number) {
    const payload: TokenPayload = { userId };
    const token = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_ADMIN_ACCESS_TOKEN_SECRET'),
      expiresIn: `${this.configService.get('JWT_ADMIN_ACCESS_TOKEN_EXPIRATION_TIME')}s`,
    });
    const cookie = `AAuthentication=${token}; HttpOnly; Path=/; Max-Age=${this.configService.get('JWT_ADMIN_ACCESS_TOKEN_EXPIRATION_TIME')}; SameSite=strict; Secure=${this.configService.get('NODE_ENV') === 'production'}`;
    return {
      cookie,
      token,
    };
  }

  public getCookieWithJwtRefreshToken(userId: number) {
    const payload: TokenPayload = { userId };
    const token = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_TOKEN_SECRET'),
      expiresIn: `${this.configService.get('JWT_REFRESH_TOKEN_EXPIRATION_TIME')}s`,
    });
    const cookie = `Refresh=${token}; HttpOnly; Path=/; Max-Age=${this.configService.get('JWT_REFRESH_TOKEN_EXPIRATION_TIME')}; SameSite=strict; Secure=${this.configService.get('NODE_ENV') === 'production'}`;
    return {
      cookie,
      token,
    };
  }

  public getCookieWithJwtAdminRefreshToken(userId: number) {
    const payload: TokenPayload = { userId };
    const token = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_ADMIN_REFRESH_TOKEN_SECRET'),
      expiresIn: `${this.configService.get('JWT_ADMIN_REFRESH_TOKEN_EXPIRATION_TIME')}s`,
    });
    return {
      cookie: `ARefresh=${token}; HttpOnly; Path=/; Max-Age=${this.configService.get('JWT_ADMIN_REFRESH_TOKEN_EXPIRATION_TIME')}; SameSite=strict; Secure=${this.configService.get('NODE_ENV') === 'production'}`,
      token,
    };
  }

  public getCookiesForLogOut() {
    return [
      'Authentication=; HttpOnly; Path=/; Max-Age=0',
      'Refresh=; HttpOnly; Path=/; Max-Age=0',
    ];
  }

  public getCookiesForLogOutAdmin() {
    return [
      'AAuthentication=; HttpOnly; Path=/; Max-Age=0',
      'ARefresh=; HttpOnly; Path=/; Max-Age=0',
    ];
  }

  public async register(registrationData: RegisterDto) {
    const hashedPassword = await bcrypt.hash(registrationData.password, 10);
    try {
      const createdUser = await this.userService.create({
        ...registrationData,
        password: hashedPassword,
      });
      createdUser.password = undefined;
      return createdUser;
    } catch (error) {
      if (error?.code === PostgresErrorCode.UniqueViolation) {
        throw new HttpException(
          'User with that email already exists',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw new HttpException(
        'Something went wrong',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  public async getAuthenticatedUser(email: string, hashedPassword: string) {
    try {
      const user = await this.userService.getByEmail(email);
      await this.verifyPassword(hashedPassword, user.password);
      user.password = undefined;
      return user;
    } catch {
      throw new HttpException(
        'Wrong credentials provided',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  public async getAuthenticatedAdmin(email: string, hashedPassword: string) {
    try {
      const admin = await this.adminService.getByEmail(email);
      await this.verifyPassword(hashedPassword, admin.password);
      admin.password = undefined;
      return admin;
    } catch {
      throw new HttpException(
        'Wrong credentials provided',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
