import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import { IsNotEmpty } from 'class-validator';

export class CreateCategoryCourseDto {
  @ApiProperty({
    description: 'The name of the course category',
    example: 'Programming',
  })
  @IsString()
  @IsNotEmpty()
  public name: string;

  @ApiProperty({
    description: 'The description of the course category',
    example: 'Programming related courses',
    required: false,
  })
  @IsString()
  @IsNotEmpty()
  public description: string;
}
