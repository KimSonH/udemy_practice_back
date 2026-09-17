import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CourseSetsService } from '../course-sets.service';
import { CourseSet } from '../entities/course-set.entity';
import { UdemyQuestionBanksService } from 'src/udemy-question-banks/udemy-question-banks.service';
import {
  createMockDataSource,
  createMockRepository,
} from 'src/common/test/mocks';

describe('CourseSetsService', () => {
  let service: CourseSetsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourseSetsService,
        {
          provide: getRepositoryToken(CourseSet),
          useValue: createMockRepository<CourseSet>(),
        },
        { provide: UdemyQuestionBanksService, useValue: {} },
        { provide: DataSource, useValue: createMockDataSource() },
      ],
    }).compile();

    service = module.get<CourseSetsService>(CourseSetsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
