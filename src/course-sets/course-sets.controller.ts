import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CourseSetsService } from './course-sets.service';
import { CreateCourseSetDto } from './dto/create-course-set.dto';
import { UpdateCourseSetDto } from './dto/update-course-set.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
  ApiConsumes,
  getSchemaPath,
} from '@nestjs/swagger';
import { CourseSet } from './entities/course-set.entity';
import JwtAdminAuthenticationGuard from 'src/authentication/guard/jwt-admin-authentication.guard';

@ApiTags('Course Sets')
@ApiBearerAuth()
@Controller('course-sets')
@UseGuards(JwtAdminAuthenticationGuard)
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

  @ApiOperation({
    summary:
      'Import câu hỏi từ nhiều file CSV vào các Course Set của 1 course. Mỗi file tự map vào đúng set dựa theo số "Practice Test N" trong tên file <-> CourseSet.order. Import lại 1 set đã có câu hỏi sẽ THAY THẾ toàn bộ câu hỏi cũ của set đó.',
  })
  @ApiResponse({ status: 201, description: 'Kết quả import từng file' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiParam({ name: 'courseId', type: 'number' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @ApiOperation({
    summary:
      'Import 1 file CSV vào đúng 1 Course Set đã biết id (không cần suy luận từ tên file). THAY THẾ toàn bộ câu hỏi cũ của set.',
  })
  @ApiResponse({ status: 201, description: 'Kết quả import' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @Post(':id/csv')
  @UseInterceptors(
    FilesInterceptor('file', 1, {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (request, file, callback) => {
        if (!file.originalname.toLowerCase().endsWith('.csv')) {
          return callback(new BadRequestException('Chỉ nhận file .csv'), false);
        }
        callback(null, true);
      },
    }),
  )
  importSingleCsv(
    @Param('id') id: string,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {
    const file = files?.[0];
    if (!file) {
      throw new BadRequestException('Cần 1 file CSV');
    }
    return this.courseSetsService.importSingleCsv(+id, {
      originalname: file.originalname,
      buffer: file.buffer,
    });
  }

  @Post('import/:courseId')
  @UseInterceptors(
    FilesInterceptor('files', 20, {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (request, file, callback) => {
        if (!file.originalname.toLowerCase().endsWith('.csv')) {
          return callback(new BadRequestException('Chỉ nhận file .csv'), false);
        }
        callback(null, true);
      },
    }),
  )
  importQuestions(
    @Param('courseId') courseId: string,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {
    return this.courseSetsService.importQuestionsFromCsv(
      +courseId,
      (files || []).map((file) => ({
        originalname: file.originalname,
        buffer: file.buffer,
      })),
    );
  }
}
