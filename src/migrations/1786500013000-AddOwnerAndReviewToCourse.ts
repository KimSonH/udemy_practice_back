import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Lets learners create courses.
 *
 * owner_user_id: the learner who created the course; NULL for courses made in
 * the admin. SET NULL on delete, so removing an account leaves its courses to
 * the admin rather than taking buyers' courses with it.
 *
 * reviewed_at: learner courses go public at once and an admin looks at them
 * afterwards. NULL on a learner course means "not looked at since its last
 * edit". Meaningless for admin courses, which stay NULL.
 */
export class AddOwnerAndReviewToCourse1786500013000
  implements MigrationInterface
{
  name = 'AddOwnerAndReviewToCourse1786500013000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "course" ADD "owner_user_id" integer`);
    await queryRunner.query(`ALTER TABLE "course" ADD "reviewed_at" TIMESTAMP`);
    await queryRunner.query(
      `ALTER TABLE "course" ADD CONSTRAINT "FK_course_owner_user" FOREIGN KEY ("owner_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_course_owner_user_id" ON "course" ("owner_user_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_course_owner_user_id"`);
    await queryRunner.query(
      `ALTER TABLE "course" DROP CONSTRAINT "FK_course_owner_user"`,
    );
    await queryRunner.query(`ALTER TABLE "course" DROP COLUMN "reviewed_at"`);
    await queryRunner.query(`ALTER TABLE "course" DROP COLUMN "owner_user_id"`);
  }
}
