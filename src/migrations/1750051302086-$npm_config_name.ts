import { MigrationInterface, QueryRunner } from "typeorm";

export class  $npmConfigName1750051302086 implements MigrationInterface {
    name = ' $npmConfigName1750051302086'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_premium" ADD "accountId" integer`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_premium" DROP COLUMN "accountId"`);
    }

}
