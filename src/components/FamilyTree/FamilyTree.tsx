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
} from 'lucide-react';
import { exportTreeToPdf, exportTreeToImage } from '../../utils/export';

interface FamilyTreeProps {
  members: Member[];
  isAdmin: boolean;
  focusedMemberId: string | null;
  setFocusedMemberId: (id: string | null) => void;
  onAddMember: (parentId?: string) => void;
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
    return members
      .filter((m) => m.parentId === id)
      .sort((a, b) => (a.birthDate || '9999').localeCompare(b.birthDate || '9999'));
  };

  const countDescendants = (id: string): number => {
    let count = 0;
    const kids = getChildren(id);
    kids.forEach((k) => {
      count += 1 + countDescendants(k.id);
    });
    return count;
  };

  // Find root ancestors (no parent or parent not found in members)
  const rootAncestors = members.filter(
    (m) => !m.parentId || !memberMap.has(m.parentId)
  );

  // Focused member
  const focusedMember = focusedMemberId ? memberMap.get(focusedMemberId) || null : null;

  // Build breadcrumb path
  const breadcrumbPath: Member[] = [];
  let current: Member | null = focusedMember;
  while (current) {
    breadcrumbPath.unshift(current);
    current = current.parentId ? memberMap.get(current.parentId) || null : null;
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
    const kids = getChildren(m.id);
    const totalDesc = countDescendants(m.id);
    const isFocused = m.id === focusedMemberId;

    return (
      <li key={m.id} className="animate-in fade-in duration-200">
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
        />

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

          {breadcrumbPath.map((item, idx) => {
            const isLast = idx === breadcrumbPath.length - 1;
            return (
              <React.Fragment key={item.id}>
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
          onEdit={onEditMember}
          onMoveParent={onMoveParent}
          onDelete={onDeleteMember}
          onFocusMember={(id) => setFocusedMemberId(id)}
          totalDescendants={countDescendants(focusedMember.id)}
          childrenCount={getChildren(focusedMember.id).length}
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
              {(focusedMember ? [focusedMember] : rootAncestors).map((root) =>
                renderTreeNode(root, 0)
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
