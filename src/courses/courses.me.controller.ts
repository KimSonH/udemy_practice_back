import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Req,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import JwtAuthenticationGuard from 'src/authentication/guard/jwt-authentication.guard';
import { RequestWithUser } from 'src/authentication/requestWithUser.interface';
import { CourseSetsService } from 'src/course-sets/course-sets.service';
import { CreateCourseSetForCourseDto } from 'src/course-sets/dto/create-course-set-for-course.dto';
import { UpdateCourseSetDto } from 'src/course-sets/dto/update-course-set.dto';
import LocalFilesInterceptor from 'src/interceptors/localFiles.interceptor';
import { GumroadService, PUBLIC_FILES_URL } from 'src/gumroad/gumroad.service';
import { CoursesService } from './courses.service';
import {
  CreateMyCourseDto,
  MyVideoCourseDto,
  UpdateMyCourseDto,
} from './dto/my-course.dto';
import { CreateCourseDto } from './dto/create-course.dto';
import { VideoCourseDto } from './dto/create-video-course.dto';

/**
 * Courses a learner creates and manages themselves, with their course sets,
 * CSV imports and thumbnails. Reuses the admin's service
 * methods; what differs is decided here: ownership is checked on every id
 * before anything else runs, and the fields a learner may not set are
 * overwritten rather than trusted (the global ValidationPipe does not strip
 * unknown properties).
 */
@ApiTags('My courses')
@ApiBearerAuth()
@Controller('me')
@UseGuards(JwtAuthenticationGuard)
export class CoursesMeController {
  constructor(
    private readonly coursesService: CoursesService,
    private readonly courseSetsService: CourseSetsService,
    private readonly gumroadService: GumroadService,
  ) {}

  /**
   * Any learner change to what buyers see sends the course back to the admin's
   * review queue, so content cannot be swapped after a review.
   */
  private async changed<T>(courseId: number, work: Promise<T>) {
    const result = await work;
    await this.coursesService.markUnreviewed(courseId);
    return result;
  }

  // ---- courses

  @Get('courses')
  list(@Req() req: RequestWithUser) {
    return this.coursesService.findAllByOwner(req.user.id);
  }

  @Get('courses/:id')
  async get(
    @Req() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.coursesService.assertOwnedBy(id, req.user.id);
    return this.coursesService.getCourseById(id);
  }

  @Post('courses')
  async create(@Req() req: RequestWithUser, @Body() dto: CreateMyCourseDto) {
    return this.coursesService.createCourse(practice(dto), req.user.id);
  }

  @Post('courses/video')
  async createVideo(
    @Req() req: RequestWithUser,
    @Body() dto: MyVideoCourseDto,
  ) {
    const data = video(dto);
    await this.gumroadService.assertUploadsOwnedBy(
      req.user.id,
      lessonUrls(data),
    );
    return this.coursesService.createVideoCourse(data, req.user.id);
  }

  @Put('courses/video/:id')
  async updateVideo(
    @Req() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MyVideoCourseDto,
  ) {
    await this.coursesService.assertOwnedBy(id, req.user.id);
    const data = video(dto);
    // Videos the course already has stay allowed, so courses saved before
    // uploads were recorded can still be edited.
    const current = await this.coursesService.getCourseById(id);
    await this.gumroadService.assertUploadsOwnedBy(
      req.user.id,
      lessonUrls(data),
      lessonUrls(current),
    );
    return this.changed(id, this.coursesService.updateVideoCourse(id, data));
  }

  @Put('courses/:id')
  async update(
    @Req() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMyCourseDto,
  ) {
    await this.coursesService.assertOwnedBy(id, req.user.id);
    return this.changed(
      id,
      this.coursesService.updateCourse(id, practice(dto)),
    );
  }

  @Delete('courses/:id')
  async remove(
    @Req() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.coursesService.assertOwnedBy(id, req.user.id);
    return this.coursesService.deleteCourse(id);
  }

