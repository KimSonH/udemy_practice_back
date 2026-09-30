/**
 * Whether an account may sign in.
 *
 * A varchar rather than a boolean, to match `course.status`, which is already
 * 'active' / 'inactive' in this schema.
 */
export const USER_STATUS_ACTIVE = 'active';
export const USER_STATUS_INACTIVE = 'inactive';

export const USER_STATUSES = [
  USER_STATUS_ACTIVE,
  USER_STATUS_INACTIVE,
] as const;

export type UserStatus = (typeof USER_STATUSES)[number];
