import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ClassMarker } from './classMarkers.entity';
import { In, Repository } from 'typeorm';
import { ClassMarkerSearchService } from './classMarkerSearch.service';

@Injectable()
export class ClassMarkersService {
  constructor(
    @InjectRepository(ClassMarker)
    private readonly classMarkersRepository: Repository<ClassMarker>,
    private readonly classMarkersSearchService: ClassMarkerSearchService,
  ) {}

  async getClassMarkers() {
    const page = 1,
      limit = 10;

    const [items, total] = await this.classMarkersRepository.findAndCount({
      where: { deletedAt: null },
      take: limit,
      skip: (page - 1) * limit,
    });

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async search(text: string) {
    const page = 1,
      limit = 10;
    const result = await this.classMarkersSearchService.search(text);
    console.log(result);

    const ids = result.map((item) => item.id);
    if (!ids.length) {
      return {
        items: [],
        total: 0,
        page: 1,
        limit: 10,
      };
    }
    const [items, total] = await this.classMarkersRepository.findAndCount({
      where: { id: In(ids), deletedAt: null },
      take: limit,
      skip: (page - 1) * limit,
    });
    return {
      items,
      total,
      page,
      limit,
    };
  }
}
