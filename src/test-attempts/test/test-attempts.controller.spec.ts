import { Test, TestingModule } from '@nestjs/testing';

import JwtAuthenticationGuard from 'src/authentication/guard/jwt-authentication.guard';
import { allowAllGuard } from 'src/common/test/mocks';

import { TestAttemptsController } from '../test-attempts.controller';
import { TestAttemptsService } from '../test-attempts.service';

describe('TestAttemptsController', () => {
  let controller: TestAttemptsController;
  const service = {
    start: jest.fn(),
    saveProgress: jest.fn(),
    submit: jest.fn(),
    findByCourse: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TestAttemptsController],
      providers: [{ provide: TestAttemptsService, useValue: service }],
    })
      .overrideGuard(JwtAuthenticationGuard)
      .useValue(allowAllGuard)
      .compile();

    controller = module.get<TestAttemptsController>(TestAttemptsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // The body never decides whose attempt this is. These four assertions are
  // the whole reason the controller has a spec: a route that read a user id
  // from the request body would let anyone name somebody else.
  const req = { user: { id: 3 } } as never;

  it('starts an attempt for the token holder', async () => {
    await controller.start(req, { courseId: 7, mode: 'exam' });
    expect(service.start).toHaveBeenCalledWith(3, {
      courseId: 7,
      mode: 'exam',
    });
  });

  it('saves against the token holder', async () => {
    await controller.save(req, 91, { revision: 2 });
    expect(service.saveProgress).toHaveBeenCalledWith(3, 91, { revision: 2 });
  });

  it('submits as the token holder', async () => {
    await controller.submit(req, 91, {});
    expect(service.submit).toHaveBeenCalledWith(3, 91, {});
  });

  it('lists only the token holder attempts', async () => {
    await controller.findByCourse(req, 7);
    expect(service.findByCourse).toHaveBeenCalledWith(3, 7);
  });
});
