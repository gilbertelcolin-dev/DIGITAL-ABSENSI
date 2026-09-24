export default function AttendanceList() {
  // Data statis sementara (Dummy Data) untuk memoles UI Front-End
  const absenList = [
    { id: "101", nama: "Budi Santoso", waktu: "07:15 AM", status: "Hadir" },
    { id: "102", nama: "Siti Aminah", waktu: "07:20 AM", status: "Hadir" },
    { id: "103", nama: "Andi Wijaya", waktu: "-", status: "Belum Hadir" },
  ];

  return (
    <div className="w-full rounded-2xl border border-[#d8d3c9] bg-[#faf9f6] p-5 shadow-[0_8px_28px_rgba(35,32,25,0.05)] sm:p-6">
      <div className="mb-6 flex flex-col gap-3 border-b border-[#e5e1d9] pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#949dae]">02 / Roster</p>
          <h2 className="font-display mt-1 text-xl font-semibold text-[#191b1f]">Daftar kehadiran hari ini</h2>
        </div>
        <span className="w-fit rounded-full border border-[#e2c982] bg-[#fbf5e5] px-3 py-1 font-mono text-[11px] font-semibold text-[#9b6f19]">
          Total: {absenList.length} Siswa
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[#e5e1d9] font-mono text-[10px] uppercase tracking-[0.12em] text-[#687080]">
              <th className="px-4 py-3 font-semibold">ID</th>
              <th className="px-4 py-3 font-semibold">Nama siswa</th>
              <th className="px-4 py-3 font-semibold">Waktu scan</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="text-sm text-[#454b57]">
            {absenList.map((siswa, index) => (
              <tr key={index} className="border-b border-[#e5e1d9] transition-colors hover:bg-[#f3f1ec]">
                <td className="px-4 py-4 font-mono text-xs text-[#687080]">{siswa.id}</td>
                <td className="px-4 py-4 font-medium text-[#191b1f]">{siswa.nama}</td>
                <td className="px-4 py-4 font-mono text-xs text-[#687080]">{siswa.waktu}</td>
                <td className="px-4 py-4">
                  <span className={`rounded-md px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider ${siswa.status === 'Hadir' ? 'bg-[#e5f3eb] text-[#428265]' : 'bg-[#eef0f2] text-[#687080]'}`}>
                    {siswa.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}