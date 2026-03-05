import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClientGpsToReservations1709649600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "reservations"
      ADD COLUMN IF NOT EXISTS "clientLatitude" DECIMAL(10, 7),
      ADD COLUMN IF NOT EXISTS "clientLongitude" DECIMAL(10, 7)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "reservations"
      DROP COLUMN IF EXISTS "clientLatitude",
      DROP COLUMN IF EXISTS "clientLongitude"
    `);
  }
}
