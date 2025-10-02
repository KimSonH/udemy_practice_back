import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { CategoryCourse } from './entities/categories.course.entity';
import { CreateCategoryCourseDto } from './dto/create-category.course.admin.dto';
import { UpdateCategoryCourseDto } from './dto/update-category.course.admin.dto';

@Injectable()
export class CategoriesCourseAdminService {
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
      throw new BadRequestException('Error getting category');
    }
  }

  async update(id: number, updateCategoryCourseDto: UpdateCategoryCourseDto) {
    try {
      await this.findOne(id);
      return this.categoryCourseRepository.update(id, updateCategoryCourseDto);
    } catch (error) {
      throw new BadRequestException('Error updating category');
    }
  }

  async remove(id: number) {
    try {
      await this.findOne(id);
      return this.categoryCourseRepository.softDelete(id);
    } catch (error) {
      throw new BadRequestException('Error deleting category');
    }
  }
}
