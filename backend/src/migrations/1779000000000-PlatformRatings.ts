import { MigrationInterface, QueryRunner } from 'typeorm';

export class PlatformRatings1779000000000 implements MigrationInterface {
  name = 'PlatformRatings1779000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "platform_ratings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "rating" integer NOT NULL,
        "comment" text,
        "email" character varying(255),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_platform_ratings" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_platform_ratings_createdAt" ON "platform_ratings" ("createdAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "platform_ratings"`);
  }
}
