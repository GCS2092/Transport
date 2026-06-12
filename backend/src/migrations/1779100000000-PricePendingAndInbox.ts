import { MigrationInterface, QueryRunner } from 'typeorm';

export class PricePendingAndInbox1779100000000 implements MigrationInterface {
  name = 'PricePendingAndInbox1779100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "reservations"
      ADD COLUMN IF NOT EXISTS "pricePending" boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'client_inbox_messages_messagetype_enum'
        ) THEN
          CREATE TYPE "public"."client_inbox_messages_messagetype_enum"
          AS ENUM ('SYSTEM', 'PRICE_QUOTE', 'ADMIN');
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "client_inbox_messages" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "reservationId" uuid NOT NULL,
        "clientEmail" character varying NOT NULL,
        "message" text NOT NULL,
        "messageType" "public"."client_inbox_messages_messagetype_enum" NOT NULL DEFAULT 'SYSTEM',
        "quotedAmount" numeric(10,2),
        "isFromAdmin" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_client_inbox_messages" PRIMARY KEY ("id"),
        CONSTRAINT "FK_client_inbox_messages_reservation"
          FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_client_inbox_reservation"
      ON "client_inbox_messages" ("reservationId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "client_inbox_messages"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."client_inbox_messages_messagetype_enum"`);
    await queryRunner.query(`ALTER TABLE "reservations" DROP COLUMN IF EXISTS "pricePending"`);
  }
}
