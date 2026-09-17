import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CoursesService } from '../courses.service';
import { Course } from '../entities/courses.entity';
import { CourseSetsService } from 'src/course-sets/course-sets.service';
import { UdemyQuestionBanksService } from 'src/udemy-question-banks/udemy-question-banks.service';
import { OrganizationsService } from 'src/organizations/organizations.service';
import {
  createMockDataSource,
  createMockRepository,
} from 'src/common/test/mocks';

describe('CoursesService', () => {
  let service: CoursesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        {
          provide: getRepositoryToken(Course),
          useValue: createMockRepository<Course>(),
        },
        { provide: CourseSetsService, useValue: {} },
        { provide: UdemyQuestionBanksService, useValue: {} },
        { provide: OrganizationsService, useValue: {} },
        { provide: DataSource, useValue: createMockDataSource() },
      ],
    }).compile();

    service = module.get<CoursesService>(CoursesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
