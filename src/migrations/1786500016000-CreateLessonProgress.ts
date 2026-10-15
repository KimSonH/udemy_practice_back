import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Which lessons of a video course a learner has opened and finished, keyed by
 * the lesson's video URL (lessons get new ids on every course save). CASCADE:
 * progress goes with the account or the course.
 */
export class CreateLessonProgress1786500016000 implements MigrationInterface {
  name = 'CreateLessonProgress1786500016000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "lesson_progress" (
        "id" SERIAL NOT NULL,
        "user_id" integer NOT NULL,
        "course_id" integer NOT NULL,
        "url" character varying NOT NULL,
        "completed_at" TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_lesson_progress" PRIMARY KEY ("id"),
        CONSTRAINT "FK_lesson_progress_user" FOREIGN KEY ("user_id")
          REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_lesson_progress_course" FOREIGN KEY ("course_id")
          REFERENCES "course"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_lesson_progress_user_course_url" ON "lesson_progress" ("user_id", "course_id", "url")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "lesson_progress"`);
  }
}
