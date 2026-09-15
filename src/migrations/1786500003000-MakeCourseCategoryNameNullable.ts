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
    // Restoring NOT NULL: NULL rows become an empty string first, because a
    // course without a category used to be stored as '' (video courses, say).
    await queryRunner.query(
      `UPDATE "course" SET "category_name" = '' WHERE "category_name" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "course" ALTER COLUMN "category_name" SET NOT NULL`,
    );
  }
}
