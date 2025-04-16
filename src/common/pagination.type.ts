import { IsNumber, Min, IsNotEmpty } from 'class-validator';
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
}
