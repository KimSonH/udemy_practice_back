import { PartialType } from '@nestjs/swagger';
import { CreateCourseResourceDto } from './create-course-resource.dto';

export class UpdateCourseResourceDto extends PartialType(
  CreateCourseResourceDto,
) {}
