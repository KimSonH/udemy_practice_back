import { Module } from '@nestjs/common';
import { CourseContentsService } from './course-contents.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseContent } from './entities/course-content.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CourseContent])],
  controllers: [],
  providers: [CourseContentsService],
  exports: [CourseContentsService],
})
export class CourseContentsModule {}
