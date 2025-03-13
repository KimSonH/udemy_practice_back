import { Module } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CoursesAdminController } from './courses.admin.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from './entities/courses.entity';
import { UdemyQuestionBanksModule } from 'src/udemyQuestionBanks/udemy-question-banks.module';
import { CoursesController } from './courses.controller';
@Module({
  imports: [TypeOrmModule.forFeature([Course]), UdemyQuestionBanksModule],
  controllers: [CoursesAdminController, CoursesController],
  providers: [CoursesService],
  exports: [CoursesService],
})
export class CoursesModule {}
