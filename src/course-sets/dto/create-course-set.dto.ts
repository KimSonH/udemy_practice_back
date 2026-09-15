import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNumber,
  IsNotEmpty,
  IsString,
  IsArray,
  IsOptional,
} from 'class-validator';
import { UdemyQuestionBank } from 'src/udemy-question-banks/entities/udemy-question-bank.entity';
import { Course } from 'src/courses/entities/courses.entity';
export class CreateCourseSetDto {
  @ApiProperty({ description: 'Name of the course set' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description:
      'Order of the set within the course, used to map imported CSV files by number, e.g. "Practice Test 3" -> order = 3',
  })
  @IsNumber()
  @IsNotEmpty()
  order: number;

  @ApiProperty({ description: 'Course id of the course set' })
  @IsNotEmpty()
  course: Course;

  @ApiProperty({ description: 'Udemy question banks of the course set' })
  @IsArray()
  @IsNotEmpty()
  @Type(() => UdemyQuestionBank)
  @IsOptional()
  udemyQuestionBanks: UdemyQuestionBank[];
}
