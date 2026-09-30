import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import JwtAdminAuthenticationGuard from 'src/authentication/guard/jwt-admin-authentication.guard';
import { PaginationParams } from 'src/common/pagination.type';
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
}
