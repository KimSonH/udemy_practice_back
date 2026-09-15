import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Resync every serial column sequence to max(id) + 1.
 *
 * Context: importing questions from CSV failed with
 * `duplicate key value violates unique constraint "PK_b456e148c582d42a6a57c35c7a4"`
 * because the udemy_question_bank.id sequence had fallen behind max(id), which
 * happens when data is seeded or restored with explicit ids and the sequence is
 * never setval'd. nextval then returns an id that already exists.
 *
 * This migration is idempotent and safe: it only moves a sequence to
 * max(id) + 1, which by definition cannot collide with an id already in use.
 */
export class ResyncIdentitySequences1786500004000
  implements MigrationInterface
{
  name = 'ResyncIdentitySequences1786500004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      DECLARE
        r RECORD;
        seq_name text;
      BEGIN
        FOR r IN
          SELECT c.relname AS table_name, a.attname AS column_name
          FROM pg_class s
          JOIN pg_depend d ON d.objid = s.oid AND d.deptype = 'a'
          JOIN pg_class c ON c.oid = d.refobjid
          JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = d.refobjsubid
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE s.relkind = 'S' AND c.relkind = 'r' AND n.nspname = 'public'
        LOOP
          seq_name := pg_get_serial_sequence(quote_ident(r.table_name), r.column_name);
          IF seq_name IS NOT NULL THEN
            EXECUTE format(
              'SELECT setval(%L, COALESCE((SELECT max(%I) FROM %I), 0) + 1, false)',
              seq_name, r.column_name, r.table_name
            );
          END IF;
        END LOOP;
      END $$;
    `);
  }

  public async down(): Promise<void> {
    // No revert: moving the sequences back to their old, lagging values would
    // simply recreate the bug.
  }
}
