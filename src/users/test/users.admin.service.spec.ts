import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { NotFoundException } from '@nestjs/common';

import { User } from '../entities/user.entity';
import { UsersService } from '../users.service';
import {
  createMockDataSource,
  createMockRepository,
} from 'src/common/test/mocks';
import { PaginationParams } from 'src/common/pagination.type';

function params(overrides: Partial<PaginationParams> = {}): PaginationParams {
  return { page: 1, limit: 10, ...overrides } as PaginationParams;
}

describe('UsersService.findAllForAdmin', () => {
  let service: UsersService;
  let repository: ReturnType<typeof createMockRepository<User>>;
  let dataSource: ReturnType<typeof createMockDataSource>;

  beforeEach(async () => {
    repository = createMockRepository<User>();
    repository.findAndCount.mockResolvedValue([[], 0]);
    dataSource = createMockDataSource();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: repository },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();
    service = module.get(UsersService);
  });

  it('asks for the slice that matches the page and limit', async () => {
    await service.findAllForAdmin(params({ page: 3, limit: 10 }));

    const [options] = repository.findAndCount.mock.calls[0];
    expect(options).toMatchObject({ skip: 20, take: 10 });
  });

  it('orders by newest first and always ends with a stable key', async () => {
    await service.findAllForAdmin(params());

    const [options] = repository.findAndCount.mock.calls[0];
    // Users created in one import share a createdAt, and under LIMIT/OFFSET a
    // tie lets a row appear on two pages or on none.
    expect(options.order).toEqual({ createdAt: 'DESC', id: 'DESC' });
  });

  it('maps a whitelisted sort key onto its column', async () => {
    await service.findAllForAdmin(params({ sortBy: 'email', sortDir: 'ASC' }));

    const [options] = repository.findAndCount.mock.calls[0];
    expect(options.order).toEqual({ email: 'ASC', id: 'DESC' });
  });

  it('ignores a sort key that is not on the whitelist', async () => {
    await service.findAllForAdmin(
      params({ sortBy: 'password', sortDir: 'ASC' }),
    );

    const [options] = repository.findAndCount.mock.calls[0];
    // A caller never names a column. Falling back to the default is the safe
    // answer; interpolating `password` would be the unsafe one.
    expect(options.order).toEqual({ createdAt: 'DESC', id: 'DESC' });
  });

  it('matches the search term against both name fields and the email', async () => {
    await service.findAllForAdmin(params({ search: 'nguyen' }));

    const [options] = repository.findAndCount.mock.calls[0];
    // TypeORM expresses OR as an array of where objects.
    expect(Array.isArray(options.where)).toBe(true);
    const keys = (options.where as Record<string, unknown>[]).map((clause) =>
      Object.keys(clause),
    );
    expect(keys).toEqual([['firstName'], ['lastName'], ['email']]);
  });

  it('adds no where clause when nothing is searched for', async () => {
    await service.findAllForAdmin(params());

    const [options] = repository.findAndCount.mock.calls[0];
    expect(options.where).toBeUndefined();
  });

  it('attaches the number of courses each user bought', async () => {
    // The list advertises this number. Loading the relation on a paginated
    // find multiplies rows, and counting the join table alone would count
    // enrolments whose course is soft deleted — the same mistake
    // attachQuestionCounts made, where a set promised 250 and served 249.
    repository.findAndCount.mockResolvedValue([
      [{ id: 4 } as User, { id: 9 } as User],
      2,
    ]);
    dataSource.query.mockResolvedValue([{ user_id: 4, count: '3' }]);

    const result = await service.findAllForAdmin(params());

    expect(result.items.map((user) => user.courseCount)).toEqual([3, 0]);

    const [sql, bindings] = dataSource.query.mock.calls[0] as unknown as [
      string,
      unknown[],
    ];
    expect(sql).toMatch(/JOIN\s+course/i);
    // Both halves of the join carry their own soft-delete flag: the course
    // (a removed course) and the enrolment row (a revoked enrolment). Each
    // must be filtered; matching a bare `deleted_at IS NULL` would accept
    // either alias alone.
    expect(sql).toMatch(/\bc\.deleted_at IS NULL/i);
    expect(sql).toMatch(/\buc\.deleted_at IS NULL/i);
    expect(bindings).toEqual([[4, 9]]);
  });

  it('does not query for counts when the page is empty', async () => {
    repository.findAndCount.mockResolvedValue([[], 0]);

    await service.findAllForAdmin(params());

    expect(dataSource.query).not.toHaveBeenCalled();
  });
});

describe('UsersService.findOneForAdmin', () => {
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

  it('loads the user with the courses they bought', async () => {
    repository.findOne.mockResolvedValue({ id: 7, userCourses: [] } as User);

    await service.findOneForAdmin(7);

    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: 7 },
      relations: ['userCourses', 'userCourses.course'],
    });
  });

  it('drops enrolments whose course was soft deleted', async () => {
    // TypeORM applies the soft-delete filter to the joined course, so a live
    // enrolment pointing at a deleted course comes back with `course: null`.
    // The admin page cannot render that row and would crash on `.course.name`.
    repository.findOne.mockResolvedValue({
      id: 7,
      userCourses: [
        { id: 1, course: { id: 10, name: 'Live course' } },
        { id: 2, course: null },
      ],
    } as unknown as User);

    const user = await service.findOneForAdmin(7);

    expect(user.userCourses.map((uc) => uc.id)).toEqual([1]);
    expect(user.userCourses.every((uc) => uc.course)).toBeTruthy();
  });

  it('throws NotFoundException when the user does not exist', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.findOneForAdmin(999)).rejects.toThrow(
      NotFoundException,
    );
  });
});
