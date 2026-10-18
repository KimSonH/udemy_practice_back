import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional } from 'class-validator';
import { PaginationParams } from 'src/common/pagination.type';

// The admin sends an empty value for a filter left on "All"; that means no
// filter, not an invalid one.
const emptyToUndefined = Transform(({ value }) =>
  value === '' ? undefined : value,
);

/** The admin course list's filters, on top of search, paging and sorting. */
export class AdminCourseQuery extends PaginationParams {
  @emptyToUndefined
  @IsOptional()
  @IsIn(['active', 'inactive'])
  @ApiPropertyOptional({ enum: ['active', 'inactive'] })
  status?: 'active' | 'inactive';

  /** A video course is one with sections; a practice course has none. */
  @emptyToUndefined
  @IsOptional()
  @IsIn(['practice', 'video'])
  @ApiPropertyOptional({ enum: ['practice', 'video'] })
  kind?: 'practice' | 'video';

  /** Who made it: an admin, or a learner (owner_user_id set). */
  @emptyToUndefined
  @IsOptional()
  @IsIn(['admin', 'learner'])
  @ApiPropertyOptional({ enum: ['admin', 'learner'] })
  creator?: 'admin' | 'learner';
}
