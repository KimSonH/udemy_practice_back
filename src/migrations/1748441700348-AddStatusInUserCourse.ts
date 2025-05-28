import { MigrationInterface, QueryRunner } from "typeorm";

export class AddStatusInUserCourse1748441700348 implements MigrationInterface {
    name = 'AddStatusInUserCourse1748441700348'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_course" ADD "status" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_course" DROP COLUMN "status"`);
    }

}
