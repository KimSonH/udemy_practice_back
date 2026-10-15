import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class SaveLessonProgressDto {
  /** The lesson's video URL, which is how progress is keyed. */
  @IsString()
  @MaxLength(2048)
  url: string;

  /** Leave out to only mark the lesson as the one last opened. */
  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}
