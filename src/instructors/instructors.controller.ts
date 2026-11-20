import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import JwtAuthenticationGuard from 'src/authentication/guard/jwt-authentication.guard';
import { RequestWithUser } from 'src/authentication/requestWithUser.interface';
import LocalFilesInterceptor from 'src/interceptors/localFiles.interceptor';
import { UpdateInstructorProfileDto } from './dto/update-instructor-profile.dto';
import { InstructorsService } from './instructors.service';

const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

@ApiTags('Instructor')
@ApiBearerAuth()
@Controller('me/instructor')
@UseGuards(JwtAuthenticationGuard)
export class InstructorMeController {
  constructor(private readonly instructorsService: InstructorsService) {}

  @ApiOperation({
    summary:
      'KPIs for the last 30 days, 12 months of earnings and per-course figures for the signed-in instructor',
  })
  @Get('overview')
  overview(@Req() req: RequestWithUser) {
    return this.instructorsService.overview(req.user.id);
  }

  @ApiOperation({ summary: "The signed-in user's public profile fields" })
  @Get('profile')
  myProfile(@Req() req: RequestWithUser) {
    return this.instructorsService.myProfile(req.user.id);
  }

  @ApiOperation({
    summary:
      'Update headline, bio and links; links must be http(s) URLs on the named site',
  })
  @Put('profile')
  updateProfile(
    @Req() req: RequestWithUser,
    @Body() dto: UpdateInstructorProfileDto,
  ) {
    return this.instructorsService.updateProfile(req.user.id, dto);
  }

  @ApiOperation({ summary: 'Upload a profile photo (JPEG, PNG or WebP, 2 MB)' })
  @Post('avatar')
  @UseInterceptors(
    LocalFilesInterceptor({
      fieldName: 'file',
      path: '/avatars',
      // No SVG: it is served from our origin and can carry script.
      fileFilter: (request, file, callback) =>
        AVATAR_TYPES.includes(file.mimetype)
          ? callback(null, true)
          : callback(
              new BadRequestException('Use a JPEG, PNG or WebP image'),
              false,
            ),
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  uploadAvatar(
    @Req() req: RequestWithUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Use a JPEG, PNG or WebP image');
    return this.instructorsService.setAvatar(req.user.id, file.filename);
  }

  @ApiOperation({
    summary:
      'Paid sales of the signed-in instructor between two dates (YYYY-MM-DD, inclusive; default this month)',
  })
  @Get('sales')
  sales(
    @Req() req: RequestWithUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.instructorsService.sales(req.user.id, from, to);
  }
}

@ApiTags('Instructor')
@Controller('instructors')
export class InstructorsController {
  constructor(private readonly instructorsService: InstructorsService) {}

  @ApiOperation({ summary: "An instructor's public page and courses on sale" })
  @Get(':id')
  profile(@Param('id', ParseIntPipe) id: number) {
    return this.instructorsService.profile(id);
  }
}
