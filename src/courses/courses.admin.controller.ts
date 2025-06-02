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
  BadRequestException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { CoursesService } from './courses.service';
import { PaginationParams } from 'src/common/pagination.type';
import JwtAdminAuthenticationGuard from 'src/authentication/guard/jwt-admin-authentication.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiConsumes,
  ApiBody,
  getSchemaPath,
} from '@nestjs/swagger';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import LocalFilesInterceptor from 'src/interceptors/localFiles.interceptor';
import { Course } from './entities/courses.entity';

@ApiTags('Admin Courses')
@ApiBearerAuth()
@Controller('admin/courses')
@UseGuards(JwtAdminAuthenticationGuard)
export class CoursesAdminController {
  constructor(private readonly coursesService: CoursesService) {}

  @ApiOperation({ summary: 'Create a new course' })
  @ApiResponse({
    status: 201,
    description: 'Course successfully created',
    type: Course,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBody({ type: CreateCourseDto })
  @Post()
  createCourse(@Body() course: CreateCourseDto) {
    return this.coursesService.createCourse(course);
  }

  @ApiOperation({ summary: 'Upload course thumbnail' })
  @ApiResponse({ status: 200, description: 'Thumbnail successfully uploaded' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Invalid image' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @Post('upload-thumbnail/:id')
  @UseInterceptors(
    LocalFilesInterceptor({
      fieldName: 'file',
      path: '/courses',
      fileFilter: (request, file, callback) => {
        if (!file.mimetype.includes('image')) {
          return callback(
            new BadRequestException('Provide a valid image'),
            false,
          );
        }
        callback(null, true);
      },
      limits: {
        fileSize: Math.pow(1024, 5),
      },
    }),
  )
  uploadThumbnail(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.coursesService.uploadThumbnail(+id, file.filename);
  }

  @ApiOperation({ summary: 'Get all courses' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated courses',
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: { type: 'string', $ref: getSchemaPath(Course) },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({ name: 'page', required: false, type: 'number' })
  @ApiQuery({ name: 'limit', required: false, type: 'number' })
  @Get()
  getCourses(@Query() query: PaginationParams) {
    return this.coursesService.findAll(query);
  }

  @ApiOperation({ summary: 'Get course by ID' })
  @ApiResponse({ status: 200, description: 'Returns the course', type: Course })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiParam({ name: 'id', type: 'number' })
  @Get(':id')
  getCourseById(@Param('id') id: number) {
    return this.coursesService.getCourseById(id);
  }

  @ApiOperation({ summary: 'Update course' })
  @ApiResponse({
    status: 200,
    description: 'Course successfully updated',
    type: Course,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiBody({ type: UpdateCourseDto })
  @Put(':id')
  updateCourse(@Param('id') id: number, @Body() course: UpdateCourseDto) {
    return this.coursesService.updateCourse(id, course);
  }

  @ApiOperation({ summary: 'Delete course' })
  @ApiResponse({ status: 200, description: 'Course successfully deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiParam({ name: 'id', type: 'number' })
  @Delete(':id')
  deleteCourse(@Param('id') id: number) {
    return this.coursesService.deleteCourse(id);
  }
}
