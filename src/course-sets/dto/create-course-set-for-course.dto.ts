import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class CreateCourseSetForCourseDto {
  @ApiProperty({ description: 'Tên course set, admin tự đặt' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description:
      'Thứ tự hiển thị/map CSV. Bỏ trống sẽ tự lấy order lớn nhất hiện có + 1',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  order?: number;
}
