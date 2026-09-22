import { MigrationInterface, QueryRunner } from 'typeorm';

const LEGACY = 'course_set_udemy_question_banks_udemy_question_bank';
const CANONICAL = 'course_set_udemy_question_bank';

/**
 * Moves the question links that never made it across the rename.
 *
 * What happened: 1773567796337 created "course_set_udemy_question_bank" as a
 * new empty table — its own comment says "new table, no rename" while every
 * other column in that migration is marked "preserve data". The migration
 * meant to carry the rows over, 1774272699144, opens with a guard that skips
 * itself when the new table already exists. It did, so it skipped, and said
 * so in a warning nobody was reading.
 *
 * The result is two join tables with no row in common: the entity reads the
 * canonical one, while the legacy one still holds the only record of which
 * questions belong to the Javascript course. That course is active and for
 * sale, and every one of its six sets answers the API with zero questions.
 *
 * This migration only copies. Dropping the legacy table is a separate one,
 * so the data can be checked in place first.
 */
export class MergeLegacyCourseSetQuestionJoin1786500008000
  implements MigrationInterface
{
  name = 'MergeLegacyCourseSetQuestionJoin1786500008000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable(LEGACY))) return;

    // ON CONFLICT DO NOTHING so a pair already present is left alone and the
    // migration can be run twice without failing on the primary key.
    await queryRunner.query(`
      INSERT INTO "${CANONICAL}" ("course_set_id", "udemy_question_bank_id")
      SELECT l."courseSetId", l."udemyQuestionBankId"
      FROM "${LEGACY}" l
      -- Only rows whose set and question still exist: the canonical table has
      -- foreign keys to both, and a dangling pair would abort the whole copy.
      WHERE EXISTS (SELECT 1 FROM "course_set" cs WHERE cs.id = l."courseSetId")
        AND EXISTS (
          SELECT 1 FROM "udemy_question_bank" q
          WHERE q.id = l."udemyQuestionBankId"
        )
      ON CONFLICT DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable(LEGACY))) return;

    // Exact inverse while the legacy table is still there: remove precisely
    // the pairs it holds, and leave everything that was already canonical.
    await queryRunner.query(`
      DELETE FROM "${CANONICAL}" c
      USING "${LEGACY}" l
      WHERE c."course_set_id" = l."courseSetId"
        AND c."udemy_question_bank_id" = l."udemyQuestionBankId"
    `);
  }
}
