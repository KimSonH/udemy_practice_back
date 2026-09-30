import { ForbiddenException } from '@nestjs/common';

import { assertUserActive } from '../user-status';

describe('assertUserActive', () => {
  it('lets an active user through', () => {
    expect(() => assertUserActive({ status: 'active' })).not.toThrow();
  });

  it('refuses an inactive user', () => {
    expect(() => assertUserActive({ status: 'inactive' })).toThrow(
      ForbiddenException,
    );
  });

  it('lets a user with no status through', () => {
    // A row read before the column existed, or a test double that omits it.
    // Refusing here would lock everyone out on a half-applied deploy; the
    // migration gives every real row a value.
    expect(() => assertUserActive({})).not.toThrow();
  });
});
