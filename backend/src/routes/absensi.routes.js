import { Router } from 'express';
import { createAbsensi, listAbsensi, statsAbsensi } from '../controllers/absensi.controller.js';

const r = Router();
// Urutan penting: /stats harus sebelum / agar tidak ketelan
r.get('/stats', statsAbsensi); // admin: hadir vs belum hadir
r.get('/', listAbsensi);       // admin: tabel + filter + search
r.post('/', createAbsensi);    // tablet: scan + foto
export default r;
