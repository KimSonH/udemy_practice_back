import { BadRequestException, Injectable } from '@nestjs/common';
import { Course } from './entities/courses.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { WithTransaction } from 'src/common/decorators/transaction.decorator';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { UdemyQuestionBanksService } from 'src/udemyQuestionBanks/udemy-question-banks.service';
@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private readonly coursesRepository: Repository<Course>,
    private readonly udemyQuestionBanksService: UdemyQuestionBanksService,
  ) {}

  async getCourses(page: number, limit: number) {
    try {
      const offset = (page - 1) * limit;

      const [items, total] = await this.coursesRepository.findAndCount({
        relations: ['udemyQuestionBanks'],
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
        relations: ['udemyQuestionBanks'],
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
        relations: ['udemyQuestionBanks'],
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
  async createCourse(course: CreateCourseDto) {
    const { udemyQuestionBanks } =
      await this.udemyQuestionBanksService.findQuestionsByCategoryName(
        course.udemyQuestionBanks.categoryName,
        course.udemyQuestionBanks.numberOfQuestions,
      );

    return this.coursesRepository.save({
      name: course.name,
      description: course.description,
      price: course.price,
      status: course.status,
      udemyQuestionBanks: udemyQuestionBanks,
    });
  }

  @WithTransaction()
  async updateCourse(id: number, updateCourse: UpdateCourseDto) {
    const course = await this.getCourseById(id);

    if (
      course.udemyQuestionBanks[0].categoryName !==
      updateCourse.udemyQuestionBanks.categoryName
    ) {
      const { udemyQuestionBanks } =
        await this.udemyQuestionBanksService.findQuestionsByCategoryName(
          updateCourse.udemyQuestionBanks.categoryName,
          updateCourse.udemyQuestionBanks.numberOfQuestions,
        );

      course.udemyQuestionBanks = udemyQuestionBanks;
    }

    return this.coursesRepository.update(id, course);
  }

  async deleteCourse(id: number) {
    return this.coursesRepository.delete(id);
  }
}
