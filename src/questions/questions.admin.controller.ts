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
import { QuestionsService } from './questions.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { PaginationParams } from 'src/common/pagination.type';
import JwtAdminAuthenticationGuard from 'src/authentication/guard/jwt-admin-authentication.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('Admin Questions')
@ApiBearerAuth()
@Controller('admin/questions')
@UseGuards(JwtAdminAuthenticationGuard)
export class QuestionsAdminController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new question' })
  @ApiResponse({
    status: 201,
    description: 'The question has been successfully created.',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request.',
  })
  create(@Body() createQuestionDto: CreateQuestionDto) {
    return this.questionsService.create(createQuestionDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all questions with pagination and search' })
  @ApiResponse({
    status: 200,
    description: 'Return all questions.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search term for filtering questions',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number for pagination',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of items per page',
  })
  findAll(
    @Query('search') search: string,
    @Query() { page, limit }: PaginationParams,
  ) {
    if (search) {
      return this.questionsService.findAllWithSearch(search, page, limit);
    }
    return this.questionsService.findAll(page, limit);
  }

  @Get('group-by-category-name')
  @ApiOperation({ summary: 'Get questions grouped by category name' })
  @ApiResponse({
    status: 200,
    description: 'Return questions grouped by category name.',
  })
  groupQuestionsByCategoryName() {
    return this.questionsService.groupQuestionsByCategoryName();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a question by id' })
  @ApiResponse({
    status: 200,
    description: 'Return the question.',
  })
  @ApiResponse({
    status: 404,
    description: 'Question not found.',
  })
  @ApiParam({
    name: 'id',
    description: 'The id of the question',
  })
  findOne(@Param('id') id: string) {
    return this.questionsService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a question' })
  @ApiResponse({
    status: 200,
    description: 'The question has been successfully updated.',
  })
  @ApiResponse({
    status: 404,
    description: 'Question not found.',
  })
  @ApiParam({
    name: 'id',
    description: 'The id of the question to update',
  })
  update(
    @Param('id') id: string,
    @Body() updateQuestionDto: UpdateQuestionDto,
  ) {
    return this.questionsService.update(+id, updateQuestionDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a question' })
  @ApiResponse({
    status: 200,
    description: 'The question has been successfully deleted.',
  })
  @ApiResponse({
    status: 404,
    description: 'Question not found.',
  })
  @ApiParam({
    name: 'id',
    description: 'The id of the question to delete',
  })
  remove(@Param('id') id: string) {
    return this.questionsService.remove(+id);
  }
}
