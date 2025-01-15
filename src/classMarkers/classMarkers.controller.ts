import { Controller, Get } from '@nestjs/common';
import { ClassMarkersService } from './classMarkers.service';

@Controller('class-markers')
export class ClassMarkersController {
  constructor(private readonly classMarkersService: ClassMarkersService) {}

  @Get('/list')
  async getClassMarkers() {
    return this.classMarkersService.getClassMarkers();
  }
}
