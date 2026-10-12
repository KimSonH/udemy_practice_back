import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateCourseDto } from './create-course.dto';
import { VideoCourseDto } from './create-video-course.dto';

/**
 * What a learner may send for a practice course. No organization, and no
 * creation mode or question count: those exist for "auto" courses, which draw
 * questions from the shared question bank. A learner course is always
 * "manual", with questions imported per course set.
 */
export class CreateMyCourseDto extends OmitType(CreateCourseDto, [
  'organizationId',
  'creationMode',
  'udemyQuestionBanks',
] as const) {}

export class UpdateMyCourseDto extends PartialType(CreateMyCourseDto) {}

export class MyVideoCourseDto extends OmitType(VideoCourseDto, [
  'organizationId',
  'id',
] as const) {}
