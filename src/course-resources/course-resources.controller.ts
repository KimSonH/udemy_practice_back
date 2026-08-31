import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import JwtOptionalAuthenticationGuard from 'src/authentication/guard/jwt-optional-authentication.guard';
import { RequestWithUser } from 'src/authentication/requestWithUser.interface';
import { CourseResourcesService } from './course-resources.service';
import { CourseResource } from './entities/course-resource.entity';

@ApiTags('Course Resources')
@Controller('courses/:courseId/resources')
@UseGuards(JwtOptionalAuthenticationGuard)
export class CourseResourcesController {
  constructor(
    private readonly courseResourcesService: CourseResourcesService,
  ) {}

  @ApiOperation({
    summary: 'Danh sách resource hiển thị mà người dùng có quyền xem',
  })
  @ApiResponse({ status: 200, type: [CourseResource] })
  @ApiParam({ name: 'courseId', type: 'number' })
  @Get()
  findVisible(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Req() req: RequestWithUser,
  ) {
    return this.courseResourcesService.findVisibleByCourse(
      courseId,
      req.user?.id,
    );
  }

  @ApiOperation({ summary: 'Chi tiết resource theo slug (kèm HTML)' })
  @ApiResponse({ status: 200, type: CourseResource })
  @ApiParam({ name: 'courseId', type: 'number' })
  @ApiParam({ name: 'slug', type: 'string' })
  @Get(':slug')
  findBySlug(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('slug') slug: string,
    @Req() req: RequestWithUser,
  ) {
    return this.courseResourcesService.findVisibleBySlug(
      courseId,
      slug,
      req.user?.id,
    );
  }
}
