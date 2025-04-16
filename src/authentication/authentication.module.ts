import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from 'src/users/users.module';
import { AuthenticationService } from './authentication.service';
import { AuthenticationController } from './authentication.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategy/jwt.strategy';
import { AdminModule } from 'src/admin/admin.module';
import { LocalAdminStrategy } from './strategy/local-admin.strategy';
import { JwtAdminStrategy } from './strategy/jwt-admin.strategy';
import { JwtAdminRefreshTokenStrategy } from './strategy/jwt-refresh-admin-token.strategy';
import JwtAdminAuthenticationGuard from './guard/jwt-admin-authentication.guard';
import { AuthenticationAdminController } from './authentication.admin.controller';
import { JwtRefreshTokenStrategy } from './strategy/jwt-refresh-token.strategy';
import { LocalStrategy } from './strategy/local.strategy';
import { AuthenticationAdminService } from './authentication.admin.service';
@Module({
  imports: [
    UsersModule,
    AdminModule,
    PassportModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_ACCESS_TOKEN_SECRET'),
        signOptions: {
          expiresIn: `${configService.get('JWT_ACCESS_TOKEN_EXPIRATION_TIME')}s`,
        },
      }),
    }),
  ],
  providers: [
    AuthenticationService,
    AuthenticationAdminService,
    LocalStrategy,
    LocalAdminStrategy,
    JwtStrategy,
    JwtRefreshTokenStrategy,
    JwtAdminStrategy,
    JwtAdminRefreshTokenStrategy,
    JwtAdminAuthenticationGuard,
  ],
  controllers: [AuthenticationController, AuthenticationAdminController],
})
export class AuthenticationModule {}
