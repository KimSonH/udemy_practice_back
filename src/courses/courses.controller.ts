import { Controller, Get, Query, Param } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { PaginationParams } from 'src/common/pagination.type';

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  findAll(@Query() query: PaginationParams) {
    return this.coursesService.findAllByCategoryName(query);
  }

  @Get('group-by-category-name')
  getGroupCategoryName() {
    return this.coursesService.getGroupCategoryName();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.coursesService.findOneWithStatus(+id);
  }
}
