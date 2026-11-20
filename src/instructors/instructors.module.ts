import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoursesModule } from 'src/courses/courses.module';
import { UserCourse } from 'src/user-courses/entities/user-course.entity';
import { User } from 'src/users/entities/user.entity';
import {
  InstructorMeController,
  InstructorsController,
} from './instructors.controller';
import { InstructorsService } from './instructors.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserCourse, User]), CoursesModule],
  controllers: [InstructorMeController, InstructorsController],
  providers: [InstructorsService],
})
export class InstructorsModule {}
