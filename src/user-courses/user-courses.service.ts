import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { CreateUserCourseDto } from './dto/create-user-course.dto';
import { UpdateUserCourseDto } from './dto/update-user-course.dto';
import { UserCourse } from './entities/user-course.entity';
import { ILike, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginationParams } from 'src/common/pagination.type';

@Injectable()
export class UserCoursesService {
  private logger = new Logger(UserCoursesService.name);
  private relations = ['course', 'user'];

  constructor(
    @InjectRepository(UserCourse)
    private readonly userCourseRepository: Repository<UserCourse>,
  ) {}

  async create(createUserCourseDto: CreateUserCourseDto) {
    try {
      const userCourse = this.userCourseRepository.create(createUserCourseDto);
      await this.userCourseRepository.save(userCourse);
      return userCourse;
    } catch {
      throw new InternalServerErrorException('User course creation failed');
    }
  }

  async getUserCoursesByUserId(userId: number, query: PaginationParams) {
    const { page, limit, search, orderBy } = query;
    const offset = (page - 1) * limit;
    const order = {
      DESC: 'DESC',
      ASC: 'ASC',
    };
    try {
      const [userCourses, total] = await this.userCourseRepository.findAndCount(
        {
          where: { user: { id: userId } },
          relations: this.relations,
          order: {
            createdAt: order[orderBy] || 'DESC',
          },
          skip: page === 9999 ? undefined : offset,
          take: page === 9999 ? undefined : limit,
        },
      );
      return {
        items: userCourses,
        total,
        page,
        limit,
      };
    } catch (error) {
      this.logger.error(`Error getting user courses: ${error.message}`);
      throw new BadRequestException('Error getting user courses');
    }
  }

  async findAll(query: PaginationParams) {
    const { page, limit, search, orderBy } = query;
    const offset = (page - 1) * limit;
    const order = {
      DESC: 'DESC',
      ASC: 'ASC',
    };
    const orderByOrder = order[orderBy];
    try {
      const [items, total] = await this.userCourseRepository.findAndCount({
        relations: this.relations,
        where: {
          course: {
            name: search ? ILike(`%${search}%`) : undefined,
          },
        },
        order: {
          createdAt: orderByOrder || 'DESC',
        },
        skip: page === 9999 ? undefined : offset,
        take: page === 9999 ? undefined : limit,
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
    try {
      const userCourse = await this.userCourseRepository.findOne({
        where: { id },
        relations: this.relations,
      });

      if (!userCourse) {
        throw new BadRequestException('User course not found');
      }

      return userCourse;
    } catch (error) {
      this.logger.error(`Error getting user course: ${error.message}`);
      throw new BadRequestException('Error getting user course');
    }
  }

  async update(id: number, updateUserCourseDto: UpdateUserCourseDto) {
    const userCourse = await this.findOne(id);
    try {
      const updatedUserCourse = this.userCourseRepository.merge(
        userCourse,
        updateUserCourseDto,
      );
      await this.userCourseRepository.save(updatedUserCourse);
      return updatedUserCourse;
    } catch (error) {
      this.logger.error(`Error updating user course: ${error.message}`);
      throw new BadRequestException('Error updating user course');
    }
  }

  async remove(id: number) {
    await this.findOne(id);
    try {
      await this.userCourseRepository.softDelete(id);
      return { message: 'User course deleted successfully' };
    } catch (error) {
      this.logger.error(`Error deleting user course: ${error.message}`);
      throw new BadRequestException('Error deleting user course');
    }
  }
}
