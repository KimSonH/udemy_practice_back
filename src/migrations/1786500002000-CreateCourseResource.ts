import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCourseResource1786500002000 implements MigrationInterface {
  name = 'CreateCourseResource1786500002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "course_resource" (
        "id" SERIAL NOT NULL,
        "title" character varying NOT NULL,
        "slug" character varying NOT NULL,
        "html" text,
        "is_visible" boolean NOT NULL DEFAULT false,
        "access_level" character varying NOT NULL DEFAULT 'private',
        "order" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "course_id" integer,
        CONSTRAINT "PK_course_resource" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "course_resource"
      ADD CONSTRAINT "FK_course_resource_course"
      FOREIGN KEY ("course_id") REFERENCES "course"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // A slug is unique within one course, counting only rows not soft-deleted.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_course_resource_course_slug"
      ON "course_resource" ("course_id", "slug")
      WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_course_resource_course_id"
      ON "course_resource" ("course_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_course_resource_course_id"`);
    await queryRunner.query(`DROP INDEX "UQ_course_resource_course_slug"`);
    await queryRunner.query(
      `ALTER TABLE "course_resource" DROP CONSTRAINT "FK_course_resource_course"`,
    );
    await queryRunner.query(`DROP TABLE "course_resource"`);
  }
}
