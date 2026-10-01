# User Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the admin a Users section that can list, create, edit and — the part that matters — lock a learner out of signing in.

**Architecture:** Bottom-up. A migration adds `user.status`, then the three auth entry points start refusing inactive users, then the unguarded public `users` controller is removed, then a guarded `admin/users` controller is built, and only then do the admin pages consume it. Every backend task follows the shape `admin/organizations` already uses: guarded controller, `resolveSort` + `toOrderObject` with an `id` tiebreaker, service returning `{ items, total, page, limit }`.

**Tech Stack:** NestJS 11, TypeORM, Postgres, Jest 29, bcrypt. Admin: Next.js 16 (App Router, Turbopack), React 19, TanStack Table v8, shadcn/ui, zod, Vitest.

**Spec:** `docs/features/user-management.md`

## Global Constraints

- **Two repos.** Tasks 1–5 are in `udemy_practice_back`. Tasks 6–7 are in `udemy_practice_admin`. Never mix them in one commit.
- **Commit, never push.** Standing user instruction: the user pushes.
- **Never run migrations.** Task 1 writes a migration; the user runs it. Do not run `npm run migration:run` in any environment.
- **Comments and thrown messages in English.** User-facing strings localize en + vi on the front.
- **Conventional Commits**, English, imperative mood. **No co-author lines.** Never pass `-c user.email` / `-c user.name` to git.
- **`status` values are exactly `'active'` and `'inactive'`**, lowercase varchar, matching `course.status`.
- **The access token lives 604800 seconds.** This is why a login-only check is not enough.
- **Run `npx jest` on its own line** — never chained behind another command with `&&`. A `grep` succeeding on failure output has masked a red suite here before.
- **Admin checks:** `npx tsc --noEmit`, `npx eslint src --max-warnings=0`, `npx vitest run`.
- **The admin dev server is on port 3001**; port 3000 is the learner front, a different repo on a different Tailwind major.

## Review Focus

Five things the spec implies that no happy path would exercise. Each has a test assigned to the task that owns the code.

1. **Deleting a user who has a `user_premium` row but no `user_course`.** The spec says "refuse if the user has an enrolment", but `user_premium.user_id` is `NO ACTION` too. Hiding such a user strands a paid record. The guard must count both. — Task 5.
2. **An email that collides with a soft-deleted user.** `email` is UNIQUE and a soft delete does not release it, so create and update must answer with a readable field error rather than a Postgres 500. — Task 5.
3. **An in-flight request from someone locked a second ago.** The token is valid and unexpired; the next call must be refused. This is the whole feature — a test that only drives the login form passes against a build where locking does nothing. — Task 2.
4. **An email differing only by case.** `getByEmail` uses `findOneBy({ email })`, an exact match, and the unique index is case-sensitive, so `A@x.com` and `a@x.com` are two accounts. Creating users from the admin makes this easy to hit. Pin the behaviour so changing it is deliberate. — Task 5.
5. **A sort key that is not on the whitelist.** `resolveSort` must drop it and fall back, never let a caller name a column. — Task 4.

## File Structure

**`udemy_practice_back`**

| File | Responsibility |
|---|---|
| `src/migrations/1786500012000-AddStatusToUser.ts` | Create: adds `user.status`. |
| `src/users/user-status.ts` | Create: the status constants and the one `assertUserActive` helper the three auth paths call. |
| `src/users/entities/user.entity.ts` | Modify: add the `status` column. |
| `src/authentication/strategy/jwt.strategy.ts` | Modify: refuse an inactive user. |
| `src/authentication/strategy/jwt-refresh-token.strategy.ts` | Modify: same. |
| `src/authentication/authentication.service.ts` | Modify: same, at login. |
| `src/users/users.controller.ts` | Delete: unguarded, unused, writes plaintext passwords. |
| `src/users/users.service.ts` | Modify: hash in `create`; add the admin read and write methods. |
| `src/users/users.admin.controller.ts` | Create: the guarded `admin/users` routes. |
| `src/users/dto/admin-user.dto.ts` | Create: create, update and status DTOs. |
| `src/users/users.module.ts` | Modify: drop the public controller, register the admin one. |
| `src/users/test/*.spec.ts` | Create: helper, service, write and module-guard specs. |

**`udemy_practice_admin`**

| File | Responsibility |
|---|---|
| `src/types/user.ts` | Create: the `User` type the pages read. |
| `src/schema/user.ts` | Create: zod schemas for the create and edit forms. |
| `src/services/user.ts` | Create: the calls to `admin/users`. |
| `src/lib/api.ts` | Modify: add the endpoint. The key `user` is taken by the admin's own account endpoint — use `adminUsers`. |
| `src/components/app-sidebar.tsx` | Modify: render the Users entry `router.ts` already declares. |
| `src/app/(Home)/users/page.tsx`, `columns.tsx`, `loading.tsx` | Create: the list. |
| `src/app/(Home)/users/action-form.tsx` | Create: the shared create/edit form. |
| `src/app/(Home)/users/create/page.tsx`, `[id]/page.tsx` | Create: the two form pages. |

---

## Task 1: The `status` column

**Repo:** `udemy_practice_back`

