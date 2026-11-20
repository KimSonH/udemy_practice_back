import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * What an instructor's public page shows about them: a one-line headline, an
 * about text, a photo and links to their other profiles.
 */
export class AddUserInstructorProfile1786500019000
  implements MigrationInterface
{
  name = 'AddUserInstructorProfile1786500019000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user"
         ADD "headline" character varying(120),
         ADD "bio" text,
         ADD "avatar_url" character varying,
         ADD "profile_links" jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user"
         DROP COLUMN "profile_links",
         DROP COLUMN "avatar_url",
         DROP COLUMN "bio",
         DROP COLUMN "headline"`,
    );
  }
}
