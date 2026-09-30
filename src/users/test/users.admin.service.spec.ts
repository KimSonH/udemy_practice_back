import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

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
    expect(options.where).toHaveLength(3);
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
    expect(sql).toMatch(/deleted_at IS NULL/i);
    expect(bindings).toEqual([[4, 9]]);
  });

  it('does not query for counts when the page is empty', async () => {
    repository.findAndCount.mockResolvedValue([[], 0]);

    await service.findAllForAdmin(params());

    expect(dataSource.query).not.toHaveBeenCalled();
  });
});
