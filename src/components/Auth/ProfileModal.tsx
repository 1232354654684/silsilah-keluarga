import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  X,
  UserCheck,
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, adminProfile, changeMyPassword, logAuditAction } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  const strength = getPasswordStrength(newPassword);

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let res = '';
    res += 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 24)];
    res += 'abcdefghijkmnpqrstuvwxyz'[Math.floor(Math.random() * 24)];
    res += '23456789'[Math.floor(Math.random() * 8)];
    res += '!@#$%'[Math.floor(Math.random() * 5)];
    for (let i = 4; i < 12; i++) {
      res += chars[Math.floor(Math.random() * chars.length)];
    }
    const shuffled = res.split('').sort(() => 0.5 - Math.random()).join('');
    setNewPassword(shuffled);
    setConfirmPassword(shuffled);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(newPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setError('Kata sandi baru minimal 6 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await changeMyPassword(newPassword);
      setSuccess('Kata sandi berhasil diperbarui.');
      setNewPassword('');
      setConfirmPassword('');
      await logAuditAction(
        'user_management',
        'GANTI_PASSWORD',
        `Pengguna ${adminProfile?.name || currentUser?.email} memperbarui kata sandi pribadinya.`
      );
    } catch (err: any) {
      if (err.code === 'auth/requires-recent-login') {
        setError('Sesi telah kedaluwarsa demi keamanan. Silakan keluar dan masuk kembali sebelum mengganti kata sandi.');
      } else {
        setError(err?.message || 'Gagal mengubah kata sandi.');
      }
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
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">Profil Pengelola</h3>
              <p className="text-xs text-[var(--mute)]">Informasi akun dan keamanan</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--mute)] hover:text-[var(--ink)] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Info Details */}
        <div className="my-4 p-4 rounded-xl bg-[var(--surface-secondary)] border border-[var(--line)] space-y-2 text-xs sm:text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--mute)]">Nama Lengkap:</span>
            <span className="font-semibold text-[var(--ink)]">
              {adminProfile?.name || currentUser?.displayName || 'Pengelola'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--mute)]">Username:</span>
            <span className="font-mono text-[var(--ink)]">
              @{adminProfile?.username || 'admin'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--mute)]">Email:</span>
            <span className="text-[var(--ink)]">{currentUser?.email}</span>
          </div>
          <div className="flex justify-between items-center pt-1 border-t border-[var(--line)]">
            <span className="text-[var(--mute)]">Peran:</span>
            <span className="inline-flex items-center gap-1 font-semibold text-xs px-2 py-0.5 rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
              <ShieldCheck className="w-3.5 h-3.5" />
              {adminProfile?.role === 'superadmin' ? 'Admin Utama' : 'Pengelola Silsilah'}
            </span>
          </div>
        </div>

        {/* Change Password Section */}
        <div className="pt-2">
          <h4 className="font-bold text-sm text-[var(--ink)] flex items-center gap-1.5 mb-2">
            <KeyRound className="w-4 h-4 text-[var(--accent)]" />
            Ubah Kata Sandi
          </h4>

          {error && (
            <div className="mb-3 p-3 text-xs bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-3 p-3 text-xs bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-3 text-xs sm:text-sm">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-[var(--mute)]">
                  Kata Sandi Baru
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
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  required
                  className="w-full px-3 py-2 pr-16 rounded-lg border border-[var(--line)] bg-[var(--bg)] text-sm focus:border-[var(--accent)] focus:outline-none"
                />
                <div className="absolute right-2 top-2 flex items-center gap-1">
                  {newPassword && (
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
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password strength meter */}
              {newPassword && (
                <div className="mt-1.5">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-[var(--mute)]">Kekuatan:</span>
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

            <div>
              <label className="block text-xs font-semibold text-[var(--mute)] mb-1">
                Konfirmasi Kata Sandi Baru
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi kata sandi baru"
                required
                className="w-full px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--bg)] text-sm focus:border-[var(--accent)] focus:outline-none"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="submit"
                disabled={loading}
                className="py-2 px-4 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                {loading ? 'Menyimpan...' : 'Perbarui Kata Sandi'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
