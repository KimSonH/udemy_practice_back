import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserCoursesService } from '../user-courses.service';
import { UserCourse } from '../entities/user-course.entity';
import { CoursesService } from 'src/courses/courses.service';
import { createMockRepository } from 'src/common/test/mocks';

describe('UserCoursesService', () => {
  let service: UserCoursesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserCoursesService,
        {
          provide: getRepositoryToken(UserCourse),
          useValue: createMockRepository<UserCourse>(),
        },
        { provide: CoursesService, useValue: {} },
      ],
    }).compile();

    service = module.get<UserCoursesService>(UserCoursesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
