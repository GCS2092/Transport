import { MigrationInterface, QueryRunner } from 'typeorm';

export class NullableClientEmail1781000000000 implements MigrationInterface {
  name = 'NullableClientEmail1781000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "reservations"
      ALTER COLUMN "clientEmail" DROP NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "client_inbox_messages"
      ALTER COLUMN "clientEmail" DROP NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "reservations" SET "clientEmail" = '' WHERE "clientEmail" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "reservations"
      ALTER COLUMN "clientEmail" SET NOT NULL
    `);

    await queryRunner.query(`
      UPDATE "client_inbox_messages" SET "clientEmail" = '' WHERE "clientEmail" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "client_inbox_messages"
      ALTER COLUMN "clientEmail" SET NOT NULL
    `);
  }
}
