-- =====================================================
-- DIGITAL ABSENSI — Schema MySQL (XAMPP / hosting)
-- Cara pakai: import file ini via phpMyAdmin,
-- atau: mysql -u root -p < sql/schema.mysql.sql
-- =====================================================
CREATE DATABASE IF NOT EXISTS absensi_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE absensi_db;

-- 1. Siswa: 1 baris per anak (barcode = id)
CREATE TABLE IF NOT EXISTS siswa (
  id VARCHAR(20) PRIMARY KEY,
  nama VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Kelas: daftar les (Matematika, Fisika, ...)
CREATE TABLE IF NOT EXISTS kelas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB;

-- 3. Relasi: 1 siswa bisa ikut >1 kelas, barcode tetap sama
CREATE TABLE IF NOT EXISTS siswa_kelas (
  siswa_id VARCHAR(20) NOT NULL,
  kelas_id INT NOT NULL,
  PRIMARY KEY (siswa_id, kelas_id),
  FOREIGN KEY (siswa_id) REFERENCES siswa(id) ON DELETE CASCADE,
  FOREIGN KEY (kelas_id) REFERENCES kelas(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 4. Admin panel login
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  nama VARCHAR(100) DEFAULT 'Administrator'
) ENGINE=InnoDB;

-- 5. Absensi: unik per (siswa, kelas, tanggal) -> cegah scan ganda
CREATE TABLE IF NOT EXISTS absensi (
  id INT AUTO_INCREMENT PRIMARY KEY,
  siswa_id VARCHAR(20) NOT NULL,
  kelas_id INT NOT NULL,
  tanggal DATE NOT NULL,
  checkin_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  foto_path VARCHAR(255) NULL,
  FOREIGN KEY (siswa_id) REFERENCES siswa(id) ON DELETE CASCADE,
  FOREIGN KEY (kelas_id) REFERENCES kelas(id) ON DELETE CASCADE,
  UNIQUE KEY uq_absen (siswa_id, kelas_id, tanggal)
) ENGINE=InnoDB;
