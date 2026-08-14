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

  @ApiProperty({ description: 'Category name of the course' })
  @IsString()
  @IsNotEmpty()
  categoryName: string;

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
      'Cách tạo course set: "auto" (mặc định, random câu hỏi theo categoryName như trước) hoặc "manual" (chỉ tạo course set rỗng, câu hỏi được import riêng bằng CSV sau)',
    enum: COURSE_CREATION_MODES,
    required: false,
    default: 'auto',
  })
  @IsIn(COURSE_CREATION_MODES)
  @IsOptional()
  creationMode?: CourseCreationMode;

  @ApiProperty({
    description:
      'Udemy question banks of the course (bắt buộc khi creationMode = "auto", không cần khi "manual")',
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
