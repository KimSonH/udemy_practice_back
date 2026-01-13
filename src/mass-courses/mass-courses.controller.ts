import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { MassCoursesService } from './mass-courses.service';
import { GetCoursesDto } from './dto/createMassCourse';

@ApiTags('Mass Courses')
@Controller('mass-courses')
export class MassCoursesController {
  constructor(private readonly massCourseService: MassCoursesService) { }

  @Get()
  @ApiOperation({ summary: 'Get Mass Courses' })
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'limit', required: false, example: '12' })
  @ApiQuery({ name: 'search', required: false, example: 'CISSP' })
  @ApiQuery({ name: 'category', required: false, example: 'security' })
  async getMassCourses(@Query() query: GetCoursesDto) {
    return await this.massCourseService.getMassCourses(query);
  }

  @Get('/enrolled')
  @ApiOperation({
    summary: 'Get enrolled account of a mass course',
    description: 'Return ONE enrolled account (latest enrolled) by course_id',
  })
  @ApiQuery({
    name: 'course_id',
    type: Number,
    required: true,
    example: 123,
    description: 'ID of the mass course',
  })
  async getCourseEnrolledAccount(@Query('course_id') courseId: string) {
    const id = Number(courseId);

    if (!Number.isInteger(id)) {
      throw new BadRequestException('course_id must be a number');
    }

    return this.massCourseService.getEnrolledAccount(id);
  }


}
