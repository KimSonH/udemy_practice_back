import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsIn,
  Max,
  Min,
} from 'class-validator';

export const MAX_COURSE_SETS = 6;
export const COURSE_CREATION_MODES = ['auto', 'manual'] as const;
export type CourseCreationMode = (typeof COURSE_CREATION_MODES)[number];

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
  @IsOptional()
  description?: string;

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

  @ApiProperty({
    description:
      'Category name of the course. Optional in general, but REQUIRED when creationMode = "auto", because questions are distributed by it.',
    required: false,
  })
  @IsString()
  @IsOptional()
  categoryName?: string;

  @ApiProperty({ description: 'Organization id of the course' })
  @IsString()
  @IsNotEmpty()
  organizationId: string;

  @ApiProperty({
    description: `Course sets of the course (max ${MAX_COURSE_SETS})`,
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  @Max(MAX_COURSE_SETS)
  courseSets: number;

  @ApiProperty({
    description:
      'How course sets are created: "auto" (the default, random questions picked by categoryName) or "manual" (empty course sets only, questions imported from CSV afterwards)',
    enum: COURSE_CREATION_MODES,
    required: false,
    default: 'auto',
  })
  @IsIn(COURSE_CREATION_MODES)
  @IsOptional()
  creationMode?: CourseCreationMode;

  @ApiProperty({
    description:
      'Udemy question banks of the course (required when creationMode = "auto", unused when "manual")',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  udemyQuestionBanks?: number;

  @ApiProperty({ description: 'Content of the course' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ description: 'Thumbnail image url of the course' })
  @IsString()
  @IsNotEmpty()
  thumbnailImageUrl: string;
}
