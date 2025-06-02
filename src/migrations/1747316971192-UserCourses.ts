import { MigrationInterface, QueryRunner } from "typeorm";

export class UserCourses1747316971192 implements MigrationInterface {
    name = 'UserCourses1747316971192'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "user_course" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "courseId" integer NOT NULL, "orderId" character varying NOT NULL, "orderData" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_10687f04aeb9fbcb6a6c744ef73" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "user_course" ADD CONSTRAINT "FK_63b2ec4f34c89d4b1219f85a806" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_course" ADD CONSTRAINT "FK_67a940b1d7b3cc2f0e99ab6d23b" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_course" DROP CONSTRAINT "FK_67a940b1d7b3cc2f0e99ab6d23b"`);
        await queryRunner.query(`ALTER TABLE "user_course" DROP CONSTRAINT "FK_63b2ec4f34c89d4b1219f85a806"`);
        await queryRunner.query(`DROP TABLE "user_course"`);
    }

}
