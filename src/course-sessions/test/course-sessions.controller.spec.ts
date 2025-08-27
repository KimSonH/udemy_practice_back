import { Test, TestingModule } from '@nestjs/testing';
import { CourseSessionsController } from './course-sessions.controller';
import { CourseSessionsService } from './course-sessions.service';

describe('CourseSessionsController', () => {
  let controller: CourseSessionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CourseSessionsController],
      providers: [CourseSessionsService],
    }).compile();

    controller = module.get<CourseSessionsController>(CourseSessionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
