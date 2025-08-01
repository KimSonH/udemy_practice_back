import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CourseContentsService } from './course-contents.service';
import { CreateCourseContentDto } from './dto/create-course-content.dto';
import { UpdateCourseContentDto } from './dto/update-course-content.dto';

@Controller('course-contents')
export class CourseContentsController {
  constructor(private readonly courseContentsService: CourseContentsService) {}

  @Post()
  create(@Body() createCourseContentDto: CreateCourseContentDto) {
    return this.courseContentsService.create(createCourseContentDto);
  }

  @Get()
  findAll() {
    return this.courseContentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.courseContentsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCourseContentDto: UpdateCourseContentDto) {
    return this.courseContentsService.update(+id, updateCourseContentDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.courseContentsService.remove(+id);
  }
}
