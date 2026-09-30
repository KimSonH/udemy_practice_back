import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import JwtAdminAuthenticationGuard from 'src/authentication/guard/jwt-admin-authentication.guard';
import { PaginationParams } from 'src/common/pagination.type';
import {
  CreateAdminUserDto,
  SetUserStatusDto,
  UpdateAdminUserDto,
} from './dto/admin-user.dto';
import { UsersService } from './users.service';

@ApiTags('Admin Users')
@ApiBearerAuth()
@Controller('admin/users')
@UseGuards(JwtAdminAuthenticationGuard)
export class UsersAdminController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'List users' })
  @Get()
  findAll(@Query() query: PaginationParams) {
    return this.usersService.findAllForAdmin(query);
  }

  @ApiOperation({ summary: 'Get one user with the courses they bought' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOneForAdmin(id);
  }

  @ApiOperation({ summary: 'Create a user' })
  @Post()
  create(@Body() dto: CreateAdminUserDto) {
    return this.usersService.createForAdmin(dto);
  }

  @ApiOperation({ summary: 'Update a user' })
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAdminUserDto,
  ) {
    return this.usersService.updateForAdmin(id, dto);
  }

  @ApiOperation({ summary: 'Lock or unlock an account' })
  @Patch(':id/status')
  setStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetUserStatusDto,
  ) {
    return this.usersService.setStatus(id, dto.status);
  }

  @ApiOperation({ summary: 'Delete a user who has no purchases' })
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.removeForAdmin(id);
  }
}
