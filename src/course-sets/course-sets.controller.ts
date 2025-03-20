import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CourseSetsService } from './course-sets.service';
import { CreateCourseSetDto } from './dto/create-course-set.dto';
import { UpdateCourseSetDto } from './dto/update-course-set.dto';

@Controller('course-sets')
export class CourseSetsController {
  constructor(private readonly courseSetsService: CourseSetsService) {}

  @Post()
  create(@Body() createCourseSetDto: CreateCourseSetDto) {
    return this.courseSetsService.create(createCourseSetDto);
  }

  @Get()
  findAll() {
    return this.courseSetsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.courseSetsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCourseSetDto: UpdateCourseSetDto) {
    return this.courseSetsService.update(+id, updateCourseSetDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.courseSetsService.remove(+id);
  }
}
