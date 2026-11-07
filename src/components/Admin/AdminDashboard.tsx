import React, { useState } from 'react';
import {
  Member,
  DocItem,
  NewsItem,
  AdminUser,
  AuditLogItem,
} from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  TreeDeciduous,
  FolderOpen,
  FileText,
  Search,
  Plus,
  Eye,
  Edit2,
  Trash2,
  Download,
  Shield,
  ShieldCheck,
  UserCheck,
  UserX,
  History,
  KeyRound,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Copy,
  Check,
  EyeOff,
} from 'lucide-react';
import { exportMembersToCSV } from '../../utils/export';

interface AdminDashboardProps {
  members: Member[];
  docs: DocItem[];
  news: NewsItem[];
  adminUsers: AdminUser[];
  auditLogs: AuditLogItem[];
  onAddMember: () => void;
  onEditMember: (member: Member) => void;
  onDeleteMember: (member: Member) => void;
  onViewInTree: (memberId: string) => void;
  onAddDoc: () => void;
  onAddNews: () => void;
  onOpenCreateAdmin: () => void;
  onEditAdmin: (user: AdminUser) => void;
  onToggleAdminStatus: (uid: string, currentStatus: string) => Promise<void>;
  onDeleteAdmin: (uid: string) => Promise<void>;
  onResetAdminPassword: (email: string) => Promise<void>;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  members,
  docs,
  news,
  adminUsers,
  auditLogs,
  onAddMember,
  onEditMember,
  onDeleteMember,
  onViewInTree,
  onAddDoc,
  onAddNews,
  onOpenCreateAdmin,
  onEditAdmin,
  onToggleAdminStatus,
  onDeleteAdmin,
  onResetAdminPassword,
}) => {
  const { currentUser, adminProfile, isSuperAdmin, changeMyPassword, logAuditAction } = useAuth();
  const [subTab, setSubTab] = useState<'members' | 'users' | 'audit' | 'password'>('members');
  const [memberSearch, setMemberSearch] = useState('');
  const [userActionMsg, setUserActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password state in admin dashboard
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [passCopied, setPassCopied] = useState(false);
  const [passMsg, setPassMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const getPassStrength = (pass: string) => {
    if (!pass) return { score: 0, text: 'Kosong', color: 'bg-stone-300' };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[0-9]/.test(pass) && /[a-zA-Z]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score: 1, text: 'Cukup', color: 'bg-amber-500' };
    if (score === 2) return { score: 2, text: 'Baik', color: 'bg-blue-500' };
    if (score === 3) return { score: 3, text: 'Kuat', color: 'bg-emerald-500' };
    return { score: 4, text: 'Sangat Kuat', color: 'bg-emerald-600' };
  };

  const passStrength = getPassStrength(newPass);

  const generateRandomPass = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let res = '';
    res += 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 24)];
    res += 'abcdefghijkmnpqrstuvwxyz'[Math.floor(Math.random() * 24)];
    res += '23456789'[Math.floor(Math.random() * 8)];
    res += '!@#$%'[Math.floor(Math.random() * 5)];
    for (let i = 4; i < 10; i++) {
      res += chars[Math.floor(Math.random() * chars.length)];
    }
    const shuffled = res.split('').sort(() => 0.5 - Math.random()).join('');
    setNewPass(shuffled);
    setConfirmPass(shuffled);
  };

  const copyPasswordToClipboard = () => {
    navigator.clipboard.writeText(newPass);
    setPassCopied(true);
    setTimeout(() => setPassCopied(false), 2000);
  };

  const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass.length < 6) {
      setPassMsg({ type: 'error', text: 'Kata sandi minimal 6 karakter.' });
      return;
    }
    if (newPass !== confirmPass) {
      setPassMsg({ type: 'error', text: 'Konfirmasi kata sandi tidak cocok.' });
      return;
    }

    setPassLoading(true);
    setPassMsg(null);
    try {
      await changeMyPassword(newPass);
      setPassMsg({ type: 'success', text: 'Kata sandi akun admin berhasil diperbarui!' });
      setNewPass('');
      setConfirmPass('');
      await logAuditAction(
        'user_management',
        'GANTI_PASSWORD',
        `Pengguna ${adminProfile?.name || currentUser?.email} berhasil mengganti kata sandi.`
      );
    } catch (err: any) {
      if (err.code === 'auth/requires-recent-login') {
        setPassMsg({
          type: 'error',
          text: 'Sesi telah kedaluwarsa demi keamanan. Silakan keluar dan masuk kembali sebelum mengganti kata sandi.',
        });
      } else {
        setPassMsg({ type: 'error', text: err?.message || 'Gagal mengubah kata sandi.' });
      }
    } finally {
      setPassLoading(false);
    }
  };

  // Map for quick parent lookup
  const memberMap = new Map<string, Member>();
  members.forEach((m) => memberMap.set(m.id, m));

  // Compute total generations
  const computeGenerations = (id: string): number => {
    const kids = members.filter((m) => m.parentId === id);
    let max = 0;
    kids.forEach((k) => {
      max = Math.max(max, computeGenerations(k.id));
    });
    return 1 + max;
  };

  const rootAncestors = members.filter(
    (m) => !m.parentId || !memberMap.has(m.parentId)
  );

  let totalGenerations = 0;
  rootAncestors.forEach((r) => {
    totalGenerations = Math.max(totalGenerations, computeGenerations(r.id));
  });

  // Filtered members list
  const filteredMembers = members.filter((m) => {
    const q = memberSearch.toLowerCase().trim();
    if (!q) return true;
    const parentName = m.parentId ? memberMap.get(m.parentId)?.name || '' : '';
    return (
      m.name.toLowerCase().includes(q) ||
      (m.birthPlace && m.birthPlace.toLowerCase().includes(q)) ||
      parentName.toLowerCase().includes(q)
    );
  });

  const handleExportCSV = () => {
    exportMembersToCSV(members);
  };

  const handleToggleStatus = async (uid: string, currentStatus: string) => {
    try {
      setUserActionMsg(null);
      await onToggleAdminStatus(uid, currentStatus);
      setUserActionMsg({
        type: 'success',
        text: `Status akun berhasil ${currentStatus === 'active' ? 'dinonaktifkan' : 'diaktifkan kembali'}.`,
      });
    } catch (err: any) {
      setUserActionMsg({ type: 'error', text: err?.message || 'Gagal mengubah status akun.' });
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus akun admin ini?')) return;
    try {
      setUserActionMsg(null);
      await onDeleteAdmin(uid);
      setUserActionMsg({ type: 'success', text: 'Akun admin berhasil dihapus.' });
    } catch (err: any) {
      setUserActionMsg({ type: 'error', text: err?.message || 'Gagal menghapus akun.' });
    }
  };

  const handleResetPassword = async (email: string) => {
    try {
      setUserActionMsg(null);
      await onResetAdminPassword(email);
      setUserActionMsg({
        type: 'success',
        text: `Email instruksi reset kata sandi telah dikirim ke ${email}.`,
      });
    } catch (err: any) {
      setUserActionMsg({
        type: 'error',
        text: err?.message || 'Gagal mengirim email reset password.',
      });
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-2 space-y-6">
      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[var(--surface)] border border-[var(--line)] rounded-[14px] p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-[var(--mute)] font-medium">Total Anggota</span>
            <h3 className="text-2xl font-bold text-[var(--ink)] leading-none mt-1">
              {members.length}
            </h3>
          </div>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--line)] rounded-[14px] p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <TreeDeciduous className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-[var(--mute)] font-medium">Kedalaman Generasi</span>
            <h3 className="text-2xl font-bold text-[var(--ink)] leading-none mt-1">
              {totalGenerations || 1}
            </h3>
          </div>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--line)] rounded-[14px] p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <FolderOpen className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-[var(--mute)] font-medium">Dokumentasi</span>
            <h3 className="text-2xl font-bold text-[var(--ink)] leading-none mt-1">
              {docs.length}
            </h3>
          </div>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--line)] rounded-[14px] p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-[var(--mute)] font-medium">Berita Kegiatan</span>
            <h3 className="text-2xl font-bold text-[var(--ink)] leading-none mt-1">
              {news.length}
            </h3>
          </div>
        </div>
      </div>

      {/* Action Shortcut Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--surface)] border border-[var(--line)] rounded-[14px] p-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onAddMember}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs sm:text-sm font-semibold transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            + Tambah Anggota
          </button>
          <button
            onClick={onAddDoc}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface-secondary)] hover:bg-[var(--line)] text-[var(--ink)] text-xs sm:text-sm font-medium transition-colors cursor-pointer"
          >
            <FolderOpen className="w-4 h-4 text-[var(--mute)]" />
            + Tambah Dokumentasi
          </button>
          <button
            onClick={onAddNews}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface-secondary)] hover:bg-[var(--line)] text-[var(--ink)] text-xs sm:text-sm font-medium transition-colors cursor-pointer"
          >
            <FileText className="w-4 h-4 text-[var(--mute)]" />
            + Tambah Berita
          </button>
        </div>

        <button
          onClick={handleExportCSV}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:border-[var(--accent)] text-xs sm:text-sm font-medium transition-colors cursor-pointer"
          title="Ekspor seluruh data anggota ke format CSV / Excel"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          Ekspor CSV (Excel)
        </button>
      </div>

      {/* Admin Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--line)] pb-2 overflow-x-auto">
        <button
          onClick={() => setSubTab('members')}
          className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
            subTab === 'members'
              ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
              : 'text-[var(--mute)] hover:text-[var(--ink)]'
          }`}
        >
          <Users className="w-4 h-4" />
          Daftar Anggota ({members.length})
        </button>

        {isSuperAdmin && (
          <button
            onClick={() => setSubTab('users')}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              subTab === 'users'
                ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                : 'text-[var(--mute)] hover:text-[var(--ink)]'
            }`}
          >
            <Shield className="w-4 h-4" />
            Manajemen Pengguna ({adminUsers.length})
          </button>
        )}

        <button
          onClick={() => setSubTab('audit')}
          className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
            subTab === 'audit'
              ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
              : 'text-[var(--mute)] hover:text-[var(--ink)]'
          }`}
        >
          <History className="w-4 h-4" />
          Riwayat Audit
        </button>

        <button
          onClick={() => setSubTab('password')}
          className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
            subTab === 'password'
              ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
              : 'text-[var(--mute)] hover:text-[var(--ink)]'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          Ganti Password
        </button>
      </div>

      {/* Alert message if any */}
      {userActionMsg && (
        <div
          className={`p-3 text-xs sm:text-sm rounded-lg flex items-center gap-2 ${
            userActionMsg.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800'
          }`}
        >
          {userActionMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{userActionMsg.text}</span>
        </div>
      )}

      {/* SUBTAB 1: MEMBERS TABLE */}
      {subTab === 'members' && (
        <div className="bg-[var(--surface)] border border-[var(--line)] rounded-[14px] p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-[var(--mute)]" />
              <input
                type="text"
                placeholder="Cari nama, kota lahir, atau orang tua..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--bg)] text-xs sm:text-sm focus:border-[var(--accent)] focus:outline-none"
              />
            </div>
            <span className="text-xs text-[var(--mute)] self-center">
              Menampilkan {filteredMembers.length} dari {members.length} anggota
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-[var(--line)] text-[var(--mute)] uppercase text-[11px] font-semibold">
                  <th className="py-2.5 px-3">Nama Anggota</th>
                  <th className="py-2.5 px-3">Orang Tua</th>
                  <th className="py-2.5 px-3">Lahir / Wafat</th>
                  <th className="py-2.5 px-3">Pasangan</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]/50">
                {filteredMembers.map((m) => {
                  const parent = m.parentId ? memberMap.get(m.parentId) : null;
                  return (
                    <tr key={m.id} className="hover:bg-[var(--surface-secondary)]/50 transition-colors">
                      <td className="py-3 px-3 font-medium text-[var(--ink)]">
                        <div className="flex items-center gap-2">
                          <span>{m.name}</span>
                          {m.isDeceased && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-700 text-stone-200">
                              Wafat
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-[var(--mute)]">
                        {parent ? parent.name : <span className="text-emerald-600 font-medium">Leluhur Utama</span>}
                      </td>
                      <td className="py-3 px-3 text-[var(--mute)]">
                        {m.birthPlace ? `${m.birthPlace}, ` : ''}
                        {m.birthDate || '-'}
                      </td>
                      <td className="py-3 px-3 text-[var(--mute)]">
                        {m.spouse || '-'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onViewInTree(m.id)}
                            className="p-1.5 rounded-lg border border-[var(--line)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors cursor-pointer"
                            title="Buka dan fokuskan di pohon silsilah"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onEditMember(m)}
                            className="p-1.5 rounded-lg border border-[var(--line)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors cursor-pointer"
                            title="Edit data anggota"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteMember(m)}
                            className="p-1.5 rounded-lg border border-transparent text-[var(--danger)] hover:bg-[var(--danger-soft)] transition-colors cursor-pointer"
                            title="Hapus data anggota"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 2: USER MANAGEMENT (SUPERADMIN ONLY) */}
      {subTab === 'users' && isSuperAdmin && (
        <div className="bg-[var(--surface)] border border-[var(--line)] rounded-[14px] p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--line)]">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[var(--ink)]">
                Manajemen Akun Pengelola & Admin
              </h3>
              <p className="text-xs text-[var(--mute)]">
                Admin Utama berhak menambah, mengedit peran, menonaktifkan, dan mengatur ulang akun
              </p>
            </div>
            <button
              onClick={onOpenCreateAdmin}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs sm:text-sm font-semibold transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              + Tambah Pengelola Baru
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-[var(--line)] text-[var(--mute)] uppercase text-[11px] font-semibold">
                  <th className="py-2.5 px-3">Nama & Username</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3">Peran</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Login Terakhir</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]/50">
                {adminUsers.map((u) => {
                  const isSelf = currentUser?.uid === u.id || currentUser?.email === u.email;
                  return (
                    <tr key={u.id} className="hover:bg-[var(--surface-secondary)]/50 transition-colors">
                      <td className="py-3 px-3 font-medium text-[var(--ink)]">
                        <div>
                          <b>{u.name}</b>
                          <span className="block text-xs text-[var(--mute)] font-mono">
                            @{u.username}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-[var(--mute)]">{u.email}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                            u.role === 'superadmin'
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                          }`}
                        >
                          {u.role === 'superadmin' ? (
                            <>
                              <ShieldCheck className="w-3 h-3" /> Admin Utama
                            </>
                          ) : (
                            <>
                              <Shield className="w-3 h-3" /> Pengelola
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            u.status === 'active'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
                          }`}
                        >
                          {u.status === 'active' ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-xs text-[var(--mute)]">
                        {u.lastLoginAt
                          ? new Date(u.lastLoginAt).toLocaleString('id-ID', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })
                          : 'Belum pernah'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onEditAdmin(u)}
                            className="p-1.5 rounded-lg border border-[var(--line)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors cursor-pointer"
                            title="Edit peran akun"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleResetPassword(u.email)}
                            className="p-1.5 rounded-lg border border-[var(--line)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors cursor-pointer"
                            title="Kirim email atur ulang kata sandi"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          {!isSelf && (
                            <>
                              <button
                                onClick={() => handleToggleStatus(u.id, u.status)}
                                className={`p-1.5 rounded-lg border border-[var(--line)] transition-colors cursor-pointer ${
                                  u.status === 'active'
                                    ? 'hover:text-amber-600 hover:border-amber-400'
                                    : 'hover:text-emerald-600 hover:border-emerald-400'
                                }`}
                                title={
                                  u.status === 'active'
                                    ? 'Nonaktifkan akun'
                                    : 'Aktifkan akun kembali'
                                }
                              >
                                {u.status === 'active' ? (
                                  <UserX className="w-3.5 h-3.5" />
                                ) : (
                                  <UserCheck className="w-3.5 h-3.5" />
                                )}
                              </button>

                              <button
                                onClick={() => handleDeleteUser(u.id)}
                                className="p-1.5 rounded-lg border border-transparent text-[var(--danger)] hover:bg-[var(--danger-soft)] transition-colors cursor-pointer"
                                title="Hapus akun admin"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 3: AUDIT LOGS */}
      {subTab === 'audit' && (
        <div className="bg-[var(--surface)] border border-[var(--line)] rounded-[14px] p-5 shadow-xs space-y-4">
          <div className="pb-3 border-b border-[var(--line)]">
            <h3 className="text-base sm:text-lg font-bold text-[var(--ink)]">
              Riwayat Aktivitas & Perubahan
            </h3>
            <p className="text-xs text-[var(--mute)]">
              Catatan riwayat perubahan data silsilah dan pengelolaan akun
            </p>
          </div>

          {auditLogs.length === 0 ? (
            <p className="text-xs text-[var(--mute)] text-center py-8">
              Belum ada riwayat aktivitas tercatat.
            </p>
          ) : (
            <div className="divide-y divide-[var(--line)]/50">
              {auditLogs.map((log) => (
                <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs sm:text-sm">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[var(--ink)]">{log.action}</span>
                      <span className="text-[11px] px-1.5 py-0.2 rounded bg-[var(--surface-secondary)] text-[var(--mute)]">
                        {log.type === 'user_management' ? 'Pengguna' : 'Silsilah'}
                      </span>
                    </div>
                    <p className="text-[var(--mute)] text-xs mt-0.5">{log.description}</p>
                  </div>
                  <div className="text-right sm:shrink-0 text-xs text-[var(--mute)]">
                    <span className="font-medium text-[var(--ink)]">{log.performedBy}</span>
                    <span className="block text-[11px]">
                      {new Date(log.timestamp).toLocaleString('id-ID', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 4: GANTI PASSWORD */}
      {subTab === 'password' && (
        <div className="bg-[var(--surface)] border border-[var(--line)] rounded-[14px] p-6 shadow-xs max-w-xl mx-auto space-y-6">
          <div className="pb-4 border-b border-[var(--line)] flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[var(--ink)]">
                Menu Ganti Kata Sandi
              </h3>
              <p className="text-xs text-[var(--mute)]">
                Perbarui kata sandi akun admin untuk menjaga keamanan akses sistem silsilah
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[var(--surface-secondary)] border border-[var(--line)] space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--mute)]">Nama Pengguna:</span>
              <span className="font-semibold text-[var(--ink)]">{adminProfile?.name || 'Administrator'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--mute)]">Username:</span>
              <span className="font-mono text-[var(--ink)]">@{adminProfile?.username || 'admin'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--mute)]">Email Terdaftar:</span>
              <span className="text-[var(--ink)] font-mono">{currentUser?.email || 'admin@silsilah.app'}</span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-[var(--line)]">
              <span className="text-[var(--mute)]">Peran:</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
                {adminProfile?.role === 'superadmin' ? 'Admin Utama' : 'Pengelola'}
              </span>
            </div>
          </div>

          {passMsg && (
            <div
              className={`p-3 text-xs sm:text-sm rounded-xl flex items-center gap-2.5 ${
                passMsg.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800'
              }`}
            >
              {passMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{passMsg.text}</span>
            </div>
          )}

          <form onSubmit={handlePasswordChangeSubmit} className="space-y-4 text-xs sm:text-sm">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-[var(--mute)]">
                  Kata Sandi Baru
                </label>
                <button
                  type="button"
                  onClick={generateRandomPass}
                  className="text-xs text-[var(--accent)] font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Acak Password Aman
                </button>
              </div>

              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  required
                  className="w-full px-3.5 py-2 pr-16 rounded-lg border border-[var(--line)] bg-[var(--bg)] text-sm focus:border-[var(--accent)] focus:outline-none"
                />
                <div className="absolute right-2 top-2 flex items-center gap-1">
                  {newPass && (
                    <button
                      type="button"
                      onClick={copyPasswordToClipboard}
                      className="p-1 text-[var(--mute)] hover:text-[var(--ink)] rounded"
                      title="Salin password ke papan klip"
                    >
                      {passCopied ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="p-1 text-[var(--mute)] hover:text-[var(--ink)] rounded cursor-pointer"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {newPass && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-[var(--mute)]">Kekuatan:</span>
                    <span className="font-semibold text-[var(--ink)]">{passStrength.text}</span>
                  </div>
                  <div className="h-1.5 w-full bg-[var(--line)] rounded-full overflow-hidden flex gap-1">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={`h-full flex-1 rounded-full ${
                          passStrength.score >= step ? passStrength.color : 'bg-transparent'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--mute)] mb-1">
                Konfirmasi Kata Sandi Baru
              </label>
              <input
                type={showPass ? 'text' : 'password'}
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                placeholder="Ulangi kata sandi baru"
                required
                className="w-full px-3.5 py-2 rounded-lg border border-[var(--line)] bg-[var(--bg)] text-sm focus:border-[var(--accent)] focus:outline-none"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={passLoading}
                className="py-2.5 px-5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold text-xs sm:text-sm transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                {passLoading ? 'Menyimpan...' : 'Perbarui Kata Sandi'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
