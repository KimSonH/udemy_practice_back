import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { JwtStrategy } from '../strategy/jwt.strategy';
import { JwtRefreshTokenStrategy } from '../strategy/jwt-refresh-token.strategy';

const config = { get: () => 'test-secret' } as unknown as ConfigService;

function usersServiceReturning(user: unknown) {
  return {
    getById: jest.fn(async () => user),
    getUserIfRefreshTokenMatches: jest.fn(async () => user),
  };
}

const LOCKED = { id: 7, email: 'a@b.c', status: 'inactive' };
const OPEN = { id: 7, email: 'a@b.c', status: 'active' };

describe('a locked account', () => {
  it('cannot use an access token issued before the lock', async () => {
    // The token is valid and unexpired — it was minted while the account was
    // open. Everything hangs on this: without it, locking someone out does
    // nothing for up to 604800 seconds.
    const strategy = new JwtStrategy(
      config,
      usersServiceReturning(LOCKED) as never,
    );

    await expect(strategy.validate({ userId: 7 } as never)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('cannot refresh', async () => {
    const strategy = new JwtRefreshTokenStrategy(
      config,
      usersServiceReturning(LOCKED) as never,
    );

    await expect(
      strategy.validate(
        { cookies: { Refresh: 'r' } } as never,
        { userId: 7 } as never,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('still lets an active account through both', async () => {
    const jwt = new JwtStrategy(config, usersServiceReturning(OPEN) as never);
    const refresh = new JwtRefreshTokenStrategy(
      config,
      usersServiceReturning(OPEN) as never,
    );

    await expect(jwt.validate({ userId: 7 } as never)).resolves.toEqual(OPEN);
    await expect(
      refresh.validate(
        { cookies: { Refresh: 'r' } } as never,
        { userId: 7 } as never,
      ),
    ).resolves.toEqual(OPEN);
  });
});
