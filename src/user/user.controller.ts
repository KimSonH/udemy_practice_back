import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { UsersService } from './user.service';
import { Request } from 'express';
import { createUserDto } from './dto/createUser.dto';

@Controller('users')
export class UserController {
  constructor(private userService: UsersService) {}

  @Get('email')
  async findEmail(@Req() request: Request) {
    const { email } = request.query;

    if (!email) {
      return 'Email query parameter is required';
    }

    return await this.userService.getByEmail(email as string);
  }

  @Post()
  async create(
    @Body()
    body: createUserDto,
  ) {
    return this.userService.create(body);
  }
}