**Files:**
- Create: `src/migrations/1786500012000-AddStatusToUser.ts`
- Create: `src/users/user-status.ts`
- Modify: `src/users/entities/user.entity.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `USER_STATUS_ACTIVE = 'active'`, `USER_STATUS_INACTIVE = 'inactive'`, `USER_STATUSES` (a readonly tuple of both), `type UserStatus = 'active' | 'inactive'`, and `User.status: UserStatus`.

- [ ] **Step 1: Write the constants**

`src/users/user-status.ts`:

```ts
/**
 * Whether an account may sign in.
 *
 * A varchar rather than a boolean, to match `course.status`, which is already
 * 'active' / 'inactive' in this schema.
 */
export const USER_STATUS_ACTIVE = 'active';
export const USER_STATUS_INACTIVE = 'inactive';

export const USER_STATUSES = [USER_STATUS_ACTIVE, USER_STATUS_INACTIVE] as const;

export type UserStatus = (typeof USER_STATUSES)[number];
```

- [ ] **Step 2: Add the column to the entity**

In `src/users/entities/user.entity.ts`, add after the `password` block:

```ts
  @ApiProperty({ description: 'Whether the account may sign in', example: 'active' })
  @Column({ name: 'status', default: USER_STATUS_ACTIVE })
  public status: UserStatus;
```

and, at the end of the class, the field the list fills in (not a column — the
same idiom `CourseSet.questionCount` already uses):

```ts
  /** Filled in by the admin listing; not stored. */
  public courseCount?: number;
```

and the import:

```ts
import { USER_STATUS_ACTIVE, UserStatus } from '../user-status';
```

- [ ] **Step 3: Write the migration**

`src/migrations/1786500012000-AddStatusToUser.ts`:

```ts
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the flag that decides whether an account may sign in.
 *
 * Most learners cannot be deleted at all: user_course.user_id and
 * user_premium.user_id are NO ACTION, so Postgres refuses a hard delete for
 * anyone who has bought a course, and test_attempt.user_id is CASCADE, so a
 * hard delete that did get through would take their attempt history with it.
 * Locking is the everyday tool instead.
 *
 * NOT NULL with a default, so every existing row becomes 'active' in the same
 * statement and no application code has to cope with a null status.
 */
export class AddStatusToUser1786500012000 implements MigrationInterface {
  name = 'AddStatusToUser1786500012000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "status" character varying NOT NULL DEFAULT 'active'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "status"`);
  }
}
```

- [ ] **Step 4: Typecheck and build**

Run: `npx tsc --noEmit` — expected exit 0.
Run: `npm run build` — expected exit 0.

- [ ] **Step 5: Do NOT run the migration**

The user runs it. Say so in the handoff; do not run `npm run migration:run`.

- [ ] **Step 6: Commit**

```bash
git add src/migrations/1786500012000-AddStatusToUser.ts src/users/user-status.ts src/users/entities/user.entity.ts
git commit -m "feat(users): add the account status column"
```

---

## Task 2: Locking takes effect immediately

**Repo:** `udemy_practice_back`

This is the task the feature lives or dies on. An access token lasts 604800 seconds, so checking only at the login screen would leave a locked person working normally for a week.

**Files:**
- Modify: `src/users/user-status.ts`
- Modify: `src/authentication/strategy/jwt.strategy.ts`
- Modify: `src/authentication/strategy/jwt-refresh-token.strategy.ts`
- Modify: `src/authentication/authentication.service.ts`
- Create: `src/users/test/user-status.spec.ts`
- Create: `src/authentication/test/inactive-user.spec.ts`

**Interfaces:**
- Consumes: `USER_STATUS_INACTIVE`, `UserStatus` from Task 1.
- Produces: `assertUserActive(user: { status?: UserStatus }): void` — throws `ForbiddenException('This account is locked')` when the status is inactive, returns nothing otherwise.

- [ ] **Step 1: Write the failing test for the helper**

`src/users/test/user-status.spec.ts`:

```ts
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
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx jest src/users/test/user-status.spec.ts`
Expected: FAIL — `assertUserActive is not a function`.

- [ ] **Step 3: Write the helper**

Append to `src/users/user-status.ts`:

```ts
import { ForbiddenException } from '@nestjs/common';

/**
 * The one place that decides a locked account cannot act.
 *
 * Called from the three auth entry points rather than from
 * UsersService.getById / getByEmail, because the admin has to read and display
 * an inactive user in order to unlock them.
 */
