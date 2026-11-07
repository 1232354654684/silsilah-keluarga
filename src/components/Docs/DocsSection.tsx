import React, { useState } from 'react';
import { DocItem } from '../../types';
import {
  FolderOpen,
  Calendar,
  ExternalLink,
  Plus,
  Edit2,
  Trash2,
  Sparkles,
} from 'lucide-react';

interface DocsSectionProps {
  docs: DocItem[];
  isAdmin: boolean;
  onAddDoc: () => void;
  onEditDoc: (item: DocItem) => void;
  onDeleteDoc: (id: string) => void;
}

export const DocsSection: React.FC<DocsSectionProps> = ({
  docs,
  isAdmin,
  onAddDoc,
  onEditDoc,
  onDeleteDoc,
}) => {
  const [deleteArmId, setDeleteArmId] = useState<string | null>(null);

  // Sort newest first
  const sortedDocs = [...docs].sort((a, b) =>
    (b.date || '').localeCompare(a.date || '')
  );

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr + 'T00:00:00');
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-2">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-3 border-b border-[var(--line)]">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--ink)] tracking-tight">
            Dokumentasi Kegiatan
          </h2>
          <p className="text-xs sm:text-sm text-[var(--mute)]">
            Kumpulan album foto, video, dan arsip momen keluarga yang tersimpan aman di Google Drive
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={onAddDoc}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs sm:text-sm font-semibold transition-colors shadow-sm self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            + Tambah Dokumentasi
          </button>
        )}
      </div>

      {/* Empty State */}
      {sortedDocs.length === 0 ? (
        <div className="text-center py-16 bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-8 shadow-xs max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)] mx-auto flex items-center justify-center mb-3">
            <FolderOpen className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-[var(--ink)]">Belum Ada Dokumentasi</h3>
          <p className="text-xs sm:text-sm text-[var(--mute)] mt-1">
            Belum ada dokumentasi kegiatan keluarga yang ditautkan.
          </p>
          {isAdmin && (
            <button
              onClick={onAddDoc}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-xs sm:text-sm font-medium hover:bg-[var(--accent-hover)] cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Tambah Dokumentasi Pertama
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sortedDocs.map((item) => (
            <div
              key={item.id}
              className="bg-[var(--surface)] border border-[var(--line)] rounded-[14px] p-5 shadow-xs flex flex-col justify-between hover:border-[var(--accent)] hover:shadow-sm transition-all group"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-[var(--mute)] mb-2">
                  <span className="flex items-center gap-1 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-[var(--accent)]" />
                    {formatDate(item.date) || 'Tanggal tidak dicantumkan'}
                  </span>
                  <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                </div>

                <h3 className="text-base sm:text-lg font-bold text-[var(--ink)] mb-2 group-hover:text-[var(--accent)] transition-colors line-clamp-2">
                  {item.title}
                </h3>

                {item.note && (
                  <p className="text-xs sm:text-sm text-[var(--mute)] leading-relaxed mb-4 line-clamp-3">
                    {item.note}
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-[var(--line)]/60 flex flex-col gap-3 mt-4">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-[var(--accent-soft)] hover:bg-[var(--accent)] hover:text-white text-[var(--accent)] font-semibold text-xs sm:text-sm transition-colors"
                >
                  Buka di Google Drive
                  <ExternalLink className="w-4 h-4" />
                </a>

                {isAdmin && (
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => onEditDoc(item)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[var(--line)] bg-[var(--surface-secondary)] text-xs text-[var(--ink)] hover:border-[var(--accent)] transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Edit
                    </button>

                    {deleteArmId === item.id ? (
                      <div className="inline-flex items-center gap-1.5 bg-red-50 dark:bg-red-950/40 p-1 rounded-lg border border-red-200 dark:border-red-800">
                        <span className="text-xs text-red-600 font-semibold px-1">
                          Yakin hapus?
                        </span>
                        <button
                          onClick={() => {
                            onDeleteDoc(item.id);
                            setDeleteArmId(null);
                          }}
                          className="px-2 py-0.5 rounded bg-[var(--danger)] text-white text-xs font-semibold cursor-pointer"
                        >
                          Ya
                        </button>
                        <button
                          onClick={() => setDeleteArmId(null)}
                          className="px-2 py-0.5 rounded bg-[var(--surface)] text-[var(--ink)] border border-[var(--line)] text-xs cursor-pointer"
                        >
                          Batal
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteArmId(item.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-transparent text-xs text-[var(--danger)] hover:bg-[var(--danger-soft)] transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Hapus
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
