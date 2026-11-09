import React, { useState, useMemo } from 'react';
import { Member } from '../../types';
import {
  scanSpouseInconsistencies,
  SpouseInconsistency,
  SpouseLinkUpdate,
} from '../../utils/spouse';
import {
  X,
  HeartHandshake,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Link2,
  Link2Off,
  UserX,
  Users,
  Check,
} from 'lucide-react';

interface SpouseAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  onApplyFix: (updates: SpouseLinkUpdate[], auditMessage: string) => Promise<void>;
}

export const SpouseAuditModal: React.FC<SpouseAuditModalProps> = ({
  isOpen,
  onClose,
  members,
  onApplyFix,
}) => {
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const issues = useMemo(() => {
    return scanSpouseInconsistencies(members);
  }, [members]);

  if (!isOpen) return null;

  const handleActionClick = async (
    issue: SpouseInconsistency,
    action: { label: string; updates: SpouseLinkUpdate[] }
  ) => {
    const actionKey = `${issue.id}_${action.label}`;
    setLoadingActionId(actionKey);
    setErrorMsg(null);
    setSuccessMsg(null);

    const auditMessage = `Memperbaiki relasi pasangan: ${issue.title} (Aksi: "${action.label}")`;

    try {
      await onApplyFix(action.updates, auditMessage);
      setSuccessMsg(`Berhasil menerapkan: "${action.label}" untuk ${issue.title}`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal menerapkan perbaikan.');
    } finally {
      setLoadingActionId(null);
    }
  };

  const getIssueBadge = (type: string) => {
    switch (type) {
      case 'name_mismatch':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40 inline-flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Teks Nama Beda
          </span>
        );
      case 'one_way_link':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-900/40 inline-flex items-center gap-1">
            <Link2 className="w-3 h-3" /> Tautan 1 Arah
          </span>
        );
      case 'deleted_target':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40 inline-flex items-center gap-1">
            <UserX className="w-3 h-3" /> Target Terhapus
          </span>
        );
      case 'duplicate_link':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-900/40 inline-flex items-center gap-1">
            <Users className="w-3 h-3" /> Pasangan Ganda
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header Modal */}
        <div className="px-5 py-4 border-b border-[var(--line)] flex items-center justify-between shrink-0 bg-[var(--surface-secondary)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400 flex items-center justify-center shrink-0">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[var(--ink)] leading-snug">
                Periksa Sinkronisasi Pasangan
              </h2>
              <p className="text-xs text-[var(--mute)]">
                Deteksi dan perbaiki data pasangan yang tidak sinkron atau terputus
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--mute)] hover:text-[var(--ink)] hover:bg-[var(--line)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Konten */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Alert Error / Success */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Kondisi 0 Masalah */}
          {issues.length === 0 ? (
            <div className="py-12 px-4 text-center flex flex-col items-center justify-center gap-3">
              <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-900/40">
                <Check className="w-7 h-7 stroke-[2.5]" />
              </div>
              <h3 className="text-base font-bold text-[var(--ink)]">
                Seluruh Data Pasangan Telah Sinkron!
              </h3>
              <p className="text-xs text-[var(--mute)] max-w-md">
                Tidak ditemukan tautan satu arah, perbedaan teks nama pasangan, atau tautan ke profil yang telah dihapus.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-[var(--ink)]">
                  Ditemukan <span className="text-rose-600 dark:text-rose-400 font-bold">{issues.length}</span> masalah inkonsistensi:
                </p>
                <span className="text-[11px] text-[var(--mute)]">
                  Pilih solusi yang diinginkan untuk setiap masalah di bawah
                </span>
              </div>

              <div className="divide-y divide-[var(--line)] border border-[var(--line)] rounded-xl overflow-hidden bg-[var(--surface)]">
                {issues.map((issue) => (
                  <div key={issue.id} className="p-4 space-y-3 hover:bg-[var(--surface-secondary)]/30 transition-colors">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-bold text-[var(--ink)]">
                            {issue.title}
                          </h4>
                          {getIssueBadge(issue.type)}
                        </div>
                        <p className="text-xs text-[var(--mute)] mt-1 leading-relaxed">
                          {issue.description}
                        </p>
                      </div>
                    </div>

                    {/* Tombol Aksi Pilihan Admin */}
                    <div className="pt-1 flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-semibold text-[var(--mute)]">Pilihan Solusi:</span>
                      {issue.actions.map((act, actIdx) => {
                        const isLoading = loadingActionId === `${issue.id}_${act.label}`;
                        return (
                          <button
                            key={actIdx}
                            onClick={() => handleActionClick(issue, act)}
                            disabled={!!loadingActionId}
                            title={act.description}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
                              act.variant === 'primary'
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                : act.variant === 'danger'
                                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 hover:bg-rose-100'
                                : 'bg-[var(--surface-secondary)] hover:bg-[var(--line)] text-[var(--ink)] border border-[var(--line)]'
                            } disabled:opacity-50`}
                          >
                            {isLoading ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : act.variant === 'primary' ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : (
                              <Link2Off className="w-3.5 h-3.5" />
                            )}
                            {act.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[var(--line)] flex items-center justify-between bg-[var(--surface-secondary)]">
          <p className="text-[11px] text-[var(--mute)]">
            Setiap tindakan perbaikan akan disimpan atomik via batch dan dicatat di Riwayat Audit.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--line)] text-xs font-medium cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