export function assertUserActive(user: { status?: UserStatus }): void {
  if (user.status === USER_STATUS_INACTIVE) {
    throw new ForbiddenException('This account is locked');
  }
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `npx jest src/users/test/user-status.spec.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Write the failing test for the entry points**

`src/authentication/test/inactive-user.spec.ts`:

```ts
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
```

If the refresh strategy's constructor signature differs from `(config, usersService)`, read the file and match it rather than guessing.

- [ ] **Step 6: Run it and watch it fail**

Run: `npx jest src/authentication/test/inactive-user.spec.ts`
Expected: FAIL — the locked user is returned instead of throwing.

- [ ] **Step 7: Add the check to `JwtStrategy`**

Replace the body of `validate` in `src/authentication/strategy/jwt.strategy.ts`:

```ts
  async validate(payload: TokenPayload) {
    const user = await this.userService.getById(payload.userId);
    // Every authenticated request lands here and the row is already read, so
    // a lock costs no extra query and bites on the very next call.
    assertUserActive(user);
    return user;
  }
```

Add `import { assertUserActive } from 'src/users/user-status';`.

- [ ] **Step 8: Add the check to the refresh strategy**

Replace the body of `validate` in `src/authentication/strategy/jwt-refresh-token.strategy.ts`:

```ts
  async validate(request: Request, payload: TokenPayload) {
    const user = await this.userService.getUserIfRefreshTokenMatches(
      request.cookies?.Refresh,
      payload.userId,
    );
    assertUserActive(user);
    return user;
  }
```

Add the same import.

- [ ] **Step 9: Add the check at login**

In `src/authentication/authentication.service.ts`, rewrite `getAuthenticatedUser`:

```ts
  public async getAuthenticatedUser(email: string, hashedPassword: string) {
    let user: User;
    try {
      user = await this.userService.getByEmail(email);
      await this.verifyPassword(hashedPassword, user.password);
    } catch {
      throw new BadRequestException('Wrong credentials provided');
    }
    // Outside the catch on purpose: a locked account has to say it is locked
    // rather than claim the password was wrong, or the admin cannot tell the
    // two apart when a learner complains.
    assertUserActive(user);
    user.password = undefined;
    return user;
  }
```

Add `import { assertUserActive } from 'src/users/user-status';` and, if missing, `import { User } from 'src/users/entities/user.entity';`.

- [ ] **Step 10: Run the tests and watch them pass**

Run: `npx jest src/authentication/test/inactive-user.spec.ts src/users/test/user-status.spec.ts`
Expected: PASS, 6 tests.

- [ ] **Step 11: Run the whole suite on its own**

Run: `npx jest`
Expected: every suite passes. Run it as its own command.

- [ ] **Step 12: Prove the tests bite**

Mutate, run, restore, one at a time:

1. Remove `assertUserActive(user)` from `jwt.strategy.ts` → the access-token test must fail.
2. Remove it from the refresh strategy → the refresh test must fail.
3. Change the helper to `if (user.status === USER_STATUS_ACTIVE)` → the "active still gets through" test must fail.

If a mutant survives, the test is not testing what it claims. Fix the test, not the mutant.

- [ ] **Step 13: Commit**

```bash
git add src/users/user-status.ts src/users/test/user-status.spec.ts src/authentication
git commit -m "feat(auth): refuse a locked account on every authenticated path"
```

---

## Task 3: Remove the unguarded users controller

**Repo:** `udemy_practice_back`

**Files:**
- Delete: `src/users/users.controller.ts`
- Modify: `src/users/users.module.ts`
- Modify: `src/users/users.service.ts`
- Create: `src/users/test/users.service.spec.ts`
- Create: `src/users/test/users.module.spec.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `UsersService.create` now stores a bcrypt hash.

- [ ] **Step 1: Confirm nothing calls the routes**

From the monorepo root:

```bash
grep -rn '"/users\|`/users\|users/email' --include='*.ts' --include='*.tsx' udemy_practice_front/src udemy_practice_admin/src
```

Expected: only `udemy_practice_admin/src/lib/router.ts`, which holds admin **page** paths, not backend API calls. If anything else appears, stop and report instead of deleting.

- [ ] **Step 2: Write the failing test that `create` hashes**

`src/users/test/users.service.spec.ts`:

```ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';

import { User } from '../entities/user.entity';
import { UsersService } from '../users.service';
import { createMockRepository } from 'src/common/test/mocks';

describe('UsersService.create', () => {
  let service: UsersService;
  let repository: ReturnType<typeof createMockRepository<User>>;

  beforeEach(async () => {
    repository = createMockRepository<User>();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: repository },
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
```

- [ ] **Step 3: Run it and watch it fail**

Run: `npx jest src/users/test/users.service.spec.ts`
Expected: FAIL — the stored value equals `plain-text-secret`.

- [ ] **Step 4: Hash in `create`**

Replace the body of `create` in `src/users/users.service.ts`:

```ts
  async create(body: createUserDto): Promise<User> {
    const user = new User();
    user.email = body.email;
    // Was assigned straight from the body, so the public POST /users route
    // wrote plaintext passwords into the table. Ten rounds, the same as
    // authentication.service.register.
    user.password = await bcrypt.hash(body.password, 10);
    user.firstName = body.firstName;
    user.lastName = body.lastName;
    return this.usersRepository.save(user);
  }
```

Add `import * as bcrypt from 'bcrypt';` if it is not already there.

- [ ] **Step 5: Run it and watch it pass**

Run: `npx jest src/users/test/users.service.spec.ts`
Expected: PASS.

- [ ] **Step 6: Delete the controller and deregister it**

```bash
rm src/users/users.controller.ts
```

In `src/users/users.module.ts`, drop the `UsersController` import and set:

```ts
  // The public `users` controller that used to sit here had no guard on any
  // route: POST created a user with an unhashed password, and
  // GET /users/email told anyone whether an address was registered. Nothing
  // called it — the front registers through /authentication/register.
  controllers: [],
```

Task 4 fills the array.

- [ ] **Step 7: Write the module guard test**

`src/users/test/users.module.spec.ts`:

```ts
import 'reflect-metadata';

import JwtAdminAuthenticationGuard from 'src/authentication/guard/jwt-admin-authentication.guard';
import { UsersModule } from '../users.module';

/** Where Nest keeps a class-level `@UseGuards(...)`. */
const GUARDS_METADATA = '__guards__';

type Named = { name: string };

function controllersOf(module: unknown): Named[] {
  return (Reflect.getMetadata('controllers', module) as Named[]) ?? [];
}

function guardNamesOf(controller: Named): string[] {
  const guards =
    (Reflect.getMetadata(GUARDS_METADATA, controller) as unknown[]) ?? [];
  return guards.map((guard) =>
    typeof guard === 'function' ? (guard as Named).name : String(guard),
  );
}

describe('UsersModule', () => {
  it('guards every controller it registers', () => {
    // This module reaches every account in the system. An unguarded
    // controller sat here and shipped; asserting the route list would not
    // have caught it, because the routes were fine and the guard was absent.
    const registered = controllersOf(UsersModule).map((controller) => ({
      controller: controller.name,
      guards: guardNamesOf(controller),
    }));

    expect(registered).toEqual(
      registered.map(({ controller }) => ({
        controller,
        guards: [JwtAdminAuthenticationGuard.name],
      })),
    );
  });
});
```

- [ ] **Step 8: Run the checks**

Run: `npx tsc --noEmit` — exit 0.
Run: `npm run lint` — no errors.
Run: `npx jest` — every suite passes.

- [ ] **Step 9: Commit**

```bash
git add -A src/users
git commit -m "fix(users): remove the unguarded user routes and hash on create"
```

---

## Task 4: `admin/users` — reading

**Repo:** `udemy_practice_back`

**Files:**
- Create: `src/users/users.admin.controller.ts`
- Create: `src/users/test/users.admin.service.spec.ts`
- Modify: `src/users/users.service.ts`
- Modify: `src/users/users.module.ts`

**Interfaces:**
- Consumes: nothing from Task 1–3 beyond the entity.
- Produces:
  - `UsersService.findAllForAdmin(query: PaginationParams): Promise<{ items: User[]; total: number; page: number; limit: number }>`
  - `UsersService.findOneForAdmin(id: number): Promise<User>` — the user with `userCourses` and each `course` loaded.

- [ ] **Step 1: Write the failing tests**

`src/users/test/users.admin.service.spec.ts`:

```ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { User } from '../entities/user.entity';
import { UsersService } from '../users.service';
import { createMockRepository } from 'src/common/test/mocks';
import { PaginationParams } from 'src/common/pagination.type';

function params(overrides: Partial<PaginationParams> = {}): PaginationParams {
  return { page: 1, limit: 10, ...overrides } as PaginationParams;
}

describe('UsersService.findAllForAdmin', () => {
  let service: UsersService;
  let repository: ReturnType<typeof createMockRepository<User>>;

  beforeEach(async () => {
    repository = createMockRepository<User>();
    repository.findAndCount.mockResolvedValue([[], 0]);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: repository },
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
```

The `beforeEach` needs the data source alongside the repository:

```ts
import { DataSource } from 'typeorm';
import { createMockDataSource } from 'src/common/test/mocks';

  let dataSource: ReturnType<typeof createMockDataSource>;

  // inside beforeEach, before compile():
  dataSource = createMockDataSource();

  // inside the providers array:
  { provide: DataSource, useValue: dataSource },
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npx jest src/users/test/users.admin.service.spec.ts`
Expected: FAIL — `findAllForAdmin is not a function`.

- [ ] **Step 3: Write the read methods**

Add near the top of `src/users/users.service.ts`:

```ts
/**
 * Sort keys GET /admin/users accepts. Anything else falls back to the default;
 * a caller never names a column.
 */
const USER_SORT_COLUMNS = {
  id: 'id',
  email: 'email',
  firstName: 'firstName',
  lastName: 'lastName',
  status: 'status',
  createdAt: 'createdAt',
};
```

and the methods:

```ts
  async findAllForAdmin(query: PaginationParams) {
    const { page, limit, search } = query;
    const offset = (page - 1) * limit;

    const where = search
      ? [
          { firstName: ILike(`%${search}%`) },
          { lastName: ILike(`%${search}%`) },
          { email: ILike(`%${search}%`) },
        ]
      : undefined;

    const [items, total] = await this.usersRepository.findAndCount({
      where,
      order: toOrderObject(
        resolveSort(query.sortBy, query.sortDir, USER_SORT_COLUMNS, {
          column: 'createdAt',
          direction: 'DESC',
        }),
        'id',
      ),
      skip: offset,
      take: limit,
    });

    await this.attachCourseCounts(items);

    return { items, total, page, limit };
  }

  /**
   * How many courses each user on this page actually owns.
   *
   * One grouped query rather than a relation on the paginated find, which
   * would multiply rows. The join to `course` with `deleted_at IS NULL` is the
   * part that matters: an enrolment row outlives the course it points at, so
   * counting `user_course` alone would advertise a course the learner can no
   * longer open.
   */
  private async attachCourseCounts(users: User[]): Promise<void> {
    if (users.length === 0) return;

    const ids = users.map((user) => user.id);
    const rows: { user_id: number; count: string }[] =
      await this.dataSource.query(
        `SELECT uc.user_id, count(*) AS count
         FROM user_course uc
         JOIN course c ON c.id = uc.course_id
         WHERE uc.user_id = ANY($1) AND c.deleted_at IS NULL
         GROUP BY uc.user_id`,
        [ids],
      );

    const byUser = new Map(rows.map((row) => [row.user_id, +row.count]));
    for (const user of users) {
      user.courseCount = byUser.get(user.id) ?? 0;
    }
  }

  async findOneForAdmin(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['userCourses', 'userCourses.course'],
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
```

Imports to add: `ILike` and `DataSource` from `typeorm`, `NotFoundException` from `@nestjs/common`, `PaginationParams` from `src/common/pagination.type`, `resolveSort, toOrderObject` from `src/common/resolve-sort`.

`UsersService` currently takes only the repository, so extend its constructor —
this is how `CoursesService` reaches the same kind of grouped count:

```ts
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}
```

Every existing spec that builds `UsersService` through `Test.createTestingModule`
must now also provide `{ provide: DataSource, useValue: createMockDataSource() }`,
or it fails to resolve the dependency. That is Tasks 3 and 5's spec files as well
as this one — a missing provider in a test double has twice been the thing that
turned a suite red here, so add it to all three in this step rather than
discovering it later.

- [ ] **Step 4: Run them and watch them pass**

Run: `npx jest src/users/test/users.admin.service.spec.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Write the controller**

`src/users/users.admin.controller.ts`:

```ts
import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import JwtAdminAuthenticationGuard from 'src/authentication/guard/jwt-admin-authentication.guard';
import { PaginationParams } from 'src/common/pagination.type';
import { UsersService } from './users.service';

@ApiTags('Admin Users')
@ApiBearerAuth()
@Controller('admin/users')
@UseGuards(JwtAdminAuthenticationGuard)
export class UsersAdminController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'List users' })
  @Get()
  findAll(@Query() query: PaginationParams) {
    return this.usersService.findAllForAdmin(query);
  }

  @ApiOperation({ summary: 'Get one user with the courses they bought' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOneForAdmin(id);
  }
}
```

- [ ] **Step 6: Register it**

In `src/users/users.module.ts`, set `controllers: [UsersAdminController]` and import it.

- [ ] **Step 7: Run the module guard test**

Run: `npx jest src/users/test/users.module.spec.ts`
Expected: PASS — the newly registered controller carries the admin guard.

- [ ] **Step 8: Prove the tests bite**

Mutate, run, restore, one at a time:

1. Drop `AND c.deleted_at IS NULL` from the count query → the count test must fail.
2. Drop the `JOIN course` and count `user_course` alone → the same test must fail.
3. Change `byUser.get(user.id) ?? 0` to `?? 1` → the `[3, 0]` assertion must fail.
4. Remove the `if (users.length === 0) return;` guard → the empty-page test must fail.
5. Drop the `'id'` argument from `toOrderObject` → the tiebreaker test must fail.

- [ ] **Step 9: Run the checks**

Run `npx tsc --noEmit`, then `npm run lint`, then `npx jest`, each on its own line.

- [ ] **Step 10: Verify against a running server**

With the backend running:

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3333/admin/users
```

Expected: `401`. An unauthenticated `200` means the guard is not attached — stop and fix it.

- [ ] **Step 11: Commit**

```bash
git add src/users
git commit -m "feat(users): list and read users from the admin API"
```

---

## Task 5: `admin/users` — writing

**Repo:** `udemy_practice_back`

**Files:**
- Create: `src/users/dto/admin-user.dto.ts`
- Create: `src/users/test/users.admin.write.spec.ts`
- Modify: `src/users/users.service.ts`
- Modify: `src/users/users.admin.controller.ts`

**Interfaces:**
- Consumes: `USER_STATUSES`, `USER_STATUS_ACTIVE`, `UserStatus` (Task 1); `findOneForAdmin` (Task 4).
- Produces:
  - `UsersService.createForAdmin(dto: CreateAdminUserDto): Promise<User>`
  - `UsersService.updateForAdmin(id: number, dto: UpdateAdminUserDto): Promise<User>`
  - `UsersService.setStatus(id: number, status: UserStatus): Promise<User>`
  - `UsersService.removeForAdmin(id: number): Promise<{ message: string }>`

- [ ] **Step 1: Write the DTOs**

`src/users/dto/admin-user.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

import { USER_STATUSES, UserStatus } from '../user-status';

export class CreateAdminUserDto {
  @IsEmail()
  @ApiProperty({ example: 'learner@example.com' })
  email: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  lastName: string;

  @IsString()
  @MinLength(8)
  @ApiProperty({ description: 'Stored as a bcrypt hash, never as given' })
  password: string;
}

export class UpdateAdminUserDto {
  @IsOptional()
  @IsEmail()
  @ApiProperty({ required: false })
  email?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ required: false })
  firstName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ required: false })
  lastName?: string;
}

export class SetUserStatusDto {
  @IsIn(USER_STATUSES as unknown as string[])
  @ApiProperty({ enum: USER_STATUSES })
  status: UserStatus;
}
```

- [ ] **Step 2: Write the failing tests**

`src/users/test/users.admin.write.spec.ts`:

```ts
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';

import { User } from '../entities/user.entity';
import { UsersService } from '../users.service';
import { createMockRepository } from 'src/common/test/mocks';

describe('UsersService admin writes', () => {
  let service: UsersService;
  let repository: ReturnType<typeof createMockRepository<User>>;

  beforeEach(async () => {
    repository = createMockRepository<User>();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: repository },
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

      const saved = repository.save.mock.calls[0][0] as User;
      expect(saved.password).not.toBe('plain-text-secret');
      await expect(
        bcrypt.compare('plain-text-secret', saved.password),
      ).resolves.toBe(true);
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
  });

  describe('setStatus', () => {
    it('writes the status', async () => {
      repository.findOne.mockResolvedValue({ id: 7 } as User);

      await service.setStatus(7, 'inactive');

      expect(repository.update).toHaveBeenCalledWith(7, {
        status: 'inactive',
      });
    });
  });
});
```

- [ ] **Step 3: Run them and watch them fail**

Run: `npx jest src/users/test/users.admin.write.spec.ts`
Expected: FAIL — the methods do not exist.

- [ ] **Step 4: Write the methods**

Add to `src/users/users.service.ts`:

```ts
  /**
   * The unique index on `email` keeps its hold on a soft-deleted row, so this
   * has to look past the delete or the collision surfaces as a Postgres 500.
   */
  private async assertEmailFree(email: string, exceptId?: number) {
    const existing = await this.usersRepository.findOne({
      where: { email },
      withDeleted: true,
    });
    if (existing && existing.id !== exceptId) {
      throw new BadRequestException('email is already taken');
    }
  }

  async createForAdmin(dto: CreateAdminUserDto): Promise<User> {
    await this.assertEmailFree(dto.email);

    const user = new User();
    user.email = dto.email;
    user.firstName = dto.firstName;
    user.lastName = dto.lastName;
    user.password = await bcrypt.hash(dto.password, 10);
    user.status = USER_STATUS_ACTIVE;
    return this.usersRepository.save(user);
  }

  async updateForAdmin(id: number, dto: UpdateAdminUserDto): Promise<User> {
    const user = await this.findOneForAdmin(id);
    if (dto.email && dto.email !== user.email) {
      await this.assertEmailFree(dto.email, id);
    }
    await this.usersRepository.update(id, dto);
    return this.findOneForAdmin(id);
  }

  async setStatus(id: number, status: UserStatus): Promise<User> {
    await this.findOneForAdmin(id);
    await this.usersRepository.update(id, { status });
    return this.findOneForAdmin(id);
  }

  async removeForAdmin(id: number): Promise<{ message: string }> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['userCourses', 'userPremiums'],
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Both foreign keys are NO ACTION, so a hard delete is impossible anyway;
    // hiding the user would only strand the records pointing at them. Lock the
    // account instead — that is what the status column is for.
    const owned =
      (user.userCourses?.length ?? 0) + (user.userPremiums?.length ?? 0);
    if (owned > 0) {
      throw new BadRequestException(
        'This user has purchases and cannot be deleted; lock the account instead',
      );
    }

    await this.usersRepository.softDelete(id);
    return { message: 'User deleted successfully' };
  }
```

Imports to add: `BadRequestException`, the three DTO types, `USER_STATUS_ACTIVE` and `UserStatus`.

- [ ] **Step 5: Run them and watch them pass**

Run: `npx jest src/users/test/users.admin.write.spec.ts`
Expected: PASS, 8 tests.

- [ ] **Step 6: Add the routes**

Append to `UsersAdminController`:

```ts
  @ApiOperation({ summary: 'Create a user' })
  @Post()
  create(@Body() dto: CreateAdminUserDto) {
    return this.usersService.createForAdmin(dto);
  }

  @ApiOperation({ summary: 'Update a user' })
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAdminUserDto,
  ) {
    return this.usersService.updateForAdmin(id, dto);
  }

  @ApiOperation({ summary: 'Lock or unlock an account' })
  @Patch(':id/status')
  setStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetUserStatusDto,
  ) {
    return this.usersService.setStatus(id, dto.status);
  }

  @ApiOperation({ summary: 'Delete a user who has no purchases' })
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.removeForAdmin(id);
  }
