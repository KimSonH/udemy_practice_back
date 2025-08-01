import { Test, TestingModule } from '@nestjs/testing';
import { CourseContentsController } from './course-contents.controller';
import { CourseContentsService } from './course-contents.service';

describe('CourseContentsController', () => {
  let controller: CourseContentsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CourseContentsController],
      providers: [CourseContentsService],
    }).compile();

    controller = module.get<CourseContentsController>(CourseContentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
