import * as XLSX from 'xlsx';
import { Member } from '../types';
import { getSpouseDisplayName } from './spouse';

export const EXCEL_MEMBER_HEADERS = [
  'Kode',
  'Nama Lengkap',
  'Jenis Kelamin',
  'Kode Orang Tua',
  'Tempat Lahir',
  'Tanggal Lahir',
  'Sudah Meninggal',
  'Tanggal Wafat',
  'Nama Pasangan',
  'Kode Pasangan',
  'Menantu (Dari Luar Keluarga)',
  'Alamat',
  'Link Foto',
  'Catatan',
  'Sembunyikan Alamat & Tgl Lahir',
] as const;

const COLUMN_WIDTHS = [
  { wch: 10 }, // Kode
  { wch: 28 }, // Nama Lengkap
  { wch: 16 }, // Jenis Kelamin
  { wch: 16 }, // Kode Orang Tua
  { wch: 20 }, // Tempat Lahir
  { wch: 16 }, // Tanggal Lahir
  { wch: 16 }, // Sudah Meninggal
  { wch: 16 }, // Tanggal Wafat
  { wch: 26 }, // Nama Pasangan
  { wch: 16 }, // Kode Pasangan
  { wch: 28 }, // Menantu (Dari Luar Keluarga)
  { wch: 36 }, // Alamat
  { wch: 40 }, // Link Foto
  { wch: 32 }, // Catatan
  { wch: 32 }, // Sembunyikan Alamat & Tgl Lahir
];

/**
 * Membuat sheet petunjuk pengisian data silsilah
 */
