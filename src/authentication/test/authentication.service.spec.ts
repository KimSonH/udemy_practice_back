import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';

import { UsersService } from 'src/users/users.service';
import { AuthenticationService } from '../authentication.service';

describe('AuthenticationService.getAuthenticatedUser', () => {
  let service: AuthenticationService;
  let usersService: { getByEmail: jest.Mock };
  let hash: string;

  beforeAll(async () => {
    // A real hash, so verifyPassword genuinely succeeds or fails. bcrypt is
    // deliberately not mocked: a mocked compare would let these tests pass
    // even if the password check were broken.
    hash = await bcrypt.hash('secret', 10);
  });

  beforeEach(async () => {
    usersService = { getByEmail: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthenticationService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: {} },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = module.get(AuthenticationService);
  });

  it('tells a locked account it is locked, not that the password was wrong', async () => {
    // Pins the placement of assertUserActive: outside the try/catch. Inside
    // it, the ForbiddenException would be swallowed and rethrown as a
    // BadRequestException, and the admin could not tell a lock from a typo.
    usersService.getByEmail.mockResolvedValue({
      id: 7,
      email: 'a@b.c',
      password: hash,
      status: 'inactive',
    });

    const attempt = service.getAuthenticatedUser('a@b.c', 'secret');

    await expect(attempt).rejects.toThrow(ForbiddenException);
    await expect(attempt).rejects.not.toBeInstanceOf(BadRequestException);
  });

  it('returns an active user with the password cleared', async () => {
    usersService.getByEmail.mockResolvedValue({
      id: 7,
      email: 'a@b.c',
      password: hash,
      status: 'active',
    });

    const user = await service.getAuthenticatedUser('a@b.c', 'secret');

    expect(user).toMatchObject({ id: 7, email: 'a@b.c', status: 'active' });
    // toEqual would treat a missing key and undefined as the same, so assert
    // the hash is gone explicitly.
    expect(user.password).toBeUndefined();
  });

  it('still rejects a wrong password as bad credentials', async () => {
    usersService.getByEmail.mockResolvedValue({
      id: 7,
      email: 'a@b.c',
      password: hash,
      status: 'active',
    });

    await expect(
      service.getAuthenticatedUser('a@b.c', 'not-the-password'),
    ).rejects.toThrow(BadRequestException);
  });
});
