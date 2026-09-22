import 'reflect-metadata';

import JwtAdminAuthenticationGuard from 'src/authentication/guard/jwt-admin-authentication.guard';
import { UdemyQuestionBanksModule } from '../udemy-question-banks.module';

/** Where Nest keeps a class-level `@UseGuards(...)`. */
const GUARDS_METADATA = '__guards__';

/** Only the class name is needed here, so that is all this asks for. */
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

describe('UdemyQuestionBanksModule', () => {
  it('registers at least one controller', () => {
    // Without this the guard check below would iterate an empty list and pass
    // while proving nothing.
    expect(controllersOf(UdemyQuestionBanksModule).length).toBeGreaterThan(0);
  });

  it('guards every controller it registers', () => {
    // This module reaches the whole question bank, `correctAnswer` included.
    // An unguarded second controller sat here and shipped to production: it
    // served any question's answer key to anyone, and took PATCH and DELETE on
    // any row. Asserting the route list would not have caught it — the routes
    // were fine, the guard was missing. So this asserts the guard.
    const registered = controllersOf(UdemyQuestionBanksModule).map(
      (controller) => ({
        controller: controller.name,
        guards: guardNamesOf(controller),
      }),
    );

    expect(registered).toEqual(
      registered.map(({ controller }) => ({
        controller,
        guards: [JwtAdminAuthenticationGuard.name],
      })),
    );
  });
});
