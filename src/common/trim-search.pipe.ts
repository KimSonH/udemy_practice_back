import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';

/**
 * Trims the `search` query parameter for every route, so " php " finds what
 * "php" finds and a blank search means no filter at all.
 *
 * A pipe rather than `@Transform` on the DTOs: the global ValidationPipe runs
 * without `transform`, so a DTO transform never reaches the handler, and some
 * controllers read `@Query('search')` directly with no DTO.
 */
@Injectable()
export class TrimSearchPipe implements PipeTransform {
  transform(value: unknown, { type, data }: ArgumentMetadata) {
    if (type !== 'query') return value;
    if (data === 'search') {
      return typeof value === 'string' ? value.trim() : value;
    }
    if (
      data === undefined &&
      value !== null &&
      typeof value === 'object' &&
      typeof (value as { search?: unknown }).search === 'string'
    ) {
      const query = value as { search: string };
      return { ...query, search: query.search.trim() };
    }
    return value;
  }
}
