import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UserCoursePaginationParams {
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @ApiProperty({
    description: 'The page number to retrieve',
    example: 1,
  })
  page: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @ApiProperty({
    description: 'The number of items to retrieve per page',
    example: 10,
  })
  limit: number;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'The search query to filter results',
    example: 'search query',
  })
  search?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'The status to filter results',
    example: 'pending',
  })
  status?: 'pending' | 'completed' | 'failed';

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'The course ID to filter results',
    example: 1,
  })
  courseId?: number;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'The user ID to filter results',
    example: 1,
  })
  userId?: number;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'The order by field to sort results',
    example: 'createdAt',
  })
  orderBy?: string;
}
