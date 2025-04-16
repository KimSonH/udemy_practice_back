import { Module } from '@nestjs/common';
import { CourseSetsService } from './course-sets.service';
import { CourseSetsController } from './course-sets.controller';
import { CourseSet } from './entities/course-set.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UdemyQuestionBanksModule } from 'src/udemyQuestionBanks/udemy-question-banks.module';

@Module({
  imports: [TypeOrmModule.forFeature([CourseSet]), UdemyQuestionBanksModule],
  controllers: [CourseSetsController],
  providers: [CourseSetsService],
  exports: [CourseSetsService],
})
export class CourseSetsModule {}
