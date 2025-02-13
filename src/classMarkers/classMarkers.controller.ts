import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ClassMarkersService } from './classMarkers.service';
import JwtAuthenticationGuard from 'src/authentication/jwt-authentication.guard';

@Controller('class-markers')
export class ClassMarkersController {
  constructor(private readonly classMarkersService: ClassMarkersService) {}

  @Get('/list')
  async getClassMarkers() {
    return this.classMarkersService.getClassMarkers();
  }

  @UseGuards(JwtAuthenticationGuard)
  @Get(':id')
  async getClassMarkerById(@Param('id') id: string) {
    return this.classMarkersService.getClassMarkerById(+id);
  }
}
