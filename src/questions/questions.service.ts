import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Question } from './entities/question.entity';
import { Like, Repository } from 'typeorm';

@Injectable()
export class QuestionsService {
  constructor(
    @InjectRepository(Question)
    private readonly questionsRepository: Repository<Question>,
  ) {}
  create(createQuestionDto: CreateQuestionDto) {
    return this.questionsRepository.create(createQuestionDto);
  }

  async findAll(page: number, limit: number) {
    try {
      const offset = (page - 1) * limit;
      const [items, total] = await this.questionsRepository.findAndCount({
        where: {
          deletedAt: null,
        },
        order: {
          id: 'DESC',
        },
        take: limit,
        skip: offset,
      });

      return {
        items,
        total,
      };
    } catch (error) {
      console.log('error', error);
      throw new BadRequestException('Error getting questions');
    }
  }

  async findAllWithSearch(search: string, page: number, limit: number) {
    try {
      const offset = (page - 1) * limit;
      const [items, total] = await this.questionsRepository.findAndCount({
        where: {
          question: Like(`%${search}%`),
          deletedAt: null,
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
      throw new BadRequestException('Error getting questions');
    }
  }

  async groupQuestionsByCategoryName() {
    try {
      const groupedQuestions = await this.questionsRepository
        .createQueryBuilder('question')
        .select('question.categoryName', 'categoryName')
        .addSelect('COUNT(*)', 'count')
        .groupBy('question.categoryName')
        .getRawMany();

      return groupedQuestions;
    } catch (error) {
      console.log('error', error);
      throw new BadRequestException('Error getting questions');
    }
  }

  async findQuestionsByCategoryName(categoryName: string, take: number) {
    const [questions, total] = await this.questionsRepository.findAndCount({
      where: { categoryName, deletedAt: null },
      take,
    });

    if (total === 0) {
      throw new BadRequestException('Questions not found');
    }

    if (take > total) {
      throw new BadRequestException(
        'Number of questions is greater than total',
      );
    }

    return {
      questions,
      total,
    };
  }

  async findOne(id: number) {
    try {
      const question = await this.questionsRepository.findOne({
        where: { id, deletedAt: null },
      });

      if (!question) {
        throw new NotFoundException('Question not found');
      }

      return question;
    } catch (error) {
      console.log('error', error);
      throw new BadRequestException('Error getting question');
    }
  }

  async update(id: number, updateQuestionDto: UpdateQuestionDto) {
    try {
      await this.findOne(id);
      return this.questionsRepository.update(id, updateQuestionDto);
    } catch (error) {
      console.log('error', error);
      throw new BadRequestException('Error updating question');
    }
  }

  async remove(id: number) {
    try {
      await this.findOne(id);
      return this.questionsRepository.softDelete(id);
    } catch (error) {
      console.log('error', error);
      throw new BadRequestException('Error deleting question');
    }
  }
}
