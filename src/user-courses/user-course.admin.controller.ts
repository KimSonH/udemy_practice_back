import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserCoursePaginationParams } from './types/pagination.type';
import JwtAdminAuthenticationGuard from 'src/authentication/guard/jwt-admin-authentication.guard';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
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

  @ApiTags('Admin User Courses')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a user course' })
  @ApiResponse({
    status: 200,
    description: 'User course deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User course not found' })
  @ApiParam({ name: 'id', type: 'number' })
  @Delete(':id')
  remove(@Param('id') id: number) {
    return this.userCourseAdminService.remove(id);
  }
}
