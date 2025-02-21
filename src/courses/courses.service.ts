import { BadRequestException, Injectable } from '@nestjs/common';
import { Course } from './courses.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository, QueryRunner } from 'typeorm';
import { CreateCourseDto } from './types/createCourse.type';
import { ClassMarkersService } from 'src/classMarkers/classMarkers.service';
import { UpdateCourseDto } from './types/updateCourse.type';
import { WithTransaction } from 'src/common/decorators/transaction.decorator';

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private readonly coursesRepository: Repository<Course>,
    private readonly classMarkersService: ClassMarkersService,
  ) {}

  async getCourses(page: number, limit: number) {
    try {
      const offset = (page - 1) * limit;

      const [items, total] = await this.coursesRepository.findAndCount({
        relations: ['questions'],
        order: {
          id: 'DESC',
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
    } catch (error) {
      console.log('error', error);
      throw new BadRequestException('Error getting courses');
    }
  }

  async searchCourses(search: string, page: number, limit: number) {
    try {
      const offset = (page - 1) * limit;

      const [items, total] = await this.coursesRepository.findAndCount({
        where: { name: Like(`%${search}%`) },
        relations: ['questions'],
        order: {
          id: 'DESC',
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
    } catch (error) {
      console.log('error', error);
      throw new BadRequestException('Error searching courses');
    }
  }

  async getCourseById(id: number) {
    try {
      const course = await this.coursesRepository.findOne({
        where: { id },
        relations: ['questions'],
      });

      if (!course) {
        throw new BadRequestException('Course not found');
      }

      return course;
    } catch (error) {
      console.log('error', error);
      throw new BadRequestException('Error getting course by id');
    }
  }

  @WithTransaction()
  async createCourse(course: CreateCourseDto, queryRunner?: QueryRunner) {
    const { classMarkers } =
      await this.classMarkersService.findClassMarkersByCategoryName(
        course.questions.categoryName,
        course.questions.numberOfQuestions,
      );

    return queryRunner.manager.save(Course, {
      name: course.name,
      description: course.description,
      price: course.price,
      status: course.status,
      questions: classMarkers,
    });
  }

  @WithTransaction()
  async updateCourse(
    id: number,
    updateCourse: UpdateCourseDto,
    queryRunner?: QueryRunner,
  ) {
    const course = await this.getCourseById(id);

    if (
      course.questions[0].categoryName !== updateCourse.questions.categoryName
    ) {
      const { classMarkers } =
        await this.classMarkersService.findClassMarkersByCategoryName(
          updateCourse.questions.categoryName,
          updateCourse.questions.numberOfQuestions,
        );

      course.questions = classMarkers;
    }

    return queryRunner.manager.update(Course, id, course);
  }

  @WithTransaction()
  async deleteCourse(id: number, queryRunner?: QueryRunner) {
    return queryRunner.manager.delete(Course, id);
  }
}
