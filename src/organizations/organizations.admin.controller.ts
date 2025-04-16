import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UploadedFile,
  BadRequestException,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { PaginationParams } from 'src/common/pagination.type';
import LocalFilesInterceptor from 'src/interceptors/localFiles.interceptor';
import JwtAdminAuthenticationGuard from 'src/authentication/guard/jwt-admin-authentication.guard';

@Controller('admin/organizations')
@UseGuards(JwtAdminAuthenticationGuard)
export class OrganizationsAdminController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  create(@Body() createOrganizationDto: CreateOrganizationDto) {
    return this.organizationsService.create(createOrganizationDto);
  }

  @Post('upload-thumbnail/:id')
  @UseInterceptors(
    LocalFilesInterceptor({
      fieldName: 'file',
      path: '/organizations',
      fileFilter: (request, file, callback) => {
        if (!file.mimetype.includes('image')) {
          return callback(
            new BadRequestException('Provide a valid image'),
            false,
          );
        }
        callback(null, true);
      },
      limits: {
        fileSize: Math.pow(1024, 5),
      },
    }),
  )
  uploadThumbnail(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.organizationsService.uploadThumbnail(+id, file.filename);
  }

  @Get()
  findAll(@Query() query: PaginationParams) {
    return this.organizationsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.organizationsService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.update(+id, updateOrganizationDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.organizationsService.remove(+id);
  }
}
