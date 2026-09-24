import { useEffect, useMemo, useState } from 'react';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL
  || import.meta.env.VITE_API_URL?.replace(/\/api\/absensi\/?$/, '')
  || window.location.origin;

function formatTime(value) {
  if (!value) return '-';
  return new Date(value).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

async function fetchJson(path) {
  const response = await fetch(`${apiBaseUrl}${path}`);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || 'Gagal mengambil data dari backend.');
  return payload;
}

function AdminPanel() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('Semua status');
  const [attendanceRows, setAttendanceRows] = useState([]);
  const [stats, setStats] = useState({ total: 0, hadir: 0, belum_hadir: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const scannerUrl = import.meta.env.VITE_SCANNER_URL || '/';

  useEffect(() => {
    let isMounted = true;

    const loadAdminData = async () => {
      setIsLoading(true);
      setErrorMessage('');
      try {
        const [studentsPayload, attendancePayload, statsPayload] = await Promise.all([
          fetchJson('/api/siswa'),
          fetchJson('/api/absensi'),
          fetchJson('/api/absensi/stats'),
        ]);

        const attendanceByStudent = new Map(
          attendancePayload.data.map((attendance) => [String(attendance.siswa_id), attendance]),
        );
        const rows = studentsPayload.data.map((student) => {
          const attendance = attendanceByStudent.get(String(student.id));
          return {
            id: String(student.id),
            name: student.nama,
            group: student.kelas?.join(', ') || '-',
            time: formatTime(attendance?.waktu),
            status: attendance ? 'Hadir' : 'Belum hadir',
          };
        });

        if (isMounted) {
          setAttendanceRows(rows);
          setStats(statsPayload);
        }
      } catch (error) {
        if (isMounted) setErrorMessage(error.message);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadAdminData();
    return () => { isMounted = false; };
  }, []);

  const filteredRows = useMemo(() => attendanceRows.filter((student) => {
    const matchesQuery = `${student.name} ${student.id} ${student.group}`.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === 'Semua status' || student.status === filter;
    return matchesQuery && matchesFilter;
  }), [attendanceRows, filter, query]);

  return (
    <div className="admin-shell min-h-screen bg-[#121316] text-[#e3e2e6] font-sans">
      <aside className="admin-sidebar hidden border-r border-[#2b303a] bg-[#191b1f] lg:flex">
        <div className="flex w-full flex-col p-6">
          <div className="flex items-center gap-3 border-b border-[#2b303a] pb-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#d7a43f] font-bold text-[#271900]">A</div>
            <div><p className="font-display text-sm font-bold text-[#f7f8fa]">Absensi Les</p><p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#949dae]">Admin workspace</p></div>
          </div>
          <nav className="mt-8 space-y-2" aria-label="Menu admin">
            <a className="flex items-center gap-3 rounded-lg bg-[#d7a43f]/10 px-3 py-3 text-sm font-semibold text-[#d7a43f]" href="/admin">Overview</a>
            <a className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-[#949dae] transition hover:bg-[#252930] hover:text-[#f7f8fa]" href="#attendance">Kehadiran</a>
            <a className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-[#949dae] transition hover:bg-[#252930] hover:text-[#f7f8fa]" href="#students">Data siswa</a>
          </nav>
          <div className="mt-auto rounded-xl border border-[#d7a43f]/20 bg-[#d7a43f]/6 p-4"><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#d7a43f]">Scanner tablet</p><p className="mt-2 text-sm leading-5 text-[#d3c4b0]">Kamera hanya berjalan di perangkat tablet.</p><a className="mt-4 inline-block text-xs font-semibold text-[#d7a43f] hover:text-[#f4be56]" href={scannerUrl} target="_blank" rel="noreferrer">Buka scanner &rarr;</a></div>
        </div>
      </aside>

      <main className="admin-content min-w-0">
        <header className="border-b border-[#2b303a] bg-[#191b1f] px-5 py-5 sm:px-8"><div className="flex items-center justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#d7a43f]">Admin workspace / Overview</p><h1 className="font-display mt-2 text-2xl font-bold text-[#f7f8fa] sm:text-3xl">Selamat pagi, Admin.</h1></div><div className="hidden items-center gap-3 sm:flex"><span className="text-right"><span className="block text-sm font-semibold text-[#f7f8fa]">Senin, 21 September 2026</span><span className="block text-xs text-[#949dae]">Sesi pagi · 07:00 - 10:00</span></span><div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2a384c] font-mono text-xs text-[#d5e3fd]">AD</div></div></div></header>

        <div className="mx-auto max-w-7xl px-5 py-7 sm:px-8 sm:py-9">
          <div className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Total siswa" value={stats.total} detail="Terdaftar aktif" tone="neutral" />
            <Metric label="Sudah hadir" value={stats.hadir} detail={stats.total ? `${Math.round((stats.hadir / stats.total) * 100)}% dari total` : 'Belum ada data'} tone="gold" />
            <Metric label="Belum hadir" value={stats.belum_hadir} detail="Perlu perhatian" tone="blue" />
            <Metric label="Scan hari ini" value={stats.hadir} detail="Data dari backend" tone="green" />
          </div>

          {errorMessage && <div className="mb-5 rounded-xl border border-[#e69d43]/30 bg-[#e69d43]/10 px-4 py-3 text-sm text-[#f2b56b]">{errorMessage} Pastikan backend aktif di {apiBaseUrl}.</div>}

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.55fr)]">
            <div id="attendance" className="rounded-2xl border border-[#2b303a] bg-[#1e2126] shadow-[0_4px_20px_-2px_rgba(0,0,0,0.45)]">
              <div className="flex flex-col gap-4 border-b border-[#2b303a] p-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#949dae]">Attendance register</p><h2 className="font-display mt-1 text-xl font-semibold text-[#f7f8fa]">Kehadiran hari ini</h2></div><div className="flex gap-2"><input value={query} onChange={(event) => setQuery(event.target.value)} className="w-36 rounded-lg border border-[#3a4250] bg-[#141619] px-3 py-2 text-xs text-[#f7f8fa] outline-none placeholder:text-[#687080] focus:border-[#d7a43f]" placeholder="Cari siswa..." aria-label="Cari siswa" /><select value={filter} onChange={(event) => setFilter(event.target.value)} className="rounded-lg border border-[#3a4250] bg-[#141619] px-2 py-2 text-xs text-[#d3c4b0] outline-none focus:border-[#d7a43f]" aria-label="Filter status"><option>Semua status</option><option>Hadir</option><option>Belum hadir</option></select></div></div>
              <div className="overflow-x-auto"><table className="w-full min-w-162.5 text-left"><thead><tr className="border-b border-[#2b303a] font-mono text-[10px] uppercase tracking-[0.12em] text-[#687080]"><th className="px-5 py-3">Siswa</th><th className="px-5 py-3">Kelompok</th><th className="px-5 py-3">Waktu scan</th><th className="px-5 py-3">Status</th></tr></thead><tbody>{filteredRows.map((student) => <tr key={student.id} className="border-b border-[#2b303a] transition hover:bg-[#252930]"><td className="px-5 py-4"><span className="block text-sm font-semibold text-[#f7f8fa]">{student.name}</span><span className="font-mono text-[10px] text-[#687080]">ID {student.id}</span></td><td className="px-5 py-4 text-sm text-[#d3c4b0]">{student.group}</td><td className="px-5 py-4 font-mono text-xs text-[#949dae]">{student.time}</td><td className="px-5 py-4"><StatusBadge status={student.status} /></td></tr>)}</tbody></table></div>
              {isLoading && <p className="p-8 text-center text-sm text-[#949dae]">Memuat data dari backend...</p>}
              {!isLoading && filteredRows.length === 0 && <p className="p-8 text-center text-sm text-[#949dae]">Tidak ada siswa yang sesuai.</p>}
            </div>

            <aside className="space-y-5">
              <div className="rounded-2xl border border-[#2b303a] bg-[#1e2126] p-5"><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#949dae]">Live activity</p><h2 className="font-display mt-1 text-lg font-semibold text-[#f7f8fa]">Scan terbaru</h2><div className="mt-5 space-y-4"><Activity name="Pandya Pratama" time="07:31" /><Activity name="Siti Aminah" time="07:20" /><Activity name="Budi Santoso" time="07:15" /></div></div>
              <div id="students" className="rounded-2xl border border-[#d7a43f]/20 bg-[#d7a43f]/6 p-5"><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#d7a43f]">Admin note</p><p className="font-display mt-3 text-base font-semibold leading-6 text-[#f7f8fa]">Jaga suasana scan tetap ramah.</p><p className="mt-2 text-sm leading-6 text-[#d3c4b0]">Sambut siswa ketika nama mereka muncul di layar.</p></div>
            </aside>
          </section>
        </div>
      </main>
    </div>
  );
}

function Metric({ label, value, detail, tone }) {
  const valueColor = { neutral: 'text-[#f7f8fa]', gold: 'text-[#d7a43f]', blue: 'text-[#abcaf0]', green: 'text-[#4eaf84]' }[tone];
  return <div className="rounded-xl border border-[#2b303a] bg-[#1e2126] p-5 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.25)]"><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#949dae]">{label}</p><p className={`mt-3 font-mono text-3xl font-semibold ${valueColor}`}>{value}</p><p className="mt-1 text-xs text-[#687080]">{detail}</p></div>;
}

function StatusBadge({ status }) {
  const isPresent = status === 'Hadir';
  return <span className={`rounded-md px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider ${isPresent ? 'bg-[#4eaf84]/10 text-[#4eaf84]' : 'bg-[#e69d43]/10 text-[#e69d43]'}`}>{status}</span>;
}

function Activity({ name, time }) {
  return <div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2a384c] font-mono text-[10px] text-[#d5e3fd]">{name.split(' ').map((part) => part[0]).join('')}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-[#f7f8fa]">{name}</p><p className="text-xs text-[#687080]">Berhasil scan</p></div><span className="font-mono text-xs text-[#949dae]">{time}</span></div>;
}

export default AdminPanel;
