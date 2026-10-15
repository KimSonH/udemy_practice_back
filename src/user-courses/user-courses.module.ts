import { Module } from '@nestjs/common';
import { UserCoursesService } from './user-courses.service';
import { UserCoursesController } from './user-courses.controller';
import { UserCourse } from './entities/user-course.entity';
import { LessonProgress } from './entities/lesson-progress.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoursesModule } from 'src/courses/courses.module';
import { UserCourseAdminController } from './user-course.admin.controller';
import { UserCourseAdminService } from './user-course.admin.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserCourse, LessonProgress]),
    CoursesModule,
  ],
  controllers: [UserCoursesController, UserCourseAdminController],
  providers: [UserCoursesService, UserCourseAdminService],
  exports: [UserCoursesService, UserCourseAdminService],
})
export class UserCoursesModule {}
