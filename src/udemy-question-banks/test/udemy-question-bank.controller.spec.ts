import { Test, TestingModule } from '@nestjs/testing';
import { UdemyQuestionBanksController } from '../udemy-question-banks.controller';
import { UdemyQuestionBanksService } from '../udemy-question-banks.service';

describe('UdemyQuestionBanksController', () => {
  let controller: UdemyQuestionBanksController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UdemyQuestionBanksController],
      providers: [{ provide: UdemyQuestionBanksService, useValue: {} }],
    }).compile();

    controller = module.get<UdemyQuestionBanksController>(
      UdemyQuestionBanksController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
