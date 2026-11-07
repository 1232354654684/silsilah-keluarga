import React, { useState } from 'react';
import { AdminRole, AdminUser } from '../../types';
import {
  X,
  UserPlus,
  Key,
  Eye,
  EyeOff,
  RefreshCw,
  Shield,
  ShieldCheck,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';

interface AdminUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    username: string;
    email: string;
    role: AdminRole;
    password?: string;
  }) => Promise<void>;
  userToEdit: AdminUser | null;
}

export const AdminUserModal: React.FC<AdminUserModalProps> = ({
  isOpen,
  onClose,
  onSave,
  userToEdit,
}) => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AdminRole>('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (userToEdit) {
      setName(userToEdit.name || '');
      setUsername(userToEdit.username || '');
      setEmail(userToEdit.email || '');
      setRole(userToEdit.role || 'admin');
      setPassword('');
    } else {
      setName('');
      setUsername('');
      setEmail('');
      setRole('admin');
      setPassword('');
    }
    setError(null);
    setCopied(false);
  }, [userToEdit, isOpen]);

  if (!isOpen) return null;

  // Password strength calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, text: 'Kosong', color: 'bg-stone-300' };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score: 1, text: 'Lemah', color: 'bg-red-500' };
    if (score === 2) return { score: 2, text: 'Cukup', color: 'bg-amber-500' };
    if (score === 3) return { score: 3, text: 'Kuat', color: 'bg-blue-500' };
    return { score: 4, text: 'Sangat Kuat', color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength(password);

  // Generate strong random password
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let res = '';
    // Ensure at least 1 uppercase, 1 lowercase, 1 digit, 1 special
    res += 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 24)];
    res += 'abcdefghijkmnpqrstuvwxyz'[Math.floor(Math.random() * 24)];
    res += '23456789'[Math.floor(Math.random() * 8)];
    res += '!@#$%'[Math.floor(Math.random() * 5)];
    for (let i = 4; i < 12; i++) {
      res += chars[Math.floor(Math.random() * chars.length)];
    }
    // Shuffle
    const shuffled = res.split('').sort(() => 0.5 - Math.random()).join('');
    setPassword(shuffled);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Nama lengkap pengelola wajib diisi.');
      return;
    }
    if (!username.trim()) {
      setError('Username wajib diisi.');
      return;
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(username.trim())) {
      setError('Username hanya boleh huruf, angka, underscore, atau titik.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Alamat email valid wajib diisi.');
      return;
    }

    if (!userToEdit) {
      if (password.length < 8) {
        setError('Password minimal 8 karakter.');
        return;
      }
      if (!/[0-9]/.test(password) || !/[a-zA-Z]/.test(password)) {
        setError('Password wajib mengombinasikan huruf dan angka.');
        return;
      }
    }

    setLoading(true);
    setError(null);
    try {
      await onSave({
        name: name.trim(),
        username: username.toLowerCase().trim(),
        email: email.toLowerCase().trim(),
        role,
        password: password || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Gagal menyimpan akun admin.');
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
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">
                {userToEdit ? 'Edit Pengelola' : 'Tambah Akun Admin Baru'}
              </h3>
              <p className="text-xs text-[var(--mute)]">
                {userToEdit
                  ? 'Perbarui hak akses pengelola'
                  : 'Buat akun pengelola data atau Admin Utama baru'}
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
              Nama Lengkap <span className="text-[var(--danger)]">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Dimas Arya Pratama"
              required
              className="w-full px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--bg)] text-sm focus:border-[var(--accent)] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--mute)] mb-1">
                Username <span className="text-[var(--danger)]">*</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="dimas_arya"
                disabled={!!userToEdit}
                required
                className="w-full px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--bg)] text-sm focus:border-[var(--accent)] focus:outline-none disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--mute)] mb-1">
                Email Pengelola <span className="text-[var(--danger)]">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="dimas@keluarga.com"
                disabled={!!userToEdit}
                required
                className="w-full px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--bg)] text-sm focus:border-[var(--accent)] focus:outline-none disabled:opacity-60"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--mute)] mb-1">
              Peran Hak Akses <span className="text-[var(--danger)]">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-colors ${
                  role === 'admin'
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)]/40'
                    : 'border-[var(--line)] bg-[var(--surface)]'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value="admin"
                  checked={role === 'admin'}
                  onChange={() => setRole('admin')}
                  className="mt-0.5 text-[var(--accent)]"
                />
                <div>
                  <span className="font-semibold block text-[var(--ink)]">Pengelola</span>
                  <span className="text-[11px] text-[var(--mute)]">
                    Mengelola silsilah, berita, dan dokumentasi.
                  </span>
                </div>
              </label>

              <label
                className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-colors ${
                  role === 'superadmin'
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)]/40'
                    : 'border-[var(--line)] bg-[var(--surface)]'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value="superadmin"
                  checked={role === 'superadmin'}
                  onChange={() => setRole('superadmin')}
                  className="mt-0.5 text-[var(--accent)]"
                />
                <div>
                  <span className="font-semibold block text-[var(--ink)]">Admin Utama</span>
                  <span className="text-[11px] text-[var(--mute)]">
                    Akses penuh, termasuk mengelola akun admin lain.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {!userToEdit && (
            <div className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--surface-secondary)]/50 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-[var(--mute)]">
                  Kata Sandi Baru <span className="text-[var(--danger)]">*</span>
                </label>
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  className="text-xs text-[var(--accent)] font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" /> Acak Password
                </button>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 8 karakter (huruf & angka)"
                  required={!userToEdit}
                  className="w-full px-3 py-2 pr-16 rounded-lg border border-[var(--line)] bg-[var(--bg)] text-sm focus:border-[var(--accent)] focus:outline-none"
                />
                <div className="absolute right-2 top-2 flex items-center gap-1">
                  {password && (
                    <button
                      type="button"
                      onClick={copyToClipboard}
                      className="p-1 text-[var(--mute)] hover:text-[var(--ink)] rounded"
                      title="Salin password"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 text-[var(--mute)] hover:text-[var(--ink)] rounded cursor-pointer"
                    title={showPassword ? 'Sembunyikan' : 'Tampilkan'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password strength meter */}
              {password && (
                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-[var(--mute)]">Kekuatan Password:</span>
                    <span className="font-semibold text-[var(--ink)]">{strength.text}</span>
                  </div>
                  <div className="h-1.5 w-full bg-[var(--line)] rounded-full overflow-hidden flex gap-1">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={`h-full flex-1 rounded-full ${
                          strength.score >= step ? strength.color : 'bg-transparent'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

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
              {loading ? 'Menyimpan...' : 'Simpan Akun'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
