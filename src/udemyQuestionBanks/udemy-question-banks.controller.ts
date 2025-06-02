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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  getSchemaPath,
} from '@nestjs/swagger';
import { UdemyQuestionBank } from './entities/udemy-question-bank.entity';

@ApiTags('Questions')
@Controller('questions')
export class UdemyQuestionBanksController {
  constructor(
    private readonly udemyQuestionBanksService: UdemyQuestionBanksService,
  ) {}

  @ApiOperation({ summary: 'Create question' })
  @ApiResponse({
    status: 201,
    description: 'Question successfully created',
    type: UdemyQuestionBank,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiBody({ type: CreateUdemyQuestionBankDto })
  @Post()
  create(@Body() createUdemyQuestionBankDto: CreateUdemyQuestionBankDto) {
    return this.udemyQuestionBanksService.create(createUdemyQuestionBankDto);
  }

  @ApiOperation({ summary: 'Get all questions' })
  @ApiResponse({
    status: 200,
    description: 'Returns all questions',
    schema: {
      type: 'array',
      items: { $ref: getSchemaPath(UdemyQuestionBank) },
    },
  })
  @Get()
  findAll() {
    return;
  }

  @ApiOperation({ summary: 'Get question by ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the question',
    type: UdemyQuestionBank,
  })
  @ApiResponse({ status: 404, description: 'Question not found' })
  @ApiParam({ name: 'id', type: 'number' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.udemyQuestionBanksService.findOne(+id);
  }

  @ApiOperation({ summary: 'Update question' })
  @ApiResponse({
    status: 200,
    description: 'Question successfully updated',
    type: UdemyQuestionBank,
  })
  @ApiResponse({ status: 404, description: 'Question not found' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiBody({ type: UpdateUdemyQuestionBankDto })
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

  @ApiOperation({ summary: 'Delete question' })
  @ApiResponse({ status: 200, description: 'Question successfully deleted' })
  @ApiResponse({ status: 404, description: 'Question not found' })
  @ApiParam({ name: 'id', type: 'number' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.udemyQuestionBanksService.remove(+id);
  }
}
