import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPaymentTrackingFields1774527567226 implements MigrationInterface {
    name = 'AddPaymentTrackingFields1774527567226'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "reservations"
            ADD COLUMN IF NOT EXISTS "paymentUpdatedBy" character varying(20)
        `);
        await queryRunner.query(`
            ALTER TABLE "reservations"
            ADD COLUMN IF NOT EXISTS "paymentUpdatedByName" character varying(255)
        `);
        await queryRunner.query(`
            ALTER TABLE "reservations"
            ADD COLUMN IF NOT EXISTS "paymentUpdatedAt" TIMESTAMP
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reservations" DROP COLUMN IF EXISTS "paymentUpdatedAt"`);
        await queryRunner.query(`ALTER TABLE "reservations" DROP COLUMN IF EXISTS "paymentUpdatedByName"`);
        await queryRunner.query(`ALTER TABLE "reservations" DROP COLUMN IF EXISTS "paymentUpdatedBy"`);
    }
}