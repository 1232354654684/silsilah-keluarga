import React, { useState, useEffect } from 'react';
import { Member } from '../../types';
import { getDisplayImageUrl } from '../../utils/googleDrive';
import {
  User,
  Calendar,
  MapPin,
  Heart,
  FileText,
  Users,
  Plus,
  Edit2,
  Trash2,
  ArrowRightLeft,
  EyeOff,
  GitBranch,
  ExternalLink,
} from 'lucide-react';

interface MemberDetailPanelProps {
  member: Member;
  allMembers: Member[];
  isAdmin: boolean;
  onAddChild: (parentId: string) => void;
  onEdit: (member: Member) => void;
  onMoveParent: (member: Member) => void;
  onDelete: (member: Member) => void;
  onFocusMember: (id: string) => void;
  totalDescendants: number;
  childrenCount: number;
}

export const MemberDetailPanel: React.FC<MemberDetailPanelProps> = ({
  member,
  allMembers,
  isAdmin,
  onAddChild,
  onEdit,
  onMoveParent,
  onDelete,
  onFocusMember,
  totalDescendants,
  childrenCount,
}) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [imageError, setImageError] = useState(false);
  const displayImage = member.avatarUrl ? getDisplayImageUrl(member.avatarUrl) : '';

  useEffect(() => {
    setImageError(false);
  }, [member.id, member.avatarUrl]);

  // Formatter for date
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-';
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

  // Find linked spouse if spouseMemberId exists
  const linkedSpouse = member.spouseMemberId
    ? allMembers.find((m) => m.id === member.spouseMemberId)
    : null;

  // Find parent name
  const parent = member.parentId
    ? allMembers.find((m) => m.id === member.parentId)
    : null;

  const hasChildren = childrenCount > 0;

  return (
    <div className="bg-[var(--surface)] border border-[var(--line)] rounded-[14px] p-5 sm:p-6 shadow-xs mb-6 transition-colors">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-[var(--line)]">
        {/* Left: Avatar & Basic Headline */}
        <div className="flex items-center gap-4">
          <div className="relative">
            {displayImage && !imageError ? (
              <img
                src={displayImage}
                alt={member.name}
                onError={() => setImageError(true)}
                referrerPolicy="no-referrer"
                loading="lazy"
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-[var(--accent)] shadow-sm"
              />
            ) : (
              <div
                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center font-bold text-2xl shadow-sm border-2 border-[var(--line)] ${
                  member.gender === 'female'
                    ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                    : member.gender === 'male'
                    ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                    : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                }`}
              >
                {member.name
                  .split(' ')
                  .slice(0, 2)
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase() || <User className="w-8 h-8" />}
              </div>
            )}
            {member.isDeceased && (
              <span className="absolute -bottom-1 -right-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-stone-800 text-stone-100 border border-stone-600 shadow-xs">
                Wafat
              </span>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-bold text-[var(--ink)] tracking-tight">
                {member.name}
              </h2>
              {member.gender && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--surface-secondary)] text-[var(--mute)] border border-[var(--line)] font-medium">
                  {member.gender === 'male'
                    ? 'Laki-laki'
                    : member.gender === 'female'
                    ? 'Perempuan'
                    : 'Lainnya'}
                </span>
              )}
              {member.hideAddressAndBirth && !isAdmin && (
                <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                  <EyeOff className="w-3 h-3" /> Privasi Aktif
                </span>
              )}
            </div>

            <p className="text-xs sm:text-sm text-[var(--mute)] mt-1">
              {parent ? (
                <span>
                  Keturunan dari{' '}
                  <button
                    onClick={() => onFocusMember(parent.id)}
                    className="text-[var(--accent)] font-semibold hover:underline cursor-pointer"
                  >
                    {parent.name}
                  </button>
                </span>
              ) : (
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                  Leluhur Tertua (Akar Silsilah)
                </span>
              )}
              {' · '}
              <span className="font-medium text-[var(--ink)]">
                {totalDescendants} Keturunan ({childrenCount} anak langsung)
              </span>
            </p>
          </div>
        </div>

        {/* Focus Navigation Button */}
        <button
          onClick={() => onFocusMember(member.id)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface-secondary)] text-xs sm:text-sm font-medium text-[var(--ink)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors cursor-pointer self-start md:self-center"
        >
          <GitBranch className="w-4 h-4" />
          Fokuskan Cabang Ini
        </button>
      </div>

      {/* Grid of details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 my-5 text-xs sm:text-sm">
        {/* Tempat & Tanggal Lahir */}
        <div className="flex items-start gap-2.5">
          <Calendar className="w-4 h-4 text-[var(--accent)] mt-0.5 shrink-0" />
          <div>
            <span className="block text-[11px] text-[var(--mute)] uppercase tracking-wider font-medium">
              Tempat, Tanggal Lahir
            </span>
            <span className="text-[var(--ink)] font-medium">
              {member.hideAddressAndBirth && !isAdmin ? (
                <span className="text-[var(--mute)] italic">Disembunyikan (Privasi)</span>
              ) : member.birthPlace || member.birthDate ? (
                `${member.birthPlace ? member.birthPlace + ', ' : ''}${formatDate(member.birthDate)}`
              ) : (
                '-'
              )}
            </span>
          </div>
        </div>

        {/* Tanggal Wafat jika ada */}
        {member.isDeceased && (
          <div className="flex items-start gap-2.5">
            <Calendar className="w-4 h-4 text-stone-500 mt-0.5 shrink-0" />
            <div>
              <span className="block text-[11px] text-[var(--mute)] uppercase tracking-wider font-medium">
                Tanggal Wafat
              </span>
              <span className="text-[var(--ink)] font-medium">
                {formatDate(member.deathDate)}
              </span>
            </div>
          </div>
        )}

        {/* Pasangan */}
        <div className="flex items-start gap-2.5">
          <Heart className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
          <div>
            <span className="block text-[11px] text-[var(--mute)] uppercase tracking-wider font-medium">
              Pasangan Hidup
            </span>
            {linkedSpouse ? (
              <button
                onClick={() => onFocusMember(linkedSpouse.id)}
                className="text-[var(--accent)] font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                {linkedSpouse.name}
                <ExternalLink className="w-3 h-3" />
              </button>
            ) : (
              <span className="text-[var(--ink)] font-medium">
                {member.spouse || '-'}
              </span>
            )}
          </div>
        </div>

        {/* Alamat */}
        <div className="flex items-start gap-2.5">
          <MapPin className="w-4 h-4 text-[var(--accent)] mt-0.5 shrink-0" />
          <div>
            <span className="block text-[11px] text-[var(--mute)] uppercase tracking-wider font-medium">
              Alamat
            </span>
            <span className="text-[var(--ink)] font-medium">
              {member.hideAddressAndBirth && !isAdmin ? (
                <span className="text-[var(--mute)] italic">Disembunyikan (Privasi)</span>
              ) : (
                member.address || '-'
              )}
            </span>
          </div>
        </div>

        {/* Total Keturunan */}
        <div className="flex items-start gap-2.5">
          <Users className="w-4 h-4 text-[var(--accent)] mt-0.5 shrink-0" />
          <div>
            <span className="block text-[11px] text-[var(--mute)] uppercase tracking-wider font-medium">
              Total Keturunan
            </span>
            <span className="text-[var(--ink)] font-medium">
              {totalDescendants} orang ({childrenCount} anak)
            </span>
          </div>
        </div>
      </div>

      {/* Catatan Biografi */}
      {member.notes && (
        <div className="bg-[var(--surface-secondary)] p-3.5 rounded-xl border border-[var(--line)] mb-4 text-xs sm:text-sm">
          <div className="flex items-center gap-1.5 text-[var(--mute)] text-[11px] uppercase tracking-wider font-semibold mb-1">
            <FileText className="w-3.5 h-3.5" /> Catatan / Riwayat Singkat
          </div>
          <p className="text-[var(--ink)] whitespace-pre-wrap leading-relaxed">
            {member.notes}
          </p>
        </div>
      )}

      {/* Admin Action Buttons */}
      {isAdmin && (
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[var(--line)]">
          <button
            onClick={() => onAddChild(member.id)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs sm:text-sm font-medium transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            + Tambah Anak
          </button>

          <button
            onClick={() => onEdit(member)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--surface-secondary)] hover:bg-[var(--line)] text-[var(--ink)] text-xs sm:text-sm font-medium border border-[var(--line)] transition-colors cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5 text-[var(--mute)]" />
            Edit Data
          </button>

          <button
            onClick={() => onMoveParent(member)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--surface-secondary)] hover:bg-[var(--line)] text-[var(--ink)] text-xs sm:text-sm font-medium border border-[var(--line)] transition-colors cursor-pointer"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-[var(--mute)]" />
            Pindah Orang Tua
          </button>

          {/* Delete Action with Child Safety Guard */}
          <div className="ml-auto">
            {confirmDelete ? (
              <div className="inline-flex items-center gap-2 bg-red-50 dark:bg-red-950/40 p-1 rounded-lg border border-red-200 dark:border-red-800">
                <span className="text-xs text-red-600 dark:text-red-400 font-medium px-2">
                  Yakin hapus?
                </span>
                <button
                  onClick={() => {
                    onDelete(member);
                    setConfirmDelete(false);
                  }}
                  className="px-2.5 py-1 rounded bg-[var(--danger)] text-white text-xs font-semibold hover:opacity-90 cursor-pointer"
                >
                  Ya, Hapus
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-2.5 py-1 rounded bg-[var(--surface)] text-[var(--ink)] border border-[var(--line)] text-xs font-medium cursor-pointer"
                >
                  Batal
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  if (hasChildren) {
                    alert('Tidak dapat menghapus anggota yang masih memiliki keturunan/anak. Hapus atau pindahkan anak-anaknya terlebih dahulu.');
                    return;
                  }
                  setConfirmDelete(true);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium border border-transparent transition-colors cursor-pointer ${
                  hasChildren
                    ? 'opacity-40 cursor-not-allowed text-[var(--mute)]'
                    : 'text-[var(--danger)] hover:bg-[var(--danger-soft)] hover:border-red-200 dark:hover:border-red-900'
                }`}
                title={hasChildren ? 'Anggota yang masih memiliki anak tidak dapat dihapus' : 'Hapus data anggota'}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
