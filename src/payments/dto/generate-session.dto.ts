import { IsIn, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class GenerateSessionDto {
  @IsNumber()
  @IsNotEmpty()
  userId: number;

  @IsNumber()
  @IsNotEmpty()
  courseId: number;

  @IsString()
  @IsNotEmpty()
  @IsIn(['vietqr', 'paypal'])
  orderBy: string;
}