```

Extend the `@nestjs/common` import with `Body`, `Delete`, `Patch`, `Post`, and import the DTOs.

- [ ] **Step 7: Prove the tests bite**

Mutate, run, restore, one at a time:

1. Drop `withDeleted: true` from `assertEmailFree` → the soft-deleted-collision test must fail.
2. Count only `userCourses` in `removeForAdmin` → the premium test must fail.
3. Remove the `owned > 0` check → both refusal tests must fail.
4. Assign `dto.password` unhashed → the hash test must fail.

- [ ] **Step 8: Run the checks**

Run `npx tsc --noEmit`, then `npm run lint`, then `npx jest`, each on its own line.

- [ ] **Step 9: Commit**

```bash
git add src/users
git commit -m "feat(users): create, edit, lock and delete users from the admin API"
```

---

## Task 6: The Users list in the admin

**Repo:** `udemy_practice_admin`

**Files:**
- Create: `src/types/user.ts`
- Create: `src/services/user.ts`
- Create: `src/app/(Home)/users/page.tsx`, `columns.tsx`, `loading.tsx`
- Modify: `src/lib/api.ts`
- Modify: `src/components/app-sidebar.tsx`

**Interfaces:**
- Consumes: `GET /admin/users`, `GET /admin/users/:id` (Task 4); `PATCH /admin/users/:id/status`, `DELETE /admin/users/:id` (Task 5).
- Produces: the `User` type, and `userService.findAll`, `findById`, `setStatus`, `remove`.

- [ ] **Step 1: Add the type**

`src/types/user.ts`:

```ts
export type UserStatus = "active" | "inactive";

