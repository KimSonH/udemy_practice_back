import { Controller, Get, Query } from '@nestjs/common';
import { ClassMarkersService } from './classMarkers.service';

@Controller('class-markers')
export class ClassMarkersController {
  constructor(private readonly classMarkersService: ClassMarkersService) {}

  @Get('/list')
  async getClassMarkers(@Query('text') text: string) {
    return this.classMarkersService.search(text);
  }
}
