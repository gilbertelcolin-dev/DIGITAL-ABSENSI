# Digital Absensi — Backend (Express)

## 1. Jalan lokal (tanpa install MySQL)
```bash
cd backend
cp .env.example .env   # default DB_DRIVER=sqlite, langsung jalan
npm install
npm run init-db        # bikin tabel + seed Budi/Siti + admin
npm run dev            # http://localhost:3000
```

## 2. Pindah ke MySQL / XAMPP
1. Buat DB via `sql/schema.mysql.sql` (phpMyAdmin → Import).
2. Isi `.env`:
```
DB_DRIVER=mysql
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=absensi_db
```
3. `npm run init-db && npm start`

## 3. Format API (penting! frontend wajib kirim `kelas`)
**POST /api/absensi**
```json
{ "id": "101", "kelas": "Matematika", "foto": "data:image/jpeg;base64,...." }
```
Sukses 201:
```json
{ "message": "Selamat datang Budi Santoso, kamu sudah absen les Matematika untuk hari ini, semangatt!", "data": {...} }
```
Gagal: `409` sudah absen | `403` salah kelas | `404` tidak terdaftar | `400` foto >2MB.

Lainnya: `GET /api/absensi?date=&kelas=&search=` •
`GET /api/absensi/stats?date=&kelas=` (hadir vs belum) •
`GET /api/siswa` • `POST/PUT/DELETE /api/siswa` (butuh `Authorization: Bearer <token>`) •
`POST /api/auth/login` (`admin` / `admin123` default).

## 4. Catatan untuk frontend (tablet + /admin)
- Tablet (`/`) tetap kiosk: habis scan → capture `react-webcam` → POST di atas → tampilkan `message`.
- Admin (`/admin`): login dulu → simpan token → GET stats + tabel + kelola siswa.
- Ganti `VITE_API_URL` ke IP laptop backend, contoh `http://192.168.1.20:3000/api/absensi`.
