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
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'limit', required: false, example: '10' })
  @ApiQuery({ name: 'search', required: false, example: 'CISSP' })
  async getMassCourses(@Query() query: GetCoursesDto) {
    return await this.massCourseService.getMassCourses(query);
  }
}
