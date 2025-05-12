import {
  IsNumber,
  Min,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
export class PaginationParams {
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
    description: 'The organization ID to filter results',
    example: '123',
  })
  organizationId?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'The organization slug to filter results',
    example: 'organization-slug',
  })
  organizationSlug?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'The order by field to sort results',
    example: 'createdAt',
  })
  orderBy?: string;
}
