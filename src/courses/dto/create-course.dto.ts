import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsNotEmpty,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UdemyQuestionBankDto {
  @ApiProperty({ description: 'Category name for the class marker' })
  @IsString()
  @IsNotEmpty()
  categoryName: string;

  @ApiProperty({ description: 'Number of questions in the class marker' })
  @IsNumber()
  @IsNotEmpty()
  numberOfQuestions: number;
}

export class CreateCourseDto {
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

  @ApiProperty({ type: UdemyQuestionBankDto })
  @ValidateNested()
  @Type(() => UdemyQuestionBankDto)
  udemyQuestionBanks: UdemyQuestionBankDto;
}
