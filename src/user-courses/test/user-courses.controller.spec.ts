import { Test, TestingModule } from '@nestjs/testing';
import { UserCoursesService } from '../user-courses.service';
import { UserCoursesController } from '../user-courses.controller';

describe('UserCoursesController', () => {
  let controller: UserCoursesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserCoursesController],
      providers: [UserCoursesService],
    }).compile();

    controller = module.get<UserCoursesController>(UserCoursesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
