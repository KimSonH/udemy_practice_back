import { MigrationInterface, QueryRunner } from "typeorm";

export class  $npmConfigName1749804670752 implements MigrationInterface {
    name = ' $npmConfigName1749804670752'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "user_premium" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "accountEmail" character varying NOT NULL, "orderId" character varying, "orderData" character varying, "orderBy" character varying, "status" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_9d18ae162ccccd64719207ecf5b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "user_premium" ADD CONSTRAINT "FK_a6d374df28ba8ef7def1ee541f8" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_premium" DROP CONSTRAINT "FK_a6d374df28ba8ef7def1ee541f8"`);
        await queryRunner.query(`DROP TABLE "user_premium"`);
    }

}
