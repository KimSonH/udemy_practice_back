import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUdemyQuestionBankDto } from './dto/create-udemy-question-bank.dto';
import { UpdateUdemyQuestionBankDto } from './dto/update-udemy-question-bank.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { UdemyQuestionBank } from './entities/udemy-question-bank.entity';
import { Like, Repository } from 'typeorm';

@Injectable()
export class UdemyQuestionBanksService {
  constructor(
    @InjectRepository(UdemyQuestionBank)
    private readonly udemyQuestionBanksRepository: Repository<UdemyQuestionBank>,
  ) {}
  create(createUdemyQuestionBankDto: CreateUdemyQuestionBankDto) {
    return this.udemyQuestionBanksRepository.create(createUdemyQuestionBankDto);
  }

  async findAll(page: number, limit: number) {
    try {
      const offset = (page - 1) * limit;
      const [items, total] =
        await this.udemyQuestionBanksRepository.findAndCount({
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
      const [items, total] =
        await this.udemyQuestionBanksRepository.findAndCount({
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

  async findAllByCategoryName(categoryName: string) {
    try {
      const [questions, total] =
        await this.udemyQuestionBanksRepository.findAndCount({
          where: { categoryName: Like(`%${categoryName}%`), deletedAt: null },
        });
      return { questions, total };
    } catch (error) {
      console.log('error', error);
      throw new BadRequestException('Error getting questions');
    }
  }

  async groupQuestionsByCategoryName() {
    try {
      const groupedQuestions = await this.udemyQuestionBanksRepository
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
    const [udemyQuestionBanks, total] =
      await this.udemyQuestionBanksRepository.findAndCount({
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
      udemyQuestionBanks,
      total,
    };
  }

  async findOne(id: number) {
    try {
      const question = await this.udemyQuestionBanksRepository.findOne({
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

  async update(
    id: number,
    updateUdemyQuestionBankDto: UpdateUdemyQuestionBankDto,
  ) {
    try {
      await this.findOne(id);
      return this.udemyQuestionBanksRepository.update(
        id,
        updateUdemyQuestionBankDto,
      );
    } catch (error) {
      console.log('error', error);
      throw new BadRequestException('Error updating question');
    }
  }

  async remove(id: number) {
    try {
      await this.findOne(id);
      return this.udemyQuestionBanksRepository.softDelete(id);
    } catch (error) {
      console.log('error', error);
      throw new BadRequestException('Error deleting question');
    }
  }
}
