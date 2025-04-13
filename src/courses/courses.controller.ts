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

  @Get('organization')
  findAllByOrganization(@Query() query: PaginationParams) {
    return this.coursesService.findAllByOrganization(query);
  }

  @Get('group-by-category-name')
  getGroupCategoryName() {
    return this.coursesService.getGroupCategoryName();
  }

  @Get('group-by-organization-name')
  getGroupOrganizationName() {
    return this.coursesService.getGroupOrganizationName();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.coursesService.findOneWithStatus(+id);
  }
}
