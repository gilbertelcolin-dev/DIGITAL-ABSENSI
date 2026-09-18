import 'dotenv/config';
import mysql from 'mysql2/promise';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// backend/src/config -> naik 3x ke folder backend/
const BACKEND_ROOT = path.resolve(__dirname, '..', '..', '..', 'backend');
const DRIVER = (process.env.DB_DRIVER || 'sqlite').toLowerCase();

let driver = DRIVER;
let pool = null;
let sqlite = null;

if (driver === 'mysql') {
  pool = mysql.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'absensi_db',
    waitForConnections: true,
    connectionLimit: 10,
    dateStrings: true, // tanggal jadi string YYYY-MM-DD (konsisten dgn sqlite)
  });
} else {
  driver = 'sqlite'; // default lokal: tanpa install MySQL
  const file = process.env.SQLITE_FILE || './data/absensi.db';
  const abs = path.isAbsolute(file) ? file : path.join(BACKEND_ROOT, file);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  sqlite = new DatabaseSync(abs);
}

// Query seragam untuk kedua driver.
// - SELECT -> array of rows
// - INSERT/UPDATE/DELETE -> { insertId, affectedRows }
export async function query(sql, params = []) {
  if (driver === 'mysql') {
    const [rows, fields] = await pool.query(sql, params);
    if (Array.isArray(rows)) return rows;
    return rows; // OkPacket untuk non-SELECT
  }
  // sqlite (sync, dibungkus async biar API sama)
  const trimmed = sql.trim().toUpperCase();
  if (trimmed.startsWith('SELECT') || trimmed.startsWith('WITH')) {
    return sqlite.prepare(sql).all(...params);
  }
  const res = sqlite.prepare(sql).run(...params);
  return {
    insertId: Number(res.lastInsertRowid) || 0,
    affectedRows: Number(res.changes) || 0,
  };
}

export async function getConnection() {
  if (driver === 'mysql') return pool.getConnection();
  return null;
}

export const dbDriver = () => driver;
