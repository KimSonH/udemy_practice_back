import { BadRequestException } from '@nestjs/common';

/**
 * Hosts each named link may point to. The page draws that site's name next
 * to the link, so a "LinkedIn" link that leads anywhere else would mislead
 * learners. `website` is the one free-form link.
 */
export const PROFILE_LINK_HOSTS = {
  website: null,
  linkedin: ['linkedin.com'],
  youtube: ['youtube.com', 'youtu.be'],
  facebook: ['facebook.com', 'fb.com'],
  x: ['x.com', 'twitter.com'],
  github: ['github.com'],
} as const;

export type ProfileLinkKey = keyof typeof PROFILE_LINK_HOSTS;
export type ProfileLinks = Partial<Record<ProfileLinkKey, string>>;

const MAX_LINK = 300;

/**
 * Keeps only known keys, drops blanks, and rejects anything that is not an
 * http(s) URL on the expected site. Returns null when nothing is left.
 */
export function cleanProfileLinks(input: unknown): ProfileLinks | null {
  if (input == null) return null;
  if (typeof input !== 'object' || Array.isArray(input)) {
    throw new BadRequestException('links must be an object');
  }
  const links: ProfileLinks = {};
  for (const key of Object.keys(PROFILE_LINK_HOSTS) as ProfileLinkKey[]) {
    const raw = (input as Record<string, unknown>)[key];
    if (raw == null || raw === '') continue;
    if (typeof raw !== 'string' || raw.length > MAX_LINK) {
      throw new BadRequestException(`links.${key} is not a valid link`);
    }
    let url: URL;
    try {
      url = new URL(raw.trim());
    } catch {
      throw new BadRequestException(`links.${key} is not a valid link`);
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      throw new BadRequestException(`links.${key} must start with https://`);
    }
    const hosts = PROFILE_LINK_HOSTS[key];
    const host = url.hostname.toLowerCase();
    if (hosts && !hosts.some((h) => host === h || host.endsWith(`.${h}`))) {
      throw new BadRequestException(`links.${key} must be a ${hosts[0]} link`);
    }
    links[key] = url.toString();
  }
  return Object.keys(links).length ? links : null;
}
