import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import JwtAuthenticationGuard from 'src/authentication/guard/jwt-authentication.guard';
import { RequestWithUser } from 'src/authentication/requestWithUser.interface';
import { CoursesService } from './courses.service';
import {
  CreateMyCourseDto,
  MyVideoCourseDto,
  UpdateMyCourseDto,
} from './dto/my-course.dto';
import { CreateCourseDto } from './dto/create-course.dto';
import { VideoCourseDto } from './dto/create-video-course.dto';

/**
 * Courses a learner creates and manages themselves. Reuses the admin's service
 * methods; what differs is decided here: ownership is checked on every id, and
 * the fields a learner may not set are overwritten rather than trusted (the
 * global ValidationPipe does not strip unknown properties).
 */
@ApiTags('My courses')
@ApiBearerAuth()
@Controller('me/courses')
@UseGuards(JwtAuthenticationGuard)
export class CoursesMeController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  list(@Req() req: RequestWithUser) {
    return this.coursesService.findAllByOwner(req.user.id);
  }

  @Get(':id')
  async get(
    @Req() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.coursesService.assertOwnedBy(id, req.user.id);
    return this.coursesService.getCourseById(id);
  }

  @Post()
  create(@Req() req: RequestWithUser, @Body() dto: CreateMyCourseDto) {
    return this.coursesService.createCourse(practice(dto), req.user.id);
  }

  @Post('video')
  createVideo(@Req() req: RequestWithUser, @Body() dto: MyVideoCourseDto) {
    return this.coursesService.createVideoCourse(video(dto), req.user.id);
  }

  @Put('video/:id')
  async updateVideo(
    @Req() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MyVideoCourseDto,
  ) {
    await this.coursesService.assertOwnedBy(id, req.user.id);
    const course = await this.coursesService.updateVideoCourse(id, video(dto));
    await this.coursesService.markUnreviewed(id);
    return course;
  }

  @Put(':id')
  async update(
    @Req() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMyCourseDto,
  ) {
    await this.coursesService.assertOwnedBy(id, req.user.id);
    const course = await this.coursesService.updateCourse(id, practice(dto));
    await this.coursesService.markUnreviewed(id);
    return course;
  }

  @Delete(':id')
  async remove(
    @Req() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.coursesService.assertOwnedBy(id, req.user.id);
    return this.coursesService.deleteCourse(id);
  }
}

function practice(dto: CreateMyCourseDto | UpdateMyCourseDto) {
  return {
    ...dto,
    creationMode: 'manual',
    organizationId: undefined,
    udemyQuestionBanks: undefined,
  } as CreateCourseDto;
}

function video(dto: MyVideoCourseDto) {
  return { ...dto, organizationId: undefined, id: undefined } as VideoCourseDto;
}
