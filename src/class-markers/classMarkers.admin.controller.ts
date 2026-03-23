import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ClassMarkersService } from './classMarkers.service';
import { PaginationParams } from 'src/common/pagination.type';
import { Query } from '@nestjs/common';
import JwtAdminAuthenticationGuard from 'src/authentication/guard/jwt-admin-authentication.guard';

@Controller('admin/class-markers')
@UseGuards(JwtAdminAuthenticationGuard)
export class ClassMarkersAdminController {
  constructor(private readonly classMarkersService: ClassMarkersService) {}

  @Get('/list')
  async getClassMarkers(
    @Query('search') search: string,
    @Query() { page, limit }: PaginationParams,
  ) {
    if (search) {
      return this.classMarkersService.searchClassMarkers(search, page, limit);
    }
    return this.classMarkersService.getClassMarkers(page, limit);
  }

  @Get('group-by-category-name')
  async groupClassMarkersByCategoryName() {
    return this.classMarkersService.groupClassMarkersByCategoryName();
  }

  @Get(':id')
  async getClassMarkerById(@Param('id') id: string) {
    return this.classMarkersService.getClassMarkerById(+id);
  }
}
