import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsEmail, IsOptional } from 'class-validator';

export class CreateUserPremiumDto {
  @ApiProperty({ description: 'User ID' })
  @IsNumber()
  userId: number;

  @ApiProperty({ description: 'User account email' })
  @IsEmail()
  accountEmail: string;

  @ApiProperty({ description: 'Order ID', required: false })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiProperty({ description: 'Order data', required: false })
  @IsOptional()
  @IsString()
  orderData?: string;

  @ApiProperty({ description: 'Order by', required: false })
  @IsOptional()
  @IsString()
  orderBy?: string;

  @ApiProperty({
    description: 'Status of order',
    required: false,
    enum: ['pending', 'completed', 'failed'],
  })
  @IsOptional()
  @IsString()
  status?: 'pending' | 'completed' | 'failed';
}
