import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, Matches } from 'class-validator';

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
    description: 'Category name, used to filter questions from the shared pool',
    example: 'AI-102',
    required: false,
  })
  categoryName?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Topic or domain of the question',
    required: false,
  })
  domain?: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ description: 'Answer option 1' })
  answerOption1: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Explanation for answer option 1',
    required: false,
  })
  explanation1?: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ description: 'Answer option 2' })
  answerOption2: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Explanation for answer option 2',
    required: false,
  })
  explanation2?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'Answer option 3', required: false })
  answerOption3?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Explanation for answer option 3',
    required: false,
  })
  explanation3?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'Answer option 4', required: false })
  answerOption4?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Explanation for answer option 4',
    required: false,
  })
  explanation4?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'Answer option 5', required: false })
  answerOption5?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Explanation for answer option 5',
    required: false,
  })
  explanation5?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'Answer option 6', required: false })
  answerOption6?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Explanation for answer option 6',
    required: false,
  })
  explanation6?: string;

  @IsNotEmpty()
  // One 1-based option index for a single-answer question, or several comma
  // separated for a multiple-response one. `IsNumberString` allowed only the
  // first shape, so a multiple-response question could not be created or
  // edited through the API even though grading has always read both.
  @Matches(/^\d+(,\d+)*$/, {
    message:
      'correctAnswer must be one or more 1-based option indexes, comma separated, such as "3" or "1,3"',
  })
  @ApiProperty({
    description:
      'Indexes of the correct answers, 1-based and comma separated. "3" means answerOption3 is correct; "1,3" is a multiple-response question.',
    example: '3',
  })
  correctAnswer: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'Overall explanation', required: false })
  overallExplanation?: string;
}
