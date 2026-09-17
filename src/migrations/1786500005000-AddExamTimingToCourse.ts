import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExamTimingToCourse1786500005000 implements MigrationInterface {
  name = 'AddExamTimingToCourse1786500005000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Both nullable with no default: every existing course keeps behaving
    // exactly as it does now, with the client deriving these from the question
    // count, until someone fills them in. Backfilling a guess would be worse
    // than admitting the figure is unknown.
    await queryRunner.query(
      `ALTER TABLE "course" ADD "duration_minutes" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "course" ADD "passing_percent" integer`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "course" DROP COLUMN "passing_percent"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course" DROP COLUMN "duration_minutes"`,
    );
  }
}
