import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCurrency1774527567225 implements MigrationInterface {
    name = 'AddCurrency1774527567225'

    public async up(queryRunner: QueryRunner): Promise<void> {

        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_reservations_airlineCompany"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_reservations_archive_pickupDateTime"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_reservations_archive_archivedAt"`);

        // SAFE ENUM
        await queryRunner.query(`
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_type WHERE typname = 'driver_proposals_status_enum'
            ) THEN
                CREATE TYPE "public"."driver_proposals_status_enum"
                AS ENUM ('PENDING','ACCEPTED','DECLINED','EXPIRED','SKIPPED');
            END IF;
        END$$;
        `);

        await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS "driver_proposals" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "reservationId" uuid NOT NULL,
            "driverId" uuid NOT NULL,
            "status" "public"."driver_proposals_status_enum"
                NOT NULL DEFAULT 'PENDING',
            "token" character varying(64) NOT NULL,
            "position" integer NOT NULL,
            "distance" double precision NOT NULL,
            "expiresAt" TIMESTAMP NOT NULL,
            "respondedAt" TIMESTAMP,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "UQ_eb08d4af80e26a0b4515b015103"
                UNIQUE ("token"),
            CONSTRAINT "PK_85f2b6c45afac79337dcab02788"
                PRIMARY KEY ("id")
        )
        `);

        await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS
        "IDX_eb08d4af80e26a0b4515b01510"
        ON "driver_proposals" ("token")
        `);

        await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS
        "IDX_9532786474b9d3926152d8b484"
        ON "driver_proposals" ("reservationId","status")
        `);

        await queryRunner.query(`
        ALTER TABLE "reservations"
        ADD COLUMN IF NOT EXISTS "currency" character varying
        `);

        await queryRunner.query(`
        ALTER TABLE "drivers"
        ADD CONSTRAINT IF NOT EXISTS
        "UQ_d4cfc1aafe3a14622aee390edb2"
        UNIQUE ("email")
        `);

        await queryRunner.query(`
        ALTER TABLE "reservations"
        ALTER COLUMN "vehicleCount"
        SET NOT NULL
        `);

        await queryRunner.query(`
        ALTER TABLE "reservations_archive"
        DROP COLUMN IF EXISTS "status"
        `);

        // SAFE ENUM status
        await queryRunner.query(`
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_type
                WHERE typname = 'reservations_archive_status_enum'
            ) THEN
                CREATE TYPE
                "public"."reservations_archive_status_enum"
                AS ENUM (
                    'EN_ATTENTE',
                    'ASSIGNEE',
                    'EN_COURS',
                    'TERMINEE',
                    'ANNULEE'
                );
            END IF;
        END$$;
        `);

        await queryRunner.query(`
        ALTER TABLE "reservations_archive"
        ADD COLUMN "status"
        "public"."reservations_archive_status_enum"
        NOT NULL
        `);

        await queryRunner.query(`
        ALTER TABLE "reservations_archive"
        DROP COLUMN IF EXISTS "tripType"
        `);

        await queryRunner.query(`
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_type
                WHERE typname = 'reservations_archive_triptype_enum'
            ) THEN
                CREATE TYPE
                "public"."reservations_archive_triptype_enum"
                AS ENUM (
                    'ALLER_SIMPLE',
                    'RETOUR_SIMPLE',
                    'ALLER_RETOUR'
                );
            END IF;
        END$$;
        `);

        await queryRunner.query(`
        ALTER TABLE "reservations_archive"
        ADD COLUMN "tripType"
        "public"."reservations_archive_triptype_enum"
        NOT NULL
        `);

        await queryRunner.query(`
        ALTER TABLE "reservations_archive"
        DROP COLUMN IF EXISTS "language"
        `);

        await queryRunner.query(`
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_type
                WHERE typname = 'reservations_archive_language_enum'
            ) THEN
                CREATE TYPE
                "public"."reservations_archive_language_enum"
                AS ENUM ('fr','en');
            END IF;
        END$$;
        `);

        await queryRunner.query(`
        ALTER TABLE "reservations_archive"
        ADD COLUMN "language"
        "public"."reservations_archive_language_enum"
        NOT NULL DEFAULT 'fr'
        `);

    }

    public async down(queryRunner: QueryRunner): Promise<void> {}
}