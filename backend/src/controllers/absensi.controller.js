import { query } from '../config/db.js';
import { parseFotoBase64, saveFoto, todayStr } from '../utils/foto.js';

// ============================================================
// POST /api/absensi
// Body JSON: { id, kelas, foto? }
//  - id    : barcode siswa, contoh "101"
//  - kelas : NAMA kelas sesi ini, contoh "Matematika" (wajib! karena 1 anak bisa 2 kelas)
//  - foto  : base64 JPG/PNG max 2MB dari react-webcam, key "foto"
// Aturan: unik per (siswa, kelas, tanggal). Scan ke-2 di kelas yg sama hari yg sama -> 409.
// ============================================================
export async function createAbsensi(req, res, next) {
  try {
    const { id, kelas, foto } = req.body;
    if (!id || !kelas) {
      return res.status(400).json({ message: 'id dan kelas wajib diisi. Contoh: {"id":"101","kelas":"Matematika"}' });
    }
    const siswaId = String(id).trim();
    const namaKelas = String(kelas).trim();
    const tanggal = todayStr();

    // 1. Siswa harus terdaftar
    const s = await query(`SELECT id, nama FROM siswa WHERE id = ?`, [siswaId]);
    if (!s.length) return res.status(404).json({ message: `ID ${siswaId} tidak terdaftar. Hubungi admin.` });
    const siswa = s[0];

    // 2. Kelas sesi ini harus ada
    const k = await query(`SELECT id, nama FROM kelas WHERE nama = ?`, [namaKelas]);
    if (!k.length) return res.status(404).json({ message: `Kelas "${namaKelas}" tidak ditemukan.` });

    // 3. Siswa harus terdaftar DI kelas itu (cegah anak Fisika absen di Matematika)
    const rel = await query(`SELECT 1 FROM siswa_kelas WHERE siswa_id = ? AND kelas_id = ?`, [siswaId, k[0].id]);
    if (!rel.length) {
      return res.status(403).json({ message: `Maaf ${siswa.nama}, kamu tidak terdaftar di kelas ${namaKelas}.` });
    }

    // 4. Cegah dobel: sudah absen kelas ini hari ini?
    const dup = await query(
      `SELECT id FROM absensi WHERE siswa_id = ? AND kelas_id = ? AND tanggal = ?`,
      [siswaId, k[0].id, tanggal]
    );
    if (dup.length) {
      return res.status(409).json({
        message: `Halo ${siswa.nama}, kamu sudah absen ${namaKelas} hari ini. Sampai jumpa di sesi berikutnya!`,
      });
    }

    // 5. Validasi + simpan foto (anti titip absen)
    let fotoPath = null;
    if (foto) {
      try {
        const parsed = parseFotoBase64(foto);
        fotoPath = saveFoto(parsed.buffer, parsed.ext, siswaId);
      } catch (err) {
        return res.status(400).json({ message: err.message });
      }
    }

    await query(
      `INSERT INTO absensi (siswa_id, kelas_id, tanggal, foto_path) VALUES (?, ?, ?, ?)`,
      [siswaId, k[0].id, tanggal, fotoPath]
    );

    // 6. Pesan ramah untuk tablet
    return res.status(201).json({
      message: `Selamat datang ${siswa.nama}, kamu sudah absen les ${namaKelas} untuk hari ini, semangatt!`,
      data: { id: siswaId, nama: siswa.nama, kelas: namaKelas, tanggal, foto: fotoPath },
    });
  } catch (e) { next(e); }
}

// GET /api/absensi?date=YYYY-MM-DD&kelas=Fisika&search=Budi
export async function listAbsensi(req, res, next) {
  try {
    const { date, kelas = '', search = '' } = req.query;
    const tanggal = date || todayStr();
    const cond = [`a.tanggal = ?`];
    const p = [tanggal];
    if (kelas) { cond.push(`k.nama = ?`); p.push(kelas); }
    if (search) { cond.push(`(s.id LIKE ? OR s.nama LIKE ?)`); p.push(`%${search}%`, `%${search}%`); }
    const rows = await query(
      `SELECT a.id, a.tanggal, a.checkin_at AS waktu, a.foto_path AS foto,
              s.id AS siswa_id, s.nama, k.nama AS kelas
       FROM absensi a
       JOIN siswa s ON s.id = a.siswa_id
       JOIN kelas k ON k.id = a.kelas_id
       WHERE ${cond.join(' AND ')}
       ORDER BY a.checkin_at DESC`,
      p
    );
    res.json({ tanggal, jumlah: rows.length, data: rows });
  } catch (e) { next(e); }
}

// GET /api/absensi/stats?date=&kelas= — untuk admin panel: hadir vs belum hadir
export async function statsAbsensi(req, res, next) {
  try {
    const { date, kelas = '' } = req.query;
    const tanggal = date || todayStr();

    // total siswa terdaftar (filter kelas bila diminta)
    const totalQ = kelas
      ? await query(
          `SELECT COUNT(*) AS n FROM siswa_kelas sk JOIN kelas k ON k.id = sk.kelas_id WHERE k.nama = ?`,
          [kelas]
        )
      : await query(`SELECT COUNT(*) AS n FROM siswa`);
    const total = Number(totalQ[0]?.n || 0);

    // yang sudah hadir hari itu
    const hadirQ = kelas
      ? await query(
          `SELECT COUNT(*) AS n FROM absensi a JOIN kelas k ON k.id = a.kelas_id
           WHERE a.tanggal = ? AND k.nama = ?`, [tanggal, kelas]
        )
      : await query(`SELECT COUNT(DISTINCT siswa_id) AS n FROM absensi WHERE tanggal = ?`, [tanggal]);
    const hadir = Number(hadirQ[0]?.n || 0);

    // yang belum hadir = selisih (nama-namanya juga dikirim biar admin gampang nagih)
    let belum = [];
    if (kelas) {
      belum = await query(
        `SELECT s.id, s.nama FROM siswa s
         JOIN siswa_kelas sk ON sk.siswa_id = s.id
         JOIN kelas k ON k.id = sk.kelas_id
         WHERE k.nama = ?
           AND s.id NOT IN (SELECT siswa_id FROM absensi a JOIN kelas k2 ON k2.id = a.kelas_id
                            WHERE a.tanggal = ? AND k2.nama = ?)
         ORDER BY s.nama`, [kelas, tanggal, kelas]
      );
    } else {
      belum = await query(
        `SELECT id, nama FROM siswa
         WHERE id NOT IN (SELECT DISTINCT siswa_id FROM absensi WHERE tanggal = ?)
         ORDER BY nama`, [tanggal]
      );
    }
    res.json({ tanggal, kelas: kelas || 'semua', total, hadir, belum_hadir: total - hadir, daftar_belum_hadir: belum });
  } catch (e) { next(e); }
}
