import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ClassMarkersService } from './classMarkers.service';
import JwtAuthenticationGuard from 'src/authentication/guard/jwt-authentication.guard';
import { PaginationParams } from 'src/common/pagination.type';
import { Query } from '@nestjs/common';

@Controller('class-markers')
export class ClassMarkersController {
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

  @UseGuards(JwtAuthenticationGuard)
  @Get(':id')
  async getClassMarkerById(@Param('id') id: string) {
    return this.classMarkersService.getClassMarkerById(+id);
  }
}
