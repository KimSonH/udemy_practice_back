import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Course } from 'src/courses/entities/courses.entity';
import { CourseSet } from 'src/course-sets/entities/course-set.entity';
import { UdemyQuestionBank } from 'src/udemy-question-banks/entities/udemy-question-bank.entity';
import { UserCourse } from 'src/user-courses/entities/user-course.entity';

import { TestAttempt } from './entities/test-attempt.entity';
import { TestAttemptsController } from './test-attempts.controller';
import { TestAttemptsService } from './test-attempts.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TestAttempt,
      Course,
      CourseSet,
      UdemyQuestionBank,
      UserCourse,
    ]),
  ],
  controllers: [TestAttemptsController],
  providers: [TestAttemptsService],
  exports: [TestAttemptsService],
})
export class TestAttemptsModule {}
