import { query } from '../config/db.js';

// GET /api/siswa — tampilkan tiap siswa + daftar kelasnya (digabung koma)
export async function listSiswa(req, res, next) {
  try {
    const { search = '' } = req.query;
    const where = search ? `WHERE s.id LIKE ? OR s.nama LIKE ?` : '';
    const p = search ? [`%${search}%`, `%${search}%`] : [];
    const rows = await query(
      `SELECT s.id, s.nama,
        COALESCE(GROUP_CONCAT(k.nama, ', '), '') AS kelas
       FROM siswa s
       LEFT JOIN siswa_kelas sk ON sk.siswa_id = s.id
       LEFT JOIN kelas k ON k.id = sk.kelas_id
       ${where}
       GROUP BY s.id, s.nama
       ORDER BY s.nama ASC`,
      p
    );
    res.json({ data: rows.map((r) => ({ ...r, kelas: r.kelas ? r.kelas.split(', ') : [] })) });
  } catch (e) { next(e); }
}

// POST /api/siswa — body: { id, nama, kelas: "Fisika" | ["Matematika","Fisika"] }
export async function createSiswa(req, res, next) {
  try {
    const { id, nama, kelas } = req.body;
    if (!id || !nama) return res.status(400).json({ message: 'id dan nama wajib diisi.' });
    const daftar = Array.isArray(kelas) ? kelas : kelas ? [kelas] : [];
    if (daftar.length === 0) return res.status(400).json({ message: 'Minimal 1 kelas wajib diisi.' });

    const ada = await query(`SELECT id FROM siswa WHERE id = ?`, [id]);
    if (ada.length) return res.status(409).json({ message: `Siswa id ${id} sudah terdaftar.` });

    await query(`INSERT INTO siswa (id, nama) VALUES (?, ?)`, [String(id).trim(), String(nama).trim()]);
    for (const k of daftar) {
      const namaK = String(k).trim();
      if (!namaK) continue;
      await query(`INSERT INTO kelas (nama) VALUES (?) ON CONFLICT(nama) DO NOTHING`, [namaK])
        .catch(() => query(`INSERT IGNORE INTO kelas (nama) VALUES (?)`, [namaK])); // mysql fallback
      const kr = await query(`SELECT id FROM kelas WHERE nama = ?`, [namaK]);
      await query(`INSERT INTO siswa_kelas (siswa_id, kelas_id) VALUES (?, ?)`, [id, kr[0].id])
        .catch(() => {}); // abaikan duplikat
    }
    res.status(201).json({ message: 'Siswa ditambahkan.', data: { id, nama, kelas: daftar } });
  } catch (e) { next(e); }
}

// PUT /api/siswa/:id — body: { nama?, kelas? } (kelas akan direplace total)
export async function updateSiswa(req, res, next) {
  try {
    const { id } = req.params;
    const { nama, kelas } = req.body;
    const ada = await query(`SELECT id FROM siswa WHERE id = ?`, [id]);
    if (!ada.length) return res.status(404).json({ message: 'Siswa tidak ditemukan.' });

    if (nama) await query(`UPDATE siswa SET nama = ? WHERE id = ?`, [String(nama).trim(), id]);
    if (kelas !== undefined) {
      const daftar = Array.isArray(kelas) ? kelas : kelas ? [kelas] : [];
      await query(`DELETE FROM siswa_kelas WHERE siswa_id = ?`, [id]);
      for (const k of daftar) {
        const namaK = String(k).trim();
        if (!namaK) continue;
        await query(`INSERT INTO kelas (nama) VALUES (?) ON CONFLICT(nama) DO NOTHING`, [namaK])
          .catch(() => query(`INSERT IGNORE INTO kelas (nama) VALUES (?)`, [namaK]));
        const kr = await query(`SELECT id FROM kelas WHERE nama = ?`, [namaK]);
        await query(`INSERT INTO siswa_kelas (siswa_id, kelas_id) VALUES (?, ?)`, [id, kr[0].id]).catch(() => {});
      }
    }
    res.json({ message: 'Siswa diperbarui.' });
  } catch (e) { next(e); }
}

// DELETE /api/siswa/:id
export async function deleteSiswa(req, res, next) {
  try {
    const { id } = req.params;
    const r = await query(`DELETE FROM siswa WHERE id = ?`, [id]);
    const n = r.affectedRows ?? 0;
    if (!n) return res.status(404).json({ message: 'Siswa tidak ditemukan.' });
    await query(`DELETE FROM siswa_kelas WHERE siswa_id = ?`, [id]).catch(() => {});
    res.json({ message: 'Siswa dihapus.' });
  } catch (e) { next(e); }
}
