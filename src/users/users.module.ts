import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UsersAdminController } from './users.admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  // The public `users` controller that used to sit here had no guard on any
  // route: POST created a user with an unhashed password, and
  // GET /users/email told anyone whether an address was registered. Nothing
  // called it — the front registers through /authentication/register. The one
  // controller here is admin-only and carries a class-level guard.
  controllers: [UsersAdminController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
