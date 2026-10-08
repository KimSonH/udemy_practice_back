import { ArgumentMetadata } from '@nestjs/common';
import { TrimSearchPipe } from '../trim-search.pipe';

const pipe = new TrimSearchPipe();
const query = (data?: string): ArgumentMetadata => ({ type: 'query', data });

describe('TrimSearchPipe', () => {
  it('trims search in a whole query object', () => {
    expect(pipe.transform({ page: '1', search: '  php  ' }, query())).toEqual({
      page: '1',
      search: 'php',
    });
  });

  it('trims a search read on its own with @Query("search")', () => {
    expect(pipe.transform('\tphp \n', query('search'))).toBe('php');
  });

  it('turns a blank search into an empty one, which means no filter', () => {
    expect(pipe.transform({ search: '   ' }, query())).toEqual({ search: '' });
  });

  it('keeps inner spaces', () => {
    expect(pipe.transform({ search: ' react native ' }, query())).toEqual({
      search: 'react native',
    });
  });

  it('leaves other query values alone', () => {
    expect(pipe.transform(' 1 ', query('page'))).toBe(' 1 ');
    expect(pipe.transform({ category: ' x ' }, query())).toEqual({
      category: ' x ',
    });
  });

  it('leaves bodies and params alone', () => {
    const body = { search: ' php ' };
    expect(pipe.transform(body, { type: 'body' })).toBe(body);
    expect(pipe.transform(' php ', { type: 'param', data: 'search' })).toBe(
      ' php ',
    );
  });

  it('leaves a repeated search (an array) alone', () => {
    const value = { search: [' a ', ' b '] };
    expect(pipe.transform(value, query())).toBe(value);
  });
});
