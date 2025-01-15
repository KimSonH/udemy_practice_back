import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassMarker } from './classMarkers.entity';
import { ClassMarkersService } from './classMarkers.service';
import { ClassMarkersController } from './classMarkers.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ClassMarker])],
  controllers: [ClassMarkersController],
  providers: [ClassMarkersService],
})
export class ClassMarkersModule {}
