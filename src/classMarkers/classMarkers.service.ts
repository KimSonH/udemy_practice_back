import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ClassMarker } from './classMarkers.entity';
import { Like, Repository } from 'typeorm';

@Injectable()
export class ClassMarkersService {
  constructor(
    @InjectRepository(ClassMarker)
    private readonly classMarkersRepository: Repository<ClassMarker>,
  ) {}

  async getClassMarkers(page: number, limit: number) {
    const offset = (page - 1) * limit;

    const [items, total] = await this.classMarkersRepository.findAndCount({
      order: {
        createdAt: 'DESC',
      },
      take: limit,
      skip: offset,
    });

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async getClassMarkerById(id: number) {
    return this.classMarkersRepository.findOneBy({ id });
  }

  async searchClassMarkers(search: string, page: number, limit: number) {
    const offset = (page - 1) * limit;

    const [items, total] = await this.classMarkersRepository.findAndCount({
      where: { question: Like(`%${search}%`) },
      order: {
        createdAt: 'DESC',
      },
      take: limit,
      skip: offset,
    });

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async groupClassMarkersByCategoryName() {
    try {
      const groupedMarkers = await this.classMarkersRepository
        .createQueryBuilder('marker')
        .select('marker.categoryName', 'categoryName')
        .addSelect('COUNT(*)', 'count')
        .groupBy('marker.categoryName')
        .getRawMany();

      return groupedMarkers;
    } catch (error) {
      throw new BadRequestException(
        'Error grouping class markers by category name',
      );
    }
  }

  async findClassMarkersByCategoryName(categoryName: string, take: number) {
    const [classMarkers, total] =
      await this.classMarkersRepository.findAndCount({
        where: { categoryName },
        take,
      });

    if (total === 0) {
      throw new BadRequestException('Class markers not found');
    }

    if (take > total) {
      throw new BadRequestException(
        'Number of questions is greater than total',
      );
    }

    return {
      classMarkers,
      total,
    };
  }

  async findClassMarkersById(id: number) {
    const classMarkers = await this.classMarkersRepository.findOneBy({ id });

    if (!classMarkers) {
      throw new BadRequestException('Class marker not found');
    }

    return classMarkers;
  }
}
