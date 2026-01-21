import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { CreateUserCourseDto } from './dto/create-user-course.dto';
import { UpdateUserCourseDto } from './dto/update-user-course.dto';
import { UserCourse } from './entities/user-course.entity';
import { Brackets, ILike, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginationParams } from 'src/common/pagination.type';
import { CoursesService } from 'src/courses/courses.service';

@Injectable()
export class UserCoursesService {
  private logger = new Logger(UserCoursesService.name);
  private relations = [
    'user',
    'course',
    'course.courseSets',
    'course.courseSets.udemyQuestionBanks',
    'course.organization',
  ];

  constructor(
    @InjectRepository(UserCourse)
    private readonly userCourseRepository: Repository<UserCourse>,
    private readonly coursesService: CoursesService,
  ) { }

  async create(createUserCourseDto: CreateUserCourseDto) {
    try {
      const userCourse = this.userCourseRepository.create(createUserCourseDto);
      await this.userCourseRepository.save(userCourse);
      return userCourse;
    } catch {
      throw new InternalServerErrorException('User course creation failed');
    }
  }

  async getUserCoursesByUserId(
    userId: number,
    query: PaginationParams,
    status?: 'completed' | 'failed' | 'pending',
  ) {
    const { page, limit, search, orderBy } = query;
    const offset = (page - 1) * limit;
    const order = {
      DESC: 'DESC',
      ASC: 'ASC',
    };
    try {
      const [userCourses, total] = await this.userCourseRepository.findAndCount(
        {
          where: { user: { id: userId }, status: status ? status : undefined },
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

  async findAll(
    query: PaginationParams,
    status?: 'completed' | 'failed' | 'pending',
    userId?: number,
  ) {
    const { page, limit, search, orderBy, organizationId, organizationSlug } =
      query;
    const offset = (page - 1) * limit;
    const order = {
      DESC: 'DESC',
      ASC: 'ASC',
    };
    const orderByOrder = order[orderBy] || 'DESC';
    try {
      // Use subquery to get the latest userCourse id for each courseId
      const subQuery = this.userCourseRepository
        .createQueryBuilder('uc_sub')
        .select('MAX(uc_sub.id)', 'maxId')
        .where('uc_sub.userId = :userId', { userId })
        .groupBy('uc_sub.courseId');

      if (status) {
        subQuery.andWhere('uc_sub.status = :status', { status });
      }

      // Main query to get unique userCourses using DISTINCT ON
      const queryBuilder = this.userCourseRepository
        .createQueryBuilder('userCourse')
        .leftJoinAndSelect('userCourse.user', 'user')
        .leftJoinAndSelect('userCourse.course', 'course')
        .leftJoinAndSelect('course.courseSets', 'courseSets')
        .leftJoinAndSelect('courseSets.udemyQuestionBanks', 'udemyQuestionBanks')
        .leftJoinAndSelect('course.organization', 'organization')
        .where('userCourse.userId = :userId', { userId })
        .andWhere('course.status = :courseStatus', { courseStatus: 'active' })
        .andWhere(`userCourse.id IN (${subQuery.getQuery()})`);

      // Add status filter
      if (status) {
        queryBuilder.andWhere('userCourse.status = :status', { status });
      }

      // Add search filter
      if (search) {
        queryBuilder.andWhere('course.name ILIKE :search', {
          search: `%${search}%`,
        });
      }

      // Add organization filters
      if (organizationId) {
        queryBuilder.andWhere('organization.id = :organizationId', {
          organizationId: +organizationId,
        });
      }

      if (organizationSlug) {
        queryBuilder.andWhere('organization.slug = :organizationSlug', {
          organizationSlug,
        });
      }

      // Set parameters from subquery
      queryBuilder.setParameters(subQuery.getParameters());

      // Get total count before pagination
      const total = await queryBuilder.getCount();

      // Apply ordering and pagination
      queryBuilder.orderBy('userCourse.createdAt', orderByOrder);

      if (page !== 9999) {
        queryBuilder.skip(offset).take(limit);
      }

      const items = await queryBuilder.getMany();

      return {
        items: items.map((item) => item.course),
        total,
        page,
        limit,
      };
    } catch (error) {
      this.logger.error(`Error getting user courses: ${error.message}`);
      throw new BadRequestException('Error getting user courses');
    }
  }

  async findOne(id: number, status?: 'completed' | 'failed' | 'pending') {
    try {
      const userCourse = await this.userCourseRepository.findOne({
        where: { id, status: status ? status : undefined },
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

  async findOneByCourseId(courseId: number, userId: number, status?: 'completed' | 'failed' | 'pending') {
    const userCourse = await this.userCourseRepository.findOne({
      where: { courseId, userId, status },
      relations: this.relations,
    })
    if (!userCourse) {
      throw new BadRequestException('User course not found');
    }

    return userCourse.course;
  }

  async findOneByOrderInvoiceNumber(orderInvoiceNumber: string) {
    const userCourse = await this.userCourseRepository.findOne({
      where: { orderId: orderInvoiceNumber },
    });
    if (!userCourse) {
      throw new BadRequestException('User course not found');
    }
    return userCourse;
  }

  async findOneByOrderId(orderId: string) {
    const userCourse = await this.userCourseRepository.findOne({
      where: { orderId },
    });
    if (!userCourse) {
      throw new BadRequestException('User course not found');
    }
    return userCourse;
  }

  async findOneWithUserId(
    userId: number,
    id: number,
    status?: 'completed' | 'failed' | 'pending',
  ) {
    const userCourse = await this.userCourseRepository.findOne({
      where: { user: { id: userId }, id, status: status ? status : undefined },
      relations: this.relations,
    });
    if (userCourse.user.id !== userId) {
      throw new BadRequestException('User course not found');
    }
    return userCourse;
  }

  async getUserCoursesByUserCourseId(
    userId: number,
    userCourseId: number,
    status?: 'completed' | 'failed' | 'pending',
  ) {
    const userCourse = await this.findOneWithUserId(
      userId,
      userCourseId,
      status,
    );

    const course = await this.coursesService.findOneWithStatus(
      userCourse.course.id,
    );

    return course;
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
