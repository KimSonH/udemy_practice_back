import {
  BadRequestException,
  CanActivate,
  Controller,
  ExecutionContext,
  Injectable,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { extname } from 'path';
import JwtAdminAuthenticationGuard from 'src/authentication/guard/jwt-admin-authentication.guard';
import JwtAuthenticationGuard from 'src/authentication/guard/jwt-authentication.guard';
import LocalFilesInterceptor from 'src/interceptors/localFiles.interceptor';
import { GumroadService } from './gumroad.service';

// A guard, not a check in the handler: guards run before the interceptor, so
// a request without a valid ticket is refused before anything is written.
@Injectable()
class UploadTicketGuard implements CanActivate {
  constructor(private readonly gumroadService: GumroadService) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    this.gumroadService.verifyTicket(request.query.ticket);
    return true;
  }
}

@ApiTags('Gumroad')
@Controller()
export class GumroadController {
  constructor(private readonly gumroadService: GumroadService) {}

  @ApiBearerAuth()
  @Post('admin/gumroad/upload-ticket')
  @UseGuards(JwtAdminAuthenticationGuard)
  uploadTicket() {
    return this.gumroadService.issueTicket();
  }

  // Learners creating their own video courses upload the same way.
  @ApiBearerAuth()
  @Post('me/gumroad/upload-ticket')
  @UseGuards(JwtAuthenticationGuard)
  learnerUploadTicket() {
    return this.gumroadService.issueTicket();
  }

  // Called by the browser directly (not through the admin's or the front's
  // Next server, whose host caps request bodies far below a video's size).
  @Post('gumroad/upload')
  @UseGuards(UploadTicketGuard)
  @UseInterceptors(
    LocalFilesInterceptor({
      fieldName: 'file',
      path: '/gumroad',
      fileFilter: (request, file, callback) => {
        if (!file.mimetype.startsWith('video/')) {
          return callback(new BadRequestException('Provide a video'), false);
        }
        callback(null, true);
      },
      // Gumroad's own cap.
      limits: { fileSize: 20 * Math.pow(1024, 3) },
      filename: (request, file, callback) =>
        callback(null, `${Date.now()}${extname(file.originalname)}`),
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Provide a video');
    return this.gumroadService.upload(file);
  }
}
