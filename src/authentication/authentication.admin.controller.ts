import {
  Controller,
  HttpCode,
  UseGuards,
  Post,
  Req,
  Get,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { LocalAuthenticationAdminGuard } from './guard/localAuthentication.admin.guard';
import { RequestWithAdmin } from './requestWithUser.interface';
import JwtRefreshAdminGuard from './guard/jwt-refresh.admin.guard';
import JwtAdminAuthenticationGuard from './guard/jwt-admin-authentication.guard';
import { AuthenticationAdminService } from './authentication.admin.service';
import { LoginDto } from './dto/login.dto';
import { Admin } from 'src/admin/admin.entity';
@ApiTags('Admin Authentication')
@Controller('admin/authentication')
export class AuthenticationAdminController {
  constructor(
    private readonly authenticationAdminService: AuthenticationAdminService,
  ) {}

  @ApiOperation({ summary: 'Admin login' })
  @ApiResponse({
    status: 200,
    description: 'Admin successfully logged in',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string' },
        expiresIn: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBody({ type: LoginDto })
  @HttpCode(200)
  @UseGuards(LocalAuthenticationAdminGuard)
  @Post('log-in')
  adminLogIn(@Req() request: RequestWithAdmin) {
    const { user } = request;
    const { token: accessToken, expiresIn } =
      this.authenticationAdminService.getCookieWithJwtAdminAccessToken(user.id);

    return { accessToken, expiresIn };
  }

  @ApiOperation({ summary: 'Admin refresh access token' })
  @ApiResponse({
    status: 200,
    description: 'Access token successfully refreshed',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string' },
        expiresIn: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBearerAuth()
  @UseGuards(JwtRefreshAdminGuard)
  @Get('refresh')
  adminRefresh(@Req() request: RequestWithAdmin) {
    const { token: accessToken, expiresIn } =
      this.authenticationAdminService.getCookieWithJwtAdminAccessToken(
        request.user.id,
      );

    return { accessToken, expiresIn };
  }

  @ApiOperation({ summary: 'Admin logout' })
  @ApiResponse({ status: 200, description: 'Admin successfully logged out' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBearerAuth()
  @HttpCode(200)
  @UseGuards(JwtAdminAuthenticationGuard)
  @Post('log-out')
  async adminLogOut(@Req() request: RequestWithAdmin) {
    await this.authenticationAdminService.removeRefreshToken(request.user.id);
  }

  @ApiOperation({ summary: 'Get authenticated admin' })
  @ApiResponse({
    status: 200,
    description: 'Returns the authenticated admin',
    type: Admin,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBearerAuth()
  @UseGuards(JwtAdminAuthenticationGuard)
  @Get()
  authenticateAdmin(@Req() request: RequestWithAdmin) {
    return request.user;
  }
}
