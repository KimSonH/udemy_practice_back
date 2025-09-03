import { PartialType } from '@nestjs/swagger';
import { CreatePaymenAccountDto } from './create-payment-account.dto';

export class UpdatePaymentAccountDto extends PartialType(
  CreatePaymenAccountDto,
) {}
