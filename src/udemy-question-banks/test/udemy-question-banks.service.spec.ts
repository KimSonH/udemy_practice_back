import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UdemyQuestionBanksService } from '../udemy-question-banks.service';
import { UdemyQuestionBank } from '../entities/udemy-question-bank.entity';
import { createMockRepository } from 'src/common/test/mocks';

describe('UdemyQuestionBanksService', () => {
  let service: UdemyQuestionBanksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UdemyQuestionBanksService,
        {
          provide: getRepositoryToken(UdemyQuestionBank),
          useValue: createMockRepository<UdemyQuestionBank>(),
        },
      ],
    }).compile();

    service = module.get<UdemyQuestionBanksService>(UdemyQuestionBanksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
