import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Per Gumroad video URL: when an admin retired it, and the result of the last
 * link check. Keyed by URL, since pasted videos have no gumroad_upload row.
 */
export class CreateGumroadVideoStatus1786500017000
  implements MigrationInterface
{
  name = 'CreateGumroadVideoStatus1786500017000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "gumroad_video_status" (
        "id" SERIAL NOT NULL,
        "url" character varying NOT NULL,
        "retired_at" TIMESTAMP,
        "checked_at" TIMESTAMP,
        "check_ok" boolean,
        "check_status" integer,
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_gumroad_video_status" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_gumroad_video_status_url" ON "gumroad_video_status" ("url")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "gumroad_video_status"`);
  }
}
