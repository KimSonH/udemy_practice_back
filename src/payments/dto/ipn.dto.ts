import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  IsArray,
  ValidateNested,
} from 'class-validator';

export class SepayOrderDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  order_id: string;

  @IsNotEmpty()
  @IsIn(['CAPTURED', 'CANCELLED', 'AUTHENTICATION_NOT_NEEDED'])
  order_status: string;

  @IsNotEmpty()
  @IsString()
  order_currency: string;

  @IsNotEmpty()
  @IsString()
  order_amount: number;

  @IsNotEmpty()
  @IsString()
  order_invoice_number: string;

  @IsNotEmpty()
  @IsArray()
  custom_data: any[];

  @IsNotEmpty()
  @IsString()
  user_agent: string;

  @IsNotEmpty()
  @IsString()
  ip_address: string;

  @IsNotEmpty()
  @IsString()
  order_description: string;
}

export class SepayTransactionDto {
  @IsNotEmpty()
  @IsString()
  id: string;

  @IsNotEmpty()
  @IsString()
  payment_method: string;

  @IsNotEmpty()
  @IsString()
  transaction_id: string;

  @IsNotEmpty()
  @IsString()
  @IsIn(['PAYMENT', 'REFUND'])
  transaction_type: string;

  @IsNotEmpty()
  @IsString()
  transaction_date: string;

  @IsNotEmpty()
  @IsString()
  @IsIn(['APPROVED', 'DECLINED'])
  transaction_status: string;

  @IsNotEmpty()
  @IsString()
  transaction_amount: string;

  @IsNotEmpty()
  @IsString()
  transaction_currency: string;
}

export class SepayCustomerDto {
  @IsNotEmpty()
  @IsString()
  id: string;

  @IsNotEmpty()
  @IsString()
  customer_id: string;
}

export class SepayIPNDto {
  @IsInt()
  @IsNotEmpty()
  timestamp: number;

  @IsString()
  @IsNotEmpty()
  notification_type: string;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => SepayOrderDto)
  order: SepayOrderDto;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => SepayTransactionDto)
  transaction: SepayTransactionDto;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => SepayCustomerDto)
  customer: SepayCustomerDto;
}
