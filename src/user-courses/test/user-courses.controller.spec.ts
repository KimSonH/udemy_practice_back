import { Test, TestingModule } from '@nestjs/testing';
import { UserCoursesController } from '../user-courses.controller';
import { UserCoursesService } from '../user-courses.service';
import JwtAuthenticationGuard from 'src/authentication/guard/jwt-authentication.guard';
import { allowAllGuard } from 'src/common/test/mocks';

describe('UserCoursesController', () => {
  let controller: UserCoursesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserCoursesController],
      providers: [{ provide: UserCoursesService, useValue: {} }],
    })
      .overrideGuard(JwtAuthenticationGuard)
      .useValue(allowAllGuard)
      .compile();

    controller = module.get<UserCoursesController>(UserCoursesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
