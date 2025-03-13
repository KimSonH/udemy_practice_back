import { PartialType } from '@nestjs/swagger';
import { CreateUdemyQuestionBankDto } from './create-udemy-question-bank.dto';

export class UpdateUdemyQuestionBankDto extends PartialType(
  CreateUdemyQuestionBankDto,
) {}
