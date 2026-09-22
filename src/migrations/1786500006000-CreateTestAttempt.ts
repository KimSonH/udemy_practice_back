import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTestAttempt1786500006000 implements MigrationInterface {
  name = 'CreateTestAttempt1786500006000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // The exam clock columns are timestamptz, unlike the created_at/updated_at
    // convention elsewhere in this schema. Whether an attempt has run out of
    // time is decided by comparing these against the server's clock, and a
    // timestamp without a zone is a wall-clock reading that means different
    // instants in different places.
    await queryRunner.query(`
      CREATE TABLE "test_attempt" (
        "id" SERIAL NOT NULL,
        "mode" character varying NOT NULL,
        "status" character varying NOT NULL DEFAULT 'in_progress',
        "current_index" integer NOT NULL DEFAULT 0,
        "question_ids" jsonb,
        "option_order" jsonb,
        "answers" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "flagged" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "revealed" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "revision" integer NOT NULL DEFAULT 0,
        "started_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "finished_at" TIMESTAMP WITH TIME ZONE,
        "deadline" TIMESTAMP WITH TIME ZONE,
        "timed_out" boolean NOT NULL DEFAULT false,
        "correct_count" integer,
        "total_count" integer,
        "domain_scores" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "user_id" integer NOT NULL,
        "course_id" integer NOT NULL,
        "course_set_id" integer,
        CONSTRAINT "PK_test_attempt" PRIMARY KEY ("id")
      )
    `);

    // Serves both reads there are: one learner's history for a course, and the
    // cross-course progress summary. Both start from the user.
    await queryRunner.query(`
      CREATE INDEX "IDX_test_attempt_user_course_started"
        ON "test_attempt" ("user_id", "course_id", "started_at")
    `);

    // CASCADE throughout: an attempt has no meaning once its learner, its
    // course or its set is gone, and leaving orphans would quietly skew every
    // progress figure computed from this table.
    await queryRunner.query(`
      ALTER TABLE "test_attempt"
        ADD CONSTRAINT "FK_test_attempt_user"
        FOREIGN KEY ("user_id") REFERENCES "user"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "test_attempt"
        ADD CONSTRAINT "FK_test_attempt_course"
        FOREIGN KEY ("course_id") REFERENCES "course"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "test_attempt"
        ADD CONSTRAINT "FK_test_attempt_course_set"
        FOREIGN KEY ("course_set_id") REFERENCES "course_set"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "test_attempt"`);
  }
}
