import { MigrationInterface, QueryRunner } from "typeorm";

export class AddExternalDriverFields1776136830917 implements MigrationInterface {
    name = 'AddExternalDriverFields1776136830917'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "platform_ratings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "rating" integer NOT NULL, "comment" text, "email" character varying(255), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_2ec94329af7dcff41c52ad8f517" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "users" ADD "deleted_at" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "reservations" ADD "airlineCompany" character varying`);
        await queryRunner.query(`ALTER TABLE "reservations" ADD "departureTime" character varying`);
        await queryRunner.query(`ALTER TABLE "reservations" ADD "landingTime" character varying`);
        await queryRunner.query(`ALTER TABLE "reservations" ADD "flightDetails" text`);
        await queryRunner.query(`ALTER TABLE "reservations" ADD "vehicleCount" integer NOT NULL DEFAULT '1'`);
        await queryRunner.query(`ALTER TABLE "reservations" ADD "paymentUpdatedBy" character varying(20)`);
        await queryRunner.query(`ALTER TABLE "reservations" ADD "paymentUpdatedByName" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "reservations" ADD "paymentUpdatedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "reservations" ADD "currency" character varying`);
        await queryRunner.query(`ALTER TABLE "reservations" ADD "externalDriverName" character varying`);
        await queryRunner.query(`ALTER TABLE "reservations" ADD "externalDriverPhone" character varying`);
        await queryRunner.query(`ALTER TABLE "reservations" ADD "externalDriverPlate" character varying`);
        await queryRunner.query(`ALTER TABLE "reservations" ADD "externalDriverVehicle" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reservations" DROP COLUMN "externalDriverVehicle"`);
        await queryRunner.query(`ALTER TABLE "reservations" DROP COLUMN "externalDriverPlate"`);
        await queryRunner.query(`ALTER TABLE "reservations" DROP COLUMN "externalDriverPhone"`);
        await queryRunner.query(`ALTER TABLE "reservations" DROP COLUMN "externalDriverName"`);
        await queryRunner.query(`ALTER TABLE "reservations" DROP COLUMN "currency"`);
        await queryRunner.query(`ALTER TABLE "reservations" DROP COLUMN "paymentUpdatedAt"`);
        await queryRunner.query(`ALTER TABLE "reservations" DROP COLUMN "paymentUpdatedByName"`);
        await queryRunner.query(`ALTER TABLE "reservations" DROP COLUMN "paymentUpdatedBy"`);
        await queryRunner.query(`ALTER TABLE "reservations" DROP COLUMN "vehicleCount"`);
        await queryRunner.query(`ALTER TABLE "reservations" DROP COLUMN "flightDetails"`);
        await queryRunner.query(`ALTER TABLE "reservations" DROP COLUMN "landingTime"`);
        await queryRunner.query(`ALTER TABLE "reservations" DROP COLUMN "departureTime"`);
        await queryRunner.query(`ALTER TABLE "reservations" DROP COLUMN "airlineCompany"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "deleted_at"`);
        await queryRunner.query(`DROP TABLE "platform_ratings"`);
    }

}
