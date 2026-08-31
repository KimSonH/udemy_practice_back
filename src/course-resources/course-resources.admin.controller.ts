import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import JwtAdminAuthenticationGuard from 'src/authentication/guard/jwt-admin-authentication.guard';
import { CourseResourcesService } from './course-resources.service';
import { CourseResource } from './entities/course-resource.entity';
import { CreateCourseResourceDto } from './dto/create-course-resource.dto';
import { UpdateCourseResourceDto } from './dto/update-course-resource.dto';
import { ReorderCourseResourcesDto } from './dto/reorder-course-resources.dto';
import { ToggleVisibilityDto } from './dto/toggle-visibility.dto';

@ApiTags('Admin Course Resources')
@ApiBearerAuth()
@Controller('admin/courses/:courseId/resources')
@UseGuards(JwtAdminAuthenticationGuard)
export class CourseResourcesAdminController {
  constructor(
    private readonly courseResourcesService: CourseResourcesService,
  ) {}

  @ApiOperation({ summary: 'Danh sách resource của course (kể cả ẩn)' })
  @ApiResponse({ status: 200, type: [CourseResource] })
  @ApiParam({ name: 'courseId', type: 'number' })
  @Get()
  findAll(@Param('courseId', ParseIntPipe) courseId: number) {
    return this.courseResourcesService.findAllByCourseForAdmin(courseId);
  }

  @ApiOperation({ summary: 'Tạo resource mới cho course' })
  @ApiResponse({ status: 201, type: CourseResource })
  @ApiParam({ name: 'courseId', type: 'number' })
  @ApiBody({ type: CreateCourseResourceDto })
  @Post()
  create(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Body() dto: CreateCourseResourceDto,
  ) {
    return this.courseResourcesService.create(courseId, dto);
  }

  @ApiOperation({ summary: 'Sắp xếp lại thứ tự resource' })
  @ApiParam({ name: 'courseId', type: 'number' })
  @ApiBody({ type: ReorderCourseResourcesDto })
  @Patch('reorder')
  reorder(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Body() dto: ReorderCourseResourcesDto,
  ) {
    return this.courseResourcesService.reorder(courseId, dto);
  }

  @ApiOperation({ summary: 'Chi tiết 1 resource' })
  @ApiResponse({ status: 200, type: CourseResource })
  @ApiParam({ name: 'courseId', type: 'number' })
  @ApiParam({ name: 'id', type: 'number' })
  @Get(':id')
  findOne(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.courseResourcesService.findOneForAdmin(courseId, id);
  }

  @ApiOperation({ summary: 'Cập nhật resource' })
  @ApiResponse({ status: 200, type: CourseResource })
  @ApiParam({ name: 'courseId', type: 'number' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiBody({ type: UpdateCourseResourceDto })
  @Put(':id')
  update(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCourseResourceDto,
  ) {
    return this.courseResourcesService.update(courseId, id, dto);
  }

  @ApiOperation({ summary: 'Bật/tắt hiển thị resource' })
  @ApiResponse({ status: 200, type: CourseResource })
  @ApiParam({ name: 'courseId', type: 'number' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiBody({ type: ToggleVisibilityDto })
  @Patch(':id/visibility')
  setVisibility(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ToggleVisibilityDto,
  ) {
    return this.courseResourcesService.setVisibility(
      courseId,
      id,
      dto.isVisible,
    );
  }

  @ApiOperation({ summary: 'Xóa mềm resource' })
  @ApiParam({ name: 'courseId', type: 'number' })
  @ApiParam({ name: 'id', type: 'number' })
  @Delete(':id')
  remove(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.courseResourcesService.remove(courseId, id);
  }
}
