import { Test, TestingModule } from '@nestjs/testing';
import { CourseSetsController } from '../course-sets.controller';
import { CourseSetsService } from '../course-sets.service';
import JwtAdminAuthenticationGuard from 'src/authentication/guard/jwt-admin-authentication.guard';
import { allowAllGuard } from 'src/common/test/mocks';

describe('CourseSetsController', () => {
  let controller: CourseSetsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CourseSetsController],
      providers: [{ provide: CourseSetsService, useValue: {} }],
    })
      .overrideGuard(JwtAdminAuthenticationGuard)
      .useValue(allowAllGuard)
      .compile();

    controller = module.get<CourseSetsController>(CourseSetsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
