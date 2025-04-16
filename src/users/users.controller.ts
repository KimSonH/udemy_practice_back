import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { Request } from 'express';
import { createUserDto } from './dto/createUser.dto';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('email')
  async findEmail(@Req() request: Request) {
    const { email } = request.query;

    if (!email) {
      return 'Email query parameter is required';
    }

    return await this.usersService.getByEmail(email as string);
  }

  @Post()
  async create(
    @Body()
    body: createUserDto,
  ) {
    return this.usersService.create(body);
  }
}
