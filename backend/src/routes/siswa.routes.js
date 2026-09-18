import { Router } from 'express';
import { listSiswa, createSiswa, updateSiswa, deleteSiswa } from '../controllers/siswa.controller.js';
import { requireAuth } from '../controllers/auth.controller.js';

const r = Router();
r.get('/', listSiswa);                 // publik: tablet butuh cek siswa (opsional)
r.post('/', requireAuth, createSiswa); // admin only
r.put('/:id', requireAuth, updateSiswa);
r.delete('/:id', requireAuth, deleteSiswa);
export default r;
