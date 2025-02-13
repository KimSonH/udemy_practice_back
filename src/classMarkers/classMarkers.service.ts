import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ClassMarker, QuestionType } from './classMarkers.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ClassMarkersService {
  constructor(
    @InjectRepository(ClassMarker)
    private readonly classMarkersRepository: Repository<ClassMarker>,
  ) {}

  async getClassMarkers() {
    const page = 1,
      limit = 30,
      questionType = QuestionType.MULTIPLE_CHOICE;

    const [items, total] = await this.classMarkersRepository.findAndCount({
      where: { deletedAt: null, questionType },
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

  async getClassMarkerById(id: number) {
    return this.classMarkersRepository.findOneBy({ id });
  }
}
