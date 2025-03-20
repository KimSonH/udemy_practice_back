import { Injectable } from '@nestjs/common';
import { CreateCourseSetDto } from './dto/create-course-set.dto';
import { UpdateCourseSetDto } from './dto/update-course-set.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseSet } from './entities/course-set.entity';
@Injectable()
export class CourseSetsService {
  constructor(
    @InjectRepository(CourseSet)
    private readonly courseSetsRepository: Repository<CourseSet>,
  ) {}
  create(createCourseSetDto: CreateCourseSetDto) {
    return this.courseSetsRepository.save(createCourseSetDto);
  }

  async findAll() {
    const [courseSets, total] = await this.courseSetsRepository.findAndCount({
      relations: ['udemyQuestionBanks'],
      where: { deletedAt: null },
    });
    return { courseSets, total };
  }

  findOne(id: number) {
    return this.courseSetsRepository.findOne({
      where: { id, deletedAt: null },
      relations: ['udemyQuestionBanks'],
    });
  }

  update(id: number, updateCourseSetDto: UpdateCourseSetDto) {
    return this.courseSetsRepository.update(id, updateCourseSetDto);
  }

  remove(id: number) {
    return this.courseSetsRepository.delete(id);
  }
}
