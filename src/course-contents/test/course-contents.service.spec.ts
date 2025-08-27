import { Test, TestingModule } from '@nestjs/testing';
import { CourseContentsService } from './course-contents.service';

describe('CourseContentsService', () => {
  let service: CourseContentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CourseContentsService],
    }).compile();

    service = module.get<CourseContentsService>(CourseContentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
