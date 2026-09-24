import { useCallback, useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import Webcam from 'react-webcam';

const scannerConfig = {
  fps: 10,
  qrbox: { width: 280, height: 280 },
  aspectRatio: 1.333333,
  disableFlip: false,
  videoConstraints: {
    width: { ideal: 640, max: 960 },
    height: { ideal: 480, max: 720 },
  },
  formatsToSupport: [
    Html5QrcodeSupportedFormats.QR_CODE,
  ],
};

function App() {
  const [appStep, setAppStep] = useState('scanning');
  const [tempStudentData, setTempStudentData] = useState(null);
  const [attendanceResult, setAttendanceResult] = useState(null);
  const [scanMessage, setScanMessage] = useState('Menunggu pemindaian...');
  const [statusColor, setStatusColor] = useState('text-gray-500');

  const scannerRef = useRef(null);
  const webcamRef = useRef(null);

  useEffect(() => {
    if (appStep !== 'scanning') return undefined;

    let isMounted = true;
    let scanner;

    const showCameraError = (error) => {
      const reason = `${error?.name || ''} ${error?.message || error || ''}`;

      if (reason.includes('NotAllowedError') || reason.includes('Permission')) {
        setScanMessage('Izin kamera ditolak. Klik ikon gembok di address bar, pilih Camera > Allow, lalu refresh.');
      } else if (reason.includes('NotFoundError') || reason.includes('No camera')) {
        setScanMessage('Kamera tidak ditemukan. Hubungkan webcam atau aktifkan kamera laptop.');
      } else if (reason.includes('NotReadableError')) {
        setScanMessage('Kamera sedang dipakai aplikasi lain. Tutup Zoom, Teams, atau aplikasi kamera, lalu refresh.');
      } else {
        setScanMessage('Kamera gagal dibuka. Pastikan izin kamera browser dan Windows sudah aktif, lalu refresh.');
      }

      setStatusColor('text-red-600');
    };

    const startScanner = async () => {
      const onScanSuccess = async (decodedText) => {
        if (!isMounted) return;
        let payloadData = { waktu: new Date().toISOString() };

        try {
          const parsedData = JSON.parse(decodedText);
          payloadData.id = parsedData.id;
          payloadData.nama = parsedData.nama;
          payloadData.kelas = parsedData.kelas || parsedData.kelompok || parsedData.class || 'Kelas belum diisi';
        } catch {
          payloadData.id = decodedText;
          payloadData.nama = 'Nama tidak ada di QR';
          payloadData.kelas = 'Kelas belum diisi';
        }

        setTempStudentData(payloadData);
        setScanMessage('Kode terbaca. Silakan ambil foto selfie.');
        setStatusColor('text-green-600');

        if (scannerRef.current?.isScanning) {
          await Promise.resolve(scannerRef.current.stop()).catch(() => {});
        }
        setAppStep('selfie');
      };

      scanner = new Html5Qrcode('reader');
      scannerRef.current = scanner;

      try {
        const cameras = await Html5Qrcode.getCameras();
        if (!isMounted) return;
        if (!cameras.length) throw new Error('No camera');

        const preferredCamera = cameras.find((camera) => /back|rear|environment|belakang/i.test(camera.label)) || cameras[0];
        await scanner.start(preferredCamera.id, scannerConfig, onScanSuccess, () => {});
      } catch (error) {
        if (isMounted) showCameraError(error);
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      const cleanupScanner = async () => {
        try {
          if (scanner?.isScanning) await scanner.stop();
        } catch {}

        try {
          await scanner?.clear();
        } catch {}
      };

      cleanupScanner();
      scannerRef.current = null;
    };
  }, [appStep]);

  const captureAndSubmit = useCallback(async () => {
    setAppStep('processing');
    setAttendanceResult(null);
    setScanMessage('Mengirim data kehadiran...');
    setStatusColor('text-blue-600');

    const imageSrc = webcamRef.current?.getScreenshot();
    const finalPayload = {
      ...tempStudentData,
      foto: imageSrc,
    };

    try {
      const apiUrl = import.meta.env.VITE_API_URL
        || `${window.location.origin}/api/absensi`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalPayload),
      });

      if (!response.ok) throw new Error('Absensi ditolak oleh server.');

      const namaPanggilan = finalPayload.nama !== 'Nama tidak ada di QR'
        ? finalPayload.nama
        : finalPayload.id;
      const waktuHadir = new Date();
      setAttendanceResult({
        nama: namaPanggilan,
        kelas: finalPayload.kelas || 'Kelas belum diisi',
        waktu: waktuHadir.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      });
      setScanMessage(`Selamat datang ${namaPanggilan}, kamu sudah absen les untuk hari ini, semangatt!`);
      setStatusColor('text-green-600');
    } catch {
      setScanMessage('Gagal terhubung ke server Back-End.');
      setStatusColor('text-red-600');
    }

    setTimeout(() => {
      setTempStudentData(null);
      setAttendanceResult(null);
      setScanMessage('Kamera aktif. Arahkan QR code atau barcode ke kamera.');
      setStatusColor('text-gray-500');
      setAppStep('scanning');
    }, 3500);
  }, [tempStudentData]);

  const isScanning = appStep === 'scanning';
  const isSelfie = appStep === 'selfie';
  const isProcessing = appStep === 'processing';
  const isSuccess = Boolean(attendanceResult);
  const todayLabel = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#1d2e3d_0%,#0a1117_36%,#050b12_100%)] text-[#edf3ff]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 rounded-[30px] border border-white/10 bg-[#0f1720]/80 px-5 py-4 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#f7d57d,#d99531)] text-lg font-black text-[#120f09] shadow-[0_12px_30px_rgba(215,157,68,0.42)]">
                A
              </div>
              <div>
                <p className="text-xl font-black tracking-tight text-white">Absensi Les</p>
                <p className="text-[10px] uppercase tracking-[0.18em] text-[#9eb0c5]">Ruang kehadiran siswa</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-full border border-[#324765] bg-[#0d1a27] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#dfeaf8]">
                {todayLabel}
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.9)]" />
                Sistem aktif
              </span>
            </div>
          </div>
        </header>

        <main className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(285px,0.6fr)]">
          <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[#0b141b]/90 shadow-[0_30px_80px_rgba(0,0,0,0.32)] backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#f3c76c]">
                  {isScanning ? '01 / Pindai kartu' : isSelfie ? '02 / Verifikasi wajah' : '03 / Proses data'}
                </p>
                <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
                  {isScanning ? 'Scan untuk mulai belajar.' : isSelfie ? 'Satu langkah lagi.' : 'Mencatat kehadiran.'}
                </h1>
              </div>

              <div className="hidden items-center gap-2 rounded-full border border-[#d7a43f]/30 bg-[#d7a43f]/10 px-3 py-1.5 sm:flex">
                <span className="h-2.5 w-2.5 rounded-full bg-[#3ae2a2] shadow-[0_0_16px_rgba(58,226,162,0.85)]" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#f4d588]">Siap</span>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-white/10 bg-[#101c27] p-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#18263a] text-[#d4dce8]">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 3v18M3 12h18" />
                    </svg>
                  </span>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[#90a5bc]">Status kamera</p>
                    <p className="text-sm font-semibold text-white">
                      {isScanning ? 'Kamera siap mendeteksi QR' : isSelfie ? 'Kamera siap menangkap selfie' : 'Sedang mengirim data'}
                    </p>
                  </div>
                </div>

                <div className="rounded-full border border-[#2b3a4d] bg-[#0a1117] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#dfe8fb]">
                  {isScanning ? 'Aktif' : isSelfie ? 'Verifikasi' : isProcessing ? 'Proses' : 'Selesai'}
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#091219] p-3 shadow-[inset_0_0_35px_rgba(0,0,0,0.55)]">
                <div className="relative flex min-h-[360px] items-center justify-center overflow-hidden rounded-[22px] bg-[radial-gradient(circle_at_top,rgba(56,72,92,0.38),rgba(9,18,25,0.96)_62%)] sm:min-h-[440px]">
                  {isSuccess && (
                    <div className="absolute inset-0 z-20 flex animate-[fade-in_400ms_ease-out] items-center justify-center bg-[#071019]/90 p-6 text-center">
                      <div className="w-full max-w-md animate-[welcome-pop_500ms_cubic-bezier(0.22,1,0.36,1)] rounded-[30px] border border-emerald-300/20 bg-[linear-gradient(145deg,#12362c,#0e1d28_58%)] p-7 shadow-[0_30px_80px_rgba(0,0,0,0.48)]">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-300/30 bg-emerald-400/15 text-3xl text-emerald-300 shadow-[0_0_32px_rgba(52,211,153,0.22)]">✓</div>
                        <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-300">Kehadiran tercatat</p>
                        <h2 className="mt-2 text-3xl font-black tracking-tight text-white">Selamat datang, {attendanceResult.nama}!</h2>
                        <p className="mt-3 text-sm text-[#d1dfe8]">Semoga belajar hari ini berjalan lebih cerah dan produktif.</p>
                        <div className="mt-6 grid grid-cols-2 gap-3 text-left">
                          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                            <p className="text-[10px] uppercase tracking-[0.16em] text-[#8ea0b5]">Kelas</p>
                            <p className="mt-1 truncate text-sm font-bold text-white">
                              {Array.isArray(attendanceResult.kelas) ? attendanceResult.kelas.join(', ') : attendanceResult.kelas}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                            <p className="text-[10px] uppercase tracking-[0.16em] text-[#8ea0b5]">Jam hadir</p>
                            <p className="mt-1 text-sm font-bold text-white">{attendanceResult.waktu}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {isScanning && (
                    <>
                      <div id="reader" className="h-[360px] w-full sm:h-[440px]" />
                      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0,transparent_52%,rgba(0,0,0,0.35)_100%)]" />
                      <div className="pointer-events-none absolute inset-4 rounded-[24px] border border-white/10">
                        <span className="absolute left-6 top-6 h-8 w-8 rounded-tl-2xl border-l-2 border-t-2 border-[#d7a43f]" />
                        <span className="absolute right-6 top-6 h-8 w-8 rounded-tr-2xl border-r-2 border-t-2 border-[#d7a43f]" />
                        <span className="absolute bottom-6 left-6 h-8 w-8 rounded-bl-2xl border-b-2 border-l-2 border-[#d7a43f]" />
                        <span className="absolute bottom-6 right-6 h-8 w-8 rounded-br-2xl border-b-2 border-r-2 border-[#d7a43f]" />
                      </div>
                    </>
                  )}

                  {isSelfie && (
                    <div className="w-full p-3 text-center">
                      <Webcam
                        audio={false}
                        ref={webcamRef}
                        screenshotFormat="image/jpeg"
                        videoConstraints={{ facingMode: 'user' }}
                        className="mx-auto max-h-[360px] w-full rounded-[22px] object-cover shadow-[0_18px_40px_rgba(0,0,0,0.42)]"
                      />
                      <button
                        type="button"
                        onClick={captureAndSubmit}
                        className="mt-5 rounded-2xl bg-[linear-gradient(135deg,#f7d583,#d28e2d)] px-7 py-3 text-sm font-black text-[#201509] shadow-[0_14px_32px_rgba(214,157,69,0.4)] transition duration-200 hover:-translate-y-0.5 hover:bg-[linear-gradient(135deg,#f3ca69,#c77f1d)] focus:outline-none focus:ring-2 focus:ring-[#d7a43f]/60"
                      >
                        Ambil foto & absen
                      </button>
                    </div>
                  )}

                  {isProcessing && (
                    <div className="flex w-full flex-col items-center justify-center p-8 text-center text-[#e5e7eb]">
                      <div className="mb-4 h-14 w-14 animate-spin rounded-full border-4 border-white/10 border-t-[#f3c76c] shadow-[0_0_24px_rgba(243,199,108,0.35)]" />
                      <p className="text-lg font-semibold text-white">Memproses kehadiran...</p>
                      <p className="mt-2 text-sm text-[#a9b7c7]">Data siswa dan selfie sedang dikirim ke sistem.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className={`mt-4 flex items-center justify-center gap-2 rounded-[18px] border px-4 py-3 text-sm font-medium shadow-sm ${statusColor === 'text-green-600' ? 'border-emerald-300/50 bg-emerald-500/10 text-emerald-300' : statusColor === 'text-red-600' ? 'border-rose-300/50 bg-rose-500/10 text-rose-300' : statusColor === 'text-blue-600' ? 'border-sky-300/50 bg-sky-500/10 text-sky-300' : 'border-[#dfe7f1]/10 bg-[#f5f6f8]/10 text-[#dfe7f1]'}`}>
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-current" />
                <span>{scanMessage}</span>
              </div>
            </div>
          </section>

          <aside className="space-y-5">
            <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,#121d2a,#0e151d)] p-5 shadow-[0_18px_42px_rgba(0,0,0,0.22)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9bb0c9]">Status kehadiran</p>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-white/8 bg-[#0f1b27] p-4">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[#8ea0b5]">Scan hari ini</p>
                  <p className="mt-2 text-3xl font-black text-white">{attendanceResult ? '1' : '0'}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-[#0f1b27] p-4">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[#8ea0b5]">Kamera</p>
                  <p className="mt-2 text-sm font-semibold text-white">{isScanning ? 'Siap mendeteksi QR' : 'Aktif dan stabil'}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-[#d7a43f]/20 bg-[linear-gradient(180deg,#131b10,#101612)] p-5 shadow-[0_18px_34px_rgba(0,0,0,0.2)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f4d588]">Panduan</p>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-[#dfe7f1]">
                <li className="flex gap-3">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[#f3c76c]" />
                  Pastikan QR terlihat jelas dan tidak buram.
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[#f3c76c]" />
                  Tempatkan barcode di tengah frame kamera.
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[#f3c76c]" />
                  Setelah dikenal, foto selfie akan otomatis muncul.
                </li>
              </ul>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}

export default App;
