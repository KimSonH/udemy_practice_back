import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTBTransaction1765457543333 implements MigrationInterface {
    name = 'AddTBTransaction1765457543333'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "tb_transactions" ("id" SERIAL NOT NULL, "gateway" character varying(100) NOT NULL, "transaction_date" TIMESTAMP NOT NULL DEFAULT now(), "account_number" character varying(100), "sub_account" character varying(250), "amount_in" numeric(20,2) NOT NULL DEFAULT '0', "amount_out" numeric(20,2) NOT NULL DEFAULT '0', "accumulated" numeric(20,2) NOT NULL DEFAULT '0', "code" character varying(250), "transaction_content" text, "reference_number" character varying(255), "body" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_fa73e03e9932974888aeee77998" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "tb_transactions"`);
    }

}
