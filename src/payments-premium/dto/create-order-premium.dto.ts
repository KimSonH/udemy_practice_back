import { IsEmail, IsNotEmpty, IsNumber } from 'class-validator';

export class CreateOrderPremiumDto {
  @IsEmail()
  accountEmail: string;

  @IsNotEmpty()
  @IsNumber()
  price: number;

  @IsNotEmpty()
  @IsNumber()
  accountId: number;
}
