import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { CourseSetsService } from './course-sets.service';
import { CreateCourseSetDto } from './dto/create-course-set.dto';
import { UpdateCourseSetDto } from './dto/update-course-set.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  getSchemaPath,
} from '@nestjs/swagger';
import { CourseSet } from './entities/course-set.entity';

@ApiTags('Course Sets')
@Controller('course-sets')
export class CourseSetsController {
  constructor(private readonly courseSetsService: CourseSetsService) {}

  @ApiOperation({ summary: 'Create a new course set' })
  @ApiResponse({
    status: 201,
    description: 'Course set successfully created',
    type: CourseSet,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiBody({ type: CreateCourseSetDto })
  @Post()
  create(@Body() createCourseSetDto: CreateCourseSetDto) {
    return this.courseSetsService.create(createCourseSetDto);
  }

  @ApiOperation({ summary: 'Get all course sets' })
  @ApiResponse({
    status: 200,
    description: 'Returns all course sets',
    schema: {
      type: 'array',
      items: { $ref: getSchemaPath(CourseSet) },
    },
  })
  @Get()
  findAll() {
    return this.courseSetsService.findAll();
  }

  @ApiOperation({ summary: 'Get course set by ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the course set',
    type: CourseSet,
  })
  @ApiResponse({ status: 404, description: 'Course set not found' })
  @ApiParam({ name: 'id', type: 'number' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.courseSetsService.findOne(+id);
  }

  @ApiOperation({ summary: 'Update course set' })
  @ApiResponse({
    status: 200,
    description: 'Course set successfully updated',
    type: CourseSet,
  })
  @ApiResponse({ status: 404, description: 'Course set not found' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiBody({ type: UpdateCourseSetDto })
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCourseSetDto: UpdateCourseSetDto,
  ) {
    return this.courseSetsService.update(+id, updateCourseSetDto);
  }

  @ApiOperation({ summary: 'Delete course set' })
  @ApiResponse({ status: 200, description: 'Course set successfully deleted' })
  @ApiResponse({ status: 404, description: 'Course set not found' })
  @ApiParam({ name: 'id', type: 'number' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.courseSetsService.remove(+id);
  }
}
