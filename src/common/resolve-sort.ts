export type SortDirection = 'ASC' | 'DESC';

export type ResolvedSort = {
  /** A column path this process chose, safe to interpolate into SQL. */
  column: string;
  direction: SortDirection;
};

/**
 * Turn an untrusted `sortBy` / `sortDir` pair into a column TypeORM may
 * interpolate into a statement.
 *
 * TypeORM does not bind the keys of its `order` object, nor the column argument
 * of `QueryBuilder.orderBy`, so the only safe value is one this process picked.
 * `allowed` maps the name the API exposes to the column path the query uses;
 * anything outside that map falls back to the caller's default rather than
 * raising, because a bad sort key in a URL should not break a list page.
 */
export function resolveSort(
  sortBy: string | undefined,
  sortDir: string | undefined,
  allowed: Record<string, string>,
  fallback: ResolvedSort,
): ResolvedSort {
  if (typeof sortBy !== 'string') {
    return fallback;
  }

  // Own properties only: a bare `allowed[sortBy]` would resolve "constructor"
  // and "toString" to functions inherited from Object.prototype.
  if (!Object.prototype.hasOwnProperty.call(allowed, sortBy)) {
    return fallback;
  }

  const direction: SortDirection =
    typeof sortDir === 'string' && sortDir.toUpperCase() === 'ASC'
      ? 'ASC'
      : 'DESC';

  return { column: allowed[sortBy], direction };
}

/**
 * Expand a resolved sort into the nested object TypeORM's `order` option takes,
 * so a relation path like "course.name" becomes { course: { name: 'ASC' } }.
 *
 * `tieBreaker` is appended as a last ordering key, and a paginated list wants
 * one. Sorting by a column where rows tie leaves their relative order to the
 * database: "ORDER BY status LIMIT 10 OFFSET 10" is free to return any ten of
 * the tied rows, so a row can appear on two pages or on none. Every course in
 * the catalogue currently has status "Active", which makes that the normal
 * case rather than an edge one.
 *
 * Always DESC and always last, so it decides nothing except between rows the
 * chosen sort cannot separate.
 */
export function toOrderObject(
  sort: ResolvedSort,
  tieBreaker?: string,
): Record<string, unknown> {
  const nest = (column: string, direction: SortDirection) =>
    column
      .split('.')
      .reduceRight<unknown>(
        (acc, key) => ({ [key]: acc }),
        direction,
      ) as Record<string, unknown>;

  const order = nest(sort.column, sort.direction);
  if (!tieBreaker) return order;

  // Merged rather than spread, so a tie breaker under the same relation as the
  // sort column does not replace it.
  return merge(order, nest(tieBreaker, 'DESC'));
}

/**
 * Deep-merges the two single-branch objects `nest` produces.
 *
 * The existing value wins, which is what makes a tie breaker equal to the
 * sort column harmless: "sort by id ASC" keeps ASC rather than being followed
 * by a contradictory id DESC. No separate guard for that case, since this is
 * the behaviour either way.
 */
function merge(
  base: Record<string, unknown>,
  extra: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };

  for (const [key, value] of Object.entries(extra)) {
    const existing = out[key];
    out[key] =
      existing && typeof existing === 'object' && typeof value === 'object'
        ? merge(
            existing as Record<string, unknown>,
            value as Record<string, unknown>,
          )
        : (existing ?? value);
  }

  return out;
}