export type User = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  /** Only the list sends this — a grouped count, not a loaded relation. */
  courseCount?: number;
  /** Only the detail endpoint sends this. */
  userCourses?: { id: number; course?: { id: number; name: string } }[];
};
```

- [ ] **Step 2: Add the endpoint**

In `src/lib/api.ts`, add to `apiUrl`:

```ts
  // `user` is already taken by the admin's own account endpoint above.
  adminUsers: `${baseUrl}/admin/users`,
```

- [ ] **Step 3: Write the service**

`src/services/user.ts`:

```ts
import { apiUrl, fetchApi, methodFetch } from "@/lib/api";
import { objectToQueryString } from "@/lib/utils";
import { ResponseApi, ResponsePagination } from "@/types/common";
import { User, UserStatus } from "@/types/user";

export const userService = {
  findAll: async ({
    search,
    page,
    limit,
    sortBy,
    sortDir,
  }: {
    search: string;
    page: number;
    limit: number;
    sortBy?: string;
    sortDir?: string;
  }) => {
    const response = await fetchApi(
      apiUrl.adminUsers +
        objectToQueryString({ search, page, limit, sortBy, sortDir }),
      { method: methodFetch.get },
    );
    const data: ResponseApi<ResponsePagination<User>> = await response?.json();
    return data.data;
  },

  findById: async (id: string) => {
    const response = await fetchApi(`${apiUrl.adminUsers}/${id}`, {
      method: methodFetch.get,
    });
    const data: ResponseApi<User> = await response?.json();
    return data.data;
  },

  setStatus: async (id: number, status: UserStatus) => {
    const response = await fetchApi(`${apiUrl.adminUsers}/${id}/status`, {
      method: methodFetch.patch,
      body: JSON.stringify({ status }),
    });
    return (await response?.json()) as ResponseApi<User>;
  },

  remove: async (id: number) => {
    const response = await fetchApi(`${apiUrl.adminUsers}/${id}`, {
      method: methodFetch.delete,
    });
    return (await response?.json()) as ResponseApi<{ message: string }>;
  },
};
```

- [ ] **Step 4: Show the sidebar entry**

In `src/components/app-sidebar.tsx`, add between the dashboard and courses entries:

```tsx
  {
    title: protectedRoutes.users.label,
    url: protectedRoutes.users.href,
    icon: Users,
  },
