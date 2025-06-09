import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { UserCoursesService } from './user-courses.service';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { UserCourse } from './entities/user-course.entity';
import { UserCoursePaginationParams } from './types/pagination.type';

@Injectable()
export class UserCourseAdminService {
  private logger = new Logger(UserCourseAdminService.name);
  private relations = [
    'user',
    'course',
    // 'course.courseSets',
    // 'course.courseSets.udemyQuestionBanks',
    // 'course.organization',
  ];

  constructor(
    @InjectRepository(UserCourse)
    private readonly userCourseRepository: Repository<UserCourse>,
  ) {}

  async findAll(query: UserCoursePaginationParams) {
    const { page, limit, search, status, orderBy } = query;
    const offset = (page - 1) * limit;
    const order = {
      DESC: 'DESC',
      ASC: 'ASC',
    };

    try {
      const [items, total] = await this.userCourseRepository.findAndCount({
        relations: this.relations,
        where: {
          course: {
            name: search ? ILike(`%${search}%`) : undefined,
          },
          user: {
            firstName: search ? ILike(`%${search}%`) : undefined,
            lastName: search ? ILike(`%${search}%`) : undefined,
          },
          status: status ? status : undefined,
        },
        order: {
          createdAt: order[orderBy] || 'DESC',
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
      this.logger.error(`Error getting user courses: ${error.message}`);
      throw new BadRequestException('Error getting user courses');
    }
  }

  async findOne(id: number) {
    const userCourse = await this.userCourseRepository.findOne({
      where: { id },
      relations: this.relations,
    });
    if (!userCourse) {
      throw new NotFoundException('User course not found');
    }
    return userCourse;
  }

  async changeStatus(id: number, status: 'pending' | 'completed' | 'failed') {
    const userCourse = await this.findOne(id);

    try {
      await this.userCourseRepository.update(userCourse.id, { status });
      return {
        message: 'User course status changed successfully',
      };
    } catch (error) {
      this.logger.error(`Error changing user course status: ${error.message}`);
      throw new BadRequestException('Error changing user course status');
    }
  }
}
