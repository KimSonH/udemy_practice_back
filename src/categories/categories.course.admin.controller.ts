import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CategoriesCourseAdminService } from './categories.course.admin.service';
import { CreateCategoryCourseDto } from './dto/create-category.course.admin.dto';
import { PaginationParams } from 'src/common/pagination.type';
import { UpdateCategoryCourseDto } from './dto/update-category.course.admin.dto';
import JwtAdminAuthenticationGuard from 'src/authentication/guard/jwt-admin-authentication.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Admin Course Categories')
@ApiBearerAuth()
@Controller('admin/categories/course')
@UseGuards(JwtAdminAuthenticationGuard)
export class CategoriesCourseAdminController {
  constructor(
    private readonly categoriesCourseAdminService: CategoriesCourseAdminService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new course category' })
  @ApiResponse({
    status: 201,
    description: 'The course category has been successfully created.',
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  create(@Body() createCategoryCourseDto: CreateCategoryCourseDto) {
    return this.categoriesCourseAdminService.create(createCategoryCourseDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all course categories' })
  @ApiResponse({
    status: 200,
    description: 'Return all course categories.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search term for filtering categories',
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
      return this.categoriesCourseAdminService.findAllWithSearch(
        search,
        page,
        limit,
      );
    }
    return this.categoriesCourseAdminService.findAll(page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a course category by id' })
  @ApiResponse({
    status: 200,
    description: 'Return the course category.',
  })
  @ApiResponse({
    status: 404,
    description: 'Course category not found.',
  })
  findOne(@Param('id') id: string) {
    return this.categoriesCourseAdminService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a course category' })
  @ApiResponse({
    status: 200,
    description: 'The course category has been successfully updated.',
  })
  @ApiResponse({
    status: 404,
    description: 'Course category not found.',
  })
  update(
    @Param('id') id: string,
    @Body() updateCategoryCourseDto: UpdateCategoryCourseDto,
  ) {
    return this.categoriesCourseAdminService.update(
      +id,
      updateCategoryCourseDto,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a course category' })
  @ApiResponse({
    status: 200,
    description: 'The course category has been successfully deleted.',
  })
  @ApiResponse({
    status: 404,
    description: 'Course category not found.',
  })
  remove(@Param('id') id: string) {
    return this.categoriesCourseAdminService.remove(+id);
  }
}
