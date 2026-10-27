import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const emptyToUndefined = Transform(({ value }) =>
  value === '' ? undefined : value,
);

export class GumroadVideoQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  /** Matches the URL, a course name or a lesson name. */
  @emptyToUndefined
  @IsOptional()
  @IsString()
  search?: string;

  /** used: in a live lesson now; unused: in none, not retired; retired. */
  @emptyToUndefined
  @IsOptional()
  @IsIn(['used', 'unused', 'retired'])
  @ApiPropertyOptional({ enum: ['used', 'unused', 'retired'] })
  usage?: 'used' | 'unused' | 'retired';

  /** From the last "Check all links": broken, or never checked. */
  @emptyToUndefined
  @IsOptional()
  @IsIn(['broken', 'unchecked'])
  @ApiPropertyOptional({ enum: ['broken', 'unchecked'] })
  health?: 'broken' | 'unchecked';

  /** admin / learner: who uploaded it; untracked: pasted, never uploaded here. */
  @emptyToUndefined
  @IsOptional()
  @IsIn(['admin', 'learner', 'untracked'])
  @ApiPropertyOptional({ enum: ['admin', 'learner', 'untracked'] })
  source?: 'admin' | 'learner' | 'untracked';
}
