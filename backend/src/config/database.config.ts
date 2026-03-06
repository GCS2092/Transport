import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

const baseConfig = {
  type: 'postgres' as const,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  synchronize: !isProduction,
  migrationsRun: isProduction,
  logging: !isProduction,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
};

const connectionConfig = process.env.DATABASE_URL
  ? { url: process.env.DATABASE_URL }
  : {
      host:     process.env.DB_HOST     || 'localhost',
      port:     parseInt(process.env.DB_PORT, 10) || 5432,
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME     || 'Transport',
    };

export const databaseConfig: TypeOrmModuleOptions = {
  ...baseConfig,
  ...connectionConfig,
} as TypeOrmModuleOptions;

export default new DataSource(databaseConfig as DataSourceOptions);