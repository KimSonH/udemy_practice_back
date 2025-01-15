import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassMarker } from './classMarkers.entity';
import { ClassMarkersService } from './classMarkers.service';
import { ClassMarkersController } from './classMarkers.controller';
import { ClassMarkerSearchService } from './classMarkerSearch.service';
import { SearchModule } from 'src/search/search.module';

@Module({
  imports: [TypeOrmModule.forFeature([ClassMarker]), SearchModule],
  controllers: [ClassMarkersController],
  providers: [ClassMarkersService, ClassMarkerSearchService],
})
export class ClassMarkersModule {}
