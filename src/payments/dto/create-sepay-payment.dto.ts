import { IsNotEmpty, IsNumber } from 'class-validator';

export class CreateSepayPaymentDto {
  @IsNotEmpty()
  @IsNumber()
  courseId: number;
}
