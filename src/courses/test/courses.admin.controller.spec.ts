import { Test, TestingModule } from '@nestjs/testing';
import { CoursesAdminController } from '../courses.admin.controller';
import { CoursesService } from '../courses.service';

describe('CoursesAdminController', () => {
  let controller: CoursesAdminController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CoursesAdminController],
      providers: [
        {
          provide: CoursesService,
          useValue: {
            // Add mock methods here
          },
        },
      ],
    }).compile();

    controller = module.get<CoursesAdminController>(CoursesAdminController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
