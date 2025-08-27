import { PartialType } from '@nestjs/swagger';
import { CreateCourseContentDto } from './create-course-content.dto';

export class UpdateCourseContentDto extends PartialType(CreateCourseContentDto) {}
