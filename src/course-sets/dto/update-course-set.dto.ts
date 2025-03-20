import { PartialType } from '@nestjs/swagger';
import { CreateCourseSetDto } from './create-course-set.dto';

export class UpdateCourseSetDto extends PartialType(CreateCourseSetDto) {}
