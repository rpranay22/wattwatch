import 'dotenv/config';
import mysql from 'mysql2/promise';

// DB_SSL: your CRM's Sequelize config hard-requires SSL (typical of a
// managed cloud MySQL such as PlanetScale/Aiven). If WattWatch and the CRM
// share that same host, this pool needs the same SSL setting to connect.
// Left optional so local development against plain MySQL still works.
const useSsl = String(process.env.DB_SSL || '').toLowerCase() === 'true';


export const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'wattwatch',
  waitForConnections: true,
  connectionLimit: 10,
  // DATE columns come back as plain 'YYYY-MM-DD' strings instead of JS Date
  // objects. A MySQL DATE has no timezone; converting it through a JS Date
  // and back out via toISOString() can silently shift the calendar day
  // depending on the server's local timezone, and calling .toISOString() on
  // whatever the driver actually returns was the root cause of the Usage
  // Calendar crash. Skipping the JS Date round-trip removes that entire
  // class of bug.
  dateStrings: ['DATE'],
  ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
});
console.log('DB Config:', {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'wattwatch',
  waitForConnections: true,
});
export async function pingDb() {
  const c = await db.getConnection();
  try { await c.query('SELECT 1'); return true; } finally { c.release(); }
}
