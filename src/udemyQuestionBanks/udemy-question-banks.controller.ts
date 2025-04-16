import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { UdemyQuestionBanksService } from './udemy-question-banks.service';
import { CreateUdemyQuestionBankDto } from './dto/create-udemy-question-bank.dto';
import { UpdateUdemyQuestionBankDto } from './dto/update-udemy-question-bank.dto';

@Controller('questions')
export class UdemyQuestionBanksController {
  constructor(
    private readonly udemyQuestionBanksService: UdemyQuestionBanksService,
  ) {}

  @Post()
  create(@Body() createUdemyQuestionBankDto: CreateUdemyQuestionBankDto) {
    return this.udemyQuestionBanksService.create(createUdemyQuestionBankDto);
  }

  @Get()
  findAll() {
    return;
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.udemyQuestionBanksService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateUdemyQuestionBankDto: UpdateUdemyQuestionBankDto,
  ) {
    return this.udemyQuestionBanksService.update(
      +id,
      updateUdemyQuestionBankDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.udemyQuestionBanksService.remove(+id);
  }
}
