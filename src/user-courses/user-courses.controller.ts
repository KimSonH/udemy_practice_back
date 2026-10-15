import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
  Put,
} from '@nestjs/common';
import { UserCoursesService } from './user-courses.service';
import { CreateUserCourseDto } from './dto/create-user-course.dto';
import { SaveLessonProgressDto } from './dto/save-lesson-progress.dto';
import { UpdateUserCourseDto } from './dto/update-user-course.dto';
import { PaginationParams } from 'src/common/pagination.type';
import JwtAuthenticationGuard from 'src/authentication/guard/jwt-authentication.guard';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBody,
  getSchemaPath,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { UserCourse } from './entities/user-course.entity';
import { RequestWithUser } from 'src/authentication/requestWithUser.interface';
import { Course } from 'src/courses/entities/courses.entity';

@ApiTags('User Courses')
@Controller('user-courses')
@UseGuards(JwtAuthenticationGuard)
export class UserCoursesController {
  constructor(private readonly userCoursesService: UserCoursesService) {}

  @ApiOperation({ summary: 'Create a new user course' })
  @ApiResponse({
    status: 201,
    description: 'The user course has been successfully created.',
    type: UserCourse,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiBody({ type: CreateUserCourseDto })
  @Post()
  create(@Body() createUserCourseDto: CreateUserCourseDto) {
    return this.userCoursesService.create(createUserCourseDto);
  }

  @ApiOperation({ summary: 'Get user courses by user ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns all user courses',
    schema: {
      type: 'object',
      properties: {
        items: { type: 'array', items: { $ref: getSchemaPath(UserCourse) } },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User course not found' })
  @ApiQuery({ name: 'page', required: false, type: 'number' })
  @ApiQuery({ name: 'limit', required: false, type: 'number' })
  @Get('by-user-id')
  getUserCoursesByUserId(
    @Req() req: RequestWithUser,
    @Query() query: PaginationParams,
  ) {
    return this.userCoursesService.getUserCoursesByUserId(
      req.user.id,
      query,
      'completed',
    );
  }

  @ApiOperation({ summary: 'Get user course by ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the user course',
    type: Course,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User course not found' })
  @ApiParam({ name: 'userCourseId', type: 'number' })
  @Get('by-user-course-id/:userCourseId')
  getUserCoursesByCourseId(
    @Req() req: RequestWithUser,
    @Param('userCourseId') userCourseId: string,
  ) {
    return this.userCoursesService.getUserCoursesByUserCourseId(
      req.user.id,
      +userCourseId,
      'completed',
    );
  }

  @ApiOperation({ summary: 'Get all user courses' })
  @ApiResponse({
    status: 200,
    description: 'Returns all user courses',
    schema: {
      type: 'object',
      properties: {
        items: { type: 'array', items: { $ref: getSchemaPath(UserCourse) } },
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
  @UseGuards(JwtAuthenticationGuard)
  findAll(@Req() req: RequestWithUser, @Query() query: PaginationParams) {
    return this.userCoursesService.findAll(query, 'completed', req.user.id);
  }

  @ApiOperation({ summary: "The caller's progress in a video course" })
  @ApiParam({ name: 'courseId', type: 'number' })
  @Get(':courseId/progress')
  @UseGuards(JwtAuthenticationGuard)
  getProgress(
    @Req() req: RequestWithUser,
    @Param('courseId', ParseIntPipe) courseId: number,
  ) {
    return this.userCoursesService.getProgress(req.user.id, courseId);
  }

  @ApiOperation({ summary: 'Record that a lesson was opened or finished' })
  @ApiParam({ name: 'courseId', type: 'number' })
  @Put(':courseId/progress')
  @UseGuards(JwtAuthenticationGuard)
  saveProgress(
    @Req() req: RequestWithUser,
    @Param('courseId', ParseIntPipe) courseId: number,
    @Body() body: SaveLessonProgressDto,
  ) {
    return this.userCoursesService.saveProgress(
      req.user.id,
      courseId,
      body.url,
      body.completed,
    );
  }

  @ApiOperation({ summary: 'Enroll the caller in a free course' })
  @ApiParam({ name: 'courseId', type: 'number' })
  @Post(':courseId/enroll')
  @UseGuards(JwtAuthenticationGuard)
  enroll(
    @Req() req: RequestWithUser,
    @Param('courseId', ParseIntPipe) courseId: number,
  ) {
    return this.userCoursesService.enrollFree(req.user.id, courseId);
  }

  @ApiOperation({ summary: 'Whether the caller has bought a course' })
  @ApiParam({ name: 'courseId', type: 'number' })
  @Get(':courseId/owned')
  @UseGuards(JwtAuthenticationGuard)
  async owned(
    @Req() req: RequestWithUser,
    @Param('courseId', ParseIntPipe) courseId: number,
  ) {
    return {
      owned: await this.userCoursesService.owns(req.user.id, courseId),
    };
  }

  @ApiOperation({ summary: 'Get user course by ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the user course',
    type: UserCourse,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User course not found' })
  @ApiParam({ name: 'id', type: 'number' })
  @Get(':id')
  @UseGuards(JwtAuthenticationGuard)
  findOne(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.userCoursesService.findOneByCourseId(
      +id,
      req.user.id,
      'completed',
    );
  }

  @ApiOperation({ summary: 'Update user course' })
  @ApiResponse({
    status: 200,
    description: 'Returns the updated user course',
    type: UserCourse,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User course not found' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiBody({ type: UpdateUserCourseDto })
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateUserCourseDto: UpdateUserCourseDto,
  ) {
    return this.userCoursesService.update(+id, updateUserCourseDto);
  }

  @ApiOperation({ summary: 'Delete user course' })
  @ApiResponse({
    status: 200,
    description: 'Returns the deleted user course',
    type: UserCourse,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User course not found' })
  @ApiParam({ name: 'id', type: 'number' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userCoursesService.remove(+id);
  }
}
