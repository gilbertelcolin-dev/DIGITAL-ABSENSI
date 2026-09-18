import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import siswaRoutes from './src/routes/siswa.routes.js';
import absensiRoutes from './src/routes/absensi.routes.js';
import authRoutes from './src/routes/auth.routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Foto base64 2MB -> JSON bisa ~2.8MB, jadi limit 3MB
app.use(cors());
app.use(express.json({ limit: '3mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => res.json({
  ok: true,
  service: 'digital-absensi backend',
  endpoints: ['POST /api/absensi', 'GET /api/absensi', 'GET /api/absensi/stats', 'GET /api/siswa', 'POST /api/siswa', 'PUT /api/siswa/:id', 'DELETE /api/siswa/:id', 'POST /api/auth/login'],
}));

app.use('/api/siswa', siswaRoutes);
app.use('/api/absensi', absensiRoutes);
app.use('/api/auth', authRoutes);

// 404 + error handler rapi (biar frontend gampang baca message)
app.use((req, res) => res.status(404).json({ message: 'Endpoint tidak ditemukan.' }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Payload terlalu besar. Foto maksimal 2 MB.' });
  }
  res.status(500).json({ message: 'Kesalahan server. Coba lagi.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Backend jalan di http://localhost:${PORT} (driver=${process.env.DB_DRIVER || 'sqlite'})`);
  console.log(`   Tablet: POST /api/absensi   Admin: GET /api/absensi + /stats`);
});
