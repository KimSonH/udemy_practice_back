import { Module } from '@nestjs/common';
import { QuestionsService } from './questions.service';
import { QuestionsController } from './questions.controller';
import { QuestionsAdminController } from './questions.admin.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Question } from './entities/question.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Question])],
  controllers: [QuestionsController, QuestionsAdminController],
  providers: [QuestionsService],
  exports: [QuestionsService],
})
export class QuestionsModule {}
