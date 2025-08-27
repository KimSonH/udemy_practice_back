import { Test, TestingModule } from '@nestjs/testing';
import { CourseSessionsService } from './course-sessions.service';

describe('CourseSessionsService', () => {
  let service: CourseSessionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CourseSessionsService],
    }).compile();

    service = module.get<CourseSessionsService>(CourseSessionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