  // Not tied to a course: the edit form uploads first, then saves the name.
  @Post('courses/upload-thumbnail')
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
      // Tighter than the admin's: any signed-in learner can reach this.
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadThumbnail(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Provide a valid image');
    return {
      filename: file.filename,
      path: `/uploads/courses/${file.filename}`,
    };
  }

  // ---- course sets

  @Post('courses/:courseId/course-sets')
  async createSet(
    @Req() req: RequestWithUser,
    @Param('courseId', ParseIntPipe) courseId: number,
    @Body() dto: CreateCourseSetForCourseDto,
  ) {
    await this.coursesService.assertOwnedBy(courseId, req.user.id);
    return this.changed(
      courseId,
      this.courseSetsService.createForCourse(courseId, dto),
    );
  }

  @Patch('course-sets/:id')
  async updateSet(
    @Req() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCourseSetDto,
  ) {
    const courseId = await this.coursesService.assertSetOwnedBy(
      id,
      req.user.id,
    );
    return this.changed(courseId, this.courseSetsService.update(id, dto));
  }

  @Delete('course-sets/:id')
  async removeSet(
    @Req() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const courseId = await this.coursesService.assertSetOwnedBy(
      id,
      req.user.id,
    );
    return this.changed(courseId, this.courseSetsService.remove(id));
  }

  @Post('course-sets/:id/csv')
  @UseInterceptors(
    FilesInterceptor('file', 1, {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (request, file, callback) => {
        if (!file.originalname.toLowerCase().endsWith('.csv')) {
          return callback(
            new BadRequestException('Only .csv files are accepted'),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async importSetCsv(
    @Req() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {
    const courseId = await this.coursesService.assertSetOwnedBy(
      id,
      req.user.id,
    );
    const file = files?.[0];
    if (!file) throw new BadRequestException('A CSV file is required');
    return this.changed(
      courseId,
      this.courseSetsService.importSingleCsv(id, {
        originalname: file.originalname,
        buffer: file.buffer,
      }),
    );
  }
}

/**
 * Learners upload, they do not link: a thumbnail must be the bare file name
 * our upload endpoint returned, and a lesson video must come from the storage
 * our Gumroad uploader writes to. Otherwise a course could point at any image
 * or video on the internet. (The admin endpoints accept any URL.)
 */
const UPLOADED_FILE_NAME = /^[A-Za-z0-9._-]+$/;

function assertUploadedThumbnail(value?: string) {
  if (value && !UPLOADED_FILE_NAME.test(value)) {
    throw new BadRequestException([
      {
        field: 'thumbnailImageUrl',
        message: 'Upload the thumbnail instead of linking to it',
      },
    ]);
  }
}

function assertUploadedVideos(dto: MyVideoCourseDto) {
  for (const session of dto.courseSessions ?? []) {
    for (const content of session.courseContents ?? []) {
      if (!content.uploadUrl?.startsWith(`${PUBLIC_FILES_URL}/`)) {
        throw new BadRequestException([
          {
            field: 'courseSessions',
            message: `Upload the video for "${content.name}" instead of linking to it`,
          },
        ]);
      }
    }
  }
}

function practice(dto: CreateMyCourseDto | UpdateMyCourseDto) {
  assertUploadedThumbnail(dto.thumbnailImageUrl);
  return {
    ...dto,
    creationMode: 'manual',
    organizationId: undefined,
    udemyQuestionBanks: undefined,
  } as CreateCourseDto;
}

function video(dto: MyVideoCourseDto) {
  assertUploadedThumbnail(dto.thumbnailImageUrl);
  assertUploadedVideos(dto);
  return { ...dto, organizationId: undefined, id: undefined } as VideoCourseDto;
}

function lessonUrls(course: {
  courseSessions?: { courseContents?: { uploadUrl?: string }[] }[];
}) {
  return (course.courseSessions ?? []).flatMap((session) =>
    (session.courseContents ?? [])
      .map((content) => content.uploadUrl)
      .filter((url): url is string => !!url),
  );
}
