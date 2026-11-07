import React, { useState } from 'react';
import { NewsItem } from '../../types';
import {
  FileText,
  Calendar,
  ExternalLink,
  Plus,
  Edit2,
  Trash2,
  Sparkles,
} from 'lucide-react';

interface NewsSectionProps {
  news: NewsItem[];
  isAdmin: boolean;
  onAddNews: () => void;
  onEditNews: (item: NewsItem) => void;
  onDeleteNews: (id: string) => void;
}

export const NewsSection: React.FC<NewsSectionProps> = ({
  news,
  isAdmin,
  onAddNews,
  onEditNews,
  onDeleteNews,
}) => {
  const [deleteArmId, setDeleteArmId] = useState<string | null>(null);

  // Sort descending by date
  const sortedNews = [...news].sort((a, b) =>
    (b.date || '').localeCompare(a.date || '')
  );

  const formatDate = (dateStr: string) => {
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
    <div className="max-w-4xl mx-auto py-2">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-6 pb-3 border-b border-[var(--line)]">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--ink)] tracking-tight">
            Kabar & Berita Keluarga
          </h2>
          <p className="text-xs sm:text-sm text-[var(--mute)]">
            Informasi kegiatan, agenda silaturahmi, dan kabar bahagia keluarga besar
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={onAddNews}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs sm:text-sm font-semibold transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            + Tambah Berita
          </button>
        )}
      </div>

      {/* Empty State */}
      {sortedNews.length === 0 ? (
        <div className="text-center py-16 bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-8 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)] mx-auto flex items-center justify-center mb-3">
            <FileText className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-[var(--ink)]">Belum Ada Berita</h3>
          <p className="text-xs sm:text-sm text-[var(--mute)] max-w-sm mx-auto mt-1">
            Belum ada pengumuman atau berita kegiatan keluarga yang diterbitkan.
          </p>
          {isAdmin && (
            <button
              onClick={onAddNews}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-xs sm:text-sm font-medium hover:bg-[var(--accent-hover)] cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Tambah Berita Pertama
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {sortedNews.map((item) => (
            <article
              key={item.id}
              className="bg-[var(--surface)] border border-[var(--line)] rounded-[14px] p-6 shadow-xs hover:border-[var(--accent)] transition-colors"
            >
              {/* Date & Author */}
              <div className="flex items-center justify-between text-xs text-[var(--mute)] mb-2">
                <span className="flex items-center gap-1 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-[var(--accent)]" />
                  {formatDate(item.date)}
                </span>
                {item.createdBy && (
                  <span className="text-[11px]">Diterbitkan oleh {item.createdBy}</span>
                )}
              </div>

              {/* Title */}
              <h3 className="text-lg sm:text-xl font-bold text-[var(--ink)] mb-3 leading-snug">
                {item.title}
              </h3>

              {/* Body */}
              <p className="text-xs sm:text-sm text-[var(--ink)] whitespace-pre-wrap leading-relaxed mb-4">
                {item.body}
              </p>

              {/* Footer with Google Drive link and admin actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[var(--line)]/60">
                {item.url ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[var(--accent)] hover:underline"
                  >
                    Buka Lampiran di Google Drive
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <div />
                )}

                {isAdmin && (
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => onEditNews(item)}
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
                            onDeleteNews(item.id);
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
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
