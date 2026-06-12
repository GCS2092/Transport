import { MigrationInterface, QueryRunner } from 'typeorm';
import { getZoneSeedEntries } from '../seed/zones.data';

export class SeedZones1780000000000 implements MigrationInterface {
  name = 'SeedZones1780000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const entries = getZoneSeedEntries();

    for (const entry of entries) {
      await queryRunner.query(
        `INSERT INTO zones (id, name, description, "isActive", "createdAt", "updatedAt")
         VALUES (uuid_generate_v4(), $1, $2, true, NOW(), NOW())
         ON CONFLICT (name) DO UPDATE SET
           description = EXCLUDED.description,
           "isActive" = true`,
        [entry.name, entry.description],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const entries = getZoneSeedEntries();
    const names = entries.map(e => e.name);

    await queryRunner.query(
      `UPDATE zones SET "isActive" = false WHERE name = ANY($1)`,
      [names],
    );
  }
}
