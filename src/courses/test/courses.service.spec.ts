import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Brackets, DataSource } from 'typeorm';

import { CoursesService } from '../courses.service';
import { Course } from '../entities/courses.entity';
import { CourseSetsService } from 'src/course-sets/course-sets.service';
import { UdemyQuestionBanksService } from 'src/udemy-question-banks/udemy-question-banks.service';
import { OrganizationsService } from 'src/organizations/organizations.service';
import { PaginationParams } from 'src/common/pagination.type';
import {
  createMockDataSource,
  createMockRepository,
} from 'src/common/test/mocks';

type Condition = { sql: string; params?: Record<string, unknown> };

/**
 * A query builder that records what was asked of it instead of talking to a
 * database. `andWhere` is given a Brackets for the filter group, so the factory
 * inside it is run against a stub to make those conditions observable too.
 */
function createQueryBuilderSpy(items: unknown[] = [], total = 0) {
  const conditions: Condition[] = [];
  const orderBy: Array<[string, string]> = [];
  const skip: unknown[] = [];
  const take: unknown[] = [];

  const record = (sql: string, params?: Record<string, unknown>) => {
    conditions.push({ sql, params });
  };

  const builder = {
    leftJoinAndSelect: jest.fn(() => builder),
    andWhere: jest.fn(
      (clause: string | Brackets, params?: Record<string, unknown>) => {
        if (clause instanceof Brackets) {
          clause.whereFactory({ andWhere: record } as never);
        } else {
          record(clause, params);
        }
        return builder;
      },
    ),
    orderBy: jest.fn((column: string, direction: string) => {
      orderBy.push([column, direction]);
      return builder;
    }),
    skip: jest.fn((value: unknown) => {
      skip.push(value);
      return builder;
    }),
    take: jest.fn((value: unknown) => {
      take.push(value);
      return builder;
    }),
    getManyAndCount: jest.fn(async () => [items, total]),
  };

  return { builder, conditions, orderBy, skip, take };
}

function params(overrides: Partial<PaginationParams> = {}): PaginationParams {
  return { page: 1, limit: 10, ...overrides } as PaginationParams;
}

