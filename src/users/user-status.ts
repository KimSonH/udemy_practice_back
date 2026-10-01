import { ForbiddenException } from '@nestjs/common';

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

/**
 * The one place that decides a locked account cannot act.
 *
 * Called from the three auth entry points rather than from
 * UsersService.getById / getByEmail, because the admin has to read and display
 * an inactive user in order to unlock them.
 */
export function assertUserActive(user: { status?: UserStatus }): void {
  if (user.status === USER_STATUS_INACTIVE) {
    throw new ForbiddenException('This account is locked');
  }
}
