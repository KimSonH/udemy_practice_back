import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

import {
  MAX_ATTEMPT_QUESTIONS,
  TEST_MODES,
  TestMode,
} from '../test-attempt.constants';

export class CreateTestAttemptDto {
  @ApiProperty({ description: 'Course being sat' })
  @IsInt()
  @IsNotEmpty()
  courseId: number;

  @ApiProperty({
    description:
      'Course set being sat. Omit for the missed-question drill, which belongs to no single set.',
    required: false,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  courseSetId?: number;

  @ApiProperty({ enum: TEST_MODES })
  @IsIn(TEST_MODES)
  mode: TestMode;

  @ApiProperty({
    description:
      'The questions this attempt covers, in the order they will be shown. Required for the drill; on a set attempt it records a shuffled order. Every id must belong to the course.',
    required: false,
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(MAX_ATTEMPT_QUESTIONS)
  @IsOptional()
  questionIds?: string[];

  @ApiProperty({
    description:
      'questionId -> option indexes in the order shown. Present only when the answers were shuffled.',
    required: false,
  })
  @IsObject()
  @IsOptional()
  optionOrder?: Record<string, string[]>;
}
