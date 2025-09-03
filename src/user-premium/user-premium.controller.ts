import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ConfirmVietQRDto,
  CreateUserPremiumDto,
  GetSoldAccountDto,
} from './dto/create-user-premium.dto';
import { UpdateUserPremiumDto } from './dto/update-user-premium.dto';
import { PaginationParams } from 'src/common/pagination.type';
import JwtAuthenticationGuard from 'src/authentication/guard/jwt-authentication.guard';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBody,
  getSchemaPath,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { UserPremium } from './entities/user-premium.entity';
import { RequestWithUser } from 'src/authentication/requestWithUser.interface';
import { UserPremiumsService } from './user-premium.service';

@ApiTags('User Premiums')
@Controller('user-premiums')
@UseGuards(JwtAuthenticationGuard)
export class UserPremiumsController {
  constructor(private readonly userPremiumsService: UserPremiumsService) {}

  @ApiOperation({ summary: 'Create a new user premium record' })
  @ApiResponse({
    status: 201,
    description: 'The user premium has been successfully created.',
    type: UserPremium,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiBody({ type: CreateUserPremiumDto })
  @Post()
  create(@Body() createUserPremiumDto: CreateUserPremiumDto) {
    return this.userPremiumsService.create(createUserPremiumDto);
  }

  @ApiOperation({ summary: 'Get user premiums by user ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns all user premiums',
    schema: {
      type: 'object',
      properties: {
        items: { type: 'array', items: { $ref: getSchemaPath(UserPremium) } },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User premium not found' })
  @ApiQuery({ name: 'page', required: false, type: 'number' })
  @ApiQuery({ name: 'limit', required: false, type: 'number' })
  @Get('by-user-id')
  getUserPremiumsByUserId(
    @Req() req: RequestWithUser,
    @Query() query: PaginationParams,
  ) {
    return this.userPremiumsService.getUserPremiumsByUserId(
      req.user.id,
      query,
      'completed',
    );
  }

  @ApiOperation({ summary: 'Get user premium by ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the user premium',
    type: UserPremium,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User premium not found' })
  @ApiParam({ name: 'id', type: 'number' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userPremiumsService.findOne(+id, 'completed');
  }

  @ApiOperation({ summary: 'Update user premium' })
  @ApiResponse({
    status: 200,
    description: 'Returns the updated user premium',
    type: UserPremium,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User premium not found' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiBody({ type: UpdateUserPremiumDto })
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateUserPremiumDto: UpdateUserPremiumDto,
  ) {
    return this.userPremiumsService.update(+id, updateUserPremiumDto);
  }

  @ApiOperation({ summary: 'Delete user premium' })
  @ApiResponse({
    status: 200,
    description: 'Returns the deleted user premium',
    type: UserPremium,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User premium not found' })
  @ApiParam({ name: 'id', type: 'number' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userPremiumsService.remove(+id);
  }

  @Get('sold-account/:account_id')
  async getSoldAccount(@Param('account_id') accountId: string) {
    const id = parseInt(accountId, 10);
    const result = await this.userPremiumsService.getSoldAccountInfo(id);
    return {
      status: true,
      data: result,
    };
  }


  @Get('by-user-id')
@UseGuards(JwtAuthenticationGuard)
async getPremiumAccounts(
  @Req() req: RequestWithUser,
  @Query() query: PaginationParams,
) {
  return this.userPremiumsService.getPremiumAccountsOfCurrentUser(
    req.user.id,
    query,
    'completed',
  );
}

  @ApiOperation({ summary: 'Get all completed premium accounts' })
  @ApiResponse({
    status: 200,
    description: 'Returns all completed premium payments',
    schema: {
      type: 'object',
      properties: {
        items: { type: 'array', items: { $ref: getSchemaPath(UserPremium) } },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({ name: 'page', required: false, type: 'number' })
  @ApiQuery({ name: 'limit', required: false, type: 'number' })
  @ApiQuery({ name: 'search', required: false, type: 'string' })
  @ApiQuery({ name: 'orderBy', required: false, enum: ['ASC', 'DESC'] })
  @Get()
  findAll(@Query() query: PaginationParams) {
    return this.userPremiumsService.findAllAccountPremium(query, 'completed');
  }


@ApiOperation({ summary: 'Confirm payment VietQR' })
@ApiResponse({ status: 200, description: 'Confirmation successful' })
@Post('vietqr/confirm')
async confirmVietQRPayment(
  @Req() req: RequestWithUser,
  @Body() dto: ConfirmVietQRDto,
) {
  return this.userPremiumsService.confirmVietQRPayment({
    userId: req.user.id,
    accountId: dto.accountId,
    accountEmail: dto.accountEmail,
  });
}
}
