import { Test, TestingModule } from '@nestjs/testing';
import { UdemyQuestionBanksService } from '../udemy-question-banks.service';
import { UdemyQuestionBanksController } from '../udemy-question-banks.controller';

describe('UdemyQuestionBanksController', () => {
  let controller: UdemyQuestionBanksController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UdemyQuestionBanksController],
      providers: [UdemyQuestionBanksService],
    }).compile();

    controller = module.get<UdemyQuestionBanksController>(
      UdemyQuestionBanksController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
