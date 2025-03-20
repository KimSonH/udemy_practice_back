import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsNotEmpty, IsBoolean } from 'class-validator';

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
  @IsString()
  @IsNotEmpty()
  status: string;

  @ApiProperty({ description: 'Type of the course' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({ description: 'Category name of the course' })
  @IsString()
  @IsNotEmpty()
  categoryName: string;

  @ApiProperty({ description: 'Organization name of the course' })
  @IsString()
  @IsNotEmpty()
  organizationName: string;

  @ApiProperty({ description: 'Course sets of the course' })
  @IsNumber()
  @IsNotEmpty()
  courseSets: number;

  @ApiProperty({ description: 'Udemy question banks of the course' })
  @IsNumber()
  @IsNotEmpty()
  udemyQuestionBanks: number;

  @ApiProperty({ description: 'Content of the course' })
  @IsString()
  @IsNotEmpty()
  content: string;
}
