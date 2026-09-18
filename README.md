# DIGITAL ABSENSI

Sistem absensi les berbasis **QR Code**: siswa scan dari tablet, data tercatat otomatis, admin pantau kehadiran lewat dashboard.

## Fitur

- **Scanner QR (frontend)** — React + Tailwind, scan cepat, kirim otomatis ke backend
- **API absensi (backend)** — Express, validasi siswa & kelas, cegah absen ganda per hari
- **Dashboard admin** — rekap kehadiran per tanggal & kelas, kelola data siswa
- **Login admin** — autentikasi JWT
- **Database ganda** — SQLite untuk UAT lokal (tanpa install), MySQL untuk production/XAMPP
- **Upload foto** — bukti kehadiran saat scan (maks 2 MB)

## Struktur

```
├── src/              # Frontend React (scanner + admin)
├── public/           # Aset statis
├── backend/
│   ├── server.js     # Entry point API
│   ├── src/routes/   # Endpoint siswa, absensi, auth
│   ├── src/controllers/
│   ├── src/config/db.js
│   ├── scripts/init-db.js
│   └── sql/schema.mysql.sql
```

## Cara jalan (UAT lokal)

```bash
# 1. Backend
cd backend
cp .env.example .env
npm install
npm run init-db
npm run dev        # http://localhost:3000

# 2. Frontend (terminal baru)
cd ..
npm install
npm run dev        # http://localhost:5173
```

Login admin default: `admin` / `admin123` (ganti di `.env` untuk production).

## Format QR

QR berisi JSON:

```json
{ "id": "101", "nama": "Budi Santoso" }
```

## Catatan data

File sensitif **tidak ikut ke GitHub** (hanya lokal untuk UAT): `backend/.env`, `backend/data/`, `backend/uploads/`. Template konfigurasi tersedia di `backend/.env.example`.

## Tim

- Gilbert Elcolin — backend & database
- dityoo12-max — frontend scanner
