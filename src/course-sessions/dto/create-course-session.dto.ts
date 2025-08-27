import {
  IsNotEmpty,
  IsString,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { CreateCourseContentDto } from 'src/course-contents/dto/create-course-content.dto';

export class CreateCourseSessionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  uploadUrl?: string;

  @ValidateNested({ each: true })
  courseContents: CreateCourseContentDto[];
}