describe('CoursesService', () => {
  let service: CoursesService;
  let repository: ReturnType<typeof createMockRepository<Course>>;

  beforeEach(async () => {
    repository = createMockRepository<Course>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        { provide: getRepositoryToken(Course), useValue: repository },
        { provide: CourseSetsService, useValue: {} },
        { provide: UdemyQuestionBanksService, useValue: {} },
        { provide: OrganizationsService, useValue: {} },
        { provide: DataSource, useValue: createMockDataSource() },
      ],
    }).compile();

    service = module.get<CoursesService>(CoursesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllByAdmin', () => {
    function arrange(items: unknown[] = [], total = 0) {
      const spy = createQueryBuilderSpy(items, total);
      repository.createQueryBuilder.mockReturnValue(spy.builder as never);
      return spy;
    }

    describe('paging', () => {
      it('asks for the slice that matches the page and limit', async () => {
        const spy = arrange();

        await service.findAllByAdmin(params({ page: 3, limit: 10 }));

        expect(spy.skip).toEqual([20]);
        expect(spy.take).toEqual([10]);
      });

      it('starts at zero on the first page', async () => {
        const spy = arrange();

        await service.findAllByAdmin(params({ page: 1, limit: 25 }));

        expect(spy.skip).toEqual([0]);
        expect(spy.take).toEqual([25]);
      });

      it('turns paging off for the page 9999 escape hatch', async () => {
        const spy = arrange();

        await service.findAllByAdmin(params({ page: 9999, limit: 10 }));

        expect(spy.skip).toEqual([undefined]);
        expect(spy.take).toEqual([undefined]);
      });

      it('returns the rows, the total and the paging it was given', async () => {
        arrange([{ id: 1 }, { id: 2 }], 57);

        const result = await service.findAllByAdmin(
          params({ page: 2, limit: 20 }),
        );

        expect(result).toEqual({
          items: [{ id: 1 }, { id: 2 }],
          total: 57,
          page: 2,
          limit: 20,
        });
      });
    });

    describe('sorting', () => {
      it('defaults to newest first', async () => {
        const spy = arrange();

        await service.findAllByAdmin(params());

        expect(spy.orderBy).toEqual([['course.createdAt', 'DESC']]);
      });

      it('still honours the legacy orderBy parameter', async () => {
        const spy = arrange();

        await service.findAllByAdmin(params({ orderBy: 'ASC' }));

        expect(spy.orderBy).toEqual([['course.createdAt', 'ASC']]);
      });

      it('maps a whitelisted sort key onto its column', async () => {
        const spy = arrange();

        await service.findAllByAdmin(
          params({ sortBy: 'name', sortDir: 'ASC' }),
        );

        expect(spy.orderBy).toEqual([['course.name', 'ASC']]);
      });

      it('treats any direction other than ASC as DESC', async () => {
        const spy = arrange();

        await service.findAllByAdmin(
          params({ sortBy: 'name', sortDir: 'sideways' }),
        );

        expect(spy.orderBy).toEqual([['course.name', 'DESC']]);
      });

      it('discards the direction too when the sort key is not whitelisted', async () => {
        const spy = arrange();

        await service.findAllByAdmin(
          params({ sortBy: 'password', sortDir: 'ASC' }),
        );

        // Not ['course.createdAt', 'ASC']: rejecting the key rejects the whole
        // sort, so the direction comes from the default rather than from the
        // request that was just refused.
        expect(spy.orderBy).toEqual([['course.createdAt', 'DESC']]);
      });

      it('never lets a sort key reach the query as written', async () => {
        const spy = arrange();

        // TypeORM interpolates the orderBy column rather than binding it, so
        // the whitelist is the only thing standing between this parameter and
        // the SQL. It must not appear in the query under any spelling.
        await service.findAllByAdmin(
          params({ sortBy: 'name; DROP TABLE courses' }),
        );

        expect(spy.orderBy).toEqual([['course.createdAt', 'DESC']]);
      });

      it('ignores a sort key inherited from Object.prototype', async () => {
        const spy = arrange();

        await service.findAllByAdmin(params({ sortBy: 'constructor' }));

        expect(spy.orderBy).toEqual([['course.createdAt', 'DESC']]);
      });
    });

    describe('filtering', () => {
      it('always excludes soft-deleted courses', async () => {
        const spy = arrange();

        await service.findAllByAdmin(params());

        expect(spy.conditions).toContainEqual({
          sql: 'course.deletedAt IS NULL',
          params: undefined,
        });
      });

      it('adds nothing else when no filter is asked for', async () => {
        const spy = arrange();

        await service.findAllByAdmin(params());

        expect(spy.conditions).toHaveLength(1);
      });

      it('matches the search term anywhere in the name, case-insensitively', async () => {
        const spy = arrange();

        await service.findAllByAdmin(params({ search: 'azure' }));

        expect(spy.conditions).toContainEqual({
          sql: 'course.name ILIKE :search',
          params: { search: '%azure%' },
        });
      });

      it('filters by type through a fixed map', async () => {
        const spy = arrange();

        await service.findAllByAdmin(params({ type: 'free' }));

        expect(spy.conditions).toContainEqual({
          sql: 'course.type = :type',
          params: { type: 'free' },
        });
      });

      it('coerces organizationId to a number', async () => {
        const spy = arrange();

        await service.findAllByAdmin(params({ organizationId: '42' }));

        expect(spy.conditions).toContainEqual({
          sql: 'organization.id = :organizationId',
          params: { organizationId: 42 },
        });
      });

      it('filters by organization slug', async () => {
        const spy = arrange();

        await service.findAllByAdmin(params({ organizationSlug: 'acme' }));

        expect(spy.conditions).toContainEqual({
          sql: 'organization.slug = :organizationSlug',
          params: { organizationSlug: 'acme' },
        });
      });

      it('applies every filter given at once', async () => {
        const spy = arrange();

        await service.findAllByAdmin(
          params({
            search: 'azure',
            type: 'paid',
            organizationId: '7',
            organizationSlug: 'acme',
          }),
        );

        // The soft-delete guard plus the four filters.
        expect(spy.conditions).toHaveLength(5);
      });

      it('adds no type condition when the type is an empty string', async () => {
        const spy = arrange();

        await service.findAllByAdmin(params({ type: '' }));

        expect(spy.conditions).toHaveLength(1);
      });

      it('rejects a type that is neither free nor paid', async () => {
        arrange();

        // Binding an unrecognised type used to leave the parameter undefined,
        // and the endpoint answered 200 with an empty list — which reads as
        // "there are no courses" rather than "that is not a course type".
        await expect(
          service.findAllByAdmin(params({ type: 'gift' })),
        ).rejects.toThrow(
          new BadRequestException('"type" must be one of: free, paid'),
        );
      });
    });

    describe('when the query fails', () => {
      it('reports a bad request rather than leaking the database error', async () => {
        const spy = arrange();
        spy.builder.getManyAndCount.mockRejectedValue(
          new Error('connection terminated'),
        );

        await expect(service.findAllByAdmin(params())).rejects.toThrow(
          new BadRequestException('Error getting courses'),
        );
      });
    });
  });
});
