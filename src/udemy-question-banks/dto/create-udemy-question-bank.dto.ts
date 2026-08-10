import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumberString,
} from 'class-validator';

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

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Category name (dùng để lọc câu hỏi theo pool chung)',
    example: 'AI-102',
    required: false,
  })
  categoryName?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'Chủ đề/domain của câu hỏi', required: false })
  domain?: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ description: 'Đáp án 1' })
  answerOption1: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'Giải thích cho đáp án 1', required: false })
  explanation1?: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ description: 'Đáp án 2' })
  answerOption2: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'Giải thích cho đáp án 2', required: false })
  explanation2?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'Đáp án 3', required: false })
  answerOption3?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'Giải thích cho đáp án 3', required: false })
  explanation3?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'Đáp án 4', required: false })
  answerOption4?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'Giải thích cho đáp án 4', required: false })
  explanation4?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'Đáp án 5', required: false })
  answerOption5?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'Giải thích cho đáp án 5', required: false })
  explanation5?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'Đáp án 6', required: false })
  answerOption6?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'Giải thích cho đáp án 6', required: false })
  explanation6?: string;

  @IsNotEmpty()
  @IsNumberString()
  @ApiProperty({
    description:
      'Số thứ tự đáp án đúng (1-based, ví dụ "3" nghĩa là answerOption3 đúng)',
    example: '3',
  })
  correctAnswer: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'Giải thích tổng quát', required: false })
  overallExplanation?: string;
}
