import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CoursesAdminController } from '../courses.admin.controller';
import { CoursesService } from '../courses.service';
import { CourseSetsService } from 'src/course-sets/course-sets.service';
import JwtAdminAuthenticationGuard from 'src/authentication/guard/jwt-admin-authentication.guard';
import { allowAllGuard } from 'src/common/test/mocks';

describe('CoursesAdminController', () => {
  let controller: CoursesAdminController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CoursesAdminController],
      providers: [
        { provide: CoursesService, useValue: {} },
        { provide: CourseSetsService, useValue: {} },
        {
          // This controller decorates two routes with LocalFilesInterceptor,
          // which is a mixin whose class injects ConfigService. A mixin is a
          // fresh class per call, so it cannot be overridden by reference —
          // the dependency has to be provided instead.
          provide: ConfigService,
          useValue: { get: jest.fn(() => 'test') },
        },
      ],
    })
      .overrideGuard(JwtAdminAuthenticationGuard)
      .useValue(allowAllGuard)
      .compile();

    controller = module.get<CoursesAdminController>(CoursesAdminController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
