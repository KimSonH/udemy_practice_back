import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { QuestionDto } from './createCourse.type';

export class UpdateCourseDto {
  @ApiProperty({ description: 'Name of the course' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Description of the course' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'Price of the course' })
  @IsNumber()
  @IsNotEmpty()
  price: number;

  @ApiProperty({ description: 'Status of the course' })
  @IsBoolean()
  @IsNotEmpty()
  status: boolean;

  @ApiProperty({ type: QuestionDto })
  @ValidateNested()
  @Type(() => QuestionDto)
  questions: QuestionDto;
}
