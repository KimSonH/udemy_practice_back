import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassMarker } from './classMarkers.entity';
import { ClassMarkersService } from './classMarkers.service';
import { ClassMarkersController } from './classMarkers.controller';
import { ClassMarkersAdminController } from './classMarkers.admin.controller';
@Module({
  imports: [TypeOrmModule.forFeature([ClassMarker])],
  controllers: [ClassMarkersController, ClassMarkersAdminController],
  providers: [ClassMarkersService],
  exports: [ClassMarkersService],
})
export class ClassMarkersModule {}
