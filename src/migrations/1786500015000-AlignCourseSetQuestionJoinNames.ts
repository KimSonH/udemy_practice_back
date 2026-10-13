import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Brings the course_set <-> question join table's constraint and index names
 * in line with production.
 *
 * Production ran a migration generated on the server (recorded there as
 * "$npmConfigName1786693267486") whose file was then deleted. Comparing a
 * schema diff on production with one on a database built from this repo shows
 * it did one thing: rename these two foreign keys and two indexes to the names
 * TypeORM derives from the entity. Databases built from the repo still have
 * the old names.
 *
 * Every rename is guarded, so this is a no-op where the names are already
 * right (production) and does the rename everywhere else. Nothing about the
 * columns, data or the constraints' behaviour changes.
 */
const RENAMES = [
  // [old name, new name]; the first is on course_set_id, the second on
  // udemy_question_bank_id.
  ['FK_47ac96a1a731055dad87643b76a', 'FK_b7742efef7b78c39a4229a8e1a8'],
  ['FK_9aa77c2767839743712f469d380', 'FK_4b5ed3477dec733d09610f52c7b'],
] as const;

const INDEX_RENAMES = [
  ['IDX_47ac96a1a731055dad87643b76', 'IDX_b7742efef7b78c39a4229a8e1a'],
  ['IDX_9aa77c2767839743712f469d38', 'IDX_4b5ed3477dec733d09610f52c7'],
] as const;

async function renameConstraint(
  queryRunner: QueryRunner,
  from: string,
  to: string,
) {
  // RENAME CONSTRAINT has no IF EXISTS; check the catalogue instead.
  await queryRunner.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = '${from}'
          AND conrelid = 'course_set_udemy_question_bank'::regclass
      ) THEN
        ALTER TABLE "course_set_udemy_question_bank"
          RENAME CONSTRAINT "${from}" TO "${to}";
      END IF;
    END $$;
  `);
}

export class AlignCourseSetQuestionJoinNames1786500015000
  implements MigrationInterface
{
  name = 'AlignCourseSetQuestionJoinNames1786500015000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [from, to] of RENAMES) {
      await renameConstraint(queryRunner, from, to);
    }
    for (const [from, to] of INDEX_RENAMES) {
      await queryRunner.query(
        `ALTER INDEX IF EXISTS "public"."${from}" RENAME TO "${to}"`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const [from, to] of RENAMES) {
      await renameConstraint(queryRunner, to, from);
    }
    for (const [from, to] of INDEX_RENAMES) {
      await queryRunner.query(
        `ALTER INDEX IF EXISTS "public"."${to}" RENAME TO "${from}"`,
      );
    }
  }
}
