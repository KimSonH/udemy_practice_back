import type { Repository } from 'typeorm';

/**
 * A repository shaped just enough for Nest's injector and for the query paths
 * the services actually take. Every method is a jest mock, so a test can give
 * one a return value without building a whole fake ORM.
 *
 * This file lives under `src/common/test`, which `tsconfig.build.json` excludes
 * from the production build — it must never reach `dist`.
 */
export function createMockRepository<T extends object = object>(): jest.Mocked<
  Repository<T>
> {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    findBy: jest.fn(),
    findOneBy: jest.fn(),
    findAndCount: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    softDelete: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  } as unknown as jest.Mocked<Repository<T>>;
}

/**
 * Stands in for a guard while a spec only checks that a controller assembles.
 * Without it Nest instantiates the real guard, which drags in ConfigService and
 * the whole passport strategy for a test that never issues a request.
 */
export const allowAllGuard = { canActivate: () => true };

/**
 * A DataSource whose only job is to satisfy the injector. Services that open a
 * transaction get a runner whose calls all resolve, so nothing reaches a
 * database.
 */
export function createMockDataSource() {
  return {
    createQueryRunner: jest.fn(() => ({
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: { save: jest.fn(), find: jest.fn(), delete: jest.fn() },
    })),
    // Raw reads, e.g. the grouped question count the course lists attach.
    query: jest.fn(async () => []),
    transaction: jest.fn(),
    getRepository: jest.fn(),
  };
}
