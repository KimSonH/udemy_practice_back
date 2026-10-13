import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Records every video uploaded to Gumroad through the API, with the learner
 * who uploaded it (NULL for admins). Learner courses may only use their own
 * uploads, and the daily cap on learner uploads counts these rows.
 * CASCADE: a deleted account's upload log goes with it.
 */
export class CreateGumroadUpload1786500014000 implements MigrationInterface {
  name = 'CreateGumroadUpload1786500014000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "gumroad_upload" (
        "id" SERIAL NOT NULL,
        "user_id" integer,
        "url" character varying NOT NULL,
        "size" bigint NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_gumroad_upload" PRIMARY KEY ("id"),
        CONSTRAINT "FK_gumroad_upload_user" FOREIGN KEY ("user_id")
          REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_gumroad_upload_url" ON "gumroad_upload" ("url")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_gumroad_upload_user_created" ON "gumroad_upload" ("user_id", "created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "gumroad_upload"`);
  }
}
