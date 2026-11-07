import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  X,
  LogIn,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Lock,
  Sparkles,
} from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { login, sendResetEmail, rateLimitInfo } = useAuth();
  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const isLocked =
    rateLimitInfo.lockedUntil !== null && Date.now() < rateLimitInfo.lockedUntil;
  const lockMinutes = isLocked
    ? Math.ceil((rateLimitInfo.lockedUntil! - Date.now()) / 60000)
    : 0;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identity.trim()) {
      setError('Masukkan username atau email Anda.');
      return;
    }
    if (!password) {
      setError('Masukkan kata sandi.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await login(identity, password);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Gagal masuk. Periksa kembali username/email dan password.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim() || !resetEmail.includes('@')) {
      setError('Masukkan alamat email yang valid.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await sendResetEmail(resetEmail.trim());
      setSuccessMsg(`Tautan reset password telah dikirim ke ${resetEmail}. Silakan periksa kotak masuk atau spam.`);
    } catch (err: any) {
      setError(err?.message || 'Gagal mengirim email reset kata sandi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-[14px] w-full max-w-md shadow-2xl p-6 text-[var(--ink)] animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
              <LogIn className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">
                {isForgotPassword ? 'Atur Ulang Kata Sandi' : 'Masuk Pengelola'}
              </h3>
              <p className="text-xs text-[var(--mute)]">
                {isForgotPassword
                  ? 'Kirimkan instruksi pemulihan ke email Anda'
                  : 'Akses khusus Admin Utama dan Pengelola Silsilah'}
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

        {/* Lockout Warning */}
        {isLocked && (
          <div className="mt-4 p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl text-xs flex items-start gap-2.5">
            <Lock className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <b className="block">Akun Dikunci Sementara</b>
              Terlalu banyak percobaan masuk yang salah (5 kali). Demi keamanan, silakan coba lagi dalam {lockMinutes} menit.
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mt-4 p-3 text-xs bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success message */}
        {successMsg && (
          <div className="mt-4 p-3 text-xs bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Login Form */}
        {!isForgotPassword ? (
          <form onSubmit={handleLoginSubmit} className="mt-4 space-y-4 text-xs sm:text-sm">
            <div>
              <label className="block text-xs font-semibold text-[var(--mute)] mb-1">
                Username atau Alamat Email
              </label>
              <input
                type="text"
                value={identity}
                onChange={(e) => setIdentity(e.target.value)}
                placeholder="Contoh: admin atau nama@keluarga.com"
                disabled={isLocked || loading}
                required
                className="w-full px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--bg)] text-sm focus:border-[var(--accent)] focus:outline-none disabled:opacity-60"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-[var(--mute)]">
                  Kata Sandi
                </label>
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(true)}
                  className="text-xs text-[var(--accent)] hover:underline cursor-pointer"
                >
                  Lupa kata sandi?
                </button>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isLocked || loading}
                  required
                  className="w-full px-3 py-2 pr-10 rounded-lg border border-[var(--line)] bg-[var(--bg)] text-sm focus:border-[var(--accent)] focus:outline-none disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-2.5 text-[var(--mute)] hover:text-[var(--ink)] cursor-pointer"
                  title={showPassword ? 'Sembunyikan' : 'Tampilkan'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLocked || loading}
                className="w-full py-2.5 px-4 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold text-xs sm:text-sm shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Memeriksa...' : 'Masuk ke Dashboard'}
              </button>
            </div>
          </form>
        ) : (
          /* Forgot Password Form */
          <form onSubmit={handleResetSubmit} className="mt-4 space-y-4 text-xs sm:text-sm">
            <p className="text-xs text-[var(--mute)]">
              Masukkan email yang terdaftar pada akun Anda. Kami akan mengirimkan tautan untuk membuat kata sandi baru.
            </p>

            <div>
              <label className="block text-xs font-semibold text-[var(--mute)] mb-1">
                Alamat Email Terdaftar
              </label>
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="nama@keluarga.com"
                required
                className="w-full px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--bg)] text-sm focus:border-[var(--accent)] focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="text-xs text-[var(--mute)] hover:text-[var(--ink)] font-medium cursor-pointer"
              >
                ← Kembali ke Halaman Masuk
              </button>
              <button
                type="submit"
                disabled={loading}
                className="py-2 px-4 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                {loading ? 'Mengirim...' : 'Kirim Tautan'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
