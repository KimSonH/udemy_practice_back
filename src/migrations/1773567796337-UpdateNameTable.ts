import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateNameTable1773567796337 implements MigrationInterface {
  name = 'UpdateNameTable1773567796337';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Drop FKs
    await queryRunner.query(
      `ALTER TABLE "course_set" DROP CONSTRAINT "FK_c20bfd980d8c93f86e30d1d98d0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_content" DROP CONSTRAINT "FK_f1281164769d6f2350fd78f226b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_session" DROP CONSTRAINT "FK_e9bb31da957336a4d604ead2656"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course" DROP CONSTRAINT "FK_185bdae02bd62d9d4da3273c3b9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_course" DROP CONSTRAINT "FK_63b2ec4f34c89d4b1219f85a806"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_course" DROP CONSTRAINT "FK_67a940b1d7b3cc2f0e99ab6d23b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_premium" DROP CONSTRAINT "FK_a6d374df28ba8ef7def1ee541f8"`,
    );

    // 2. Create join table (new table, no rename)
    await queryRunner.query(
      `CREATE TABLE "course_set_udemy_question_bank" ("course_set_id" integer NOT NULL, "udemy_question_bank_id" integer NOT NULL, CONSTRAINT "PK_5bc2ab1344e655f293d6aba68dc" PRIMARY KEY ("course_set_id", "udemy_question_bank_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b7742efef7b78c39a4229a8e1a" ON "course_set_udemy_question_bank" ("course_set_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4b5ed3477dec733d09610f52c7" ON "course_set_udemy_question_bank" ("udemy_question_bank_id")`,
    );

    // 3. Rename columns (preserve data) - udemy_question_bank
    await queryRunner.query(
      `ALTER TABLE "udemy_question_bank" RENAME COLUMN "questionType" TO "question_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "udemy_question_bank" RENAME COLUMN "categoryName" TO "category_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "udemy_question_bank" RENAME COLUMN "answerOption1" TO "answer_option_1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "udemy_question_bank" RENAME COLUMN "explanation1" TO "explanation_1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "udemy_question_bank" RENAME COLUMN "answerOption2" TO "answer_option_2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "udemy_question_bank" RENAME COLUMN "explanation2" TO "explanation_2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "udemy_question_bank" RENAME COLUMN "answerOption3" TO "answer_option_3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "udemy_question_bank" RENAME COLUMN "explanation3" TO "explanation_3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "udemy_question_bank" RENAME COLUMN "answerOption4" TO "answer_option_4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "udemy_question_bank" RENAME COLUMN "explanation4" TO "explanation_4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "udemy_question_bank" RENAME COLUMN "answerOption5" TO "answer_option_5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "udemy_question_bank" RENAME COLUMN "explanation5" TO "explanation_5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "udemy_question_bank" RENAME COLUMN "answerOption6" TO "answer_option_6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "udemy_question_bank" RENAME COLUMN "explanation6" TO "explanation_6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "udemy_question_bank" RENAME COLUMN "correctAnswer" TO "correct_answer"`,
    );
    await queryRunner.query(
      `ALTER TABLE "udemy_question_bank" RENAME COLUMN "overallExplanation" TO "overall_explanation"`,
    );
    await queryRunner.query(
      `ALTER TABLE "udemy_question_bank" RENAME COLUMN "createdAt" TO "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "udemy_question_bank" RENAME COLUMN "updatedAt" TO "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "udemy_question_bank" RENAME COLUMN "deletedAt" TO "deleted_at"`,
    );

    // course_set
    await queryRunner.query(
      `ALTER TABLE "course_set" RENAME COLUMN "createdAt" TO "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_set" RENAME COLUMN "updatedAt" TO "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_set" RENAME COLUMN "deletedAt" TO "deleted_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_set" RENAME COLUMN "courseId" TO "course_id"`,
    );

    // organizations
    await queryRunner.query(
      `ALTER TABLE "organizations" RENAME COLUMN "thumbnailImageUrl" TO "thumbnail_image_url"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizations" RENAME COLUMN "createdAt" TO "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizations" RENAME COLUMN "updatedAt" TO "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizations" RENAME COLUMN "deletedAt" TO "deleted_at"`,
    );

    // course_content
    await queryRunner.query(
      `ALTER TABLE "course_content" RENAME COLUMN "uploadUrl" TO "upload_url"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_content" RENAME COLUMN "isRead" TO "is_read"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_content" RENAME COLUMN "isShown" TO "is_shown"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_content" RENAME COLUMN "createdAt" TO "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_content" RENAME COLUMN "updatedAt" TO "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_content" RENAME COLUMN "deletedAt" TO "deleted_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_content" RENAME COLUMN "courseSessionId" TO "course_session_id"`,
    );

    // course_session
    await queryRunner.query(
      `ALTER TABLE "course_session" RENAME COLUMN "uploadUrl" TO "upload_url"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_session" RENAME COLUMN "createdAt" TO "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_session" RENAME COLUMN "updatedAt" TO "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_session" RENAME COLUMN "deletedAt" TO "deleted_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_session" RENAME COLUMN "courseId" TO "course_id"`,
    );

    // course
    await queryRunner.query(
      `ALTER TABLE "course" RENAME COLUMN "thumbnailImageUrl" TO "thumbnail_image_url"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course" RENAME COLUMN "categoryName" TO "category_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course" RENAME COLUMN "createdAt" TO "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course" RENAME COLUMN "updatedAt" TO "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course" RENAME COLUMN "deletedAt" TO "deleted_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course" RENAME COLUMN "organizationId" TO "organization_id"`,
    );

    // user_course
    await queryRunner.query(
      `ALTER TABLE "user_course" RENAME COLUMN "userId" TO "user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_course" RENAME COLUMN "courseId" TO "course_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_course" RENAME COLUMN "orderId" TO "order_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_course" RENAME COLUMN "orderData" TO "order_data"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_course" RENAME COLUMN "orderBy" TO "order_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_course" RENAME COLUMN "createdAt" TO "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_course" RENAME COLUMN "updatedAt" TO "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_course" RENAME COLUMN "deletedAt" TO "deleted_at"`,
    );

    // user_premium
    await queryRunner.query(
      `ALTER TABLE "user_premium" RENAME COLUMN "userId" TO "user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_premium" RENAME COLUMN "accountEmail" TO "account_email"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_premium" RENAME COLUMN "accountId" TO "account_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_premium" RENAME COLUMN "orderId" TO "order_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_premium" RENAME COLUMN "orderData" TO "order_data"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_premium" RENAME COLUMN "orderBy" TO "order_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_premium" RENAME COLUMN "createdAt" TO "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_premium" RENAME COLUMN "updatedAt" TO "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_premium" RENAME COLUMN "deletedAt" TO "deleted_at"`,
    );

    // user
    await queryRunner.query(
      `ALTER TABLE "user" RENAME COLUMN "firstName" TO "first_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" RENAME COLUMN "lastName" TO "last_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" RENAME COLUMN "currentHashedRefreshToken" TO "current_hashed_refresh_token"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" RENAME COLUMN "createdAt" TO "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" RENAME COLUMN "updatedAt" TO "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" RENAME COLUMN "deletedAt" TO "deleted_at"`,
    );

    // admin
    await queryRunner.query(
      `ALTER TABLE "admin" RENAME COLUMN "firstName" TO "first_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "admin" RENAME COLUMN "lastName" TO "last_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "admin" RENAME COLUMN "currentHashedRefreshToken" TO "current_hashed_refresh_token"`,
    );
    await queryRunner.query(
      `ALTER TABLE "admin" RENAME COLUMN "createdAt" TO "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "admin" RENAME COLUMN "updatedAt" TO "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "admin" RENAME COLUMN "deletedAt" TO "deleted_at"`,
    );

    // class_marker: rename enum type then column
    await queryRunner.query(
      `ALTER TYPE "public"."class_marker_questiontype_enum" RENAME TO "class_marker_question_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_marker" RENAME COLUMN "questionType" TO "question_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_marker" RENAME COLUMN "parentCategoryName" TO "parent_category_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_marker" RENAME COLUMN "categoryName" TO "category_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_marker" RENAME COLUMN "randomAnswer" TO "random_answer"`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_marker" RENAME COLUMN "correctFeedback" TO "correct_feedback"`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_marker" RENAME COLUMN "incorrectFeedback" TO "incorrect_feedback"`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_marker" RENAME COLUMN "answerA" TO "answer_a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_marker" RENAME COLUMN "answerB" TO "answer_b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_marker" RENAME COLUMN "answerC" TO "answer_c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_marker" RENAME COLUMN "answerD" TO "answer_d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_marker" RENAME COLUMN "answerE" TO "answer_e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_marker" RENAME COLUMN "answerF" TO "answer_f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_marker" RENAME COLUMN "answerG" TO "answer_g"`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_marker" RENAME COLUMN "answerH" TO "answer_h"`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_marker" RENAME COLUMN "answerI" TO "answer_i"`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_marker" RENAME COLUMN "answerJ" TO "answer_j"`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_marker" RENAME COLUMN "createdAt" TO "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_marker" RENAME COLUMN "updatedAt" TO "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_marker" RENAME COLUMN "deletedAt" TO "deleted_at"`,
    );

    // category_course
    await queryRunner.query(
      `ALTER TABLE "category_course" RENAME COLUMN "createdAt" TO "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "category_course" RENAME COLUMN "updatedAt" TO "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "category_course" RENAME COLUMN "deletedAt" TO "deleted_at"`,
    );

    // 4. Re-add FKs
    await queryRunner.query(
      `ALTER TABLE "course_set" ADD CONSTRAINT "FK_40175d040ab91fb7a94de7aebae" FOREIGN KEY ("course_id") REFERENCES "course"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_content" ADD CONSTRAINT "FK_9e9a5fbf8dbe593a72679efe2a6" FOREIGN KEY ("course_session_id") REFERENCES "course_session"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_session" ADD CONSTRAINT "FK_7d09aa9b1873078d3eae312b69b" FOREIGN KEY ("course_id") REFERENCES "course"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "course" ADD CONSTRAINT "FK_a689399339465273230b0fc2289" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_course" ADD CONSTRAINT "FK_8abb4cbd80ac598dbe7c4dd8ce2" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_course" ADD CONSTRAINT "FK_a17a0128f2f4fbb56ca04a07036" FOREIGN KEY ("course_id") REFERENCES "course"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_premium" ADD CONSTRAINT "FK_d5e3338274543d0be19129ff8c4" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_set_udemy_question_bank" ADD CONSTRAINT "FK_b7742efef7b78c39a4229a8e1a8" FOREIGN KEY ("course_set_id") REFERENCES "course_set"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_set_udemy_question_bank" ADD CONSTRAINT "FK_4b5ed3477dec733d09610f52c7b" FOREIGN KEY ("udemy_question_bank_id") REFERENCES "udemy_question_bank"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop FKs
    await queryRunner.query(
      `ALTER TABLE "course_set_udemy_question_bank" DROP CONSTRAINT "FK_4b5ed3477dec733d09610f52c7b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_set_udemy_question_bank" DROP CONSTRAINT "FK_b7742efef7b78c39a4229a8e1a8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_premium" DROP CONSTRAINT "FK_d5e3338274543d0be19129ff8c4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_course" DROP CONSTRAINT "FK_a17a0128f2f4fbb56ca04a07036"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_course" DROP CONSTRAINT "FK_8abb4cbd80ac598dbe7c4dd8ce2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course" DROP CONSTRAINT "FK_a689399339465273230b0fc2289"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_session" DROP CONSTRAINT "FK_7d09aa9b1873078d3eae312b69b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_content" DROP CONSTRAINT "FK_9e9a5fbf8dbe593a72679efe2a6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_set" DROP CONSTRAINT "FK_40175d040ab91fb7a94de7aebae"`,
    );

    // Rename back - category_course
    await queryRunner.query(
      `ALTER TABLE "category_course" RENAME COLUMN "deleted_at" TO "deletedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "category_course" RENAME COLUMN "updated_at" TO "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "category_course" RENAME COLUMN "created_at" TO "createdAt"`,
    );

    // class_marker
    await queryRunner.query(
      `ALTER TABLE "class_marker" RENAME COLUMN "deleted_at" TO "deletedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_marker" RENAME COLUMN "updated_at" TO "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_marker" RENAME COLUMN "created_at" TO "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_marker" RENAME COLUMN "answer_j" TO "answerJ"`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_marker" RENAME COLUMN "answer_i" TO "answerI"`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_marker" RENAME COLUMN "answer_h" TO "answerH"`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_marker" RENAME COLUMN "answer_g" TO "answerG"`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_marker" RENAME COLUMN "answer_f" TO "answerF"`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_marker" RENAME COLUMN "answer_e" TO "answerE"`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_marker" RENAME COLUMN "answer_d" TO "answerD"`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_marker" RENAME COLUMN "answer_c" TO "answerC"`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_marker" RENAME COLUMN "answer_b" TO "answerB"`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_marker" RENAME COLUMN "answer_a" TO "answerA"`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_marker" RENAME COLUMN "incorrect_feedback" TO "incorrectFeedback"`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_marker" RENAME COLUMN "correct_feedback" TO "correctFeedback"`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_marker" RENAME COLUMN "random_answer" TO "randomAnswer"`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_marker" RENAME COLUMN "category_name" TO "categoryName"`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_marker" RENAME COLUMN "parent_category_name" TO "parentCategoryName"`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_marker" RENAME COLUMN "question_type" TO "questionType"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."class_marker_question_type_enum" RENAME TO "class_marker_questiontype_enum"`,
    );

    // admin
    await queryRunner.query(
      `ALTER TABLE "admin" RENAME COLUMN "deleted_at" TO "deletedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "admin" RENAME COLUMN "updated_at" TO "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "admin" RENAME COLUMN "created_at" TO "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "admin" RENAME COLUMN "current_hashed_refresh_token" TO "currentHashedRefreshToken"`,
    );
    await queryRunner.query(
      `ALTER TABLE "admin" RENAME COLUMN "last_name" TO "lastName"`,
    );
    await queryRunner.query(
      `ALTER TABLE "admin" RENAME COLUMN "first_name" TO "firstName"`,
    );

    // user
    await queryRunner.query(
      `ALTER TABLE "user" RENAME COLUMN "deleted_at" TO "deletedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" RENAME COLUMN "updated_at" TO "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" RENAME COLUMN "created_at" TO "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" RENAME COLUMN "current_hashed_refresh_token" TO "currentHashedRefreshToken"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" RENAME COLUMN "last_name" TO "lastName"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" RENAME COLUMN "first_name" TO "firstName"`,
    );

    // user_premium
    await queryRunner.query(
      `ALTER TABLE "user_premium" RENAME COLUMN "deleted_at" TO "deletedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_premium" RENAME COLUMN "updated_at" TO "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_premium" RENAME COLUMN "created_at" TO "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_premium" RENAME COLUMN "order_by" TO "orderBy"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_premium" RENAME COLUMN "order_data" TO "orderData"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_premium" RENAME COLUMN "order_id" TO "orderId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_premium" RENAME COLUMN "account_id" TO "accountId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_premium" RENAME COLUMN "account_email" TO "accountEmail"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_premium" RENAME COLUMN "user_id" TO "userId"`,
    );

    // user_course
    await queryRunner.query(
      `ALTER TABLE "user_course" RENAME COLUMN "deleted_at" TO "deletedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_course" RENAME COLUMN "updated_at" TO "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_course" RENAME COLUMN "created_at" TO "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_course" RENAME COLUMN "order_by" TO "orderBy"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_course" RENAME COLUMN "order_data" TO "orderData"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_course" RENAME COLUMN "order_id" TO "orderId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_course" RENAME COLUMN "course_id" TO "courseId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_course" RENAME COLUMN "user_id" TO "userId"`,
    );

    // course
    await queryRunner.query(
      `ALTER TABLE "course" RENAME COLUMN "organization_id" TO "organizationId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course" RENAME COLUMN "deleted_at" TO "deletedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course" RENAME COLUMN "updated_at" TO "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course" RENAME COLUMN "created_at" TO "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course" RENAME COLUMN "category_name" TO "categoryName"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course" RENAME COLUMN "thumbnail_image_url" TO "thumbnailImageUrl"`,
    );

    // course_session
    await queryRunner.query(
      `ALTER TABLE "course_session" RENAME COLUMN "course_id" TO "courseId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_session" RENAME COLUMN "deleted_at" TO "deletedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_session" RENAME COLUMN "updated_at" TO "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_session" RENAME COLUMN "created_at" TO "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_session" RENAME COLUMN "upload_url" TO "uploadUrl"`,
    );

    // course_content
    await queryRunner.query(
      `ALTER TABLE "course_content" RENAME COLUMN "course_session_id" TO "courseSessionId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_content" RENAME COLUMN "deleted_at" TO "deletedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_content" RENAME COLUMN "updated_at" TO "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_content" RENAME COLUMN "created_at" TO "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_content" RENAME COLUMN "is_shown" TO "isShown"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_content" RENAME COLUMN "is_read" TO "isRead"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_content" RENAME COLUMN "upload_url" TO "uploadUrl"`,
    );

    // organizations
    await queryRunner.query(
      `ALTER TABLE "organizations" RENAME COLUMN "deleted_at" TO "deletedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizations" RENAME COLUMN "updated_at" TO "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizations" RENAME COLUMN "created_at" TO "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizations" RENAME COLUMN "thumbnail_image_url" TO "thumbnailImageUrl"`,
    );

    // course_set
    await queryRunner.query(
      `ALTER TABLE "course_set" RENAME COLUMN "course_id" TO "courseId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_set" RENAME COLUMN "deleted_at" TO "deletedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_set" RENAME COLUMN "updated_at" TO "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_set" RENAME COLUMN "created_at" TO "createdAt"`,
    );

    // udemy_question_bank
    await queryRunner.query(
      `ALTER TABLE "udemy_question_bank" RENAME COLUMN "deleted_at" TO "deletedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "udemy_question_bank" RENAME COLUMN "updated_at" TO "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "udemy_question_bank" RENAME COLUMN "created_at" TO "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "udemy_question_bank" RENAME COLUMN "overall_explanation" TO "overallExplanation"`,
    );
    await queryRunner.query(
      `ALTER TABLE "udemy_question_bank" RENAME COLUMN "correct_answer" TO "correctAnswer"`,
    );
    await queryRunner.query(
      `ALTER TABLE "udemy_question_bank" RENAME COLUMN "explanation_6" TO "explanation6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "udemy_question_bank" RENAME COLUMN "answer_option_6" TO "answerOption6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "udemy_question_bank" RENAME COLUMN "explanation_5" TO "explanation5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "udemy_question_bank" RENAME COLUMN "answer_option_5" TO "answerOption5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "udemy_question_bank" RENAME COLUMN "explanation_4" TO "explanation4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "udemy_question_bank" RENAME COLUMN "answer_option_4" TO "answerOption4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "udemy_question_bank" RENAME COLUMN "explanation_3" TO "explanation3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "udemy_question_bank" RENAME COLUMN "answer_option_3" TO "answerOption3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "udemy_question_bank" RENAME COLUMN "explanation_2" TO "explanation2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "udemy_question_bank" RENAME COLUMN "answer_option_2" TO "answerOption2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "udemy_question_bank" RENAME COLUMN "explanation_1" TO "explanation1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "udemy_question_bank" RENAME COLUMN "answer_option_1" TO "answerOption1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "udemy_question_bank" RENAME COLUMN "category_name" TO "categoryName"`,
    );
    await queryRunner.query(
      `ALTER TABLE "udemy_question_bank" RENAME COLUMN "question_type" TO "questionType"`,
    );

    // Drop join table
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4b5ed3477dec733d09610f52c7"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b7742efef7b78c39a4229a8e1a"`,
    );
    await queryRunner.query(`DROP TABLE "course_set_udemy_question_bank"`);

    // Re-add original FKs
    await queryRunner.query(
      `ALTER TABLE "user_premium" ADD CONSTRAINT "FK_a6d374df28ba8ef7def1ee541f8" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_course" ADD CONSTRAINT "FK_67a940b1d7b3cc2f0e99ab6d23b" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_course" ADD CONSTRAINT "FK_63b2ec4f34c89d4b1219f85a806" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "course" ADD CONSTRAINT "FK_185bdae02bd62d9d4da3273c3b9" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_session" ADD CONSTRAINT "FK_e9bb31da957336a4d604ead2656" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_content" ADD CONSTRAINT "FK_f1281164769d6f2350fd78f226b" FOREIGN KEY ("courseSessionId") REFERENCES "course_session"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_set" ADD CONSTRAINT "FK_c20bfd980d8c93f86e30d1d98d0" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
