import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class CreateCourseSetForCourseDto {
  @ApiProperty({ description: 'Course set name, chosen by the admin' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description:
      'Display order, also used to map CSV files. Defaults to the current highest order + 1',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  order?: number;
}
