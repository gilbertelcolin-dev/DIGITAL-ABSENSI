import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';

// POST /api/auth/login { username, password } -> { token }
export async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'username dan password wajib.' });
    const rows = await query(`SELECT * FROM users WHERE username = ?`, [username]);
    if (!rows.length) return res.status(401).json({ message: 'Username atau password salah.' });
    const ok = await bcrypt.compare(password, rows[0].password_hash);
    if (!ok) return res.status(401).json({ message: 'Username atau password salah.' });
    const token = jwt.sign(
      { sub: rows[0].id, username: rows[0].username },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '12h' }
    );
    res.json({ message: 'Login berhasil.', token, admin: { username: rows[0].username, nama: rows[0].nama } });
  } catch (e) { next(e); }
}

// Middleware: lindungi route admin (contoh: kelola siswa)
export function requireAuth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Butuh login admin.' });
  try {
    req.admin = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    next();
  } catch {
    return res.status(401).json({ message: 'Token tidak valid / kedaluwarsa.' });
  }
}