```

`protectedRoutes.users` already exists in `src/lib/router.ts`; only the sidebar never rendered it. Import `Users` from `lucide-react`.

- [ ] **Step 5: Write the columns**

`src/app/(Home)/users/columns.tsx`, modelled on `organizations/columns.tsx`. Columns: `id`, a Name cell joining `firstName` and `lastName`, `email`, then:

```tsx
{
  id: "status",
  accessorKey: "status",
  header: () => <DataTableColumnHeader sortKey="status" title="Status" />,
  cell: ({ row }) => {
    const status = row.original.status;
    return (
      <Badge variant={status === "active" ? "default" : "secondary"}>
        {status === "active" ? "Active" : "Locked"}
      </Badge>
    );
  },
},
{
  id: "courses",
  header: () => <span>Courses</span>,
  // `courseCount` comes from the grouped query in findAllForAdmin. Do not read
  // `userCourses?.length` here — the list does not load that relation, so it
  // would render 0 for everyone and look like data loss.
  cell: ({ row }) => row.original.courseCount ?? 0,
},
```

then `createdAt` and the actions cell, both following the organizations file.

- [ ] **Step 6: Write the page**

`src/app/(Home)/users/page.tsx`, copying `organizations/page.tsx`: read `s`, `p`, `l`, `sort`, `dir` from `searchParams`; map `dir` to `ASC` / `DESC` and send neither key when no column is sorted; call `userService.findAll`; render `PageHeader` + `DataTable` with `searchPlaceholder="Search users..."` and a "New user" button pointing at `protectedRoutes.users.items!.create.href`.

`loading.tsx` re-exports the shared skeleton exactly as `organizations/loading.tsx` does.

- [ ] **Step 7: Typecheck, lint and test**

Run `npx tsc --noEmit`, then `npx eslint src --max-warnings=0`, then `npx vitest run`, each on its own line.

- [ ] **Step 8: Verify in the browser**

Backend on 3333, admin on 3001, signed in. Confirm the tab title reads "Admin Udemy Practice" before trusting any measurement — port 3000 is a different app.

1. `/users` lists users, ten to a page.
2. Clicking **Email** sorts; the URL gains `?sort=email&dir=asc` and the order changes.
3. Clicking again flips to `dir=desc` and the order reverses.
4. The search box filters by name and by email.
5. The sidebar shows Users and highlights it on that page.

- [ ] **Step 9: Commit**

```bash
git add src/types/user.ts src/services/user.ts src/lib/api.ts src/components/app-sidebar.tsx "src/app/(Home)/users"
git commit -m "feat(admin): add the users list"
```

---

## Task 7: Creating, editing and locking from the admin

**Repo:** `udemy_practice_admin`

**Files:**
- Create: `src/schema/user.ts`
- Create: `src/schema/user.test.ts`
- Create: `src/app/(Home)/users/action-form.tsx`
- Create: `src/app/(Home)/users/create/page.tsx`
- Create: `src/app/(Home)/users/[id]/page.tsx`
- Modify: `src/app/(Home)/users/columns.tsx`

**Interfaces:**
- Consumes: `userService` and the `User` type from Task 6.
- Produces: nothing later depends on this; it is the last task.

- [ ] **Step 1: Write the failing schema test**

`src/schema/user.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { CreateUserSchema, UpdateUserSchema } from "./user";

