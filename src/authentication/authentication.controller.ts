import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthenticationService } from './authentication.service';
import { RegisterDto } from './dto/register.dto';
import { LocalAuthenticationGuard } from './localAuthentication.guard';
import { RequestWithAdmin, RequestWithUser } from './requestWithUser.interface';
import JwtAuthenticationGuard from './jwt-authentication.guard';
import { UsersService } from '../users/users.service';
import JwtRefreshGuard from './jwt-refresh.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { LocalAuthenticationAdminGuard } from './localAuthentication.admin.guard';
import { AdminService } from 'src/admin/admin.service';
import JwtRefreshAdminGuard from './jwt-refresh.admin.guard';
import JwtAdminAuthenticationGuard from './jwt-admin-authentication.guard';

@ApiTags('Authentication')
@Controller('authentication')
export class AuthenticationController {
  constructor(
    private authenticationService: AuthenticationService,
    private usersService: UsersService,
    private adminService: AdminService,
  ) {}

  @ApiOperation({ summary: 'User registration' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @Post('register')
  async register(@Body() registrationData: RegisterDto) {
    return this.authenticationService.register(registrationData);
  }

  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'User successfully logged in' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @HttpCode(200)
  @UseGuards(LocalAuthenticationGuard)
  @Post('log-in')
  async logIn(@Req() request: RequestWithUser) {
    const { user } = request;
    const accessTokenCookie =
      this.authenticationService.getCookieWithJwtAccessToken(user.id);
    const { cookie: refreshTokenCookie, token: refreshToken } =
      this.authenticationService.getCookieWithJwtRefreshToken(user.id);

    await this.usersService.setCurrentRefreshToken(refreshToken, user.id);

    request.res.setHeader('Set-Cookie', [
      accessTokenCookie,
      refreshTokenCookie,
    ]);
    return user;
  }

  @ApiOperation({ summary: 'Admin login' })
  @ApiResponse({ status: 200, description: 'Admin successfully logged in' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @HttpCode(200)
  @UseGuards(LocalAuthenticationAdminGuard)
  @Post('admin/log-in')
  async adminLogIn(@Req() request: RequestWithAdmin) {
    const { user } = request;
    const accessTokenCookie =
      this.authenticationService.getCookieWithJwtAdminAccessToken(user.id);
    const { cookie: refreshTokenCookie, token: refreshToken } =
      this.authenticationService.getCookieWithJwtAdminRefreshToken(user.id);

    await this.adminService.setCurrentRefreshToken(refreshToken, user.id);

    request.res.setHeader('Set-Cookie', [
      accessTokenCookie,
      refreshTokenCookie,
    ]);
    return user;
  }

  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({
    status: 200,
    description: 'Access token successfully refreshed',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBearerAuth()
  @UseGuards(JwtRefreshGuard)
  @Get('refresh')
  refresh(@Req() request: RequestWithUser) {
    const accessTokenCookie =
      this.authenticationService.getCookieWithJwtAccessToken(request.user.id);

    request.res.setHeader('Set-Cookie', accessTokenCookie);
    return request.user;
  }

  @ApiOperation({ summary: 'Admin refresh access token' })
  @ApiResponse({
    status: 200,
    description: 'Access token successfully refreshed',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBearerAuth()
  @UseGuards(JwtRefreshAdminGuard)
  @Get('admin/refresh')
  adminRefresh(@Req() request: RequestWithAdmin) {
    const accessTokenCookie =
      this.authenticationService.getCookieWithJwtAdminAccessToken(
        request.user.id,
      );

    request.res.setHeader('Set-Cookie', accessTokenCookie);
    return request.user;
  }

  @ApiOperation({ summary: 'User logout' })
  @ApiResponse({ status: 200, description: 'User successfully logged out' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBearerAuth()
  @HttpCode(200)
  @UseGuards(JwtAuthenticationGuard)
  @Post('log-out')
  async logOut(@Req() request: RequestWithUser) {
    await this.usersService.removeRefreshToken(request.user.id);
    request.res.setHeader(
      'Set-Cookie',
      this.authenticationService.getCookiesForLogOut(),
    );
  }

  @ApiOperation({ summary: 'Admin logout' })
  @ApiResponse({ status: 200, description: 'Admin successfully logged out' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBearerAuth()
  @HttpCode(200)
  @UseGuards(JwtAdminAuthenticationGuard)
  @Post('admin/log-out')
  async adminLogOut(@Req() request: RequestWithAdmin) {
    await this.adminService.removeRefreshToken(request.user.id);
    request.res.setHeader(
      'Set-Cookie',
      this.authenticationService.getCookiesForLogOutAdmin(),
    );
  }

  @ApiOperation({ summary: 'Get authenticated user' })
  @ApiResponse({ status: 200, description: 'Returns the authenticated user' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthenticationGuard)
  @Get()
  authenticate(@Req() request: RequestWithUser) {
    const user = request.user;
    return user;
  }

  @ApiOperation({ summary: 'Get authenticated admin' })
  @ApiResponse({ status: 200, description: 'Returns the authenticated admin' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBearerAuth()
  @UseGuards(JwtAdminAuthenticationGuard)
  @Get('admin')
  authenticateAdmin(@Req() request: RequestWithAdmin) {
    const admin = request.user;
    return admin;
  }
}
