import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class CreateUserCourseDto {
  @ApiProperty({ description: 'The unique identifier of the user' })
  @IsNumber()
  userId: number;

  @ApiProperty({ description: 'The unique identifier of the course' })
  @IsNumber()
  courseId: number;

  @ApiProperty({ description: 'The unique identifier of the order' })
  @IsString()
  orderId: string;

  @ApiProperty({ description: 'The data of the order' })
  @IsString()
  orderData: string;

  @ApiProperty({ description: 'The from method of the order' })
  @IsString()
  orderBy: string;
}
