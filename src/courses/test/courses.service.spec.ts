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
  const thenBy: Array<[string, string]> = [];
  const skip: unknown[] = [];
  const take: unknown[] = [];

  const record = (sql: string, params?: Record<string, unknown>) => {
    conditions.push({ sql, params });
  };

  const selected: string[] = [];
  // The order matters for `select`, which replaces the column list rather than
  // adding to it, so the sequence of calls is recorded too.
  const calls: string[] = [];

  const builder = {
    select: jest.fn((columns: string[]) => {
      calls.push('select');
      selected.push(...columns);
      return builder;
    }),
    leftJoinAndSelect: jest.fn(() => {
      calls.push('leftJoinAndSelect');
      return builder;
    }),
    innerJoin: jest.fn(() => {
      calls.push('innerJoin');
      return builder;
    }),
    leftJoin: jest.fn(() => {
      calls.push('leftJoin');
      return builder;
    }),
    where: jest.fn((clause: string, params?: Record<string, unknown>) => {
      record(clause, params);
      return builder;
    }),
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
    // Kept apart from orderBy so a test about the chosen sort stays about
    // that, and the tie breaker has its own assertion.
    addOrderBy: jest.fn((column: string, direction: string) => {
      thenBy.push([column, direction]);
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

  return { builder, conditions, orderBy, thenBy, skip, take, selected, calls };
}

function params(overrides: Partial<PaginationParams> = {}): PaginationParams {
  return { page: 1, limit: 10, ...overrides } as PaginationParams;
}

describe('CoursesService', () => {
  let service: CoursesService;
  let repository: ReturnType<typeof createMockRepository<Course>>;
  let dataSource: ReturnType<typeof createMockDataSource>;

  beforeEach(async () => {
    repository = createMockRepository<Course>();
    dataSource = createMockDataSource();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        { provide: getRepositoryToken(Course), useValue: repository },
        { provide: CourseSetsService, useValue: {} },
        { provide: UdemyQuestionBanksService, useValue: {} },
        { provide: OrganizationsService, useValue: {} },
        { provide: DataSource, useValue: dataSource },
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

    describe('tie breaking', () => {
      it('always ends the ordering with a stable key', async () => {
        const spy = createQueryBuilderSpy();
        repository.createQueryBuilder.mockReturnValue(spy.builder as never);

        await service.findAllByAdmin(params({ sortBy: 'status' }));

        // Every course has status "Active", so sorting by it ties across the
        // whole table and the database is free to return any ten of those
        // rows for a page. Without a last key a row can show up on two pages
        // or on none.
        expect(spy.orderBy).toEqual([['course.status', 'DESC']]);
        expect(spy.thenBy).toEqual([['course.id', 'DESC']]);
      });

      it('adds it even when no sort was asked for', async () => {
        const spy = createQueryBuilderSpy();
        repository.createQueryBuilder.mockReturnValue(spy.builder as never);

        await service.findAllByAdmin(params());

        // The default is createdAt, and courses imported together share one.
        expect(spy.thenBy).toEqual([['course.id', 'DESC']]);
      });
    });

    describe('columns', () => {
      it('never asks the database for the course body', async () => {
        const spy = createQueryBuilderSpy();
        repository.createQueryBuilder.mockReturnValue(spy.builder as never);

        await service.findAllByAdmin(params());

        // `content` is the whole detail page as HTML. No list renders it,
        // and on a page of twelve courses it was the largest thing read and
        // sent. Naming the columns is what keeps it out, so this is the
        // check that a later "just add one more" does not put it back.
        expect(spy.selected).not.toContain('course.content');
        expect(spy.selected).toContain('course.name');
        expect(spy.selected).toContain('course.price');
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

      it.each([
        ['Free', 'free'],
        ['PAID', 'paid'],
        ['  free  ', 'free'],
        ['Paid', 'paid'],
      ])('normalises %s to %s before binding it', async (given, expected) => {
        const spy = arrange();

        await service.findAllByAdmin(params({ type: given }));

        // The normalised value is what reaches the query, or it would be
        // compared against a column that only ever holds lowercase.
        expect(spy.conditions).toContainEqual({
          sql: 'course.type = :type',
          params: { type: expected },
        });
      });

      it('treats a whitespace-only type as no filter at all', async () => {
        const spy = arrange();

        await service.findAllByAdmin(params({ type: '   ' }));

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

  describe('attachQuestionCounts', () => {
    function arrangeWithSets(setIds: number[], total = 1) {
      const course = {
        id: 1,
        courseSets: setIds.map((id) => ({ id })),
      } as unknown as Course;
      const spy = createQueryBuilderSpy([course], total);
      repository.createQueryBuilder.mockReturnValue(spy.builder as never);
      return { spy, course };
    }

    it('counts only questions that are not soft-deleted', async () => {
      const { course } = arrangeWithSets([7, 8]);
      dataSource.query.mockResolvedValue([
        { course_set_id: 7, count: '249' },
        { course_set_id: 8, count: '250' },
      ]);

      await service.findAll(params());

      const [sql] = dataSource.query.mock.calls[0] as unknown as [
        string,
        unknown[],
      ];
      // A soft-deleted question keeps its row in the link table, and the
      // relation the exam loads drops it. Counting the link table alone would
      // advertise a set of 250 and then serve 249.
      expect(sql).toMatch(/JOIN\s+udemy_question_bank/i);
      expect(sql).toMatch(/deleted_at IS NULL/i);
      expect(course.courseSets.map((set) => set.questionCount)).toEqual([
        249, 250,
      ]);
    });

    it('passes the set ids it was asked about', async () => {
      arrangeWithSets([7, 8]);
      dataSource.query.mockResolvedValue([]);

      await service.findAll(params());

      const [, bindings] = dataSource.query.mock.calls[0] as unknown as [
        string,
        unknown[],
      ];
      expect(bindings).toEqual([[7, 8]]);
    });

    it('reports a set the query said nothing about as zero', async () => {
      const { course } = arrangeWithSets([7, 8]);
      dataSource.query.mockResolvedValue([{ course_set_id: 7, count: '3' }]);

      await service.findAll(params());

      // GROUP BY returns no row for a set whose questions are all deleted.
      expect(course.courseSets.map((set) => set.questionCount)).toEqual([3, 0]);
    });

    it('does not query at all when no course has a set', async () => {
      const course = { id: 1, courseSets: [] } as unknown as Course;
      const spy = createQueryBuilderSpy([course], 1);
      repository.createQueryBuilder.mockReturnValue(spy.builder as never);

      await service.findAll(params());

      expect(dataSource.query).not.toHaveBeenCalled();
    });
  });

  describe('findAllVideoCourses', () => {
    function arrange(items: unknown[] = [], total = 0) {
      const spy = createQueryBuilderSpy(items, total);
      repository.createQueryBuilder.mockReturnValue(spy.builder as never);
      return spy;
    }

    describe('columns', () => {
      it('never asks the database for the course body', async () => {
        const spy = arrange();

        await service.findAllVideoCourses(params());

        // This listing was the one route still reading `content`: on
        // production the single video course carried 4,875 bytes of it, more
        // than two thirds of the response, for a card that renders none of it.
        //
        // The length check is what gives the next line its meaning: with no
        // column list at all the query reads every column, `selected` is
        // empty, and `not.toContain` would pass while the body came back.
        expect(spy.selected.length).toBeGreaterThan(0);
        expect(spy.selected).not.toContain('course.content');
      });

      it('still asks for what the course card renders', async () => {
        const spy = arrange();

        await service.findAllVideoCourses(params());

        expect(spy.selected).toContain('course.id');
        expect(spy.selected).toContain('course.name');
        expect(spy.selected).toContain('course.slug');
        expect(spy.selected).toContain('course.price');
        expect(spy.selected).toContain('course.type');
        expect(spy.selected).toContain('course.thumbnailImageUrl');
      });

      it('names the columns before joining the organization', async () => {
        const spy = arrange();

        await service.findAllVideoCourses(params());

        // `select` replaces the column list. Called after leftJoinAndSelect it
        // would throw the organization columns away, and the card's link to
        // the organization would quietly disappear.
        expect(spy.calls.indexOf('select')).toBeLessThan(
          spy.calls.indexOf('leftJoinAndSelect'),
        );
      });
    });

    describe('tie breaking', () => {
      it('ends the ordering with a stable key', async () => {
        const spy = arrange();

        await service.findAllVideoCourses(params());

        expect(spy.orderBy).toEqual([['course.createdAt', 'DESC']]);
        expect(spy.thenBy).toEqual([['course.id', 'DESC']]);
      });
    });
  });

  describe('createCourse exam timing', () => {
    it('stores the values it is given on a new course', async () => {
      repository.findOne.mockResolvedValue(null); // slug is free

      const saved: Course[] = [];
      const insertChain = {
        insert: jest.fn(() => insertChain),
        into: jest.fn(() => insertChain),
        values: jest.fn(() => insertChain),
        execute: jest.fn(async () => ({ raw: [{ id: 10 }] })),
      };
      dataSource.createQueryRunner.mockReturnValue({
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager: {
          getRepository: jest.fn(() => ({
            findOne: jest.fn(async () => ({ id: 2 })),
          })),
          createQueryBuilder: jest.fn(() => insertChain),
          save: jest.fn(async (entity: Course) => {
            saved.push(entity);
            return entity;
          }),
        },
      } as never);

      await service.createCourse({
        name: 'AI-102',
        price: 24.99,
        status: 'active',
        type: 'paid',
        organizationId: '2',
        courseSets: 1,
        creationMode: 'manual',
        content: '<p>x</p>',
        durationMinutes: 100,
        passingPercent: 70,
      } as never);

      expect(saved[0].durationMinutes).toBe(100);
      expect(saved[0].passingPercent).toBe(70);
    });
  });

  describe('updateCourse exam timing', () => {
    /**
     * The update path needs a stored course, a slug lookup and a transaction.
     * Everything here exists so the two assignments under test can be observed
     * on the entity that gets saved.
     */
    function arrange(stored: Partial<Course>) {
      const course = {
        id: 1,
        creationMode: 'manual',
        categoryName: null,
        courseSets: [],
        ...stored,
      } as unknown as Course;

      repository.findOne.mockImplementation(
        async ({ where }: { where: Record<string, unknown> }) =>
          // The slug lookup asks by slug and must find nothing, or it appends a
          // suffix forever; the course lookup asks by id.
          'slug' in where ? null : course,
      );

      const saved: Course[] = [];
      const runner = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager: {
          getRepository: jest.fn(() => ({ findOne: jest.fn() })),
          save: jest.fn(async (entity: Course) => {
            saved.push(entity);
            return entity;
          }),
          query: jest.fn(),
        },
      };
      dataSource.createQueryRunner.mockReturnValue(runner as never);

      return { course, saved };
    }

    const base = { name: 'AI-102', price: 1, status: 'active', type: 'paid' };

    it('stores the values it is given', async () => {
      const { saved } = arrange({
        durationMinutes: null,
        passingPercent: null,
      });

      await service.updateCourse(1, {
        ...base,
        durationMinutes: 100,
        passingPercent: 70,
      } as never);

      expect(saved[0].durationMinutes).toBe(100);
      expect(saved[0].passingPercent).toBe(70);
    });

    it('leaves the stored values alone when the payload omits them', async () => {
      const { saved } = arrange({ durationMinutes: 100, passingPercent: 70 });

      await service.updateCourse(1, { ...base } as never);

      // Unlike the fields beside them, which overwrite with undefined: a client
      // that knows nothing about exam timing must not silently erase it.
      expect(saved[0].durationMinutes).toBe(100);
      expect(saved[0].passingPercent).toBe(70);
    });

    it('clears a value when the payload sends null for it', async () => {
      const { saved } = arrange({ durationMinutes: 100, passingPercent: 70 });

      await service.updateCourse(1, {
        ...base,
        durationMinutes: null,
      } as never);

      expect(saved[0].durationMinutes).toBeNull();
      // Untouched, because the payload said nothing about it.
      expect(saved[0].passingPercent).toBe(70);
    });
  });
});
