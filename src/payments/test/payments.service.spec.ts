import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PaymentsService } from '../payments.service';
import { SepayService } from '../sepay.service';
import { TBTransactionService } from '../tb-transaction.service';
import { UsersService } from 'src/users/users.service';
import { UserCoursesService } from 'src/user-courses/user-courses.service';
import { CoursesService } from 'src/courses/courses.service';

describe('PaymentsService', () => {
  let service: PaymentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          // The constructor builds a PayPal client from these, so `get` has to
          // return something rather than undefined.
          provide: ConfigService,
          useValue: { get: jest.fn(() => 'test') },
        },
        { provide: UsersService, useValue: {} },
        { provide: UserCoursesService, useValue: {} },
        { provide: CoursesService, useValue: {} },
        { provide: JwtService, useValue: {} },
        { provide: SepayService, useValue: {} },
        { provide: TBTransactionService, useValue: {} },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
