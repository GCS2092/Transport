import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFlightDetailsToReservations1711400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ajout des champs pour les détails de vol
    await queryRunner.query(`
      ALTER TABLE "reservations" 
      ADD COLUMN IF NOT EXISTS "airlineCompany" character varying,
      ADD COLUMN IF NOT EXISTS "departureTime" character varying,
      ADD COLUMN IF NOT EXISTS "landingTime" character varying,
      ADD COLUMN IF NOT EXISTS "flightDetails" text,
      ADD COLUMN IF NOT EXISTS "vehicleCount" integer DEFAULT 1,
      ADD COLUMN IF NOT EXISTS "currency" character varying;
    `);

    // Index pour optimiser les recherches par compagnie aérienne
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_reservations_airlineCompany" ON "reservations" ("airlineCompany");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Suppression des colonnes en cas de rollback
    await queryRunner.query(`
      ALTER TABLE "reservations" 
      DROP COLUMN IF EXISTS "airlineCompany",
      DROP COLUMN IF EXISTS "departureTime",
      DROP COLUMN IF EXISTS "landingTime",
      DROP COLUMN IF EXISTS "flightDetails",
      DROP COLUMN IF EXISTS "vehicleCount",
      DROP COLUMN IF EXISTS "currency";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_reservations_airlineCompany";
    `);
  }
}
