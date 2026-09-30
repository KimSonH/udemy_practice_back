import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

import { USER_STATUSES, UserStatus } from '../user-status';

export class CreateAdminUserDto {
  @IsEmail()
  @ApiProperty({ example: 'learner@example.com' })
  email: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  lastName: string;

  @IsString()
  @MinLength(8)
  @ApiProperty({ description: 'Stored as a bcrypt hash, never as given' })
  password: string;
}

export class UpdateAdminUserDto {
  @IsOptional()
  @IsEmail()
  @ApiProperty({ required: false })
  email?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ required: false })
  firstName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ required: false })
  lastName?: string;
}

export class SetUserStatusDto {
  @IsIn(USER_STATUSES as unknown as string[])
  @ApiProperty({ enum: USER_STATUSES })
  status: UserStatus;
}
