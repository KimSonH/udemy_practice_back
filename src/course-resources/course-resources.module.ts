import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseResourcesService } from './course-resources.service';
import { CourseResourcesAdminController } from './course-resources.admin.controller';
import { CourseResourcesController } from './course-resources.controller';
import { CourseResource } from './entities/course-resource.entity';
import { Course } from 'src/courses/entities/courses.entity';
import { UserCourse } from 'src/user-courses/entities/user-course.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CourseResource, Course, UserCourse])],
  controllers: [CourseResourcesAdminController, CourseResourcesController],
  providers: [CourseResourcesService],
  exports: [CourseResourcesService],
})
export class CourseResourcesModule {}
