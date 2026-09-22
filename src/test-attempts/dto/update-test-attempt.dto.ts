import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

import { MAX_ATTEMPT_QUESTIONS } from '../test-attempt.constants';

export class UpdateTestAttemptDto {
  @ApiProperty({
    description:
      'The revision the client last saw. A mismatch means another tab has written since, and the save is rejected rather than merged.',
  })
  @IsInt()
  @Min(0)
  revision: number;

  @ApiProperty({
    description: 'questionId -> the option indexes picked. Sent whole.',
    required: false,
  })
  @IsObject()
  @IsOptional()
  answers?: Record<string, string[]>;

  @ApiProperty({ required: false, type: [String] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(MAX_ATTEMPT_QUESTIONS)
  @IsOptional()
  flagged?: string[];

  @ApiProperty({ required: false, type: [String] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(MAX_ATTEMPT_QUESTIONS)
  @IsOptional()
  revealed?: string[];

  @ApiProperty({ required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  currentIndex?: number;
}
