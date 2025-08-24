import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { MassCoursesService } from './mass-courses.service';
import { GetCoursesDto } from './dto/createMassCourse';

@ApiTags('Mass Courses')
@Controller('mass-courses')
export class MassCoursesController {
  constructor(private readonly massCourseService: MassCoursesService) {}

  @Get()
  @ApiOperation({ summary: 'Get Mass Courses' })
  @ApiQuery({ name: 'page', required: false, example: '0' })
  @ApiQuery({ name: 'limit', required: false, example: '12' })
  @ApiQuery({ name: 'search', required: false, example: 'CISSP' })
  @ApiQuery({ name: 'category', required: false, example: 'security' })
  async getMassCourses(@Query() query: GetCoursesDto) {
    return await this.massCourseService.getMassCourses(query);
  }
}
