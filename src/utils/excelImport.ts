import * as XLSX from 'xlsx';
import { Gender, Member } from '../types';
import { isValidHttpUrl, extractGoogleDriveId } from './googleDrive';

export interface ExcelImportRow {
  rowNumber: number; // 1-indexed row number in Excel (header is row 1, data starts at row 2)
  kode: string;
  name: string;
  gender: Gender;
  parentKode: string | null;
  birthPlace: string | null;
  birthDate: string | null;
  isDeceased: boolean;
  deathDate: string | null;
  spouseName: string | null;
  spouseKode: string | null;
  isInLaw: boolean;
  address: string | null;
  avatarUrl: string | null;
  notes: string | null;
  hideAddressAndBirth: boolean;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ExcelIssue {
  rowNumber: number;
  kode?: string;
  field?: string;
  message: string;
}

export interface ExcelParseResult {
  success: boolean;
  errorMessage?: string;
  sheetName: string;
  totalRows: number;
  rows: ExcelImportRow[];
  validRows: ExcelImportRow[];
  invalidRows: ExcelImportRow[];
  allErrors: ExcelIssue[];
  allWarnings: ExcelIssue[];
  missingRequiredHeaders: string[];
  hasCycles: boolean;
}

export interface CascadeSkippedItem {
  row: ExcelImportRow;
  reason: string;
}

export interface FilteredValidResult {
  importedRows: ExcelImportRow[];
  cascadeSkippedRows: CascadeSkippedItem[];
}

/**
 * Normalisasi string header untuk pencocokan fleksibel (lowercase, tanpa spasi ganda)
 */
function normalizeHeaderName(header: string): string {
  return String(header || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Normalisasi input jenis kelamin menjadi 'male' | 'female' | 'other'
 */
export function normalizeGender(val: any): Gender {
  if (!val) return 'male';
  const str = String(val).toLowerCase().trim();
  if (['female', 'p', 'perempuan', 'wanita', 'f'].includes(str)) {
    return 'female';
  }
  if (['other', 'lainnya', 'o'].includes(str)) {
    return 'other';
  }
  return 'male';
}

/**
 * Normalisasi nilai Ya/Tidak / boolean
 */
export function normalizeBoolean(val: any): boolean {
  if (val === true || val === 1) return true;
  if (!val) return false;
  const str = String(val).toLowerCase().trim();
  return ['ya', 'y', 'true', '1', 'sudah', 'meninggal', 'wafat'].includes(str);
}

/**
 * Normalisasi tanggal ke format YYYY-MM-DD
 * Mendukung objek Date, angka serial Excel, dan string (YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY)
 */
export function normalizeDate(val: any): { dateStr: string | null; error?: string } {
  if (val === null || val === undefined || String(val).trim() === '') {
    return { dateStr: null };
  }

  // Objek Date dari parser SheetJS
  if (val instanceof Date) {
    if (isNaN(val.getTime())) {
      return { dateStr: null, error: 'Tanggal tidak valid.' };
    }
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return { dateStr: `${y}-${m}-${d}` };
  }

  // Angka serial Excel
  if (typeof val === 'number') {
    try {
      const parsed = XLSX.SSF.parse_date_code(val);
      if (parsed && parsed.y && parsed.m && parsed.d) {
        const y = String(parsed.y).padStart(4, '0');
        const m = String(parsed.m).padStart(2, '0');
        const d = String(parsed.d).padStart(2, '0');
        return { dateStr: `${y}-${m}-${d}` };
      }
    } catch {
      // fallback jika gagal parse_date_code
    }
  }

  const str = String(val).trim();

  // Pola YYYY-MM-DD atau YYYY/MM/DD
  const matchIso = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (matchIso) {
    const y = parseInt(matchIso[1], 10);
    const m = parseInt(matchIso[2], 10);
    const d = parseInt(matchIso[3], 10);
    if (y < 1000 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) {
      return { dateStr: null, error: `Tanggal "${str}" di luar rentang kalender yang wajar.` };
    }
    return {
      dateStr: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    };
  }

  // Pola DD-MM-YYYY atau DD/MM/YYYY
  const matchDmY = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (matchDmY) {
    const d = parseInt(matchDmY[1], 10);
    const m = parseInt(matchDmY[2], 10);
    const y = parseInt(matchDmY[3], 10);
    if (y < 1000 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) {
      return { dateStr: null, error: `Tanggal "${str}" di luar rentang kalender yang wajar.` };
    }
    return {
      dateStr: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    };
  }

  return {
    dateStr: null,
    error: `Format tanggal "${str}" tidak dikenali. Gunakan format YYYY-MM-DD (contoh: 1980-05-17).`,
  };
}

/**
 * Parsing dan validasi file Excel murni (tanpa efek samping ke DOM / Firebase)
 */
export async function parseExcelMembers(
  data: ArrayBuffer | Uint8Array
): Promise<ExcelParseResult> {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(data, { type: 'array', cellDates: true });
  } catch (err: any) {
    return {
      success: false,
      errorMessage: `Gagal membaca file Excel: ${err?.message || 'Format file tidak didukung'}`,
      sheetName: '',
      totalRows: 0,
      rows: [],
      validRows: [],
      invalidRows: [],
      allErrors: [
        {
          rowNumber: 1,
          message: `File bukan dokumen Excel (.xlsx / .xls / .csv) yang valid.`,
        },
      ],
      allWarnings: [],
      missingRequiredHeaders: [],
      hasCycles: false,
    };
  }

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    return {
      success: false,
      errorMessage: 'File Excel tidak memiliki lembar kerja (sheet).',
      sheetName: '',
      totalRows: 0,
      rows: [],
      validRows: [],
      invalidRows: [],
      allErrors: [{ rowNumber: 1, message: 'Tidak ada sheet dalam file Excel.' }],
      allWarnings: [],
      missingRequiredHeaders: [],
      hasCycles: false,
    };
  }

  // Pilih sheet "Data Anggota" (case-insensitive) atau sheet pertama
  const targetSheetName =
    workbook.SheetNames.find(
      (s) => s.toLowerCase().trim() === 'data anggota'
    ) || workbook.SheetNames[0];

  const sheet = workbook.Sheets[targetSheetName];
  if (!sheet) {
    return {
      success: false,
      errorMessage: `Lembar kerja "${targetSheetName}" kosong atau tidak terbaca.`,
      sheetName: targetSheetName,
      totalRows: 0,
      rows: [],
      validRows: [],
      invalidRows: [],
      allErrors: [{ rowNumber: 1, message: 'Sheet kosong.' }],
      allWarnings: [],
      missingRequiredHeaders: [],
      hasCycles: false,
    };
  }

  // Ubah sheet menjadi array 2D
  const sheetData: any[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  if (!sheetData || sheetData.length === 0) {
    return {
      success: false,
      errorMessage: `Lembar kerja "${targetSheetName}" tidak berisi data.`,
      sheetName: targetSheetName,
      totalRows: 0,
      rows: [],
      validRows: [],
      invalidRows: [],
      allErrors: [{ rowNumber: 1, message: 'Lembar kerja kosong.' }],
      allWarnings: [],
      missingRequiredHeaders: [],
      hasCycles: false,
    };
  }

  // Cari baris header (biasanya baris 0)
  const headerRow: any[] = sheetData[0] || [];
  const headerMap = new Map<string, number>();

  headerRow.forEach((val, colIndex) => {
    const normalized = normalizeHeaderName(val);
    if (normalized) {
      // Map sinonim header
      if (normalized === 'kode') headerMap.set('kode', colIndex);
      if (normalized === 'nama lengkap' || normalized === 'nama') headerMap.set('name', colIndex);
      if (['jenis kelamin', 'gender', 'jk'].includes(normalized)) headerMap.set('gender', colIndex);
      if (['kode orang tua', 'kode ortu', 'orang tua', 'parent'].includes(normalized)) {
        headerMap.set('parentKode', colIndex);
      }
      if (['tempat lahir', 'tempat'].includes(normalized)) headerMap.set('birthPlace', colIndex);
      if (['tanggal lahir', 'tgl lahir'].includes(normalized)) headerMap.set('birthDate', colIndex);
      if (['sudah meninggal', 'status meninggal', 'meninggal', 'wafat'].includes(normalized)) {
        headerMap.set('isDeceased', colIndex);
      }
      if (['tanggal wafat', 'tgl wafat', 'tanggal meninggal', 'tgl meninggal'].includes(normalized)) {
        headerMap.set('deathDate', colIndex);
      }
      if (['nama pasangan', 'pasangan'].includes(normalized)) headerMap.set('spouseName', colIndex);
      if (['kode pasangan'].includes(normalized)) headerMap.set('spouseKode', colIndex);
      if (
        normalized.includes('menantu') ||
        normalized.includes('luar keluarga') ||
        normalized.includes('in-law')
      ) {
        headerMap.set('isInLaw', colIndex);
      }
      if (['alamat', 'domisili'].includes(normalized)) headerMap.set('address', colIndex);
      if (['link foto', 'foto', 'foto url', 'url foto', 'link gambar'].includes(normalized)) {
        headerMap.set('avatarUrl', colIndex);
      }
      if (['catatan', 'keterangan', 'notes'].includes(normalized)) headerMap.set('notes', colIndex);
      if (
        normalized.includes('sembunyikan') ||
        normalized.includes('privasi') ||
        normalized.includes('hide address')
      ) {
        headerMap.set('hideAddressAndBirth', colIndex);
      }
    }
  });

  // Validasi kolom wajib yang harus ada di header
  const missingHeaders: string[] = [];
  if (!headerMap.has('kode')) missingHeaders.push('Kode');
  if (!headerMap.has('name')) missingHeaders.push('Nama Lengkap');

  if (missingHeaders.length > 0) {
    return {
      success: false,
      errorMessage: `Kolom wajib tidak ditemukan di baris pertama: ${missingHeaders.join(', ')}. Pastikan format kolom sesuai dengan template Excel yang disediakan.`,
      sheetName: targetSheetName,
      totalRows: 0,
      rows: [],
      validRows: [],
      invalidRows: [],
      allErrors: [
        {
          rowNumber: 1,
          message: `Header kolom wajib tidak lengkap. Kolom hilang: ${missingHeaders.join(', ')}`,
        },
      ],
      allWarnings: [],
      missingRequiredHeaders: missingHeaders,
      hasCycles: false,
    };
  }

  const rawRows: ExcelImportRow[] = [];
  const kodeOccurrences = new Map<string, number[]>();

  // Baca baris data (mulai dari index 1 -> Baris Excel 2)
  for (let i = 1; i < sheetData.length; i++) {
    const row = sheetData[i] || [];
    // Cek apakah seluruh baris kosong
    const isRowEmpty = row.every(
      (cell) => cell === null || cell === undefined || String(cell).trim() === ''
    );
    if (isRowEmpty) continue;

    const rowNumber = i + 1; // Baris Excel asli (1-indexed)
    const getVal = (field: string) => {
      const idx = headerMap.get(field);
      return idx !== undefined ? row[idx] : undefined;
    };

    const kode = String(getVal('kode') || '').trim();
    const name = String(getVal('name') || '').trim();
    const gender = normalizeGender(getVal('gender'));
    const parentKodeRaw = String(getVal('parentKode') || '').trim();
    const parentKode = parentKodeRaw === '' ? null : parentKodeRaw;
    const birthPlace = String(getVal('birthPlace') || '').trim() || null;

    const birthDateRes = normalizeDate(getVal('birthDate'));
    const isDeceased = normalizeBoolean(getVal('isDeceased'));
    const deathDateRes = normalizeDate(getVal('deathDate'));

    const spouseName = String(getVal('spouseName') || '').trim() || null;
    const spouseKodeRaw = String(getVal('spouseKode') || '').trim();
    const spouseKode = spouseKodeRaw === '' ? null : spouseKodeRaw;
    const isInLaw = normalizeBoolean(getVal('isInLaw'));

    const address = String(getVal('address') || '').trim() || null;
    const avatarUrl = String(getVal('avatarUrl') || '').trim() || null;
    const notes = String(getVal('notes') || '').trim() || null;
    const hideAddressAndBirth = normalizeBoolean(getVal('hideAddressAndBirth'));

    const errors: string[] = [];
    const warnings: string[] = [];

    // Validasi dasar per baris
    if (!kode) {
      errors.push('Kolom "Kode" wajib diisi.');
    } else {
      const existing = kodeOccurrences.get(kode) || [];
      existing.push(rowNumber);
      kodeOccurrences.set(kode, existing);
    }

    if (!name) {
      errors.push('Kolom "Nama Lengkap" wajib diisi.');
    } else if (name.length > 150) {
      errors.push(`Nama Lengkap terlalu panjang (maksimal 150 karakter, saat ini ${name.length} karakter).`);
    }

    // Validasi tanggal lahir
    if (birthDateRes.error) {
      errors.push(birthDateRes.error);
    }

    // Validasi tanggal wafat
    if (deathDateRes.error) {
      errors.push(deathDateRes.error);
    }

    // Aturan: Tanggal Wafat hanya dipakai jika Sudah Meninggal = Ya
    if (deathDateRes.dateStr && !isDeceased) {
      errors.push(
        `Tanggal Wafat terisi ("${deathDateRes.dateStr}"), tetapi status Sudah Meninggal adalah "Tidak". Pilih "Ya" pada Sudah Meninggal atau kosongkan Tanggal Wafat.`
      );
    }

    // Validasi urutan tanggal
    if (birthDateRes.dateStr && deathDateRes.dateStr && isDeceased) {
      if (deathDateRes.dateStr < birthDateRes.dateStr) {
        errors.push(
          `Tanggal Wafat (${deathDateRes.dateStr}) tidak boleh lebih awal dari Tanggal Lahir (${birthDateRes.dateStr}).`
        );
      }
    }

    // Validasi Link Foto
    if (avatarUrl) {
      if (!isValidHttpUrl(avatarUrl)) {
        errors.push(`Link Foto harus diawali dengan http:// atau https:// (format URL tidak valid).`);
      } else {
        // Cek peringatan Google Photos vs Google Drive
        const lowerUrl = avatarUrl.toLowerCase();
        if (
          lowerUrl.includes('photos.app.goo.gl') ||
          lowerUrl.includes('photos.google.com')
        ) {
          warnings.push(
            'Link berasal dari Google Photos. Google Photos tidak mengizinkan tampilan gambar langsung di website lain. Gunakan link berbagi Google Drive agar foto dapat tampil.'
          );
        } else if (lowerUrl.includes('drive.google.com')) {
          const driveId = extractGoogleDriveId(avatarUrl);
          if (!driveId) {
            warnings.push(
              'Link Google Drive tidak memuat ID file yang dapat dikenali. Pastikan link diperoleh dari menu "Bagikan" > "Salin link" dengan akses "Siapa saja yang memiliki link".'
            );
          }
        }
      }
    }

    rawRows.push({
      rowNumber,
      kode,
      name,
      gender,
      parentKode,
      birthPlace,
      birthDate: birthDateRes.dateStr,
      isDeceased,
      deathDate: isDeceased ? deathDateRes.dateStr : null,
      spouseName,
      spouseKode,
      isInLaw,
      address,
      avatarUrl,
      notes,
      hideAddressAndBirth,
      isValid: errors.length === 0,
      errors,
      warnings,
    });
  }

  if (rawRows.length === 0) {
    return {
      success: false,
      errorMessage: 'Tidak ada baris data yang ditemukan di sheet ini (hanya baris header).',
      sheetName: targetSheetName,
      totalRows: 0,
      rows: [],
      validRows: [],
      invalidRows: [],
      allErrors: [{ rowNumber: 1, message: 'Tidak ada data anggota untuk diimpor.' }],
      allWarnings: [],
      missingRequiredHeaders: [],
      hasCycles: false,
    };
  }

  // 1. Cek Duplikasi Kode di seluruh sheet
  kodeOccurrences.forEach((rowNums, kode) => {
    if (rowNums.length > 1) {
      rowNums.forEach((rn) => {
        const targetRow = rawRows.find((r) => r.rowNumber === rn);
        if (targetRow) {
          targetRow.errors.push(
            `Kode "${kode}" duplikat! Ditemukan pada baris: ${rowNums.join(', ')}. Setiap baris harus memiliki Kode unik.`
          );
          targetRow.isValid = false;
        }
      });
    }
  });

  const allAvailableKodes = new Set<string>(
    rawRows.map((r) => r.kode).filter((k) => k !== '')
  );

  // 2. Cek Relasi Kode Orang Tua dan Pasangan
  rawRows.forEach((row) => {
    if (row.parentKode) {
      if (row.parentKode === row.kode) {
        row.errors.push('Anggota tidak dapat menjadi orang tua bagi dirinya sendiri.');
        row.isValid = false;
      } else if (!allAvailableKodes.has(row.parentKode)) {
        row.errors.push(
          `Kode Orang Tua "${row.parentKode}" tidak ditemukan dalam kolom Kode pada file ini.`
        );
        row.isValid = false;
      }
    }

    if (row.spouseKode) {
      if (row.spouseKode === row.kode) {
        row.errors.push('Anggota tidak dapat menjadi pasangan bagi dirinya sendiri.');
        row.isValid = false;
      } else if (!allAvailableKodes.has(row.spouseKode)) {
        row.errors.push(
          `Kode Pasangan "${row.spouseKode}" tidak ditemukan dalam kolom Kode pada file ini.`
        );
        row.isValid = false;
      }
    }
  });

  // 3. Deteksi Relasi Melingkar (Siklus) pada Orang Tua (termasuk rantai panjang: A -> B -> C -> A)
  const parentMap = new Map<string, string>();
  rawRows.forEach((r) => {
    if (r.kode && r.parentKode) {
      parentMap.set(r.kode, r.parentKode);
    }
  });

  let detectedCycles = false;
  rawRows.forEach((row) => {
    if (!row.kode || !row.parentKode) return;

    const visited = new Set<string>();
    let currentKode: string | null = row.kode;
    const chain: string[] = [];

    while (currentKode) {
      if (visited.has(currentKode)) {
        detectedCycles = true;
        chain.push(currentKode);
        const cycleStartIndex = chain.indexOf(currentKode);
        const cyclePath = chain.slice(cycleStartIndex).join(' ➔ ');
        row.errors.push(
          `Terdeteksi hubungan orang tua melingkar (siklus): ${cyclePath}. Anggota tidak boleh menjadi leluhur bagi orang tuanya sendiri.`
        );
        row.isValid = false;
        break;
      }
      visited.add(currentKode);
      chain.push(currentKode);
      currentKode = parentMap.get(currentKode) || null;
    }
  });

  // Kumpulkan semua ringkasan error dan warning
  const allErrors: ExcelIssue[] = [];
  const allWarnings: ExcelIssue[] = [];

  rawRows.forEach((row) => {
    row.isValid = row.errors.length === 0;
    row.errors.forEach((err) => {
      allErrors.push({
        rowNumber: row.rowNumber,
        kode: row.kode || undefined,
        message: err,
      });
    });
    row.warnings.forEach((warn) => {
      allWarnings.push({
        rowNumber: row.rowNumber,
        kode: row.kode || undefined,
        message: warn,
      });
    });
  });

  const validRows = rawRows.filter((r) => r.isValid);
  const invalidRows = rawRows.filter((r) => !r.isValid);

  return {
    success: allErrors.length === 0,
    sheetName: targetSheetName,
    totalRows: rawRows.length,
    rows: rawRows,
    validRows,
    invalidRows,
    allErrors,
    allWarnings,
    missingRequiredHeaders: [],
    hasCycles: detectedCycles,
  };
}

/**
 * Filter baris yang valid dengan aturan cascade skip:
 * Jika baris X dilewati, maka anak/keturunan yang mengacu pada baris X juga harus ikut dilewati.
 * Memberitahukan alasan cascade untuk setiap baris yang terimbas.
 */
export function filterValidRowsWithCascade(rows: ExcelImportRow[]): FilteredValidResult {
  // Hanya mulai dari baris yang valid secara individual
  const candidateMap = new Map<string, ExcelImportRow>();
  rows.filter((r) => r.isValid).forEach((r) => candidateMap.set(r.kode, r));

  const cascadeSkipped: CascadeSkippedItem[] = [];
  let changed = true;

  // Lakukan iterasi eliminasi hingga tidak ada lagi rantai anak yang terputus
  while (changed) {
    changed = false;
    const currentKodes = new Set<string>(candidateMap.keys());

    for (const [kode, row] of candidateMap.entries()) {
      if (row.parentKode && !currentKodes.has(row.parentKode)) {
        candidateMap.delete(kode);
        cascadeSkipped.push({
          row,
          reason: `Orang tua (Kode: "${row.parentKode}") bermasalah atau dilewati, sehingga baris ini juga otomatis dilewati.`,
        });
        changed = true;
      }
    }
  }

  // Untuk pasangan: jika pasangan dilewati, kosongkan spouseKode tetapi pertahankan spouseName
  const finalRows: ExcelImportRow[] = Array.from(candidateMap.values()).map((row) => {
    if (row.spouseKode && !candidateMap.has(row.spouseKode)) {
      return {
        ...row,
        spouseKode: null,
      };
    }
    return row;
  });

  return {
    importedRows: finalRows,
    cascadeSkippedRows: cascadeSkipped,
  };
}

/**
 * Pemetaan baris Excel menjadi objek Member siap simpan ke Firestore
 */
export function buildMembersFromExcelRows(
  rows: ExcelImportRow[],
  options: {
    adminName: string;
    attachRootToMemberId?: string | null;
  }
): Member[] {
  // 1. Buat ID unik Firestore ('m_' + base36 timestamp + random) untuk setiap Kode
  const kodeToIdMap = new Map<string, string>();
  rows.forEach((row, idx) => {
    const uniqueId =
      'm_' +
      (Date.now() + idx).toString(36) +
      Math.random().toString(36).substring(2, 6);
    kodeToIdMap.set(row.kode, uniqueId);
  });

  // 2. Terjemahkan Kode Orang Tua dan Pasangan ke ID baru
  const nowIso = new Date().toISOString();

  const members: Member[] = rows.map((row) => {
    const memberId = kodeToIdMap.get(row.kode)!;

    let parentId: string | null = null;
    if (row.parentKode) {
      parentId = kodeToIdMap.get(row.parentKode) || null;
    } else if (options.attachRootToMemberId) {
      // Tempelkan leluhur tertua di bawah anggota yang dipilih
      parentId = options.attachRootToMemberId;
    }

    let spouseMemberId: string | null = null;
    if (row.spouseKode) {
      spouseMemberId = kodeToIdMap.get(row.spouseKode) || null;
    }

    return {
      id: memberId,
      name: row.name,
      gender: row.gender,
      parentId,
      birthPlace: row.birthPlace,
      birthDate: row.birthDate,
      isDeceased: row.isDeceased,
      deathDate: row.deathDate,
      spouse: row.spouseName,
      spouseMemberId,
      isInLaw: row.isInLaw,
      address: row.address,
      avatarUrl: row.avatarUrl,
      notes: row.notes,
      hideAddressAndBirth: row.hideAddressAndBirth,
      updatedAt: nowIso,
      updatedBy: options.adminName || 'Admin',
    };
  });

  // 3. Pastikan relasi pasangan bersifat DUA ARAH secara konsisten
  members.forEach((m) => {
    if (m.spouseMemberId) {
      const partner = members.find((p) => p.id === m.spouseMemberId);
      if (partner) {
        if (!partner.spouseMemberId) {
          partner.spouseMemberId = m.id;
        }
        if (!partner.spouse) {
          partner.spouse = m.name;
        }
        if (!m.spouse) {
          m.spouse = partner.name;
        }
      }
    }
  });

  return members;
}
