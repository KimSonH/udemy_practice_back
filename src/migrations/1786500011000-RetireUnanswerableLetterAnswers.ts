import { MigrationInterface, QueryRunner } from 'typeorm';

const BACKUP = 'unanswerable_letter_answer_backup';

/**
 * Takes out of circulation the questions whose answer key points at an option
 * the database does not have.
 *
 * `1786500010000` converted 39,587 letter keys into indexes and deliberately
 * skipped 32 whose keys carry G, H or I. Those letters mean a 7th, 8th or 9th
 * option, and the schema stops at six. Every one of the 32 has all six option
 * columns filled, so the import did not leave a gap to fill in — it truncated
 * the question and the correct option's text is gone.
 *
 * The result is a question nobody can answer. 26 are multiple-response with
 * one missing member, such as "B,C,D,E,G": grading demands the whole set, and
 * the learner cannot select what is not rendered. The other 6 are
 * single-answer pointing only at the missing option — "G", "H", "I" — so
 * nothing among the six shown is correct. `parseCorrectIndexes` drops
 * non-numeric parts, so all 32 already grade as wrong whatever is picked; the
 * learner just has no way to know why.
 *
 * They are soft-deleted rather than repaired, because repairing them means
 * inventing an option, and rather than dropped, because the source CSV may
 * turn up and `down` puts them straight back. `deleted_at` is a
 * `DeleteDateColumn`, so the relation the exam loads stops returning them at
 * once. The advertised question count follows in the same change: it used to
 * count the link table, which keeps its row when a question is soft-deleted,
 * and would have promised 250 while serving 249.
 *
 * Scope is written as a condition rather than a list of the 32 ids, so it
 * stays correct if an import adds another before this runs.
 */
export class RetireUnanswerableLetterAnswers1786500011000
  implements MigrationInterface
{
  name = 'RetireUnanswerableLetterAnswers1786500011000';

  /**
   * Live questions whose key still holds a letter. After `1786500010000` the
   * only letters left are the ones past the six option columns; the guard is
   * written as "any letter" so a key this migration cannot reason about is
   * retired rather than silently left in an exam.
   */
  private static readonly UNANSWERABLE = `
    deleted_at IS NULL
    AND correct_answer ~ '[A-Za-z]'
  `;

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Which rows this retired, so `down` restores exactly those and not any
    // question soft-deleted for an unrelated reason before or since.
    await queryRunner.query(`
      CREATE TABLE "${BACKUP}" (
        "id" integer NOT NULL,
        "correct_answer" character varying,
        CONSTRAINT "PK_${BACKUP}" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      INSERT INTO "${BACKUP}" ("id", "correct_answer")
      SELECT id, correct_answer
      FROM "udemy_question_bank"
      WHERE ${RetireUnanswerableLetterAnswers1786500011000.UNANSWERABLE}
    `);

    await queryRunner.query(`
      UPDATE "udemy_question_bank"
      SET deleted_at = now()
      WHERE ${RetireUnanswerableLetterAnswers1786500011000.UNANSWERABLE}
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable(BACKUP))) return;

    // Only rows this migration retired, and only while they are still
    // soft-deleted, so a later deliberate deletion is not undone here.
    await queryRunner.query(`
      UPDATE "udemy_question_bank" q
      SET deleted_at = NULL
      FROM "${BACKUP}" b
      WHERE q.id = b."id" AND q.deleted_at IS NOT NULL
    `);
    await queryRunner.query(`DROP TABLE "${BACKUP}"`);
  }
}
