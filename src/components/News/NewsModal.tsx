import React, { useState, useEffect } from 'react';
import { NewsItem } from '../../types';
import { X, FileText, AlertCircle } from 'lucide-react';

interface NewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newsData: Partial<NewsItem>) => Promise<void>;
  newsToEdit: NewsItem | null;
}

export const NewsModal: React.FC<NewsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  newsToEdit,
}) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (newsToEdit) {
      setTitle(newsToEdit.title || '');
      setDate(newsToEdit.date || '');
      setBody(newsToEdit.body || '');
      setUrl(newsToEdit.url || '');
    } else {
      setTitle('');
      setDate(new Date().toISOString().split('T')[0]);
      setBody('');
      setUrl('');
    }
    setError(null);
  }, [newsToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Judul berita wajib diisi.');
      return;
    }
    if (!body.trim()) {
      setError('Isi berita wajib diisi.');
      return;
    }
    if (url.trim() && !/^https:\/\//i.test(url.trim())) {
      setError('Tautan Google Drive / dokumen harus diawali dengan https://');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onSave({
        title: title.trim(),
        date: date || new Date().toISOString().split('T')[0],
        body: body.trim(),
        url: url.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Gagal menyimpan berita.');
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
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">
                {newsToEdit ? 'Edit Berita Kegiatan' : 'Tambah Berita Kegiatan'}
              </h3>
              <p className="text-xs text-[var(--mute)]">
                Publikasikan pengumuman, agenda reuni, atau kabar keluarga
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
              Judul Berita <span className="text-[var(--danger)]">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Rencana Pertemuan Keluarga Idul Fitri"
              required
              className="w-full px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--bg)] text-sm focus:border-[var(--accent)] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--mute)] mb-1">
              Tanggal Berita / Pelaksanaan
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
              Isi Berita <span className="text-[var(--danger)]">*</span>
            </label>
            <textarea
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Tuliskan detail berita atau pengumuman secara rinci..."
              required
              className="w-full px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--bg)] text-sm focus:border-[var(--accent)] focus:outline-none leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--mute)] mb-1">
              Tautan Google Drive (Opsional)
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://drive.google.com/..."
              className="w-full px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--bg)] text-sm focus:border-[var(--accent)] focus:outline-none"
            />
            <p className="text-[11px] text-[var(--mute)] mt-1">
              Lampirkan link folder Google Drive foto pendukung atau surat edaran (wajib https://).
            </p>
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
              {loading ? 'Menyimpan...' : 'Simpan Berita'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
