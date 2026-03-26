import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCurrency1774527567225 implements MigrationInterface {
    name = 'AddCurrency1774527567225'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_reservations_airlineCompany"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_reservations_archive_pickupDateTime"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_reservations_archive_archivedAt"`);
        await queryRunner.query(`CREATE TYPE "public"."driver_proposals_status_enum" AS ENUM('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'SKIPPED')`);
        await queryRunner.query(`CREATE TABLE "driver_proposals" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "reservationId" uuid NOT NULL, "driverId" uuid NOT NULL, "status" "public"."driver_proposals_status_enum" NOT NULL DEFAULT 'PENDING', "token" character varying(64) NOT NULL, "position" integer NOT NULL, "distance" double precision NOT NULL, "expiresAt" TIMESTAMP NOT NULL, "respondedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_eb08d4af80e26a0b4515b015103" UNIQUE ("token"), CONSTRAINT "PK_85f2b6c45afac79337dcab02788" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_eb08d4af80e26a0b4515b01510" ON "driver_proposals" ("token") `);
        await queryRunner.query(`CREATE INDEX "IDX_9532786474b9d3926152d8b484" ON "driver_proposals" ("reservationId", "status") `);
        await queryRunner.query(`ALTER TABLE "reservations" ADD "currency" character varying`);
        await queryRunner.query(`ALTER TABLE "drivers" ADD CONSTRAINT "UQ_d4cfc1aafe3a14622aee390edb2" UNIQUE ("email")`);
        await queryRunner.query(`ALTER TABLE "reservations" ALTER COLUMN "vehicleCount" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "reservations_archive" DROP COLUMN "status"`);
        await queryRunner.query(`CREATE TYPE "public"."reservations_archive_status_enum" AS ENUM('EN_ATTENTE', 'ASSIGNEE', 'EN_COURS', 'TERMINEE', 'ANNULEE')`);
        await queryRunner.query(`ALTER TABLE "reservations_archive" ADD "status" "public"."reservations_archive_status_enum" NOT NULL`);
        await queryRunner.query(`ALTER TABLE "reservations_archive" DROP COLUMN "tripType"`);
        await queryRunner.query(`CREATE TYPE "public"."reservations_archive_triptype_enum" AS ENUM('ALLER_SIMPLE', 'RETOUR_SIMPLE', 'ALLER_RETOUR')`);
        await queryRunner.query(`ALTER TABLE "reservations_archive" ADD "tripType" "public"."reservations_archive_triptype_enum" NOT NULL`);
        await queryRunner.query(`ALTER TABLE "reservations_archive" DROP COLUMN "language"`);
        await queryRunner.query(`CREATE TYPE "public"."reservations_archive_language_enum" AS ENUM('fr', 'en')`);
        await queryRunner.query(`ALTER TABLE "reservations_archive" ADD "language" "public"."reservations_archive_language_enum" NOT NULL DEFAULT 'fr'`);
        await queryRunner.query(`ALTER TYPE "public"."email_logs_notificationtype_enum" RENAME TO "email_logs_notificationtype_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."email_logs_notificationtype_enum" AS ENUM('RESERVATION_CONFIRMED', 'CANCEL_TOKEN_REMINDER', 'DRIVER_ASSIGNED', 'REMINDER_J1', 'REMINDER_H1', 'RIDE_STARTED', 'RIDE_COMPLETED', 'RESERVATION_CANCELLED', 'DRIVER_NEW_RIDE', 'DRIVER_RIDE_MODIFIED', 'DRIVER_RIDE_CANCELLED', 'DRIVER_REMINDER_J1', 'ADMIN_NEW_RESERVATION', 'ADMIN_DRIVER_ASSIGNED', 'ADMIN_UNPAID_RIDE', 'ADMIN_ARCHIVE', 'MONTHLY_DRIVER_REPORT', 'MONTHLY_ADMIN_REPORT')`);
        await queryRunner.query(`ALTER TABLE "email_logs" ALTER COLUMN "notificationType" TYPE "public"."email_logs_notificationtype_enum" USING "notificationType"::"text"::"public"."email_logs_notificationtype_enum"`);
        await queryRunner.query(`DROP TYPE "public"."email_logs_notificationtype_enum_old"`);
        await queryRunner.query(`ALTER TABLE "driver_proposals" ADD CONSTRAINT "FK_43912866f148f38f8405a24f1f4" FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "driver_proposals" ADD CONSTRAINT "FK_9797bca23a9152e2348864716e6" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "driver_proposals" DROP CONSTRAINT "FK_9797bca23a9152e2348864716e6"`);
        await queryRunner.query(`ALTER TABLE "driver_proposals" DROP CONSTRAINT "FK_43912866f148f38f8405a24f1f4"`);
        await queryRunner.query(`CREATE TYPE "public"."email_logs_notificationtype_enum_old" AS ENUM('RESERVATION_CONFIRMED', 'DRIVER_ASSIGNED', 'REMINDER_J1', 'RIDE_STARTED', 'RIDE_COMPLETED', 'RESERVATION_CANCELLED', 'DRIVER_NEW_RIDE', 'DRIVER_RIDE_MODIFIED', 'DRIVER_RIDE_CANCELLED', 'DRIVER_REMINDER_J1')`);
        await queryRunner.query(`ALTER TABLE "email_logs" ALTER COLUMN "notificationType" TYPE "public"."email_logs_notificationtype_enum_old" USING "notificationType"::"text"::"public"."email_logs_notificationtype_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."email_logs_notificationtype_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."email_logs_notificationtype_enum_old" RENAME TO "email_logs_notificationtype_enum"`);
        await queryRunner.query(`ALTER TABLE "reservations_archive" DROP COLUMN "language"`);
        await queryRunner.query(`DROP TYPE "public"."reservations_archive_language_enum"`);
        await queryRunner.query(`ALTER TABLE "reservations_archive" ADD "language" character varying NOT NULL DEFAULT 'FR'`);
        await queryRunner.query(`ALTER TABLE "reservations_archive" DROP COLUMN "tripType"`);
        await queryRunner.query(`DROP TYPE "public"."reservations_archive_triptype_enum"`);
        await queryRunner.query(`ALTER TABLE "reservations_archive" ADD "tripType" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "reservations_archive" DROP COLUMN "status"`);
        await queryRunner.query(`DROP TYPE "public"."reservations_archive_status_enum"`);
        await queryRunner.query(`ALTER TABLE "reservations_archive" ADD "status" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "reservations" ALTER COLUMN "vehicleCount" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "drivers" DROP CONSTRAINT "UQ_d4cfc1aafe3a14622aee390edb2"`);
        await queryRunner.query(`ALTER TABLE "reservations" DROP COLUMN "currency"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9532786474b9d3926152d8b484"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_eb08d4af80e26a0b4515b01510"`);
        await queryRunner.query(`DROP TABLE "driver_proposals"`);
        await queryRunner.query(`DROP TYPE "public"."driver_proposals_status_enum"`);
        await queryRunner.query(`CREATE INDEX "IDX_reservations_archive_archivedAt" ON "reservations_archive" ("archivedAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_reservations_archive_pickupDateTime" ON "reservations_archive" ("pickupDateTime") `);
        await queryRunner.query(`CREATE INDEX "IDX_reservations_airlineCompany" ON "reservations" ("airlineCompany") `);
    }

}
