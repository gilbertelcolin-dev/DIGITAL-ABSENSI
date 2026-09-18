import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.resolve(__dirname, '..', '..', '..', 'backend', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const MAX_FOTO_BYTE = 2 * 1024 * 1024; // 2 MB sesuai permintaan

// Terima: "data:image/jpeg;base64,...." ATAU base64 polos.
// Return: { buffer, ext } atau throw Error dengan pesan ramah.
export function parseFotoBase64(foto) {
  if (!foto) return null; // foto opsional di level util, wajib-nya dicek di controller
  let base64 = String(foto).trim();
  let ext = 'jpg';

  const m = base64.match(/^data:image\/(jpeg|jpg|png);base64,(.+)$/is);
  if (m) {
    ext = m[1] === 'png' ? 'png' : 'jpg';
    base64 = m[2];
  }
  // buang whitespace yang kadang ikut dari frontend
  base64 = base64.replace(/\s/g, '');

  let buffer;
  try {
    buffer = Buffer.from(base64, 'base64');
  } catch {
    throw new Error('Format foto tidak valid (bukan base64).');
  }
  if (buffer.length === 0) throw new Error('Foto kosong.');
  if (buffer.length > MAX_FOTO_BYTE) {
    const mb = (buffer.length / 1024 / 1024).toFixed(2);
    throw new Error(`Foto ${mb} MB melebihi batas 2 MB.`);
  }
  // validasi magic bytes: JPEG (FFD8) atau PNG (89504E47)
  const isJpg = buffer[0] === 0xff && buffer[1] === 0xd8;
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50;
  if (!isJpg && !isPng) throw new Error('Foto harus JPG atau PNG.');
  return { buffer, ext: isPng ? 'png' : 'jpg' };
}

export function saveFoto(buffer, ext, siswaId) {
  const stamp = Date.now();
  const safe = String(siswaId).replace(/[^a-zA-Z0-9_-]/g, '');
  const name = `${stamp}_${safe}.${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), buffer);
  return `uploads/${name}`; // path relatif, diserve via express.static
}

export const todayStr = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
