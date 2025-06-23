import { Controller, Get, Query, Param } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { PaginationParams } from 'src/common/pagination.type';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  getSchemaPath,
} from '@nestjs/swagger';
import { Course } from './entities/courses.entity';

@ApiTags('Courses')
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @ApiOperation({ summary: 'Get all courses' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated courses',
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: { $ref: getSchemaPath(Course) },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
      },
    },
  })
  @ApiQuery({ name: 'page', required: false, type: 'number' })
  @ApiQuery({ name: 'limit', required: false, type: 'number' })
  @Get()
  findAll(@Query() query: PaginationParams) {
    return this.coursesService.findAll(query);
  }

  @ApiOperation({ summary: 'Get random courses' })
  @ApiResponse({
    status: 200,
    description: 'Returns random courses',
    schema: {
      type: 'array',
      items: { $ref: getSchemaPath(Course) },
    },
  })
  @Get('random-courses')
  getRandomCourses() {
    return this.coursesService.getRandomCourses();
  }

  @ApiOperation({ summary: 'Get courses by organization' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated courses by organization',
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: { $ref: getSchemaPath(Course) },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
      },
    },
  })
  @ApiQuery({ name: 'page', required: false, type: 'number' })
  @ApiQuery({ name: 'limit', required: false, type: 'number' })
  @Get('organization')
  findAllByOrganization(@Query() query: PaginationParams) {
    return this.coursesService.findAllByOrganization(query);
  }

  @ApiOperation({ summary: 'Get courses grouped by category' })
  @ApiResponse({
    status: 200,
    description: 'Returns courses grouped by category name',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          organizationName: { type: 'string' },
          count: { type: 'number' },
        },
      },
    },
  })
  @Get('group-by-category-name')
  getGroupCategoryName() {
    return this.coursesService.getGroupCategoryName();
  }

  @ApiOperation({ summary: 'Get courses grouped by organization' })
  @ApiResponse({
    status: 200,
    description: 'Returns courses grouped by organization name',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          organizationName: { type: 'string' },
          count: { type: 'number' },
        },
      },
    },
  })
  @Get('group-by-organization-name')
  getGroupOrganizationName() {
    return this.coursesService.getGroupOrganizationName();
  }

  @ApiOperation({ summary: 'Get course by ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the course with status',
    type: Course,
  })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiParam({ name: 'id', type: 'number' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.coursesService.findOneWithStatus(+id);
  }
}
