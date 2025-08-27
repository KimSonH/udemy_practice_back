import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CourseSessionsService } from './course-sessions.service';
import { CreateCourseSessionDto } from './dto/create-course-session.dto';
import { UpdateCourseSessionDto } from './dto/update-course-session.dto';

@Controller('course-sessions')
export class CourseSessionsController {
  constructor(private readonly courseSessionsService: CourseSessionsService) {}

  @Post()
  create(@Body() createCourseSessionDto: CreateCourseSessionDto) {
    return this.courseSessionsService.create(createCourseSessionDto);
  }

  @Get()
  findAll() {
    return this.courseSessionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.courseSessionsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCourseSessionDto: UpdateCourseSessionDto) {
    return this.courseSessionsService.update(+id, updateCourseSessionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.courseSessionsService.remove(+id);
  }
}
