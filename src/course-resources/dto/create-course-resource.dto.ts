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
  @ApiProperty({ description: 'Tiêu đề tài liệu' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Slug tùy chọn; nếu bỏ trống sẽ tự sinh từ title',
    required: false,
  })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiProperty({ description: 'Nội dung HTML thô', required: false })
  @IsString()
  @IsOptional()
  html?: string;

  @ApiProperty({ description: 'Bật/tắt hiển thị ở front', required: false })
  @IsBoolean()
  @IsOptional()
  isVisible?: boolean;

  @ApiProperty({
    description: 'Mức truy cập',
    enum: COURSE_RESOURCE_ACCESS_LEVELS,
    required: false,
    default: 'private',
  })
  @IsIn(COURSE_RESOURCE_ACCESS_LEVELS)
  @IsOptional()
  accessLevel?: CourseResourceAccessLevel;

  @ApiProperty({ description: 'Thứ tự sắp xếp', required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;
}
