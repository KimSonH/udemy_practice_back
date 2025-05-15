import { Module } from '@nestjs/common';
import { UserCoursesService } from './user-courses.service';
import { UserCoursesController } from './user-courses.controller';
import { UserCourse } from './entities/user-course.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([UserCourse])],
  controllers: [UserCoursesController],
  providers: [UserCoursesService],
  exports: [UserCoursesService],
})
export class UserCoursesModule {}
