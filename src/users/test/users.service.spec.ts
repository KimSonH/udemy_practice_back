import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';

import { User } from '../entities/user.entity';
import { UsersService } from '../users.service';
import {
  createMockDataSource,
  createMockRepository,
} from 'src/common/test/mocks';

describe('UsersService.create', () => {
  let service: UsersService;
  let repository: ReturnType<typeof createMockRepository<User>>;

  beforeEach(async () => {
    repository = createMockRepository<User>();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: repository },
        { provide: DataSource, useValue: createMockDataSource() },
      ],
    }).compile();
    service = module.get(UsersService);
  });

  it('never stores the password as it was given', async () => {
    repository.save.mockImplementation(async (user) => user as User);

    await service.create({
      email: 'a@b.c',
      password: 'plain-text-secret',
      firstName: 'A',
      lastName: 'B',
    } as never);

    const saved = repository.save.mock.calls[0][0] as User;
    expect(saved.password).not.toBe('plain-text-secret');
    await expect(
      bcrypt.compare('plain-text-secret', saved.password),
    ).resolves.toBe(true);
  });
});
