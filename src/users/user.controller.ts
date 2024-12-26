import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { UsersService } from './user.service';
import { Request } from 'express';

@Controller('users')
export class UserController {
  constructor(private userService: UsersService) {}

  @Get('email')
  async findEmail(@Req() request: Request) {
    const { email } = request.query;

    if (!email) {
      return 'Email query parameter is required';
    }

    return await this.userService.getEmail(email as string);
  }

  @Post()
  async create(
    @Body()
    body: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
    },
  ) {
    return this.userService.create(body);
  }
}
