import 'dotenv/config';
import { Sequelize } from 'sequelize';
import { sequelize } from './models/index.js';

const useSsl = String(process.env.DB_SSL || '').toLowerCase() === 'true';
const dbName = process.env.DB_NAME || 'wattwatch';

/** Create the database if it doesn't exist, then sync all models (creates tables). */
export async function initDatabase() {
  const bootstrap = new Sequelize('', process.env.DB_USER || 'root', process.env.DB_PASSWORD || '', {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    dialect: 'mysql',
    logging: false,
    dialectOptions: useSsl ? { ssl: { rejectUnauthorized: false } } : {},
  });

  await bootstrap.query(
    `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await bootstrap.close();

  await sequelize.authenticate();
  await sequelize.sync();
  console.log(`Database "${dbName}" ready — all tables synced.`);
}

export async function pingDb() {
  await sequelize.authenticate();
  return true;
}

export { sequelize };

