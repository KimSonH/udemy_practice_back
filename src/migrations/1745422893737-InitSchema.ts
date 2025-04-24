import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1745422893737 implements MigrationInterface {
    name = 'InitSchema1745422893737'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "user" ("id" SERIAL NOT NULL, "email" character varying NOT NULL, "firstName" character varying NOT NULL, "lastName" character varying NOT NULL, "password" character varying NOT NULL, "currentHashedRefreshToken" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."class_marker_questiontype_enum" AS ENUM('multiplechoice', 'truefalse', 'multipleresponse', 'shortanswer')`);
        await queryRunner.query(`CREATE TABLE "class_marker" ("id" SERIAL NOT NULL, "questionType" "public"."class_marker_questiontype_enum" NOT NULL DEFAULT 'multiplechoice', "parentCategoryName" character varying, "categoryName" character varying, "randomAnswer" character varying, "correctFeedback" character varying, "incorrectFeedback" character varying, "point" integer NOT NULL, "question" character varying NOT NULL, "correct" character varying NOT NULL, "answerA" character varying NOT NULL, "answerB" character varying NOT NULL, "answerC" character varying, "answerD" character varying, "answerE" character varying, "answerF" character varying, "answerG" character varying, "answerH" character varying, "answerI" character varying, "answerJ" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_330293e8427809ac35a11626a63" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "admin" ("id" SERIAL NOT NULL, "email" character varying NOT NULL, "firstName" character varying NOT NULL, "lastName" character varying NOT NULL, "password" character varying NOT NULL, "role" character varying NOT NULL, "currentHashedRefreshToken" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "UQ_de87485f6489f5d0995f5841952" UNIQUE ("email"), CONSTRAINT "PK_e032310bcef831fb83101899b10" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "udemy_question_bank" ("id" SERIAL NOT NULL, "question" character varying, "questionType" character varying, "categoryName" character varying, "answerOption1" character varying, "explanation1" character varying, "answerOption2" character varying, "explanation2" character varying, "answerOption3" character varying, "explanation3" character varying, "answerOption4" character varying, "explanation4" character varying, "answerOption5" character varying, "explanation5" character varying, "answerOption6" character varying, "explanation6" character varying, "correctAnswer" character varying, "overallExplanation" character varying, "domain" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_b456e148c582d42a6a57c35c7a4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "organizations" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "slug" character varying NOT NULL, "description" character varying, "thumbnailImageUrl" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "UQ_963693341bd612aa01ddf3a4b68" UNIQUE ("slug"), CONSTRAINT "PK_6b031fcd0863e3f6b44230163f9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "course" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "description" character varying, "content" character varying, "thumbnailImageUrl" character varying, "status" character varying NOT NULL, "price" integer NOT NULL, "type" character varying NOT NULL, "categoryName" character varying NOT NULL, "slug" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "organizationId" integer, CONSTRAINT "UQ_a101f48e5045bcf501540a4a5b8" UNIQUE ("slug"), CONSTRAINT "PK_bf95180dd756fd204fb01ce4916" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "course_set" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "courseId" integer, CONSTRAINT "PK_4b618149930a47841496f9029ed" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "category_course" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "description" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_becefa4788db15281f585822095" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "course_set_udemy_question_banks_udemy_question_bank" ("courseSetId" integer NOT NULL, "udemyQuestionBankId" integer NOT NULL, CONSTRAINT "PK_3c0359f3d1786f3059843f285da" PRIMARY KEY ("courseSetId", "udemyQuestionBankId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_47ac96a1a731055dad87643b76" ON "course_set_udemy_question_banks_udemy_question_bank" ("courseSetId") `);
        await queryRunner.query(`CREATE INDEX "IDX_9aa77c2767839743712f469d38" ON "course_set_udemy_question_banks_udemy_question_bank" ("udemyQuestionBankId") `);
        await queryRunner.query(`ALTER TABLE "course" ADD CONSTRAINT "FK_185bdae02bd62d9d4da3273c3b9" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "course_set" ADD CONSTRAINT "FK_c20bfd980d8c93f86e30d1d98d0" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "course_set_udemy_question_banks_udemy_question_bank" ADD CONSTRAINT "FK_47ac96a1a731055dad87643b76a" FOREIGN KEY ("courseSetId") REFERENCES "course_set"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "course_set_udemy_question_banks_udemy_question_bank" ADD CONSTRAINT "FK_9aa77c2767839743712f469d380" FOREIGN KEY ("udemyQuestionBankId") REFERENCES "udemy_question_bank"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "course_set_udemy_question_banks_udemy_question_bank" DROP CONSTRAINT "FK_9aa77c2767839743712f469d380"`);
        await queryRunner.query(`ALTER TABLE "course_set_udemy_question_banks_udemy_question_bank" DROP CONSTRAINT "FK_47ac96a1a731055dad87643b76a"`);
        await queryRunner.query(`ALTER TABLE "course_set" DROP CONSTRAINT "FK_c20bfd980d8c93f86e30d1d98d0"`);
        await queryRunner.query(`ALTER TABLE "course" DROP CONSTRAINT "FK_185bdae02bd62d9d4da3273c3b9"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9aa77c2767839743712f469d38"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_47ac96a1a731055dad87643b76"`);
        await queryRunner.query(`DROP TABLE "course_set_udemy_question_banks_udemy_question_bank"`);
        await queryRunner.query(`DROP TABLE "category_course"`);
        await queryRunner.query(`DROP TABLE "course_set"`);
        await queryRunner.query(`DROP TABLE "course"`);
        await queryRunner.query(`DROP TABLE "organizations"`);
        await queryRunner.query(`DROP TABLE "udemy_question_bank"`);
        await queryRunner.query(`DROP TABLE "admin"`);
        await queryRunner.query(`DROP TABLE "class_marker"`);
        await queryRunner.query(`DROP TYPE "public"."class_marker_questiontype_enum"`);
        await queryRunner.query(`DROP TABLE "user"`);
    }

}
