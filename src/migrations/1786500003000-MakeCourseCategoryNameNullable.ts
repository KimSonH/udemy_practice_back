import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeCourseCategoryNameNullable1786500003000
  implements MigrationInterface
{
  name = 'MakeCourseCategoryNameNullable1786500003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "course" ALTER COLUMN "category_name" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Khôi phục NOT NULL: các bản ghi NULL được đưa về chuỗi rỗng trước, vì
    // trước đây course không có category vẫn lưu '' (ví dụ video course).
    await queryRunner.query(
      `UPDATE "course" SET "category_name" = '' WHERE "category_name" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "course" ALTER COLUMN "category_name" SET NOT NULL`,
    );
  }
}
