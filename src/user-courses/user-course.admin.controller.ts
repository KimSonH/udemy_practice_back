import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserCoursesService } from './user-courses.service';
import { UserCoursePaginationParams } from './types/pagination.type';
import JwtAdminAuthenticationGuard from 'src/authentication/guard/jwt-admin-authentication.guard';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { UserCourse } from './entities/user-course.entity';
import { UserCourseAdminService } from './user-course.admin.service';

@Controller('admin/user-courses')
@UseGuards(JwtAdminAuthenticationGuard)
export class UserCourseAdminController {
  constructor(
    private readonly userCourseAdminService: UserCourseAdminService,
  ) {}

  @ApiTags('Admin User Courses')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all user courses' })
  @ApiResponse({
    status: 200,
    description: 'Returns all user courses',
    type: UserCourse,
  })
  @Get()
  findAll(@Query() query: UserCoursePaginationParams) {
    return this.userCourseAdminService.findAll(query);
  }

  @ApiTags('Admin User Courses')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change user course status' })
  @ApiResponse({
    status: 200,
    description: 'User course status changed successfully',
  })
  @Patch('change-status/:id')
  changeStatus(
    @Param('id') id: number,
    @Body() body: { status: 'pending' | 'completed' | 'failed' },
  ) {
    return this.userCourseAdminService.changeStatus(id, body.status);
  }
}
