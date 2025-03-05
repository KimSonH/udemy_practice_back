import { Test, TestingModule } from '@nestjs/testing';
import { CoursesService } from '../courses.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Course } from '../entities/courses.entity';
import { ClassMarkersService } from 'src/classMarkers/classMarkers.service';

describe('CoursesService', () => {
  let service: CoursesService;

  const mockCourseRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockClassMarkersService = {
    // Add mock methods for ClassMarkersService as needed
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        {
          provide: getRepositoryToken(Course),
          useValue: mockCourseRepository,
        },
        {
          provide: ClassMarkersService,
          useValue: mockClassMarkersService,
        },
      ],
    }).compile();

    service = module.get<CoursesService>(CoursesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
