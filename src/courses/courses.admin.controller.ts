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
} from '@nestjs/swagger';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import LocalFilesInterceptor from 'src/interceptors/localFiles.interceptor';

@ApiTags('Admin Courses')
@ApiBearerAuth()
@Controller('admin/courses')
@UseGuards(JwtAdminAuthenticationGuard)
export class CoursesAdminController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  createCourse(@Body() course: CreateCourseDto) {
    return this.coursesService.createCourse(course);
  }

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

  @Get()
  getCourses(
    @Query('search') search: string,
    @Query() { page, limit }: PaginationParams,
  ) {
    if (search) {
      return this.coursesService.searchCourses(search, page, limit);
    }
    return this.coursesService.getCourses(page, limit);
  }

  @Get(':id')
  getCourseById(@Param('id') id: number) {
    return this.coursesService.getCourseById(id);
  }

  @Put(':id')
  updateCourse(@Param('id') id: number, @Body() course: UpdateCourseDto) {
    return this.coursesService.updateCourse(id, course);
  }

  @Delete(':id')
  deleteCourse(@Param('id') id: number) {
    return this.coursesService.deleteCourse(id);
  }
}
