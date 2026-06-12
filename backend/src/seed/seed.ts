import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { getZoneSeedEntries } from './zones.data';

dotenv.config();

async function seedZones(dataSource: DataSource): Promise<void> {
  const entries = getZoneSeedEntries();
  let inserted = 0;
  let updated = 0;

  for (const entry of entries) {
    const existing = await dataSource.query(
      `SELECT id FROM zones WHERE name = $1`,
      [entry.name],
    );

    if (existing.length > 0) {
      await dataSource.query(
        `UPDATE zones SET description = $1, "isActive" = true WHERE name = $2`,
        [entry.description, entry.name],
      );
      updated++;
    } else {
      await dataSource.query(
        `INSERT INTO zones (id, name, description, "isActive", "createdAt", "updatedAt")
         VALUES (uuid_generate_v4(), $1, $2, true, NOW(), NOW())`,
        [entry.name, entry.description],
      );
      inserted++;
    }
  }

  console.log(`Zones: ${inserted} créées, ${updated} mises à jour (${entries.length} au total)`);
}

async function main() {
  const isProduction = process.env.NODE_ENV === 'production';
  const dataSource = new DataSource({
    type: 'postgres',
    ...(process.env.DATABASE_URL
      ? { url: process.env.DATABASE_URL }
      : {
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432', 10),
          username: process.env.DB_USERNAME || 'postgres',
          password: process.env.DB_PASSWORD || 'postgres',
          database: process.env.DB_NAME || 'Transport',
        }),
    ssl: isProduction ? { rejectUnauthorized: false } : false,
  });

  await dataSource.initialize();
  try {
    await seedZones(dataSource);
    console.log('Seed terminé.');
  } finally {
    await dataSource.destroy();
  }
}

main().catch(err => {
  console.error('Erreur seed:', err);
  process.exit(1);
});
