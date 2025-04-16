import { Test, TestingModule } from '@nestjs/testing';
import { CourseSetsService } from '../course-sets.service';

describe('CourseSetsService', () => {
  let service: CourseSetsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CourseSetsService],
    }).compile();

    service = module.get<CourseSetsService>(CourseSetsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
