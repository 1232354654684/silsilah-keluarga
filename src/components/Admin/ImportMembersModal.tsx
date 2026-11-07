import React, { useState, useRef, useMemo } from 'react';
import { Member } from '../../types';
import {
  ExcelParseResult,
  ExcelImportRow,
  parseExcelMembers,
  filterValidRowsWithCascade,
  buildMembersFromExcelRows,
} from '../../utils/excelImport';
import { getDisplayImageUrl } from '../../utils/googleDrive';
import {
  X,
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  FileText,
  Search,
  ArrowRight,
  Info,
  Trash2,
  CornerDownRight,
  RefreshCw,
  Eye,
  Check,
} from 'lucide-react';

interface ImportMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingMembers: Member[];
  currentAdminName?: string;
  onImportSuccess: (
    newMembers: Member[],
    mode: 'append' | 'replace',
    fileName: string,
    onProgress: (p: { stage: string; current: number; total: number; percent: number }) => void
  ) => Promise<void>;
}

export const ImportMembersModal: React.FC<ImportMembersModalProps> = ({
  isOpen,
  onClose,
  existingMembers,
  currentAdminName = 'Admin',
  onImportSuccess,
}) => {
  if (!isOpen) return null;

  // File & Parsing state
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ExcelParseResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  // Import options
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [attachRootToMemberId, setAttachRootToMemberId] = useState<string>('');
  const [skipInvalidRows, setSkipInvalidRows] = useState(false);
  const [confirmReplaceText, setConfirmReplaceText] = useState('');

  // UI state
  const [activeTab, setActiveTab] = useState<'preview' | 'issues'>('preview');
  const [tableSearch, setTableSearch] = useState('');
  const [filterIssue, setFilterIssue] = useState<'all' | 'errors' | 'warnings'>('all');

  // Execution state
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{
    stage: string;
    current: number;
    total: number;
    percent: number;
  } | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Proses file Excel
  const handleProcessFile = async (selectedFile: File) => {
    // Validasi ekstensi
    const validExts = ['.xlsx', '.xls', '.csv'];
    const hasValidExt = validExts.some((ext) =>
      selectedFile.name.toLowerCase().endsWith(ext)
    );

    if (!hasValidExt) {
      setParseError('Format file harus berupa Excel (.xlsx, .xls) atau .csv.');
      return;
    }

    setFile(selectedFile);
    setIsParsing(true);
    setParseError(null);
    setExecutionError(null);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const result = await parseExcelMembers(buffer);
      setParseResult(result);
      if (result.allErrors.length > 0) {
        setActiveTab('issues');
      } else {
        setActiveTab('preview');
      }
    } catch (err: any) {
      setParseError(err?.message || 'Gagal memproses file Excel.');
      setParseResult(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleProcessFile(e.target.files[0]);
    }
  };

  const handleResetFile = () => {
    setFile(null);
    setParseResult(null);
    setParseError(null);
    setExecutionError(null);
    setConfirmReplaceText('');
    setSkipInvalidRows(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Kalkulasi baris yang akan diimpor berdasarkan opsi skip
  const effectiveImportData = useMemo(() => {
    if (!parseResult) {
      return { rowsToImport: [], cascadeSkipped: [], canImport: false };
    }

    if (parseResult.allErrors.length === 0) {
      return {
        rowsToImport: parseResult.rows,
        cascadeSkipped: [],
        canImport: parseResult.rows.length > 0,
      };
    }

    if (skipInvalidRows) {
      const cascade = filterValidRowsWithCascade(parseResult.rows);
      return {
        rowsToImport: cascade.importedRows,
        cascadeSkipped: cascade.cascadeSkippedRows,
        canImport: cascade.importedRows.length > 0,
      };
    }

    return {
      rowsToImport: [],
      cascadeSkipped: [],
      canImport: false,
    };
  }, [parseResult, skipInvalidRows]);

  // Validasi tombol simpan/import
  const isSubmitDisabled = useMemo(() => {
    if (isImporting || isParsing || !parseResult) return true;
    if (!effectiveImportData.canImport) return true;
    if (importMode === 'replace' && confirmReplaceText.trim() !== 'GANTI') {
      return true;
    }
    return false;
  }, [
    isImporting,
    isParsing,
    parseResult,
    effectiveImportData.canImport,
    importMode,
    confirmReplaceText,
  ]);

  // Handler eksekusi import
  const handleExecuteImport = async () => {
    if (isSubmitDisabled || !parseResult || !file) return;

    setIsImporting(true);
    setExecutionError(null);
    setImportProgress({
      stage: 'Mempersiapkan data anggota...',
      current: 0,
      total: effectiveImportData.rowsToImport.length,
      percent: 0,
    });

    try {
      // 1. Buat data Member dari baris Excel
      const membersToSave = buildMembersFromExcelRows(
        effectiveImportData.rowsToImport,
        {
          adminName: currentAdminName,
          attachRootToMemberId:
            importMode === 'append' && attachRootToMemberId
              ? attachRootToMemberId
              : null,
        }
      );

      // 2. Jalankan fungsi penyimpanan yang disediakan parent (batch write ke Firestore)
      await onImportSuccess(
        membersToSave,
        importMode,
        file.name,
        (p) => setImportProgress(p)
      );

      // Selesai, tutup modal
      onClose();
    } catch (err: any) {
      setExecutionError(err?.message || 'Gagal menyimpan data ke database.');
    } finally {
      setIsImporting(false);
    }
  };

  // Filter baris preview tabel
  const filteredPreviewRows = useMemo(() => {
    if (!parseResult) return [];
    const q = tableSearch.toLowerCase().trim();
    if (!q) return parseResult.rows;
    return parseResult.rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.kode.toLowerCase().includes(q) ||
        (r.parentKode && r.parentKode.toLowerCase().includes(q)) ||
        (r.spouseName && r.spouseName.toLowerCase().includes(q))
    );
  }, [parseResult, tableSearch]);

  // Filter isu/masalah
  const filteredIssues = useMemo(() => {
    if (!parseResult) return [];
    const list: { type: 'error' | 'warning'; rowNumber: number; kode?: string; message: string }[] = [];
    if (filterIssue === 'all' || filterIssue === 'errors') {
      parseResult.allErrors.forEach((e) => list.push({ ...e, type: 'error' }));
    }
    if (filterIssue === 'all' || filterIssue === 'warnings') {
      parseResult.allWarnings.forEach((w) => list.push({ ...w, type: 'warning' }));
    }
    return list;
  }, [parseResult, filterIssue]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header Modal */}
        <div className="px-5 py-4 border-b border-[var(--line)] flex items-center justify-between shrink-0 bg-[var(--surface-secondary)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[var(--ink)] leading-snug">
                Import Data Anggota dari Excel
              </h2>
              <p className="text-xs text-[var(--mute)]">
                Unggah file silsilah keluarga dalam format .xlsx, .xls, atau .csv
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isImporting}
            className="p-1.5 rounded-lg text-[var(--mute)] hover:text-[var(--ink)] hover:bg-[var(--line)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Konten Utama */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* Zona Unggah File */}
          {!file && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                isDragging
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)]/20'
                  : 'border-[var(--line)] hover:border-[var(--accent)] bg-[var(--surface-secondary)]/50 hover:bg-[var(--surface-secondary)]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-14 h-14 rounded-2xl bg-[var(--surface)] border border-[var(--line)] shadow-xs flex items-center justify-center text-[var(--accent)]">
                <FileSpreadsheet className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--ink)]">
                  Klik untuk memilih file atau seret file ke sini
                </p>
                <p className="text-xs text-[var(--mute)] mt-1">
                  Mendukung format Microsoft Excel (.xlsx, .xls) dan CSV (.csv)
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-xs text-[var(--ink)] font-medium shadow-2xs">
                <Upload className="w-3.5 h-3.5 text-[var(--accent)]" />
                Pilih Dokumen
              </div>
            </div>
          )}

          {/* Loading Parsing File */}
          {isParsing && (
            <div className="p-8 text-center flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-[var(--accent)]" />
              <p className="text-sm font-medium text-[var(--ink)]">
                Membaca dan memvalidasi struktur file Excel...
              </p>
            </div>
          )}

          {/* Error Pembacaan Awal */}
          {parseError && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start gap-3 text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              <div className="text-xs sm:text-sm">
                <p className="font-semibold">Gagal Membaca File</p>
                <p className="mt-1">{parseError}</p>
                <button
                  onClick={handleResetFile}
                  className="mt-2 text-xs underline font-semibold cursor-pointer"
                >
                  Pilih file lain
                </button>
              </div>
            </div>
          )}

          {/* Tampilan Hasil Analisis File */}
          {parseResult && !isParsing && (
            <div className="space-y-4">
              {/* File Info Bar & Metrics */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--line)]">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-[var(--ink)] truncate max-w-xs sm:max-w-md">
                      {file?.name}
                    </p>
                    <p className="text-[11px] text-[var(--mute)]">
                      Sheet: <span className="font-medium text-[var(--ink)]">"{parseResult.sheetName}"</span> •{' '}
                      {(file ? file.size / 1024 : 0).toFixed(1)} KB
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleResetFile}
                    disabled={isImporting}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--line)] text-[var(--ink)] text-xs font-medium transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Ganti File
                  </button>
                </div>
              </div>

              {/* Status Ringkasan Baris */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] flex flex-col">
                  <span className="text-[11px] font-medium text-[var(--mute)]">Total Baris</span>
                  <span className="text-xl font-bold text-[var(--ink)] mt-0.5">
                    {parseResult.totalRows}
                  </span>
                </div>

                <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 flex flex-col">
                  <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Baris Valid
                  </span>
                  <span className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">
                    {parseResult.validRows.length}
                  </span>
                </div>

                <div className={`p-3 rounded-xl border flex flex-col ${
                  parseResult.allErrors.length > 0
                    ? 'border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20'
                    : 'border-[var(--line)] bg-[var(--surface)]'
                }`}>
                  <span className={`text-[11px] font-medium flex items-center gap-1 ${
                    parseResult.allErrors.length > 0
                      ? 'text-rose-700 dark:text-rose-400'
                      : 'text-[var(--mute)]'
                  }`}>
                    <AlertCircle className="w-3 h-3" /> Error Ditemukan
                  </span>
                  <span className={`text-xl font-bold mt-0.5 ${
                    parseResult.allErrors.length > 0
                      ? 'text-rose-700 dark:text-rose-300'
                      : 'text-[var(--ink)]'
                  }`}>
                    {parseResult.allErrors.length}
                  </span>
                </div>

                <div className={`p-3 rounded-xl border flex flex-col ${
                  parseResult.allWarnings.length > 0
                    ? 'border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20'
                    : 'border-[var(--line)] bg-[var(--surface)]'
                }`}>
                  <span className={`text-[11px] font-medium flex items-center gap-1 ${
                    parseResult.allWarnings.length > 0
                      ? 'text-amber-700 dark:text-amber-400'
                      : 'text-[var(--mute)]'
                  }`}>
                    <AlertTriangle className="w-3 h-3" /> Peringatan
                  </span>
                  <span className={`text-xl font-bold mt-0.5 ${
                    parseResult.allWarnings.length > 0
                      ? 'text-amber-700 dark:text-amber-300'
                      : 'text-[var(--ink)]'
                  }`}>
                    {parseResult.allWarnings.length}
                  </span>
                </div>
              </div>

              {/* Banner Opsi Jika Ada Error */}
              {parseResult.allErrors.length > 0 && (
                <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/80 dark:bg-rose-950/30 space-y-2">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-rose-800 dark:text-rose-200">
                        File Memiliki {parseResult.allErrors.length} Masalah Validasi
                      </p>
                      <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5 leading-relaxed">
                        Data dengan status error tidak dapat diimpor langsung demi menjaga keutuhan struktur silsilah.
                      </p>
                    </div>
                  </div>

                  <label className="flex items-start gap-2.5 pt-2 border-t border-rose-200 dark:border-rose-900/40 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={skipInvalidRows}
                      onChange={(e) => setSkipInvalidRows(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <div className="text-xs text-[var(--ink)]">
                      <span className="font-semibold text-rose-950 dark:text-rose-100">
                        Lewati baris bermasalah dan import baris yang valid saja
                      </span>
                      <p className="text-[11px] text-[var(--mute)] mt-0.5 leading-normal">
                        Catatan: Baris keturunan yang orang tuanya ikut dilewati juga otomatis akan dilewati untuk mencegah data tanpa relasi.
                      </p>
                    </div>
                  </label>

                  {skipInvalidRows && (
                    <div className="mt-2 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                      <span>
                        Siap mengimpor <strong className="font-bold">{effectiveImportData.rowsToImport.length}</strong> anggota valid.
                        {effectiveImportData.cascadeSkipped.length > 0 && (
                          <span className="ml-1 text-amber-700 dark:text-amber-400">
                            ({effectiveImportData.cascadeSkipped.length} keturunan ikut dilewati).
                          </span>
                        )}
                      </span>
                      <button
                        onClick={() => setActiveTab('issues')}
                        className="underline font-semibold ml-2 text-[11px]"
                      >
                        Lihat rincian
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Tabs Preview vs Issues */}
              <div className="border-b border-[var(--line)] flex items-center gap-3">
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`pb-2.5 px-1 text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 border-b-2 ${
                    activeTab === 'preview'
                      ? 'border-[var(--accent)] text-[var(--accent)]'
                      : 'border-transparent text-[var(--mute)] hover:text-[var(--ink)]'
                  }`}
                >
                  <Eye className="w-4 h-4" />
                  Preview Data ({parseResult.rows.length})
                </button>
                <button
                  onClick={() => setActiveTab('issues')}
                  className={`pb-2.5 px-1 text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 border-b-2 ${
                    activeTab === 'issues'
                      ? 'border-rose-600 text-rose-600 dark:text-rose-400'
                      : 'border-transparent text-[var(--mute)] hover:text-[var(--ink)]'
                  }`}
                >
                  <AlertCircle className="w-4 h-4" />
                  Daftar Masalah ({parseResult.allErrors.length + parseResult.allWarnings.length})
                </button>
              </div>

              {/* Tab: Preview Data Tabel */}
              {activeTab === 'preview' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="relative flex-1 max-w-xs">
                      <Search className="w-4 h-4 text-[var(--mute)] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Cari nama atau kode..."
                        value={tableSearch}
                        onChange={(e) => setTableSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] focus:outline-hidden focus:border-[var(--accent)]"
                      />
                    </div>
                    <span className="text-xs text-[var(--mute)]">
                      Menampilkan {filteredPreviewRows.length} dari {parseResult.rows.length} baris
                    </span>
                  </div>

                  <div className="border border-[var(--line)] rounded-xl overflow-hidden overflow-x-auto max-h-60">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[var(--surface-secondary)] text-[var(--mute)] uppercase text-[10px] tracking-wider sticky top-0 border-b border-[var(--line)]">
                        <tr>
                          <th className="py-2 px-3">Baris</th>
                          <th className="py-2 px-3">Kode</th>
                          <th className="py-2 px-3">Nama Lengkap</th>
                          <th className="py-2 px-3">L/P</th>
                          <th className="py-2 px-3">Orang Tua</th>
                          <th className="py-2 px-3">Pasangan</th>
                          <th className="py-2 px-3">Status Baris</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--line)] bg-[var(--surface)]">
                        {filteredPreviewRows.map((r) => {
                          const isInvalid = !r.isValid;
                          return (
                            <tr
                              key={r.rowNumber}
                              className={`hover:bg-[var(--surface-secondary)]/60 transition-colors ${
                                isInvalid ? 'bg-rose-50/40 dark:bg-rose-950/20' : ''
                              }`}
                            >
                              <td className="py-2 px-3 font-mono text-[var(--mute)]">
                                #{r.rowNumber}
                              </td>
                              <td className="py-2 px-3 font-semibold text-[var(--ink)]">
                                {r.kode}
                              </td>
                              <td className="py-2 px-3 font-medium text-[var(--ink)]">
                                <div className="flex items-center gap-2">
                                  {r.avatarUrl && (
                                    <img
                                      src={getDisplayImageUrl(r.avatarUrl)}
                                      alt=""
                                      referrerPolicy="no-referrer"
                                      loading="lazy"
                                      className="w-5 h-5 rounded-full object-cover shrink-0 bg-[var(--line)]"
                                      onError={(e) => {
                                        (e.target as HTMLElement).style.display = 'none';
                                      }}
                                    />
                                  )}
                                  <span>{r.name}</span>
                                </div>
                              </td>
                              <td className="py-2 px-3 text-[var(--mute)]">
                                {r.gender === 'female' ? 'Perempuan' : r.gender === 'male' ? 'Laki-laki' : 'Lainnya'}
                              </td>
                              <td className="py-2 px-3 text-[var(--mute)]">
                                {r.parentKode ? (
                                  <span className="inline-flex items-center gap-1 font-mono text-[var(--ink)]">
                                    <CornerDownRight className="w-3 h-3 text-[var(--mute)]" />
                                    {r.parentKode}
                                  </span>
                                ) : (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                    Leluhur (Akar)
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-[var(--mute)]">
                                {r.spouseName || (r.spouseKode ? `(Kode: ${r.spouseKode})` : '-')}
                              </td>
                              <td className="py-2 px-3">
                                {isInvalid ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-semibold text-[10px]">
                                    <AlertCircle className="w-3 h-3" /> Error
                                  </span>
                                ) : r.warnings.length > 0 ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-semibold text-[10px]">
                                    <AlertTriangle className="w-3 h-3" /> Valid (Peringatan)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold text-[10px]">
                                    <Check className="w-3 h-3" /> Valid
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab: Daftar Masalah / Error & Warning */}
              {activeTab === 'issues' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setFilterIssue('all')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer ${
                        filterIssue === 'all'
                          ? 'bg-[var(--ink)] text-[var(--surface)]'
                          : 'bg-[var(--surface-secondary)] text-[var(--mute)] hover:text-[var(--ink)]'
                      }`}
                    >
                      Semua ({parseResult.allErrors.length + parseResult.allWarnings.length})
                    </button>
                    <button
                      onClick={() => setFilterIssue('errors')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer ${
                        filterIssue === 'errors'
                          ? 'bg-rose-600 text-white'
                          : 'bg-[var(--surface-secondary)] text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                      }`}
                    >
                      Hanya Error ({parseResult.allErrors.length})
                    </button>
                    <button
                      onClick={() => setFilterIssue('warnings')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer ${
                        filterIssue === 'warnings'
                          ? 'bg-amber-500 text-white'
                          : 'bg-[var(--surface-secondary)] text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                      }`}
                    >
                      Hanya Peringatan ({parseResult.allWarnings.length})
                    </button>
                  </div>

                  <div className="border border-[var(--line)] rounded-xl overflow-hidden divide-y divide-[var(--line)] max-h-60 overflow-y-auto">
                    {filteredIssues.length === 0 ? (
                      <div className="p-6 text-center text-xs text-[var(--mute)]">
                        Tidak ada isu pada kategori ini.
                      </div>
                    ) : (
                      filteredIssues.map((issue, idx) => {
                        const isErr = issue.type === 'error';
                        return (
                          <div
                            key={idx}
                            className={`p-3 text-xs flex items-start gap-2.5 ${
                              isErr
                                ? 'bg-rose-50/50 dark:bg-rose-950/20'
                                : 'bg-amber-50/50 dark:bg-amber-950/20'
                            }`}
                          >
                            {isErr ? (
                              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-[var(--ink)]">
                                  Baris #{issue.rowNumber}
                                </span>
                                {issue.kode && (
                                  <span className="px-1.5 py-0.2 rounded bg-[var(--surface)] border border-[var(--line)] font-mono text-[10px] text-[var(--ink)]">
                                    Kode: {issue.kode}
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 text-[var(--ink)] leading-relaxed">
                                {issue.message}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Info baris yang terimbas cascade */}
                  {effectiveImportData.cascadeSkipped.length > 0 && (
                    <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-xs">
                      <p className="font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                        <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        {effectiveImportData.cascadeSkipped.length} Baris Keturunan Ikut Dilewati (Cascade):
                      </p>
                      <ul className="mt-1.5 space-y-1 pl-5 list-disc text-amber-800 dark:text-amber-300 text-[11px]">
                        {effectiveImportData.cascadeSkipped.slice(0, 10).map((c, i) => (
                          <li key={i}>
                            <strong>Baris #{c.row.rowNumber} ({c.row.name}):</strong> {c.reason}
                          </li>
                        ))}
                        {effectiveImportData.cascadeSkipped.length > 10 && (
                          <li>Dan {effectiveImportData.cascadeSkipped.length - 10} baris lainnya...</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Pengaturan Mode Import */}
              <div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--surface-secondary)]/50 space-y-3.5">
                <p className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider">
                  Pengaturan Mode Import
                </p>

                <div className="space-y-3 text-xs">
                  {/* Mode 1: Tambahkan ke data yang sudah ada */}
                  <label className="flex items-start gap-2.5 p-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] hover:border-[var(--accent)] transition-colors cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="append"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="mt-0.5 text-[var(--accent)] focus:ring-[var(--accent)]"
                    />
                    <div className="flex-1">
                      <p className="font-bold text-[var(--ink)]">
                        Tambahkan ke data yang sudah ada (Rekomendasi)
                      </p>
                      <p className="text-[11px] text-[var(--mute)] mt-0.5">
                        Membuat ID baru untuk tiap baris anggota tanpa menghapus atau menimpa data yang sudah tersimpan di database saat ini ({existingMembers.length} anggota).
                      </p>

                      {/* Dropdown Tempelkan Leluhur */}
                      {importMode === 'append' && existingMembers.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-[var(--line)] space-y-1.5">
                          <label className="block text-[11px] font-semibold text-[var(--ink)]">
                            (Opsional) Tempelkan leluhur tertua dari file ini di bawah anggota:
                          </label>
                          <select
                            value={attachRootToMemberId}
                            onChange={(e) => setAttachRootToMemberId(e.target.value)}
                            className="w-full sm:max-w-md px-3 py-1.5 text-xs rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] focus:outline-hidden focus:border-[var(--accent)]"
                          >
                            <option value="">
                              -- Jangan tempelkan (Jadikan sebagai Leluhur Tertua / Akar Baru) --
                            </option>
                            {existingMembers.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name} {m.birthDate ? `(Lahir: ${m.birthDate})` : ''}
                              </option>
                            ))}
                          </select>
                          <p className="text-[10px] text-[var(--mute)]">
                            Bila dipilih, baris paling atas (akar) dari file ini akan dijadikan anak dari anggota di atas, sehingga langsung tergabung ke pohon yang ada.
                          </p>
                        </div>
                      )}
                    </div>
                  </label>

                  {/* Mode 2: Ganti Semua Data */}
                  <label className="flex items-start gap-2.5 p-3 rounded-xl border border-rose-300 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20 hover:border-rose-500 transition-colors cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="mt-0.5 text-rose-600 focus:ring-rose-500"
                    />
                    <div className="flex-1">
                      <p className="font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" /> Ganti semua data anggota
                      </p>
                      <p className="text-[11px] text-rose-600/90 dark:text-rose-400/90 mt-0.5">
                        PERINGATAN: Seluruh {existingMembers.length} anggota keluarga di database akan dihapus secara permanen dan digantikan seluruhnya oleh data dari file Excel ini.
                      </p>

                      {/* Konfirmasi 2 Langkah: Ketik "GANTI" */}
                      {importMode === 'replace' && (
                        <div className="mt-3 pt-3 border-t border-rose-200 dark:border-rose-900/50 space-y-1.5">
                          <label className="block text-[11px] font-bold text-rose-800 dark:text-rose-200">
                            Ketik kata <span className="font-mono underline">GANTI</span> untuk mengonfirmasi penggantian total:
                          </label>
                          <input
                            type="text"
                            placeholder='Ketik "GANTI"'
                            value={confirmReplaceText}
                            onChange={(e) => setConfirmReplaceText(e.target.value)}
                            className="w-full sm:max-w-xs px-3 py-1.5 text-xs rounded-lg border border-rose-300 dark:border-rose-800 bg-[var(--surface)] text-[var(--ink)] focus:outline-hidden focus:border-rose-600 font-mono"
                          />
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              </div>

              {/* Progress Bar Eksekusi */}
              {isImporting && importProgress && (
                <div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-[var(--ink)]">
                    <span className="flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-[var(--accent)]" />
                      {importProgress.stage}
                    </span>
                    <span>{importProgress.percent}%</span>
                  </div>
                  <div className="w-full bg-[var(--line)] h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-2 rounded-full transition-all duration-200"
                      style={{ width: `${importProgress.percent}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Error Eksekusi */}
              {executionError && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                  <div>
                    <p className="font-bold">Gagal Menyimpan Data</p>
                    <p className="mt-0.5">{executionError}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Modal: Tombol Aksi */}
        <div className="px-5 py-3.5 border-t border-[var(--line)] flex flex-wrap items-center justify-between gap-3 bg-[var(--surface-secondary)] shrink-0">
          <div className="text-xs text-[var(--mute)]">
            {parseResult && effectiveImportData.rowsToImport.length > 0 && (
              <span>
                Total <strong className="text-[var(--ink)]">{effectiveImportData.rowsToImport.length}</strong> anggota siap disimpan.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isImporting}
              className="px-4 py-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--line)] text-[var(--ink)] text-xs sm:text-sm font-medium transition-colors cursor-pointer"
            >
              Batal
            </button>

            {parseResult && (
              <button
                onClick={handleExecuteImport}
                disabled={isSubmitDisabled}
                className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer ${
                  isSubmitDisabled
                    ? 'bg-gray-300 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed shadow-none'
                    : importMode === 'replace'
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Menyimpan Data...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    {importMode === 'replace'
                      ? `Ganti & Import ${effectiveImportData.rowsToImport.length} Anggota`
                      : `Import ${effectiveImportData.rowsToImport.length} Anggota`}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
