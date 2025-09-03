import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MassCoursesController } from './mass-courses.controller';
import { MassCoursesService } from './mass-courses.service';

@Module({
  imports: [HttpModule],
  controllers: [MassCoursesController],
  providers: [MassCoursesService],
})
export class MassCoursesModule {}
