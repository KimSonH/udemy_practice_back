import { Test, TestingModule } from '@nestjs/testing';
import { CourseSetsController } from '../course-sets.controller';
import { CourseSetsService } from '../course-sets.service';

describe('CourseSetsController', () => {
  let controller: CourseSetsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CourseSetsController],
      providers: [CourseSetsService],
    }).compile();

    controller = module.get<CourseSetsController>(CourseSetsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
