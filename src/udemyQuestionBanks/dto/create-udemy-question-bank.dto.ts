import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsArray, IsNumber } from 'class-validator';

export class CreateUdemyQuestionBankDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'The question text',
    example: 'What is TypeScript?',
  })
  question: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'The type of question',
    example: 'multiple-choice',
  })
  questionType: string;

  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  @ApiProperty({
    description: 'Array of answer options',
    example: ['A programming language', 'A database', 'A framework'],
  })
  answerOptions: string[];

  @IsNotEmpty()
  @IsArray()
  @IsNumber({}, { each: true })
  @ApiProperty({
    description: 'The correct answer(s)',
    example: [1],
  })
  correctAnswers: number[];
}
