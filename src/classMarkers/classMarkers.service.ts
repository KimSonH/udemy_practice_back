import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ClassMarker } from './classMarkers.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ClassMarkersService {
  constructor(
    @InjectRepository(ClassMarker)
    private readonly classMarkersRepository: Repository<ClassMarker>,
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
}
