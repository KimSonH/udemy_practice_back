import { Module } from '@nestjs/common';
import { CourseSessionsService } from './course-sessions.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseSession } from './entities/course-session.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CourseSession])],
  controllers: [],
  providers: [CourseSessionsService],
  exports: [CourseSessionsService],
})
export class CourseSessionsModule {}
