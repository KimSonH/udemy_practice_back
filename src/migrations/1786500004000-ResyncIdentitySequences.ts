import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Đồng bộ lại tất cả sequence của cột serial về max(id) + 1.
 *
 * Bối cảnh: import CSV câu hỏi bị lỗi
 * `duplicate key value violates unique constraint "PK_b456e148c582d42a6a57c35c7a4"`
 * vì sequence của udemy_question_bank.id tụt lại sau max(id) — xảy ra khi dữ
 * liệu được seed/restore bằng id tường minh mà không setval lại sequence. Khi
 * đó nextval trả về id đã tồn tại.
 *
 * Migration này idempotent và an toàn: chỉ đặt sequence về max(id) + 1, không
 * thể đè lên id đang dùng (theo định nghĩa của max).
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
    // Không revert: đưa sequence về giá trị cũ (đang lệch) sẽ tái tạo đúng bug.
  }
}
