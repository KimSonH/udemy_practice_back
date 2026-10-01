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
