import { MigrationInterface, QueryRunner } from "typeorm";

export class ChangePriceTypeCourse1756475055465 implements MigrationInterface {
    name = 'ChangePriceTypeCourse1756475055465'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "course" DROP COLUMN "price"`);
        await queryRunner.query(`ALTER TABLE "course" ADD "price" numeric(10,2)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "course" DROP COLUMN "price"`);
        await queryRunner.query(`ALTER TABLE "course" ADD "price" integer NOT NULL`);
    }

}
