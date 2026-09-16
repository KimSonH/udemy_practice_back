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
 */
export function toOrderObject(sort: ResolvedSort): Record<string, unknown> {
  return sort.column
    .split('.')
    .reduceRight<unknown>(
      (acc, key) => ({ [key]: acc }),
      sort.direction,
    ) as Record<string, unknown>;
}
