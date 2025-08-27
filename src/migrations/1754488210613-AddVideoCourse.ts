import { MigrationInterface, QueryRunner } from "typeorm";

export class AddVideoCourse1754488210613 implements MigrationInterface {
    name = 'AddVideoCourse1754488210613'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "course_content" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "description" character varying, "uploadUrl" character varying, "duration" integer, "isRead" boolean, "isShown" boolean, "type" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "courseSessionId" integer, CONSTRAINT "PK_b5408ca87e293be3f489c1c5c81" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "course_session" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "description" character varying, "uploadUrl" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "courseId" integer, CONSTRAINT "PK_12288a725cc3c3fba4e600a0ef6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "course_content" ADD CONSTRAINT "FK_f1281164769d6f2350fd78f226b" FOREIGN KEY ("courseSessionId") REFERENCES "course_session"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "course_session" ADD CONSTRAINT "FK_e9bb31da957336a4d604ead2656" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "course_session" DROP CONSTRAINT "FK_e9bb31da957336a4d604ead2656"`);
        await queryRunner.query(`ALTER TABLE "course_content" DROP CONSTRAINT "FK_f1281164769d6f2350fd78f226b"`);
        await queryRunner.query(`DROP TABLE "course_session"`);
        await queryRunner.query(`DROP TABLE "course_content"`);
    }

}
