import { resolveSort, toOrderObject } from '../resolve-sort';

const ALLOWED = {
  id: 'id',
  name: 'name',
  createdAt: 'createdAt',
  'course.name': 'course.name',
};

const FALLBACK = { column: 'createdAt', direction: 'DESC' as const };

describe('resolveSort', () => {
  it('maps an allowed key and an explicit ascending direction', () => {
    expect(resolveSort('name', 'ASC', ALLOWED, FALLBACK)).toEqual({
      column: 'name',
      direction: 'ASC',
    });
  });

  it('accepts a lowercase direction from the query string', () => {
    expect(resolveSort('name', 'asc', ALLOWED, FALLBACK)).toEqual({
      column: 'name',
      direction: 'ASC',
    });
  });

  it('defaults to DESC when the direction is missing or unrecognised', () => {
    expect(resolveSort('name', undefined, ALLOWED, FALLBACK).direction).toBe(
      'DESC',
    );
    expect(resolveSort('name', 'sideways', ALLOWED, FALLBACK).direction).toBe(
      'DESC',
    );
  });

  it('falls back when no sort key was requested', () => {
    expect(resolveSort(undefined, 'ASC', ALLOWED, FALLBACK)).toEqual(FALLBACK);
  });

  it('falls back on a key that is not in the whitelist', () => {
    expect(resolveSort('password', 'ASC', ALLOWED, FALLBACK)).toEqual(FALLBACK);
  });

  it('falls back on an injection attempt rather than passing it through', () => {
    expect(
      resolveSort('name; DROP TABLE courses', 'ASC', ALLOWED, FALLBACK),
    ).toEqual(FALLBACK);
  });

  it('does not resolve inherited Object properties as columns', () => {
    // A plain `allowed[sortBy]` lookup would return Object.prototype members
    // here, putting "function Object() { [native code] }" into the query.
    expect(resolveSort('__proto__', 'ASC', ALLOWED, FALLBACK)).toEqual(
      FALLBACK,
    );
    expect(resolveSort('constructor', 'ASC', ALLOWED, FALLBACK)).toEqual(
      FALLBACK,
    );
    expect(resolveSort('toString', 'ASC', ALLOWED, FALLBACK)).toEqual(FALLBACK);
  });

  it('ignores a non-string sort key', () => {
    expect(
      resolveSort(42 as unknown as string, 'ASC', ALLOWED, FALLBACK),
    ).toEqual(FALLBACK);
  });
});

describe('toOrderObject', () => {
  it('builds a flat order object for a plain column', () => {
    expect(toOrderObject({ column: 'createdAt', direction: 'DESC' })).toEqual({
      createdAt: 'DESC',
    });
  });

  it('nests a dotted relation path the way TypeORM expects', () => {
    expect(toOrderObject({ column: 'course.name', direction: 'ASC' })).toEqual({
      course: { name: 'ASC' },
    });
  });
});

describe('toOrderObject tie breaker', () => {
  it('adds nothing when none is asked for', () => {
    expect(toOrderObject({ column: 'name', direction: 'ASC' })).toEqual({
      name: 'ASC',
    });
  });

  it('appends the tie breaker after the chosen column', () => {
    // Key order is the SQL order: the sort decides, the tie breaker only
    // separates rows it could not.
    expect(toOrderObject({ column: 'status', direction: 'ASC' }, 'id')).toEqual(
      { status: 'ASC', id: 'DESC' },
    );
    expect(
      Object.keys(toOrderObject({ column: 'status', direction: 'ASC' }, 'id')),
    ).toEqual(['status', 'id']);
  });

  it('leaves it out when it is already the sort column', () => {
    // Otherwise "sort by id ascending" would be followed by id descending.
    expect(toOrderObject({ column: 'id', direction: 'ASC' }, 'id')).toEqual({
      id: 'ASC',
    });
  });

  it('keeps a relation sort and merges the tie breaker beside it', () => {
    expect(
      toOrderObject({ column: 'user.firstName', direction: 'ASC' }, 'id'),
    ).toEqual({ user: { firstName: 'ASC' }, id: 'DESC' });
  });

  it('does not let a tie breaker under the same relation replace the sort', () => {
    // A naive spread would drop { user: { firstName } } for { user: { id } }.
    expect(
      toOrderObject({ column: 'user.firstName', direction: 'ASC' }, 'user.id'),
    ).toEqual({ user: { firstName: 'ASC', id: 'DESC' } });
  });
});
