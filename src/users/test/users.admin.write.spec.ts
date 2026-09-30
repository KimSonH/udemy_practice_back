import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { DataSource, FindOneOptions } from 'typeorm';

import { User } from '../entities/user.entity';
import { UsersService } from '../users.service';
import {
  createMockDataSource,
  createMockRepository,
} from 'src/common/test/mocks';

describe('UsersService admin writes', () => {
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

  describe('createForAdmin', () => {
    it('stores a hash, never the password it was given', async () => {
      repository.findOne.mockResolvedValue(null);
      repository.save.mockImplementation(async (user) => user as User);

      await service.createForAdmin({
        email: 'a@b.c',
        firstName: 'A',
        lastName: 'B',
        password: 'plain-text-secret',
      });

      expect(repository.save).toHaveBeenCalledTimes(1);
      const saved = repository.save.mock.calls[0][0] as User;
      expect(saved.password).not.toBe('plain-text-secret');
      // A bcrypt of the plaintext, hashed once, at the cost the rest of the
      // service uses. Hashing an already hashed value would fail this compare.
      await expect(
        bcrypt.compare('plain-text-secret', saved.password),
      ).resolves.toBe(true);
      expect(bcrypt.getRounds(saved.password)).toBe(10);
    });

    it('creates the account active', async () => {
      repository.findOne.mockResolvedValue(null);
      repository.save.mockImplementation(async (user) => user as User);

      await service.createForAdmin({
        email: 'a@b.c',
        firstName: 'A',
        lastName: 'B',
        password: 'plain-text-secret',
      });

      expect((repository.save.mock.calls[0][0] as User).status).toBe('active');
    });

    it('refuses an email a soft-deleted user still holds', async () => {
      // The unique index does not release the address when the row is soft
      // deleted, so without this the admin gets a Postgres 500 they cannot
      // act on.
      repository.findOne.mockResolvedValue({ id: 3 } as User);

      await expect(
        service.createForAdmin({
          email: 'taken@b.c',
          firstName: 'A',
          lastName: 'B',
          password: 'plain-text-secret',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.save).not.toHaveBeenCalled();

      const [options] = repository.findOne.mock.calls[0];
      // The lookup has to see deleted rows or it misses the collision.
      expect(options).toMatchObject({ withDeleted: true });
    });

    it('treats an address differing only by case as a different account', async () => {
      // Current behaviour, pinned rather than endorsed: the column is
      // case-sensitive and findOne matches exactly. Changing it should be a
      // decision, not a side effect.
      repository.findOne.mockResolvedValue(null);
      repository.save.mockImplementation(async (user) => user as User);

      await service.createForAdmin({
        email: 'A@b.c',
        firstName: 'A',
        lastName: 'B',
        password: 'plain-text-secret',
      });

      const [options] = repository.findOne.mock.calls[0];
      expect(options).toMatchObject({ where: { email: 'A@b.c' } });
    });
  });

  describe('updateForAdmin', () => {
    it('refuses an email another user holds', async () => {
      repository.findOne.mockImplementation(async (options) => {
        const where = (options as FindOneOptions<User>).where as Partial<User>;
        if (where.email === 'taken@b.c') return { id: 99 } as User;
        return { id: 7, email: 'mine@b.c', userCourses: [] } as unknown as User;
      });

      await expect(
        service.updateForAdmin(7, { email: 'taken@b.c' }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('lets a user keep the email they already have', async () => {
      repository.findOne.mockImplementation(async (options) => {
        const where = (options as FindOneOptions<User>).where as Partial<User>;
        if (where.email === 'mine@b.c') return { id: 7 } as User;
        return { id: 7, email: 'mine@b.c', userCourses: [] } as unknown as User;
      });

      await service.updateForAdmin(7, { email: 'mine@b.c', firstName: 'New' });

      expect(repository.update).toHaveBeenCalledWith(7, {
        email: 'mine@b.c',
        firstName: 'New',
      });
    });

    it('writes only the declared fields, whatever else the body carries', async () => {
      // The global ValidationPipe has no whitelist, so an undeclared key such
      // as `password` or `status` reaches the service inside the DTO object.
      repository.findOne.mockResolvedValue({
        id: 7,
        email: 'mine@b.c',
        userCourses: [],
      } as unknown as User);

      await service.updateForAdmin(7, {
        firstName: 'New',
        password: 'plain-text-secret',
        status: 'inactive',
      } as never);

      expect(repository.update).toHaveBeenCalledTimes(1);
      const [, changes] = repository.update.mock.calls[0];
      expect(Object.keys(changes).sort()).toEqual([
        'email',
        'firstName',
        'lastName',
      ]);
      expect(changes).not.toHaveProperty('password');
      expect(changes).not.toHaveProperty('status');
    });

    it('reports a user that does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.updateForAdmin(7, { firstName: 'New' }),
      ).rejects.toThrow(NotFoundException);
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('removeForAdmin', () => {
    it('refuses a user who bought a course', async () => {
      repository.findOne.mockResolvedValue({
        id: 7,
        userCourses: [{ id: 1 }],
        userPremiums: [],
      } as unknown as User);

      await expect(service.removeForAdmin(7)).rejects.toThrow(
        BadRequestException,
      );
      expect(repository.softDelete).not.toHaveBeenCalled();
    });

    it('refuses a user with a premium record but no course', async () => {
      // user_premium.user_id is NO ACTION too. Hiding the user would strand a
      // paid record pointing at someone the admin can no longer see.
      repository.findOne.mockResolvedValue({
        id: 7,
        userCourses: [],
        userPremiums: [{ id: 2 }],
      } as unknown as User);

      await expect(service.removeForAdmin(7)).rejects.toThrow(
        BadRequestException,
      );
      expect(repository.softDelete).not.toHaveBeenCalled();
    });

    it('refuses a user whose only enrolment was revoked (soft deleted)', async () => {
      // A revoked enrolment is still the record of a purchase. TypeORM leaves
      // soft-deleted rows out of a relation unless the query says otherwise, so
      // this double behaves the same way: the revoked row only shows up when
      // the lookup asks for deleted rows.
      const revoked = { id: 1, deletedAt: new Date() };
      repository.findOne.mockImplementation(async (options) => {
        const withDeleted = (options as FindOneOptions<User>).withDeleted;
        return {
          id: 7,
          userCourses: withDeleted ? [revoked] : [],
          userPremiums: [],
        } as unknown as User;
      });

      await expect(service.removeForAdmin(7)).rejects.toThrow(
        BadRequestException,
      );
      expect(repository.softDelete).not.toHaveBeenCalled();

      const [options] = repository.findOne.mock.calls[0];
      expect(options).toMatchObject({
        where: { id: 7 },
        withDeleted: true,
      });
    });

    it('refuses a user whose only premium record was soft deleted', async () => {
      repository.findOne.mockImplementation(async (options) => {
        const withDeleted = (options as FindOneOptions<User>).withDeleted;
        return {
          id: 7,
          userCourses: [],
          userPremiums: withDeleted ? [{ id: 2, deletedAt: new Date() }] : [],
        } as unknown as User;
      });

      await expect(service.removeForAdmin(7)).rejects.toThrow(
        BadRequestException,
      );
      expect(repository.softDelete).not.toHaveBeenCalled();
    });

    it('soft deletes a user who bought nothing', async () => {
      repository.findOne.mockResolvedValue({
        id: 7,
        userCourses: [],
        userPremiums: [],
      } as unknown as User);

      await service.removeForAdmin(7);

      expect(repository.softDelete).toHaveBeenCalledWith(7);
    });

    it('reports a user that does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.removeForAdmin(7)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('reports a user that is already deleted', async () => {
      // `withDeleted` also lets the lookup see the user row itself.
      repository.findOne.mockResolvedValue({
        id: 7,
        deletedAt: new Date(),
        userCourses: [],
        userPremiums: [],
      } as unknown as User);

      await expect(service.removeForAdmin(7)).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.softDelete).not.toHaveBeenCalled();
    });
  });

  describe('setStatus', () => {
    it('writes the status', async () => {
      repository.findOne.mockResolvedValue({ id: 7 } as User);

      await service.setStatus(7, 'inactive');

      expect(repository.update).toHaveBeenCalledWith(7, {
        status: 'inactive',
      });
    });

    it('reports a user that does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.setStatus(7, 'inactive')).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.update).not.toHaveBeenCalled();
    });
  });
});
