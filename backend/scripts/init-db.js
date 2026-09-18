import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { query, dbDriver } from '../src/config/db.js';

const adminUser = process.env.ADMIN_USERNAME || 'admin';
const adminPass = process.env.ADMIN_PASSWORD || 'admin123';

const DDL_SQLITE = `
CREATE TABLE IF NOT EXISTS siswa (id TEXT PRIMARY KEY, nama TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now','localtime')));
CREATE TABLE IF NOT EXISTS kelas (id INTEGER PRIMARY KEY AUTOINCREMENT, nama TEXT NOT NULL UNIQUE);
CREATE TABLE IF NOT EXISTS siswa_kelas (siswa_id TEXT NOT NULL, kelas_id INTEGER NOT NULL, PRIMARY KEY (siswa_id, kelas_id),
  FOREIGN KEY (siswa_id) REFERENCES siswa(id) ON DELETE CASCADE,
  FOREIGN KEY (kelas_id) REFERENCES kelas(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, nama TEXT DEFAULT 'Administrator');
CREATE TABLE IF NOT EXISTS absensi (id INTEGER PRIMARY KEY AUTOINCREMENT, siswa_id TEXT NOT NULL, kelas_id INTEGER NOT NULL,
  tanggal TEXT NOT NULL, checkin_at TEXT DEFAULT (datetime('now','localtime')), foto_path TEXT,
  FOREIGN KEY (siswa_id) REFERENCES siswa(id) ON DELETE CASCADE,
  FOREIGN KEY (kelas_id) REFERENCES kelas(id) ON DELETE CASCADE,
  UNIQUE (siswa_id, kelas_id, tanggal));
`;

async function seed() {
  // kelas
  for (const k of ['Matematika', 'Fisika']) {
    if (dbDriver() === 'mysql') {
      await query(`INSERT IGNORE INTO kelas (nama) VALUES (?)`, [k]);
    } else {
      await query(`INSERT OR IGNORE INTO kelas (nama) VALUES (?)`, [k]);
    }
  }
  // siswa contoh (sesuai data kamu)
  const siswa = [
    { id: '101', nama: 'Budi Santoso', kelas: ['Matematika', 'Fisika'] },
    { id: '102', nama: 'Siti Aminah', kelas: ['Fisika'] },
  ];
  for (const s of siswa) {
    const ada = await query(`SELECT id FROM siswa WHERE id = ?`, [s.id]);
    if (!ada.length) await query(`INSERT INTO siswa (id, nama) VALUES (?, ?)`, [s.id, s.nama]);
    for (const kn of s.kelas) {
      const kr = await query(`SELECT id FROM kelas WHERE nama = ?`, [kn]);
      try { await query(`INSERT INTO siswa_kelas (siswa_id, kelas_id) VALUES (?, ?)`, [s.id, kr[0].id]); }
      catch { /* sudah ada */ }
    }
  }
  // admin
  const u = await query(`SELECT id FROM users WHERE username = ?`, [adminUser]);
  if (!u.length) {
    const hash = await bcrypt.hash(adminPass, 10);
    await query(`INSERT INTO users (username, password_hash, nama) VALUES (?, ?, ?)`, [adminUser, hash, 'Administrator']);
  }
  console.log(`✅ Seed OK — admin: ${adminUser} / ${adminPass.replace(/./g, '*')} (lihat .env)`);
}

async function main() {
  if (dbDriver() === 'sqlite') {
    for (const stmt of DDL_SQLITE.split(';').map((s) => s.trim()).filter(Boolean)) {
      await query(stmt);
    }
  } else {
    // MySQL: tabel dibuat dari sql/schema.mysql.sql (atau buat di sini juga biar idempotent)
    await query(`CREATE TABLE IF NOT EXISTS siswa (id VARCHAR(20) PRIMARY KEY, nama VARCHAR(100) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await query(`CREATE TABLE IF NOT EXISTS kelas (id INT AUTO_INCREMENT PRIMARY KEY, nama VARCHAR(100) NOT NULL UNIQUE)`);
    await query(`CREATE TABLE IF NOT EXISTS siswa_kelas (siswa_id VARCHAR(20) NOT NULL, kelas_id INT NOT NULL, PRIMARY KEY (siswa_id, kelas_id),
      FOREIGN KEY (siswa_id) REFERENCES siswa(id) ON DELETE CASCADE, FOREIGN KEY (kelas_id) REFERENCES kelas(id) ON DELETE CASCADE)`);
    await query(`CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(50) NOT NULL UNIQUE, password_hash VARCHAR(255) NOT NULL, nama VARCHAR(100) DEFAULT 'Administrator')`);
    await query(`CREATE TABLE IF NOT EXISTS absensi (id INT AUTO_INCREMENT PRIMARY KEY, siswa_id VARCHAR(20) NOT NULL, kelas_id INT NOT NULL,
      tanggal DATE NOT NULL, checkin_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, foto_path VARCHAR(255) NULL,
      FOREIGN KEY (siswa_id) REFERENCES siswa(id) ON DELETE CASCADE, FOREIGN KEY (kelas_id) REFERENCES kelas(id) ON DELETE CASCADE,
      UNIQUE KEY uq_absen (siswa_id, kelas_id, tanggal))`);
  }
  await seed();
  console.log(`✅ init-db selesai (driver=${dbDriver()})`);
}

main().catch((e) => { console.error('❌ init-db gagal:', e.message); process.exit(1); });
