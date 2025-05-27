import { MigrationInterface, QueryRunner } from "typeorm";

export class OrderByOfUserCourse1748354245481 implements MigrationInterface {
    name = 'OrderByOfUserCourse1748354245481'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_course" ADD "orderBy" character varying`);
        await queryRunner.query(`ALTER TABLE "user_course" ALTER COLUMN "orderId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "user_course" ALTER COLUMN "orderData" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_course" ALTER COLUMN "orderData" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "user_course" ALTER COLUMN "orderId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "user_course" DROP COLUMN "orderBy"`);
    }

}
