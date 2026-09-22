import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPrunedAtToTestAttempt1786500007000
  implements MigrationInterface
{
  name = 'AddPrunedAtToTestAttempt1786500007000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Nullable with no backfill: every attempt that exists today still has
    // its answers, and saying otherwise would be a lie about data that is
    // right there. The column only records the moment they were cleared.
    await queryRunner.query(
      `ALTER TABLE "test_attempt" ADD "pruned_at" TIMESTAMP WITH TIME ZONE`,
    );
    // The pruning job looks up submitted attempts by when they finished, and
    // unfinished ones by when they were last touched.
    await queryRunner.query(
      `CREATE INDEX "IDX_test_attempt_finished_at" ON "test_attempt" ("finished_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_test_attempt_finished_at"`);
    await queryRunner.query(
      `ALTER TABLE "test_attempt" DROP COLUMN "pruned_at"`,
    );
  }
}
