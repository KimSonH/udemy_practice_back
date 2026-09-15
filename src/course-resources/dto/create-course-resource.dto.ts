import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import {
  COURSE_RESOURCE_ACCESS_LEVELS,
  CourseResourceAccessLevel,
} from '../course-resource.constants';

export class CreateCourseResourceDto {
  @ApiProperty({ description: 'Resource title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Optional slug; generated from the title when left empty',
    required: false,
  })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiProperty({ description: 'Raw HTML content', required: false })
  @IsString()
  @IsOptional()
  html?: string;

  @ApiProperty({
    description: 'Whether the resource is visible on the front site',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isVisible?: boolean;

  @ApiProperty({
    description: 'Access level',
    enum: COURSE_RESOURCE_ACCESS_LEVELS,
    required: false,
    default: 'private',
  })
  @IsIn(COURSE_RESOURCE_ACCESS_LEVELS)
  @IsOptional()
  accessLevel?: CourseResourceAccessLevel;

  @ApiProperty({ description: 'Sort order', required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;
}
