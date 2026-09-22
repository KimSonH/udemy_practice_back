import { Module } from '@nestjs/common';
import { UdemyQuestionBanksService } from './udemy-question-banks.service';
import { UdemyQuestionBankAdminController } from './udemy-question-bank.admin.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UdemyQuestionBank } from './entities/udemy-question-bank.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UdemyQuestionBank])],
  // Only the guarded admin controller. The unguarded `/questions` controller
  // that used to sit beside it exposed the whole question bank — including
  // every `correctAnswer` — to anyone, and let them PATCH or DELETE any row.
  // It duplicated the admin controller's six routes and no client called it.
  controllers: [UdemyQuestionBankAdminController],
  providers: [UdemyQuestionBanksService],
  exports: [UdemyQuestionBanksService],
})
export class UdemyQuestionBanksModule {}
