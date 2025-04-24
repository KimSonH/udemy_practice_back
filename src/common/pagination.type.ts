import {
  IsNumber,
  Min,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationParams {
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  page: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  organizationSlug?: string;

  @IsOptional()
  @IsString()
  orderBy?: string;
}
