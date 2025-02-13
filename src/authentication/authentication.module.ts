import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from 'src/users/users.module';
import { AuthenticationService } from './authentication.service';
import { LocalStrategy } from './local.strategy';
import { AuthenticationController } from './authentication.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { JwtRefreshTokenStrategy } from './jwt-refresh-token.strategy';
import { AdminModule } from 'src/admin/admin.module';
import { LocalAdminStrategy } from './local-admin.strategy';
import { JwtAdminStrategy } from './jwt-admin.strategy';
import { JwtAdminRefreshTokenStrategy } from './jwt-refresh-admin-token.strategy';
import JwtAdminAuthenticationGuard from './jwt-admin-authentication.guard';

@Module({
  imports: [
    UsersModule,
    AdminModule,
    PassportModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_ACCESS_TOKEN_SECRET'),
        signOptions: {
          expiresIn: `${configService.get('JWT_ACCESS_TOKEN_EXPIRATION_TIME')}s`,
        },
      }),
    }),
  ],
  providers: [
    AuthenticationService,
    LocalStrategy,
    LocalAdminStrategy,
    JwtStrategy,
    JwtRefreshTokenStrategy,
    JwtAdminStrategy,
    JwtAdminRefreshTokenStrategy,
    JwtAdminAuthenticationGuard,
  ],
  controllers: [AuthenticationController],
})
export class AuthenticationModule {}
