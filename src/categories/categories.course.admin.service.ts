import {
  Injectable,
  BadRequestException,
  NotFoundException,
  HttpException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { CategoryCourse } from './entities/categories.course.entity';
import { CreateCategoryCourseDto } from './dto/create-category.course.admin.dto';
import { UpdateCategoryCourseDto } from './dto/update-category.course.admin.dto';

@Injectable()
export class CategoriesCourseAdminService {
  private readonly logger = new Logger(CategoriesCourseAdminService.name);

  constructor(
    @InjectRepository(CategoryCourse)
    private categoryCourseRepository: Repository<CategoryCourse>,
  ) {}

  create(createCategoryCourseDto: CreateCategoryCourseDto) {
    return this.categoryCourseRepository.create(createCategoryCourseDto);
  }

  async findAll(page: number, limit: number) {
    try {
      const offset = (page - 1) * limit;
      const [items, total] = await this.categoryCourseRepository.findAndCount({
        where: {
          deletedAt: null,
        },
        order: {
          id: 'DESC',
        },
        skip: offset,
        take: limit,
      });

      return {
        items,
        total,
        page,
        limit,
      };
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException('Error getting categories');
    }
  }

  async findAllWithSearch(search: string, page: number, limit: number) {
    try {
      const offset = (page - 1) * limit;
      const [items, total] = await this.categoryCourseRepository.findAndCount({
        where: {
          name: Like(`%${search}%`),
        },
        order: {
          id: 'DESC',
        },
        skip: offset,
        take: limit,
      });

      return {
        items,
        total,
        page,
        limit,
      };
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException('Error getting categories');
    }
  }

  async findOne(id: number) {
    try {
      const category = await this.categoryCourseRepository.findOne({
        where: { id, deletedAt: null },
      });

      if (!category) {
        throw new NotFoundException('Category not found');
      }

      return category;
    } catch (error) {
      // Let an intentional HTTP error through: without this the 404 thrown
      // just above is caught here and re-thrown as a generic 400, so callers
      // cannot tell "not found" from "bad request".
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(error);
      throw new BadRequestException('Error getting category');
    }
  }

  async update(id: number, updateCategoryCourseDto: UpdateCategoryCourseDto) {
    try {
      await this.findOne(id);
      return this.categoryCourseRepository.update(id, updateCategoryCourseDto);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(error);
      throw new BadRequestException('Error updating category');
    }
  }

  async remove(id: number) {
    try {
      await this.findOne(id);
      return this.categoryCourseRepository.softDelete(id);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(error);
      throw new BadRequestException('Error deleting category');
    }
  }
}
