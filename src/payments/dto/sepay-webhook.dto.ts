import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumberString,
} from 'class-validator';

export class SepayWebhookDto {
  @IsString()
  @IsNotEmpty()
  signature: string;

  @IsString()
  @IsNotEmpty()
  order_invoice_number: string;

  @IsOptional()
  @IsString()
  order_status?: string;

  @IsOptional()
  @IsString()
  payment_status?: string;

  @IsOptional()
  @IsString()
  payment_method?: string;

  @IsOptional()
  @IsNumberString()
  order_amount?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  customer_id?: string;

  @IsOptional()
  @IsString()
  custom_data?: string;
}

