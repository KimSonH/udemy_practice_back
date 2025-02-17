import {
  Controller,
  HttpCode,
  UseGuards,
  Post,
  Req,
  Get,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthenticationService } from './authentication.service';
import { LocalAuthenticationAdminGuard } from './guard/localAuthentication.admin.guard';
import { RequestWithAdmin } from './requestWithUser.interface';
import { AdminService } from 'src/admin/admin.service';
import JwtRefreshAdminGuard from './guard/jwt-refresh.admin.guard';
import JwtAdminAuthenticationGuard from './guard/jwt-admin-authentication.guard';

@Controller('authentication/admin')
export class AuthenticationAdminController {
  constructor(
    private readonly authenticationService: AuthenticationService,
    private readonly adminService: AdminService,
  ) {}

  @ApiOperation({ summary: 'Admin login' })
  @ApiResponse({ status: 200, description: 'Admin successfully logged in' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @HttpCode(200)
  @UseGuards(LocalAuthenticationAdminGuard)
  @Post('log-in')
  async adminLogIn(@Req() request: RequestWithAdmin) {
    const { user } = request;
    const { token: accessToken } =
      this.authenticationService.getCookieWithJwtAdminAccessToken(user.id);
    const { token: refreshToken } =
      this.authenticationService.getCookieWithJwtAdminRefreshToken(user.id);

    await this.adminService.setCurrentRefreshToken(refreshToken, user.id);

    return {
      accessToken,
      refreshToken,
    };
  }

  @ApiOperation({ summary: 'Admin refresh access token' })
  @ApiResponse({
    status: 200,
    description: 'Access token successfully refreshed',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBearerAuth()
  @UseGuards(JwtRefreshAdminGuard)
  @Get('refresh')
  adminRefresh(@Req() request: RequestWithAdmin) {
    const { token: accessToken } =
      this.authenticationService.getCookieWithJwtAdminAccessToken(
        request.user.id,
      );

    return {
      accessToken,
    };
  }

  @ApiOperation({ summary: 'Admin logout' })
  @ApiResponse({ status: 200, description: 'Admin successfully logged out' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBearerAuth()
  @HttpCode(200)
  @UseGuards(JwtAdminAuthenticationGuard)
  @Post('log-out')
  async adminLogOut(@Req() request: RequestWithAdmin) {
    await this.adminService.removeRefreshToken(request.user.id);
  }

  @ApiOperation({ summary: 'Get authenticated admin' })
  @ApiResponse({ status: 200, description: 'Returns the authenticated admin' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBearerAuth()
  @UseGuards(JwtAdminAuthenticationGuard)
  @Get()
  authenticateAdmin(@Req() request: RequestWithAdmin) {
    const admin = request.user;
    return admin;
  }
}
