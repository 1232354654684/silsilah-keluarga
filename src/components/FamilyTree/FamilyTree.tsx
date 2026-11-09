import React, { useState } from 'react';
import { Member } from '../../types';
import { MemberCard } from './MemberCard';
import { MemberDetailPanel } from './MemberDetailPanel';
import {
  Home,
  ChevronRight,
  Plus,
  Download,
  Image as ImageIcon,
  FileDown,
  Sparkles,
  TreeDeciduous,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Heart,
} from 'lucide-react';
import { exportTreeToPdf, exportTreeToImage } from '../../utils/export';
import { getLinkedSpouse, isCompanionMember } from '../../utils/spouse';

interface FamilyTreeProps {
  members: Member[];
  isAdmin: boolean;
  focusedMemberId: string | null;
  setFocusedMemberId: (id: string | null) => void;
  onAddMember: (parentId?: string) => void;
  onAddSpouse: (member: Member) => void;
  onUnlinkSpouse?: (memberAId: string, memberBId: string) => Promise<void>;
  onEditMember: (member: Member) => void;
  onMoveParent: (member: Member) => void;
  onDeleteMember: (member: Member) => void;
  onLoadSampleData?: () => void;
}

export const FamilyTree: React.FC<FamilyTreeProps> = ({
  members,
  isAdmin,
  focusedMemberId,
  setFocusedMemberId,
  onAddMember,
  onAddSpouse,
  onUnlinkSpouse,
  onEditMember,
  onMoveParent,
  onDeleteMember,
  onLoadSampleData,
}) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isExporting, setIsExporting] = useState(false);

  // Helper lookups
  const memberMap = new Map<string, Member>();
  members.forEach((m) => memberMap.set(m.id, m));

  const getChildren = (id: string) => {
    const m = memberMap.get(id);
    const spouse = m ? getLinkedSpouse(m, members) : null;
    return members
      .filter((c) => {
        if (c.id === id) return false;
        if (spouse && c.id === spouse.id) return false;
        // Anggota pendamping tidak pernah muncul sebagai anak di silsilah
        if (isCompanionMember(c, members)) return false;
        return c.parentId === id || (spouse && c.parentId === spouse.id);
      })
      .sort((a, b) => (a.birthDate || '9999').localeCompare(b.birthDate || '9999'));
  };

  const countDescendants = (id: string, visited = new Set<string>()): number => {
    if (visited.has(id)) return 0;
    visited.add(id);
    let count = 0;
    const kids = getChildren(id);
    kids.forEach((k) => {
      count += 1 + countDescendants(k.id, visited);
    });
    return count;
  };

  // Find root ancestors: anggota tanpa parentId (atau parent tidak ada di database) dan BUKAN pendamping
  const rootAncestors = members.filter((m) => {
    if (isCompanionMember(m, members)) return false;
    return !m.parentId || !memberMap.has(m.parentId);
  });

  const displayRoots =
    rootAncestors.length > 0
      ? rootAncestors
      : members.filter((m) => !isCompanionMember(m, members));

  // Focused member
  const focusedMember = focusedMemberId ? memberMap.get(focusedMemberId) || null : null;
  const isFocusedCompanion = focusedMember ? isCompanionMember(focusedMember, members) : false;
  const bloodSpouseOfFocused = isFocusedCompanion && focusedMember?.spouseMemberId
    ? memberMap.get(focusedMember.spouseMemberId) || null
    : null;

  // Root yang ditampilkan di canvas pohon saat ada fokus:
  // Jika yang difokuskan adalah pendamping, pohon merender cabang silsilah pasangan darahnya
  const treeRootMember = bloodSpouseOfFocused || focusedMember;

  // Build breadcrumb path
  const breadcrumbItems: Array<{ id: string; name: string }> = [];
  let current: Member | null = bloodSpouseOfFocused || focusedMember;
  const breadcrumbVisited = new Set<string>();
  while (current && !breadcrumbVisited.has(current.id)) {
    breadcrumbVisited.add(current.id);
    breadcrumbItems.unshift({ id: current.id, name: current.name });
    if (current.parentId) {
      current = memberMap.get(current.parentId) || null;
    } else {
      current = null;
    }
  }

  // Jika yang difokuskan adalah pendamping, tambahkan namanya dengan suffix "(pasangan)"
  if (isFocusedCompanion && focusedMember) {
    breadcrumbItems.push({
      id: focusedMember.id,
      name: `${focusedMember.name} (pasangan)`,
    });
  }

  // Handle Export
  const handleExportPng = async () => {
    try {
      setIsExporting(true);
      await exportTreeToImage('family-tree-capture-root', `silsilah-keluarga-${Date.now()}.png`);
    } catch (err: any) {
      alert('Gagal mengekspor gambar: ' + (err?.message || 'Error'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPdf = async () => {
    try {
      setIsExporting(true);
      await exportTreeToPdf('family-tree-capture-root', `silsilah-keluarga-${Date.now()}.pdf`);
    } catch (err: any) {
      alert('Gagal mengekspor PDF: ' + (err?.message || 'Error'));
    } finally {
      setIsExporting(false);
    }
  };

  // Recursive tree node renderer (renders up to 3 generations: depth 0, 1, 2)
  const renderTreeNode = (m: Member, depth: number) => {
    const spouse = getLinkedSpouse(m, members);
    const kids = getChildren(m.id);
    const totalDesc = countDescendants(m.id);
    const isFocused = m.id === focusedMemberId;
    const isSpouseFocused = spouse?.id === focusedMemberId;

    return (
      <li key={m.id} className="animate-in fade-in duration-200">
        {spouse ? (
          <div className="flex items-center justify-center relative">
            <MemberCard
              member={m}
              isFocused={isFocused}
              childrenCount={kids.length}
              totalDescendantsCount={totalDesc}
              onClick={() => {
                setFocusedMemberId(m.id);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              isPublicView={!isAdmin}
              allMembers={members}
              hideSpouseText={true}
            />
            {/* Horizontal connector line with Heart icon */}
            <div className="flex items-center justify-center px-1 text-rose-500 relative select-none">
              <div className="w-2.5 sm:w-3 h-0.5 bg-rose-300 dark:bg-rose-800" />
              <div
                className="p-1 rounded-full bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-800 shadow-2xs z-10 hover:scale-110 transition-transform"
                title={`Pasangan Menikah: ${m.name} & ${spouse.name}`}
              >
                <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
              </div>
              <div className="w-2.5 sm:w-3 h-0.5 bg-rose-300 dark:bg-rose-800" />
            </div>
            <MemberCard
              member={spouse}
              isFocused={isSpouseFocused}
              childrenCount={0}
              totalDescendantsCount={0}
              onClick={() => {
                setFocusedMemberId(spouse.id);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              isPublicView={!isAdmin}
              allMembers={members}
              hideSpouseText={true}
            />
          </div>
        ) : (
          <MemberCard
            member={m}
            isFocused={isFocused}
            childrenCount={kids.length}
            totalDescendantsCount={totalDesc}
            onClick={() => {
              setFocusedMemberId(m.id);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            isPublicView={!isAdmin}
            allMembers={members}
            hideSpouseText={false}
          />
        )}

        {/* Up to 3 generations: depth < 2 renders children */}
        {kids.length > 0 && depth < 2 ? (
          <ul>
            {kids.map((kid) => renderTreeNode(kid, depth + 1))}
          </ul>
        ) : kids.length > 0 ? (
          <div className="mt-2.5 text-center">
            <button
              onClick={() => {
                setFocusedMemberId(m.id);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-xs px-2.5 py-1 rounded-full bg-[var(--surface-secondary)] text-[var(--mute)] hover:text-[var(--accent)] hover:border-[var(--accent)] border border-[var(--line)] transition-colors cursor-pointer"
            >
              + {totalDesc} keturunan lagi ›
            </button>
          </div>
        ) : null}
      </li>
    );
  };

  // Empty state if no members exist
  if (members.length === 0) {
    return (
      <div className="max-w-xl mx-auto my-12 text-center p-8 bg-[var(--surface)] border border-[var(--line)] rounded-2xl shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)] mx-auto flex items-center justify-center mb-4">
          <TreeDeciduous className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-[var(--ink)]">
          Belum Ada Anggota Keluarga
        </h3>
        <p className="text-sm text-[var(--mute)] mt-1.5 max-w-md mx-auto">
          Mulai susun pohon silsilah keluarga Anda dengan menambahkan leluhur pertama atau muat contoh data keluarga.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
          {isAdmin && (
            <button
              onClick={() => onAddMember()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-semibold transition-colors cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              + Tambah Leluhur Pertama
            </button>
          )}

          {onLoadSampleData && (
            <button
              onClick={onLoadSampleData}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--surface-secondary)] hover:bg-[var(--line)] text-[var(--ink)] text-sm font-medium border border-[var(--line)] transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              Muat Data Contoh Keluarga
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Top Bar: Breadcrumbs & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        {/* Breadcrumb Path */}
        <nav className="flex items-center gap-1.5 text-xs sm:text-sm flex-wrap text-[var(--mute)]">
          <button
            onClick={() => setFocusedMemberId(null)}
            className={`flex items-center gap-1 hover:text-[var(--accent)] transition-colors cursor-pointer ${
              !focusedMemberId ? 'font-bold text-[var(--ink)]' : ''
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Semua Leluhur</span>
          </button>

          {breadcrumbItems.map((item, idx) => {
            const isLast = idx === breadcrumbItems.length - 1;
            return (
              <React.Fragment key={item.id + idx}>
                <ChevronRight className="w-3.5 h-3.5 text-[var(--mute)] shrink-0" />
                {isLast ? (
                  <span className="font-bold text-[var(--ink)] truncate max-w-[140px] sm:max-w-none">
                    {item.name}
                  </span>
                ) : (
                  <button
                    onClick={() => setFocusedMemberId(item.id)}
                    className="hover:text-[var(--accent)] hover:underline transition-colors cursor-pointer truncate max-w-[120px] sm:max-w-none"
                  >
                    {item.name}
                  </button>
                )}
              </React.Fragment>
            );
          })}
        </nav>

        {/* Tree Tools: Zoom & Export */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          {/* Zoom Controls */}
          <div className="flex items-center bg-[var(--surface)] border border-[var(--line)] rounded-lg p-0.5 shadow-2xs">
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.1))}
              className="p-1.5 text-[var(--mute)] hover:text-[var(--ink)] rounded-md hover:bg-[var(--surface-secondary)] cursor-pointer"
              title="Perkecil Tampilan"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono px-1.5 text-[var(--mute)]">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.1))}
              className="p-1.5 text-[var(--mute)] hover:text-[var(--ink)] rounded-md hover:bg-[var(--surface-secondary)] cursor-pointer"
              title="Perbesar Tampilan"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            {zoomLevel !== 1 && (
              <button
                onClick={() => setZoomLevel(1)}
                className="p-1.5 text-[var(--mute)] hover:text-[var(--ink)] rounded-md hover:bg-[var(--surface-secondary)] cursor-pointer"
                title="Reset Ukuran"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Export Dropdown / Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleExportPng}
              disabled={isExporting}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-xs font-medium hover:border-[var(--accent)] text-[var(--ink)] transition-colors shadow-2xs cursor-pointer"
              title="Ekspor Pohon ke Gambar PNG"
            >
              <ImageIcon className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span className="hidden md:inline">Ekspor Gambar</span>
            </button>
            <button
              onClick={handleExportPdf}
              disabled={isExporting}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-xs font-medium hover:border-[var(--accent)] text-[var(--ink)] transition-colors shadow-2xs cursor-pointer"
              title="Ekspor Pohon ke Dokumen PDF"
            >
              <FileDown className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span className="hidden md:inline">Ekspor PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Focused Member Detail Panel */}
      {focusedMember && (
        <MemberDetailPanel
          member={focusedMember}
          allMembers={members}
          isAdmin={isAdmin}
          onAddChild={(parentId) => onAddMember(parentId)}
          onAddSpouse={onAddSpouse}
          onUnlinkSpouse={onUnlinkSpouse}
          onEdit={onEditMember}
          onMoveParent={onMoveParent}
          onDelete={onDeleteMember}
          onFocusMember={(id) => setFocusedMemberId(id)}
          totalDescendants={countDescendants(bloodSpouseOfFocused ? bloodSpouseOfFocused.id : focusedMember.id)}
          childrenCount={getChildren(bloodSpouseOfFocused ? bloodSpouseOfFocused.id : focusedMember.id).length}
        />
      )}

      {/* Family Tree Graphic Area */}
      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-[14px] p-6 shadow-xs relative overflow-hidden transition-colors">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-[var(--mute)]">
            * Geser horizontal untuk melihat cabang keluarga secara lengkap. Klik kartu untuk membuka detail cabang.
          </p>
          {isAdmin && !focusedMember && (
            <button
              onClick={() => onAddMember()}
              className="inline-flex items-center gap-1 text-xs text-[var(--accent)] font-semibold hover:underline cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Tambah Leluhur Lain
            </button>
          )}
        </div>

        {/* Tree Scroller with zoom container */}
        <div className="scroller overflow-x-auto overflow-y-visible py-6 px-4">
          <div
            id="family-tree-capture-root"
            className="family-tree transition-transform origin-top duration-150"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            <ul>
              {(treeRootMember ? [treeRootMember] : displayRoots).map((root) =>
                renderTreeNode(root, 0)
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
