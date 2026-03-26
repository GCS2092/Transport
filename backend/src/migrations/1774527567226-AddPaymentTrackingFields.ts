import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPaymentTrackingFields1774527567226 implements MigrationInterface {
    name = 'AddPaymentTrackingFields1774527567226'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reservations" ADD "paymentUpdatedBy" character varying(20)`);
        await queryRunner.query(`ALTER TABLE "reservations" ADD "paymentUpdatedByName" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "reservations" ADD "paymentUpdatedAt" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reservations" DROP COLUMN "paymentUpdatedAt"`);
        await queryRunner.query(`ALTER TABLE "reservations" DROP COLUMN "paymentUpdatedByName"`);
        await queryRunner.query(`ALTER TABLE "reservations" DROP COLUMN "paymentUpdatedBy"`);
    }
}
