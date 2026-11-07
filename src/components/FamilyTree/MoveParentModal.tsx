import React, { useState } from 'react';
import { Member } from '../../types';
import { X, ArrowRightLeft, AlertTriangle } from 'lucide-react';

interface MoveParentModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member | null;
  allMembers: Member[];
  onSaveParent: (memberId: string, newParentId: string | null) => Promise<void>;
}

export const MoveParentModal: React.FC<MoveParentModalProps> = ({
  isOpen,
  onClose,
  member,
  allMembers,
  onSaveParent,
}) => {
  if (!isOpen || !member) return null;

  const [selectedParentId, setSelectedParentId] = useState<string>(member.parentId || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Compute all descendants of this member to prevent cyclic loops
  const forbiddenIds = new Set<string>();
  forbiddenIds.add(member.id);

  const collectDescendants = (currentId: string) => {
    const children = allMembers.filter((m) => m.parentId === currentId);
    children.forEach((c) => {
      forbiddenIds.add(c.id);
      collectDescendants(c.id);
    });
  };
  collectDescendants(member.id);

  const currentParent = member.parentId
    ? allMembers.find((m) => m.id === member.parentId)
    : null;

  const handleSave = async () => {
    if (selectedParentId === member.id) {
      setError('Tidak dapat memilih diri sendiri sebagai orang tua.');
      return;
    }
    if (forbiddenIds.has(selectedParentId)) {
      setError('Tidak dapat memilih keturunan dari anggota ini sebagai orang tuanya (mencegah relasi melingkar).');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSaveParent(member.id, selectedParentId || null);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Gagal memindahkan orang tua.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-[14px] w-full max-w-md shadow-2xl p-6 text-[var(--ink)] animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">Pindahkan Orang Tua</h3>
              <p className="text-xs text-[var(--mute)]">Ganti cabang silsilah {member.name}</p>
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
          <div className="mt-3 p-3 text-xs bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-4 space-y-3 text-xs sm:text-sm">
          <div className="p-3 rounded-lg bg-[var(--surface-secondary)] border border-[var(--line)]">
            <span className="text-[var(--mute)] block text-[11px] uppercase font-semibold">
              Orang Tua Saat Ini
            </span>
            <span className="font-semibold text-[var(--ink)] text-sm">
              {currentParent ? currentParent.name : 'Tidak ada (Leluhur Utama)'}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--mute)] mb-1">
              Pilih Orang Tua Baru
            </label>
            <select
              value={selectedParentId}
              onChange={(e) => setSelectedParentId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--bg)] text-sm focus:border-[var(--accent)] focus:outline-none"
            >
              <option value="">Tidak ada (Jadikan Leluhur Tertua Baru)</option>
              {allMembers
                .filter((m) => !forbiddenIds.has(m.id))
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
            </select>
            <p className="text-[11px] text-[var(--mute)] mt-1.5">
              * Diri sendiri dan seluruh keturunannya telah disaring secara otomatis demi mencegah lingkaran silsilah yang tidak valid.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6 pt-3 border-t border-[var(--line)]">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-lg border border-[var(--line)] text-xs sm:text-sm font-medium hover:bg-[var(--surface-secondary)] cursor-pointer"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-5 py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs sm:text-sm font-medium shadow-sm transition-colors cursor-pointer"
          >
            {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </div>
    </div>
  );
};
