import { MigrationInterface, QueryRunner } from 'typeorm';

const LEGACY = 'course_set_udemy_question_banks_udemy_question_bank';

/**
 * Removes the join table left behind by the rename, once its rows have been
 * merged by 1786500008000.
 *
 * Run separately on purpose. Until the merge is confirmed, that table is the
 * only copy of the Javascript course's questions, and a drop alongside the
 * copy would put both in one transaction with nothing to fall back to.
 */
export class DropLegacyCourseSetQuestionJoin1786500009000
  implements MigrationInterface
{
  name = 'DropLegacyCourseSetQuestionJoin1786500009000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable(LEGACY))) return;

    // Refuse rather than destroy: if anything in here is not already in the
    // canonical table, the merge did not finish and this is the last copy.
    const [{ missing }] = (await queryRunner.query(`
      SELECT count(*)::int AS missing
      FROM "${LEGACY}" l
      WHERE NOT EXISTS (
        SELECT 1 FROM "course_set_udemy_question_bank" c
        WHERE c."course_set_id" = l."courseSetId"
          AND c."udemy_question_bank_id" = l."udemyQuestionBankId"
      )
      AND EXISTS (SELECT 1 FROM "course_set" cs WHERE cs.id = l."courseSetId")
      AND EXISTS (
        SELECT 1 FROM "udemy_question_bank" q
        WHERE q.id = l."udemyQuestionBankId"
      )
    `)) as { missing: number }[];

    if (missing > 0) {
      throw new Error(
        `${LEGACY} still holds ${missing} links that are not in the canonical ` +
          `table. Run MergeLegacyCourseSetQuestionJoin1786500008000 first.`,
      );
    }

    await queryRunner.query(`DROP TABLE "${LEGACY}"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // The structure comes back, empty. The rows are not restored here — they
    // live in the canonical table, which is where the application reads them,
    // so rolling back loses nothing.
    await queryRunner.query(`
      CREATE TABLE "${LEGACY}" (
        "courseSetId" integer NOT NULL,
        "udemyQuestionBankId" integer NOT NULL,
        CONSTRAINT "PK_legacy_course_set_question" PRIMARY KEY ("courseSetId", "udemyQuestionBankId")
      )
    `);
  }
}
