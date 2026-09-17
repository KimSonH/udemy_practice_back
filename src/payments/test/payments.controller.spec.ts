import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from '../payments.controller';
import { PaymentsService } from '../payments.service';
import JwtAuthenticationGuard from 'src/authentication/guard/jwt-authentication.guard';
import { WebhookGuard } from '../guard/webhook.guard';
import { IpnGuard } from '../guard/ipn.guard';
import { allowAllGuard } from 'src/common/test/mocks';

describe('PaymentsController', () => {
  let controller: PaymentsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [{ provide: PaymentsService, useValue: {} }],
    })
      .overrideGuard(JwtAuthenticationGuard)
      .useValue(allowAllGuard)
      .overrideGuard(WebhookGuard)
      .useValue(allowAllGuard)
      .overrideGuard(IpnGuard)
      .useValue(allowAllGuard)
      .compile();

    controller = module.get<PaymentsController>(PaymentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
