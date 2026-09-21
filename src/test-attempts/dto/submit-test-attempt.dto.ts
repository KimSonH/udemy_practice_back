import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsObject, IsOptional, Min } from 'class-validator';

export class SubmitTestAttemptDto {
  @ApiProperty({
    description: 'The final answers, if any changed since the last save.',
    required: false,
  })
  @IsObject()
  @IsOptional()
  answers?: Record<string, string[]>;

  @ApiProperty({
    description:
      'Optional here, unlike on a save. A submit fired by the timer running out, or by the page closing, carries whatever revision that tab last saw, and refusing it would throw away a finished attempt to protect a record nobody is editing.',
    required: false,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  revision?: number;
}
