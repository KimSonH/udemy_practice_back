import { Module } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CoursesAdminController } from './courses.admin.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from './entities/courses.entity';
import { CourseSetsModule } from 'src/course-sets/course-sets.module';
import { CoursesController } from './courses.controller';
import { UdemyQuestionBanksModule } from 'src/udemyQuestionBanks/udemy-question-banks.module';
import { ConfigModule } from '@nestjs/config';
@Module({
  imports: [
    TypeOrmModule.forFeature([Course]),
    CourseSetsModule,
    UdemyQuestionBanksModule,
    ConfigModule,
  ],
  controllers: [CoursesAdminController, CoursesController],
  providers: [CoursesService],
  exports: [CoursesService],
})
export class CoursesModule {}
