import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The content type the last link check got back, so a link that answers 200
 * with an image can be told apart from one that does not answer at all.
 */
export class AddGumroadVideoStatusContentType1786500018000
  implements MigrationInterface
{
  name = 'AddGumroadVideoStatusContentType1786500018000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "gumroad_video_status" ADD "check_content_type" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "gumroad_video_status" DROP COLUMN "check_content_type"`,
    );
  }
}
