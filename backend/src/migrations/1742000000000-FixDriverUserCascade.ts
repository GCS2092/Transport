import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixDriverUserCascade1742000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Supprimer l'ancienne contrainte SET NULL
    await queryRunner.query(`
      ALTER TABLE drivers 
      DROP CONSTRAINT IF EXISTS "FK_57d866371f392f459cd9ee46f6a"
    `);

    // Recréer avec CASCADE
    await queryRunner.query(`
      ALTER TABLE drivers
      ADD CONSTRAINT "FK_57d866371f392f459cd9ee46f6a"
      FOREIGN KEY ("userId")
      REFERENCES users(id)
      ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE drivers 
      DROP CONSTRAINT IF EXISTS "FK_57d866371f392f459cd9ee46f6a"
    `);

    await queryRunner.query(`
      ALTER TABLE drivers
      ADD CONSTRAINT "FK_57d866371f392f459cd9ee46f6a"
      FOREIGN KEY ("userId")
      REFERENCES users(id)
      ON DELETE SET NULL
    `);
  }
}