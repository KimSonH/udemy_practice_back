import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class GetCoursesDto {
  @ApiPropertyOptional({ description: 'Page number', example: '1' })
  page?: string;

  @ApiPropertyOptional({ description: 'Limit number', example: '10' })
  limit?: string;

  @ApiPropertyOptional({ description: 'Search keyword', example: 'CISSP' })
  search?: string;

  @ApiPropertyOptional({ example: 'security' })
  @IsOptional()
  @IsString()
  category?: string;
  
}