const valid = {
  email: "learner@example.com",
  firstName: "Minh",
  lastName: "Nguyen",
  password: "at-least-8",
};

describe("CreateUserSchema", () => {
  it("accepts a complete form", () => {
    expect(CreateUserSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an address that is not an email", () => {
    expect(CreateUserSchema.safeParse({ ...valid, email: "nope" }).success).toBe(
      false,
    );
  });

  it("rejects a password under eight characters", () => {
    // Matches MinLength(8) on the API. A shorter one accepted here would be
    // refused by the server, which reads as a bug to the admin.
    expect(
      CreateUserSchema.safeParse({ ...valid, password: "short" }).success,
    ).toBe(false);
  });

  it("rejects a blank name", () => {
    expect(
      CreateUserSchema.safeParse({ ...valid, firstName: "  " }).success,
    ).toBe(false);
  });
});

describe("UpdateUserSchema", () => {
  it("does not ask for a password", () => {
    const { password: _password, ...withoutPassword } = valid;
    expect(UpdateUserSchema.safeParse(withoutPassword).success).toBe(true);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/schema/user.test.ts`
Expected: FAIL — the module does not exist.

- [ ] **Step 3: Write the schemas**

`src/schema/user.ts`:

```ts
import { z } from "zod";

const name = z.string().trim().min(1, "Required");

export const CreateUserSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  firstName: name,
  lastName: name,
  // Mirrors MinLength(8) on the API. Diverging would let the form accept
  // something the server then refuses.
  password: z.string().min(8, "At least 8 characters"),
});

export const UpdateUserSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  firstName: name,
  lastName: name,
});

export type CreateUserSchemaType = z.infer<typeof CreateUserSchema>;
export type UpdateUserSchemaType = z.infer<typeof UpdateUserSchema>;
```

- [ ] **Step 4: Run it and watch it pass**

Run: `npx vitest run src/schema/user.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Write the form**

`src/app/(Home)/users/action-form.tsx`, following `organizations/action-form.tsx`: `useForm` with `zodResolver`, one `FormField` per input so `FormLabel` wires `htmlFor` through `FormItem` context, `FormMessage` under each field, and `FormActions` as the sticky footer.

Put `noValidate` on the `<form>` element. The browser's own constraint validation has blocked submit in this repo so silently that zod never ran and no message appeared — `noValidate` is what fixed it in `13e0dab`.

The password field renders only in create mode.

When the API answers `email is already taken`, set it on the email field with `form.setError("email", ...)` rather than showing a bare toast, so the admin can see which input to fix.

- [ ] **Step 6: Write the two pages**

`create/page.tsx` renders the form with no `initialData`.

`[id]/page.tsx` fetches with `userService.findById`, renders the form with `initialData`, and below it a card listing the courses the user bought plus a Lock / Unlock button calling `userService.setStatus`.

- [ ] **Step 7: Add the row actions**

In `columns.tsx`, extend the actions cell with **Edit**, **Lock** / **Unlock**, and **Delete**. Delete uses the shared `DeleteDialog`; nesting its trigger inside the Radix dropdown does work — verified in production during the CSV import check on 2026-09-30.

On a refused delete, show the API's message about purchases rather than a generic failure.

- [ ] **Step 8: Typecheck, lint and test**

Run `npx tsc --noEmit`, then `npx eslint src --max-warnings=0`, then `npx vitest run`, each on its own line.

- [ ] **Step 9: Verify in the browser**

1. Create a user; it appears in the list.
2. Submit the create form with a five-character password — the message appears under the field and no request is sent.
3. Create a second user with the same email — the refusal appears under the email field.
4. Edit the first user's name; the list shows it.
5. Lock the first user. **Then sign in to the learner front on port 3000 as that user** — expected: refused. If a session for them is already open there, reload a page that calls the API and confirm that is refused too. This is the check that matters: steps 1–4 all pass in a build where locking does nothing.
6. Delete a user who bought something — expected: refused, with the purchases message. Delete one who bought nothing — expected: gone.

- [ ] **Step 10: Commit**

```bash
git add src/schema/user.ts src/schema/user.test.ts "src/app/(Home)/users"
git commit -m "feat(admin): create, edit and lock users"
```

---

## Handoff after the last task

Report to the user:

- The unpushed commits in each repo. The user pushes; Claude does not.
- **The migration has not been run anywhere.** Deploy the code first, then run `npm run migration:run`. Here the order is forgiving — the column has a default and nothing reads it until the code ships — but code-then-migration is the habit worth keeping.
- The two questions the spec left open: a locked learner mid-exam sees requests refused with no screen explaining why, and nothing records who locked an account or when.
