import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderInCourseSet1786500000000 implements MigrationInterface {
  name = 'AddOrderInCourseSet1786500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "course_set" ADD "order" integer`);

    // Backfill từ số ở cuối tên hiện có (ví dụ "Course Set 3" -> 3),
    // fallback sang số thứ tự theo id trong cùng course nếu tên không có số ở cuối.
    await queryRunner.query(`
      UPDATE "course_set" cs
      SET "order" = COALESCE(
        (substring(cs.name from '(\\d+)\\s*$'))::int,
        sub.rn
      )
      FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY course_id ORDER BY id) AS rn
        FROM "course_set"
      ) sub
      WHERE cs.id = sub.id
    `);

    await queryRunner.query(
      `ALTER TABLE "course_set" ALTER COLUMN "order" SET NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "course_set" DROP COLUMN "order"`);
  }
}
