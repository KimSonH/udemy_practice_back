export const COURSE_RESOURCE_ACCESS_LEVELS = [
  'public',
  'logged_in',
  'paid',
  'private',
] as const;

export type CourseResourceAccessLevel =
  (typeof COURSE_RESOURCE_ACCESS_LEVELS)[number];
