import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOrderInCourse1755245362858 implements MigrationInterface {
    name = 'AddOrderInCourse1755245362858'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "course_content" ADD "order" integer`);
        await queryRunner.query(`ALTER TABLE "course_session" ADD "order" integer`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "course_session" DROP COLUMN "order"`);
        await queryRunner.query(`ALTER TABLE "course_content" DROP COLUMN "order"`);
    }

}
