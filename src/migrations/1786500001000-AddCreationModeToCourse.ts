import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCreationModeToCourse1786500001000
  implements MigrationInterface
{
  name = 'AddCreationModeToCourse1786500001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "course" ADD "creation_mode" character varying NOT NULL DEFAULT 'auto'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "course" DROP COLUMN "creation_mode"`);
  }
}
