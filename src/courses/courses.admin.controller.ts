import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  Body,
  Put,
  Delete,
} from '@nestjs/common';
import { CoursesService } from './courses.service';
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
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

@ApiTags('Admin Courses')
@ApiBearerAuth()
@Controller('admin/courses')
@UseGuards(JwtAdminAuthenticationGuard)
export class CoursesAdminController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new course' })
  @ApiResponse({
    status: 201,
    description: 'The course has been successfully created.',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request.',
  })
  createCourse(@Body() course: CreateCourseDto) {
    return this.coursesService.createCourse(course);
  }

  @Get()
  @ApiOperation({ summary: 'Get all courses with pagination and search' })
  @ApiResponse({
    status: 200,
    description: 'Return all courses.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search term for filtering courses',
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
  getCourses(
    @Query('search') search: string,
    @Query() { page, limit }: PaginationParams,
  ) {
    if (search) {
      return this.coursesService.searchCourses(search, page, limit);
    }
    return this.coursesService.getCourses(page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a course by id' })
  @ApiResponse({
    status: 200,
    description: 'Return the course.',
  })
  @ApiResponse({
    status: 404,
    description: 'Course not found.',
  })
  @ApiParam({
    name: 'id',
    description: 'The id of the course',
    type: 'number',
  })
  getCourseById(@Param('id') id: number) {
    return this.coursesService.getCourseById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a course' })
  @ApiResponse({
    status: 200,
    description: 'The course has been successfully updated.',
  })
  @ApiResponse({
    status: 404,
    description: 'Course not found.',
  })
  @ApiParam({
    name: 'id',
    description: 'The id of the course to update',
    type: 'number',
  })
  updateCourse(@Param('id') id: number, @Body() course: UpdateCourseDto) {
    return this.coursesService.updateCourse(id, course);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a course' })
  @ApiResponse({
    status: 200,
    description: 'The course has been successfully deleted.',
  })
  @ApiResponse({
    status: 404,
    description: 'Course not found.',
  })
  @ApiParam({
    name: 'id',
    description: 'The id of the course to delete',
    type: 'number',
  })
  deleteCourse(@Param('id') id: number) {
    return this.coursesService.deleteCourse(id);
  }
}
