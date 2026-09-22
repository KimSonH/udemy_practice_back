import { MigrationInterface, QueryRunner } from 'typeorm';

const BACKUP = 'legacy_letter_answer_backup';

/**
 * Rewrites answer keys held as letters into the option indexes the app grades
 * against.
 *
 * `correct_answer` is meant to hold 1-based option indexes: "4" or "1,3".
 * Grading drops anything non-numeric, on the grounds that a letter is corrupt
 * data rather than something to guess at. 39,587 of the 40,319 questions in
 * the bank hold letters — "A", "C,D" — so grading finds no key at all and
 * marks every answer wrong whatever the learner picks. A hundred-question
 * test scores 0%.
 *
 * Nothing showed it because almost none of those questions were reachable:
 * the only course wired to them, Javascript, had lost its links in the join
 * table rename and reported zero questions. Recovering the links exposed
 * this.
 *
 * The mapping is positional, A to 1 through F to 6, which is what the option
 * columns are. Checked against the content rather than assumed: a question
 * whose key is "C,D" has its two true statements in answer_option_3 and
 * answer_option_4.
 *
 * Only rows whose every letter falls within the options that question
 * actually has are touched. Today that is all 39,587 of them, but the guard
 * belongs in the statement, not in the fact that it held when it was
 * written: 32 further questions carry G, H or I, past the six columns the
 * schema has, and those are missing options rather than a format to convert.
 * They are left alone and stay ungradable until their source is found.
 */
export class ConvertLetterAnswersToIndexes1786500010000
  implements MigrationInterface
{
  name = 'ConvertLetterAnswersToIndexes1786500010000';

  /** Questions whose key is only A-F and within that question's options. */
  private static readonly CONVERTIBLE = `
    deleted_at IS NULL
    AND replace(correct_answer, ' ', '') ~ '^[A-F](,[A-F])*$'
    AND (
      SELECT max(ascii(letter) - 64)
      FROM unnest(string_to_array(replace(correct_answer, ' ', ''), ',')) letter
    ) <= (
      (CASE WHEN coalesce(answer_option_1, '') <> '' THEN 1 ELSE 0 END) +
      (CASE WHEN coalesce(answer_option_2, '') <> '' THEN 1 ELSE 0 END) +
      (CASE WHEN coalesce(answer_option_3, '') <> '' THEN 1 ELSE 0 END) +
      (CASE WHEN coalesce(answer_option_4, '') <> '' THEN 1 ELSE 0 END) +
      (CASE WHEN coalesce(answer_option_5, '') <> '' THEN 1 ELSE 0 END) +
      (CASE WHEN coalesce(answer_option_6, '') <> '' THEN 1 ELSE 0 END)
    )
  `;

  public async up(queryRunner: QueryRunner): Promise<void> {
    // The originals, kept so this is reversible exactly rather than by a
    // second guess at the mapping. `down` restores from here and drops it.
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
      WHERE ${ConvertLetterAnswersToIndexes1786500010000.CONVERTIBLE}
    `);

    await queryRunner.query(`
      UPDATE "udemy_question_bank"
      SET correct_answer = (
        -- Order preserved so the stored key still reads the way it was
        -- written. Grading sorts both sides anyway, but a diff should not
        -- look like more changed than did.
        SELECT string_agg((ascii(letter) - 64)::text, ',' ORDER BY position)
        FROM unnest(
          string_to_array(replace(correct_answer, ' ', ''), ',')
        ) WITH ORDINALITY AS parts(letter, position)
      )
      WHERE ${ConvertLetterAnswersToIndexes1786500010000.CONVERTIBLE}
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable(BACKUP))) return;

    await queryRunner.query(`
      UPDATE "udemy_question_bank" q
      SET correct_answer = b."correct_answer"
      FROM "${BACKUP}" b
      WHERE q.id = b."id"
    `);
    await queryRunner.query(`DROP TABLE "${BACKUP}"`);
  }
}
