import { slugify as transliterate } from 'transliteration';

export function normalizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function generateSlug(title: string): string {
  const base = transliterate(title);
  return normalizeSlug(base);
}

/**
 * Generate a unique slug using Prisma and entity type
 */
export async function generateUniqueSlug(
  title: string,
  checkSlugExists: (slug: string) => Promise<boolean>,
): Promise<string> {
  let slug = generateSlug(title);
  let suffix = 1;

  while (await checkSlugExists(slug)) {
    slug = `${generateSlug(title)}-${suffix++}`;
  }

  return slug;
}
