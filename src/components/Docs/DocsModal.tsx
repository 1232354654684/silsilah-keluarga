import React, { useState, useEffect } from 'react';
import { DocItem } from '../../types';
import { X, FolderOpen, AlertCircle } from 'lucide-react';

interface DocsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (docData: Partial<DocItem>) => Promise<void>;
  docToEdit: DocItem | null;
}

export const DocsModal: React.FC<DocsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  docToEdit,
}) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (docToEdit) {
      setTitle(docToEdit.title || '');
      setDate(docToEdit.date || '');
      setUrl(docToEdit.url || '');
      setNote(docToEdit.note || '');
    } else {
      setTitle('');
      setDate(new Date().toISOString().split('T')[0]);
      setUrl('');
      setNote('');
    }
    setError(null);
  }, [docToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Judul kegiatan wajib diisi.');
      return;
    }
    if (!url.trim()) {
      setError('Tautan Google Drive wajib diisi.');
      return;
    }
    if (!/^https:\/\//i.test(url.trim())) {
      setError('Tautan Google Drive wajib diawali dengan https://');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onSave({
        title: title.trim(),
        date: date || undefined,
        url: url.trim(),
        note: note.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Gagal menyimpan dokumentasi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-[14px] w-full max-w-lg shadow-2xl p-6 text-[var(--ink)] animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">
                {docToEdit ? 'Edit Dokumentasi' : 'Tambah Dokumentasi Kegiatan'}
              </h3>
              <p className="text-xs text-[var(--mute)]">
                Tautkan folder foto atau video Google Drive kegiatan keluarga
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--mute)] hover:text-[var(--ink)] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 text-xs bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs sm:text-sm">
          <div>
            <label className="block text-xs font-semibold text-[var(--mute)] mb-1">
              Judul Kegiatan <span className="text-[var(--danger)]">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Reuni Akbar Trah Soedirman 2026"
              required
              className="w-full px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--bg)] text-sm focus:border-[var(--accent)] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--mute)] mb-1">
              Tanggal Kegiatan
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--bg)] text-sm focus:border-[var(--accent)] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--mute)] mb-1">
              Link Google Drive (Folder / Foto / Video){' '}
              <span className="text-[var(--danger)]">*</span>
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://drive.google.com/drive/folders/... atau https://drive.google.com/file/d/..."
              required
              className="w-full px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--bg)] text-sm focus:border-[var(--accent)] focus:outline-none"
            />
            <p className="text-[11px] text-[var(--mute)] mt-1">
              Pastikan tautan folder Google Drive sudah diatur ke status &quot;Siapa saja yang memiliki link dapat melihat&quot;.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--mute)] mb-1">
              Keterangan (Opsional)
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Catatan tempat, panitia, atau rangkuman momen..."
              className="w-full px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--bg)] text-sm focus:border-[var(--accent)] focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--line)]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-lg border border-[var(--line)] text-xs sm:text-sm font-medium hover:bg-[var(--surface-secondary)] cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs sm:text-sm font-medium shadow-sm transition-colors cursor-pointer"
            >
              {loading ? 'Menyimpan...' : 'Simpan Dokumentasi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
