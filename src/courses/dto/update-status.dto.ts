import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class UpdateStatusDto {
  @ApiProperty({ description: 'Id of the course' })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  ids: string[];

  @ApiProperty({ description: 'Status of the course' })
  @IsString()
  @IsNotEmpty()
  status: string;
}
