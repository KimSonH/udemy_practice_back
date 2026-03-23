import { Module } from '@nestjs/common';
import { UdemyQuestionBanksService } from './udemy-question-banks.service';
import { UdemyQuestionBanksController } from './udemy-question-banks.controller';
import { UdemyQuestionBankAdminController } from './udemy-question-bank.admin.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UdemyQuestionBank } from './entities/udemy-question-bank.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UdemyQuestionBank])],
  controllers: [UdemyQuestionBanksController, UdemyQuestionBankAdminController],
  providers: [UdemyQuestionBanksService],
  exports: [UdemyQuestionBanksService],
})
export class UdemyQuestionBanksModule {}