function createPetunjukSheet(): XLSX.WorkSheet {
  const instructionsData: string[][] = [
    ['PANDUAN LENGKAP PENGISIAN DATA SILSILAH KELUARGA (EXCEL)', ''],
    ['', ''],
    ['Kolom', 'Aturan & Panduan Pengisian'],
    [
      'Kode',
      'WAJIB DIISI. Kode unik sederhana untuk setiap baris (contoh: A1, A2, B1, dst). Kode ini dipakai untuk menghubungkan anak ke orang tua dan menghubungkan pasangan di Excel.',
    ],
    [
      'Nama Lengkap',
      'WAJIB DIISI. Nama lengkap anggota keluarga beserta gelar bila ada (contoh: H. Raden Soedirman).',
    ],
    [
      'Jenis Kelamin',
      'Pilih salah satu dari dropdown: "Laki-laki", "Perempuan", atau "Lainnya".',
    ],
    [
      'Kode Orang Tua',
      'Kode baris orang tuanya (ayah atau ibu). KOSONGKAN jika anggota merupakan leluhur tertua / akar silsilah keluarga (generasi paling atas).',
    ],
    [
      'Tempat Lahir',
      'Kota atau kabupaten kelahiran (contoh: Yogyakarta, Surakarta, Jakarta).',
    ],
    [
      'Tanggal Lahir',
      'Format teks: YYYY-MM-DD (contoh: 1960-03-15). Jangan gunakan format lain agar dapat dibaca dengan tepat.',
    ],
    [
      'Sudah Meninggal',
      'Pilih "Ya" atau "Tidak". Jika "Ya", Anda dapat mengisi kolom Tanggal Wafat.',
    ],
    [
      'Tanggal Wafat',
      'Format teks: YYYY-MM-DD (contoh: 2015-11-10). Kosongkan jika anggota masih hidup.',
    ],
    [
      'Nama Pasangan',
      'Teks nama pasangan (suami/istri). Isi jika anggota memiliki pasangan.',
    ],
    [
      'Kode Pasangan',
      'OPSIONAL. Masukkan Kode baris pasangan jika pasangan tersebut juga terdaftar dalam daftar baris ini, agar keduanya terhubung bolak-balik.',
    ],
    [
      'Menantu (Dari Luar Keluarga)',
      'Pilih "Ya" jika anggota merupakan pasangan yang berasal dari luar garis keturunan (menantu), atau "Tidak" untuk keturunan inti.',
    ],
    [
      'Alamat',
      'Alamat domisili anggota saat ini atau alamat terakhir.',
    ],
    [
      'Link Foto',
      'Di Google Drive: klik kanan foto > Bagikan > ubah akses ke "Siapa saja yang memiliki link" > Salin link > tempel di kolom Link Foto. Link Google Photos (photos.app.goo.gl) tidak bisa tampil sebagai gambar, gunakan Google Drive.',
    ],
    [
      'Catatan',
      'Keterangan tambahan seperti profesi, urutan anak, atau riwayat singkat.',
    ],
    [
      'Sembunyikan Alamat & Tgl Lahir',
      'Pilih "Ya" jika alamat dan tanggal lahir ingin dirahasiakan dari pengunjung umum (privasi keluarga), atau "Tidak" untuk ditampilkan.',
    ],
    ['', ''],
    ['TIPS PENTING:', ''],
    [
      '1. Struktur Pohon',
      'Silsilah keluarga menggunakan pohon hierarki. Pastikan setiap anak memiliki Kode Orang Tua yang sesuai dengan salah satu orang tuanya di daftar.',
    ],
    [
      '2. Nama Sheet',
      'Jangan mengganti nama sheet "Data Anggota" dan jangan mengubah urutan nama kolom pada baris pertama.',
    ],
    [
      '3. Format Angka & Tanggal',
      'Semua kolom tanggal diperlakukan sebagai teks (YYYY-MM-DD) agar tidak diubah secara otomatis oleh Excel menjadi angka tanggal lokal.',
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(instructionsData);

  ws['!cols'] = [
    { wch: 32 }, // Kolom / Topik
    { wch: 95 }, // Keterangan
  ];

  return ws;
}

/**
 * Menerapkan metadata tampilan, lebar kolom, autofilter, dan data validation pada sheet data anggota
 */
function enhanceDataAnggotaSheet(ws: XLSX.WorkSheet, totalRows: number): void {
  // Lebar kolom
  ws['!cols'] = COLUMN_WIDTHS;

  // Freeze baris pertama (header)
  ws['!views'] = [
    {
      state: 'frozen',
      ySplit: 1,
      activeCell: 'A2',
      topLeftCell: 'A2',
    },
  ];

  // Autofilter pada baris 1
  const endRow = Math.max(totalRows, 2);
  ws['!autofilter'] = { ref: `A1:O${endRow}` };

  // Validasi Dropdown untuk Jenis Kelamin (C), Sudah Meninggal (G), Menantu (K), dan Sembunyikan (O)
  ws['!dataValidation'] = [
    {
      sqref: 'C2:C1000',
      type: 'list',
      operator: 'equal',
      formula1: '"Laki-laki,Perempuan,Lainnya"',
      allowBlank: true,
      showDropDown: true,
    },
    {
      sqref: 'G2:G1000',
      type: 'list',
      operator: 'equal',
      formula1: '"Ya,Tidak"',
      allowBlank: true,
      showDropDown: true,
    },
    {
      sqref: 'K2:K1000',
      type: 'list',
      operator: 'equal',
      formula1: '"Ya,Tidak"',
      allowBlank: true,
      showDropDown: true,
    },
    {
      sqref: 'O2:O1000',
      type: 'list',
      operator: 'equal',
      formula1: '"Ya,Tidak"',
      allowBlank: true,
      showDropDown: true,
    },
  ];
}

/**
 * Unduh file workbook sebagai file Excel (.xlsx) di browser
 */
function triggerExcelDownload(workbook: XLSX.WorkBook, fileName: string): void {
  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 1. Unduh Template Excel (template-silsilah-keluarga.xlsx)
 * Menyediakan 4-5 baris contoh lengkap yang saling terhubung (Kakek, Nenek, Ayah, Ibu, Anak)
 */
export function downloadMemberTemplate(): void {
  const sampleRows: (string | null)[][] = [
    [...EXCEL_MEMBER_HEADERS],
    [
      'A1',
      'H. Raden Soedirman',
      'Laki-laki',
      '',
      'Yogyakarta',
      '1930-08-17',
      'Ya',
      '2015-11-10',
      'Hj. Siti Aminah',
      'A2',
      'Tidak',
      'Jl. Malioboro No. 45, Yogyakarta',
      'https://drive.google.com/file/d/contoh_foto_kakek/view',
      'Kakek / Leluhur perintis keluarga',
      'Tidak',
    ],
    [
      'A2',
      'Hj. Siti Aminah',
      'Perempuan',
      '',
      'Solo',
      '1935-04-21',
      'Ya',
      '2018-05-12',
      'H. Raden Soedirman',
      'A1',
      'Tidak',
      'Jl. Malioboro No. 45, Yogyakarta',
      '',
      'Nenek (Pasangan H. Raden Soedirman)',
      'Tidak',
    ],
    [
      'B1',
      'Bambang Soedirman',
      'Laki-laki',
      'A1',
      'Yogyakarta',
      '1960-03-15',
      'Tidak',
      '',
      'Sri Wahyuni',
      'B2',
      'Tidak',
      'Jl. Gejayan No. 12, Sleman',
      '',
      'Anak pertama (Ayah)',
      'Tidak',
    ],
    [
      'B2',
      'Sri Wahyuni',
      'Perempuan',
      '',
      'Semarang',
      '1965-07-20',
      'Tidak',
      '',
      'Bambang Soedirman',
      'B1',
      'Ya',
      'Jl. Gejayan No. 12, Sleman',
      '',
      'Istri Bambang (Menantu)',
      'Tidak',
    ],
    [
      'C1',
      'Dimas Arya Soedirman',
      'Laki-laki',
      'B1',
      'Yogyakarta',
      '1995-10-05',
      'Tidak',
      '',
      '',
      '',
      'Tidak',
      'Jl. Gejayan No. 12, Sleman',
      '',
      'Cucu (Anak dari Bambang & Sri Wahyuni)',
      'Tidak',
    ],
  ];

  // Buat sheet dengan format sel teks murni
  const ws = XLSX.utils.aoa_to_sheet(sampleRows);

  // Pastikan semua sel diset sebagai text cell ('s') format '@' agar tanggal tidak dirusak Excel
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:O6');
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[cellAddress];
      if (cell && cell.v !== undefined) {
        cell.t = 's';
        cell.z = '@';
        cell.v = String(cell.v);
      }
    }
  }

  enhanceDataAnggotaSheet(ws, sampleRows.length);

  const petunjukWs = createPetunjukSheet();

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data Anggota');
  XLSX.utils.book_append_sheet(wb, petunjukWs, 'Petunjuk');

  triggerExcelDownload(wb, 'template-silsilah-keluarga.xlsx');
}

/**
 * 2. Ekspor Data ke Excel (.xlsx) (data-silsilah-keluarga-YYYY-MM-DD.xlsx)
 * Mengurutkan data secara hierarkis (leluhur sebelum keturunan),
 * memetakan ID Firestore ke Kode baris (A1, A2, ...), dan menerjemahkan nilai ke format ramah Excel.
 */
export function exportMembersToExcel(members: Member[]): void {
  const memberMap = new Map<string, Member>();
  members.forEach((m) => memberMap.set(m.id, m));

  // Map anak untuk setiap orang tua
  const childrenMap = new Map<string, Member[]>();
  members.forEach((m) => {
    if (m.parentId && memberMap.has(m.parentId)) {
      const list = childrenMap.get(m.parentId) || [];
      list.push(m);
      childrenMap.set(m.parentId, list);
    }
  });

  // Pisahkan leluhur akar (tidak memiliki parentId atau parentId tidak ada di daftar)
  const rootAncestors = members.filter(
    (m) => !m.parentId || !memberMap.has(m.parentId)
  );

  // Pengurutan hierarkis: Orang tua selalu berada sebelum anak
  const orderedMembers: Member[] = [];
  const visitedIds = new Set<string>();

  // Fungsi rekursif / BFS untuk menelusuri keturunan
  const addMemberWithFamily = (member: Member) => {
    if (visitedIds.has(member.id)) return;
    visitedIds.add(member.id);
    orderedMembers.push(member);

    // Jika memiliki pasangan yang terdaftar dan belum dikunjungi, tempatkan bersebelahan jika tidak punya parent sendiri
    if (member.spouseMemberId && memberMap.has(member.spouseMemberId)) {
      const spouse = memberMap.get(member.spouseMemberId)!;
      // Jika pasangan adalah root atau sejajar, tambahkan langsung
      if (!visitedIds.has(spouse.id) && (!spouse.parentId || !memberMap.has(spouse.parentId))) {
        visitedIds.add(spouse.id);
        orderedMembers.push(spouse);
      }
    }

    // Ambil anak-anak dan proses keturunan
    const kids = childrenMap.get(member.id) || [];
    kids.forEach((k) => addMemberWithFamily(k));
  };

  rootAncestors.forEach((root) => {
    addMemberWithFamily(root);
  });

  // Jika ada anggota yang belum terjangkau (misal relasi siklus atau data terisolasi), tambahkan
  members.forEach((m) => {
    if (!visitedIds.has(m.id)) {
      visitedIds.add(m.id);
      orderedMembers.push(m);
    }
  });

  // Buat pemetaan ID internal -> Kode sementara (A1, A2, A3, ...)
  const idToCode = new Map<string, string>();
  orderedMembers.forEach((m, idx) => {
    idToCode.set(m.id, `A${idx + 1}`);
  });

  // Buat baris data
  const rows: (string | null)[][] = [
    [...EXCEL_MEMBER_HEADERS],
  ];

  orderedMembers.forEach((m) => {
    const kode = idToCode.get(m.id) || '';
    const namaLengkap = m.name || '';
    const jenisKelamin =
      m.gender === 'female'
        ? 'Perempuan'
        : m.gender === 'male'
        ? 'Laki-laki'
        : m.gender === 'other'
        ? 'Lainnya'
        : '';
    const kodeOrangTua = (m.parentId && idToCode.get(m.parentId)) || '';
    const tempatLahir = m.birthPlace || '';
    const tanggalLahir = m.birthDate || '';
    const sudahMeninggal = m.isDeceased ? 'Ya' : 'Tidak';
    const tanggalWafat = m.deathDate || '';
    
    // Nama pasangan: gunakan getSpouseDisplayName (prioritas profil terhubung, fallback teks)
    const namaPasangan = getSpouseDisplayName(m, members) || '';
    const kodePasangan = (m.spouseMemberId && idToCode.get(m.spouseMemberId)) || '';
    const menantu = m.isInLaw ? 'Ya' : 'Tidak';

    const alamat = m.address || '';
    const linkFoto = m.avatarUrl || '';
    const catatan = m.notes || '';
    const sembunyikan = m.hideAddressAndBirth ? 'Ya' : 'Tidak';

    rows.push([
      kode,
      namaLengkap,
      jenisKelamin,
      kodeOrangTua,
      tempatLahir,
      tanggalLahir,
      sudahMeninggal,
      tanggalWafat,
      namaPasangan,
      kodePasangan,
      menantu,
      alamat,
      linkFoto,
      catatan,
      sembunyikan,
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Pastikan semua sel diset sebagai text cell ('s') format '@'
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:O1');
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[cellAddress];
      if (cell && cell.v !== undefined) {
        cell.t = 's';
        cell.z = '@';
        cell.v = String(cell.v);
      }
    }
  }

  enhanceDataAnggotaSheet(ws, rows.length);

  const petunjukWs = createPetunjukSheet();

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data Anggota');
  XLSX.utils.book_append_sheet(wb, petunjukWs, 'Petunjuk');

  // Format tanggal hari ini untuk nama file: YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];
  const fileName = `data-silsilah-keluarga-${todayStr}.xlsx`;

  triggerExcelDownload(wb, fileName);
}
