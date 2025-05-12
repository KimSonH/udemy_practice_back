import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { Request } from 'express';
import { createUserDto } from './dto/createUser.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { User } from './entities/user.entity';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @ApiOperation({ summary: 'Find user by email' })
  @ApiResponse({
    status: 200,
    description: 'Returns the user',
    type: User,
  })
  @ApiResponse({
    status: 400,
    description: 'Email query parameter is required',
  })
  @ApiQuery({ name: 'email', required: true, type: 'string' })
  @Get('email')
  async findEmail(@Req() request: Request) {
    const { email } = request.query;

    if (!email) {
      return 'Email query parameter is required';
    }

    return await this.usersService.getByEmail(email as string);
  }

  @ApiOperation({ summary: 'Create user' })
  @ApiResponse({
    status: 201,
    description: 'User successfully created',
    type: User,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiBody({ type: createUserDto })
  @Post()
  async create(
    @Body()
    body: createUserDto,
  ) {
    return this.usersService.create(body);
  }
}
