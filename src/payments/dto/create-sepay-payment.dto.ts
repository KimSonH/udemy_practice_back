import { IsIn, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export type SepayPaymentMethod =
  | 'BANK_TRANSFER'
  | 'NAPAS_BANK_TRANSFER';

export class CreateSepayPaymentDto {
  @IsNotEmpty()
  @IsNumber()
  courseId: number;

  @IsOptional()
  @IsIn(['BANK_TRANSFER', 'NAPAS_BANK_TRANSFER'])
  paymentMethod?: SepayPaymentMethod;
}

