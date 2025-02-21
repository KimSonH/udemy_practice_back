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
import { CreateCourseDto } from './types/createCourse.type';
import { UpdateCourseDto } from './types/updateCourse.type';

@Controller('admin/courses')
@UseGuards(JwtAdminAuthenticationGuard)
export class CoursesAdminController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  createCourse(@Body() course: CreateCourseDto) {
    return this.coursesService.createCourse(course);
  }

  @Get()
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
  getCourseById(@Param('id') id: number) {
    return this.coursesService.getCourseById(id);
  }

  @Put(':id')
  updateCourse(@Param('id') id: number, @Body() course: UpdateCourseDto) {
    return this.coursesService.updateCourse(id, course);
  }

  @Delete(':id')
  deleteCourse(@Param('id') id: number) {
    return this.coursesService.deleteCourse(id);
  }
}
