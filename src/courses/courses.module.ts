import { Module } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CoursesAdminController } from './courses.admin.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from './entities/courses.entity';
import { QuestionsModule } from 'src/questions/questions.module';
import { CoursesController } from './courses.controller';
@Module({
  imports: [TypeOrmModule.forFeature([Course]), QuestionsModule],
  controllers: [CoursesAdminController, CoursesController],
  providers: [CoursesService],
  exports: [CoursesService],
})
export class CoursesModule {}
