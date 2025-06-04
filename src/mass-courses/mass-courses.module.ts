import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ExternalCourseController } from './mass-courses.controller';
import { ExternalCourseService } from './mass-courses.service';

@Module({
  imports: [HttpModule],
  controllers: [ExternalCourseController],
  providers: [ExternalCourseService],
})
export class ExternalCourseModule {}
