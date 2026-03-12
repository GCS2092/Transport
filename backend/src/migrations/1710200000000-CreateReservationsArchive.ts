import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReservationsArchive1710200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "reservations_archive" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "code" character varying NOT NULL,
        "status" character varying NOT NULL,
        "tripType" character varying NOT NULL,
        "language" character varying NOT NULL DEFAULT 'FR',
        "pickupDateTime" TIMESTAMP NOT NULL,
        "completedAt" TIMESTAMP,
        "amount" numeric(10,2) NOT NULL,
        "driverId" character varying,
        "pickupLabel" character varying,
        "dropoffLabel" character varying,
        "clientHash" character varying,
        "archivedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_reservations_archive_id" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_reservations_archive_pickupDateTime" ON "reservations_archive" ("pickupDateTime");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_reservations_archive_archivedAt" ON "reservations_archive" ("archivedAt");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "reservations_archive";`);
  }
}

