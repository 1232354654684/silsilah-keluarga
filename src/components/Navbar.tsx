import React, { useState } from 'react';
import {
  Users,
  TreeDeciduous,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Sun,
  Moon,
  LogIn,
  LogOut,
  UserCheck,
  Search,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Member } from '../types';

interface NavbarProps {
  activeTab: 'tree' | 'news' | 'docs' | 'admin';
  setActiveTab: (tab: 'tree' | 'news' | 'docs' | 'admin') => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  onOpenLogin: () => void;
  onOpenProfile: () => void;
  members: Member[];
  onSelectMember: (id: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  darkMode,
  setDarkMode,
  onOpenLogin,
  onOpenProfile,
  members,
  onSelectMember,
}) => {
  const { currentUser, adminProfile, isAdmin, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const searchResults = searchQuery.trim()
    ? members
        .filter((m) =>
          m.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
        )
        .slice(0, 6)
    : [];

  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-[var(--surface)]/90 border-b border-[var(--line)] transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Logo & Title */}
          <div className="flex items-center justify-between w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('tree')}
              className="flex items-center gap-2.5 text-left focus:outline-none group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-[var(--accent)] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <TreeDeciduous className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-[var(--ink)] leading-none">
                  Silsilah Keluarga
                </h1>
                <p className="text-[11px] text-[var(--mute)] mt-0.5">
                  Pohon Trah & Jejak Keturunan
                </p>
              </div>
            </button>

            {/* Mobile dark mode & login toggle buttons */}
            <div className="flex items-center gap-1 sm:hidden">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-lg text-[var(--mute)] hover:text-[var(--ink)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer"
                title={darkMode ? 'Mode Terang' : 'Mode Gelap'}
                aria-label="Toggle tema"
              >
                {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
              </button>
              {currentUser ? (
                <button
                  onClick={onOpenProfile}
                  className="p-2 rounded-lg text-[var(--accent)] hover:bg-[var(--accent-soft)] transition-colors cursor-pointer"
                  title="Profil Saya"
                >
                  <UserCheck className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={onOpenLogin}
                  className="p-2 rounded-lg text-[var(--accent)] hover:bg-[var(--accent-soft)] transition-colors cursor-pointer"
                  title="Masuk Pengelola"
                >
                  <LogIn className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Nav Tabs */}
          <nav className="flex items-center bg-[var(--surface-secondary)] p-1 rounded-full border border-[var(--line)] overflow-x-auto max-w-full">
            <button
              onClick={() => setActiveTab('tree')}
              className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'tree'
                  ? 'bg-[var(--accent)] text-white shadow-xs'
                  : 'text-[var(--mute)] hover:text-[var(--ink)]'
              }`}
            >
              <TreeDeciduous className="w-4 h-4" />
              Pohon Silsilah
            </button>
            <button
              onClick={() => setActiveTab('news')}
              className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'news'
                  ? 'bg-[var(--accent)] text-white shadow-xs'
                  : 'text-[var(--mute)] hover:text-[var(--ink)]'
              }`}
            >
              <FileText className="w-4 h-4" />
              Berita
            </button>
            <button
              onClick={() => setActiveTab('docs')}
              className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'docs'
                  ? 'bg-[var(--accent)] text-white shadow-xs'
                  : 'text-[var(--mute)] hover:text-[var(--ink)]'
              }`}
            >
              <FolderOpen className="w-4 h-4" />
              Dokumentasi
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeTab === 'admin'
                    ? 'bg-[var(--accent)] text-white shadow-xs'
                    : 'text-[var(--mute)] hover:text-[var(--ink)]'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard Admin
              </button>
            )}
          </nav>

          {/* Right actions: Search, Theme Toggle, Auth Buttons */}
          <div className="hidden sm:flex items-center gap-2">
            {/* Quick Search */}
            <div className="relative">
              <div className="flex items-center bg-[var(--surface-secondary)] border border-[var(--line)] rounded-lg px-2.5 py-1 text-sm focus-within:border-[var(--accent)]">
                <Search className="w-4 h-4 text-[var(--mute)] mr-1.5" />
                <input
                  type="text"
                  placeholder="Cari anggota..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsSearchOpen(true);
                  }}
                  onFocus={() => setIsSearchOpen(true)}
                  className="bg-transparent border-none text-xs sm:text-sm text-[var(--ink)] focus:outline-none w-28 md:w-36 placeholder-[var(--mute)]"
                />
              </div>

              {/* Search Dropdown */}
              {isSearchOpen && searchQuery.trim() && (
                <div
                  className="absolute right-0 mt-1 w-64 bg-[var(--surface)] border border-[var(--line)] rounded-xl shadow-lg p-2 z-50 text-xs sm:text-sm"
                  onMouseLeave={() => setIsSearchOpen(false)}
                >
                  {searchResults.length > 0 ? (
                    <div className="space-y-1">
                      {searchResults.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => {
                            onSelectMember(m.id);
                            setIsSearchOpen(false);
                            setSearchQuery('');
                          }}
                          className="w-full text-left p-2 rounded-lg hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] flex items-center justify-between transition-colors cursor-pointer"
                        >
                          <span className="font-medium truncate">{m.name}</span>
                          <span className="text-[11px] text-[var(--mute)]">
                            {m.birthDate ? m.birthDate.split('-')[0] : ''}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-2 text-center text-[var(--mute)] text-xs">
                      Nama tidak ditemukan
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Dark / Light Mode */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg text-[var(--mute)] hover:text-[var(--ink)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer"
              title={darkMode ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
              aria-label="Toggle tema"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Auth status */}
            {currentUser ? (
              <div className="flex items-center gap-2 pl-1 border-l border-[var(--line)]">
                <button
                  onClick={onOpenProfile}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] text-xs sm:text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
                  title="Klik untuk membuka profil / ganti password"
                >
                  <UserCheck className="w-4 h-4" />
                  <span className="max-w-[100px] truncate font-semibold">
                    {adminProfile?.name || currentUser.email?.split('@')[0]}
                  </span>
                  <span className="text-[10px] uppercase font-bold px-1 rounded bg-[var(--accent)] text-white">
                    {adminProfile?.role === 'superadmin' ? 'Utama' : 'Pengelola'}
                  </span>
                </button>
                <button
                  onClick={logout}
                  className="p-2 rounded-lg text-[var(--mute)] hover:text-[var(--danger)] hover:bg-[var(--danger-soft)] transition-colors cursor-pointer"
                  title="Keluar"
                  aria-label="Keluar"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLogin}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs sm:text-sm font-medium transition-all shadow-xs cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                Masuk Admin
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
