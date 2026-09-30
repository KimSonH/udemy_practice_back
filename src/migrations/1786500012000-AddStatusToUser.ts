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
