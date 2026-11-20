import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateInstructorProfileDto {
  @ApiPropertyOptional({ example: 'Cloud Architect · AWS SA Professional' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  headline?: string | null;

  @ApiPropertyOptional({
    description: 'Plain text, blank lines between paragraphs',
  })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  bio?: string | null;

  @ApiPropertyOptional({
    example: {
      website: 'https://example.com',
      linkedin: 'https://www.linkedin.com/in/me',
    },
  })
  @IsOptional()
  @IsObject()
  links?: Record<string, string> | null;
}
