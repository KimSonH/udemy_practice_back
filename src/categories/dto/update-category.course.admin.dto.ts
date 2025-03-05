import { PartialType } from '@nestjs/mapped-types';
import { CreateCategoryCourseDto } from './create-category.course.admin.dto';

export class UpdateCategoryCourseDto extends PartialType(
  CreateCategoryCourseDto,
) {}
