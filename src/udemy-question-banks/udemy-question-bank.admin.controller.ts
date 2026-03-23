import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UdemyQuestionBanksService } from './udemy-question-banks.service';
import { CreateUdemyQuestionBankDto } from './dto/create-udemy-question-bank.dto';
import { UpdateUdemyQuestionBankDto } from './dto/update-udemy-question-bank.dto';
import { PaginationParams } from 'src/common/pagination.type';
import JwtAdminAuthenticationGuard from 'src/authentication/guard/jwt-admin-authentication.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiBody,
  getSchemaPath,
} from '@nestjs/swagger';
import { UdemyQuestionBank } from './entities/udemy-question-bank.entity';

@ApiTags('Admin Questions')
@ApiBearerAuth()
@Controller('admin/questions')
@UseGuards(JwtAdminAuthenticationGuard)
export class UdemyQuestionBankAdminController {
  constructor(
    private readonly udemyQuestionBanksService: UdemyQuestionBanksService,
  ) {}

  @ApiOperation({ summary: 'Create a new question' })
  @ApiResponse({
    status: 201,
    description: 'The question has been successfully created.',
    type: UdemyQuestionBank,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBody({ type: CreateUdemyQuestionBankDto })
  @Post()
  create(@Body() createUdemyQuestionBankDto: CreateUdemyQuestionBankDto) {
    return this.udemyQuestionBanksService.create(createUdemyQuestionBankDto);
  }

  @ApiOperation({ summary: 'Get all questions with pagination and search' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated questions',
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: { $ref: getSchemaPath(UdemyQuestionBank) },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({ name: 'search', required: false, type: 'string' })
  @ApiQuery({ name: 'page', required: false, type: 'number' })
  @ApiQuery({ name: 'limit', required: false, type: 'number' })
  @Get()
  findAll(
    @Query('search') search: string,
    @Query() { page, limit }: PaginationParams,
  ) {
    if (search) {
      return this.udemyQuestionBanksService.findAllWithSearch(
        search,
        page,
        limit,
      );
    }
    return this.udemyQuestionBanksService.findAll(page, limit);
  }

  @ApiOperation({ summary: 'Get questions grouped by category name' })
  @ApiResponse({
    status: 200,
    description: 'Returns questions grouped by category name',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          categoryName: { type: 'string' },
          count: { type: 'number' },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get('group-by-category-name')
  groupQuestionsByCategoryName() {
    return this.udemyQuestionBanksService.groupQuestionsByCategoryName();
  }

  @ApiOperation({ summary: 'Get question by ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the question',
    type: UdemyQuestionBank,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Question not found' })
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
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Question not found' })
  @ApiParam({ name: 'id', type: 'number' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.udemyQuestionBanksService.remove(+id);
  }
}
