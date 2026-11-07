import React, { useState, useEffect } from 'react';
import { Member, Gender } from '../../types';
import { X, Upload, HelpCircle, Eye, EyeOff, Image as ImageIcon, CheckCircle2, AlertCircle } from 'lucide-react';
import { getDisplayImageUrl, getPhotoLinkStatus } from '../../utils/googleDrive';

interface MemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (memberData: Partial<Member>) => Promise<void>;
  memberToEdit: Member | null;
  defaultParentId?: string | null;
  allMembers: Member[];
}

export const MemberModal: React.FC<MemberModalProps> = ({
  isOpen,
  onClose,
  onSave,
  memberToEdit,
  defaultParentId,
  allMembers,
}) => {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [parentId, setParentId] = useState('');
  const [birthPlace, setBirthPlace] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [isDeceased, setIsDeceased] = useState(false);
  const [deathDate, setDeathDate] = useState('');
  const [spouse, setSpouse] = useState('');
  const [spouseMemberId, setSpouseMemberId] = useState('');
  const [address, setAddress] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [hideAddressAndBirth, setHideAddressAndBirth] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);

  // Find all descendants of memberToEdit to prevent cyclic loops
  const forbiddenParentIds = new Set<string>();
  if (memberToEdit) {
    forbiddenParentIds.add(memberToEdit.id);
    const getDescendants = (id: string) => {
      const kids = allMembers.filter((m) => m.parentId === id);
      kids.forEach((k) => {
        forbiddenParentIds.add(k.id);
        getDescendants(k.id);
      });
    };
    getDescendants(memberToEdit.id);
  }

  // Populate or reset form
  useEffect(() => {
    if (memberToEdit) {
      setName(memberToEdit.name || '');
      setGender(memberToEdit.gender || 'male');
      setParentId(memberToEdit.parentId || '');
      setBirthPlace(memberToEdit.birthPlace || '');
      setBirthDate(memberToEdit.birthDate || '');
      setIsDeceased(!!memberToEdit.isDeceased);
      setDeathDate(memberToEdit.deathDate || '');
      setSpouse(memberToEdit.spouse || '');
      setSpouseMemberId(memberToEdit.spouseMemberId || '');
      setAddress(memberToEdit.address || '');
      setAvatarUrl(memberToEdit.avatarUrl || '');
      setNotes(memberToEdit.notes || '');
      setHideAddressAndBirth(!!memberToEdit.hideAddressAndBirth);
    } else {
      setName('');
      setGender('male');
      setParentId(defaultParentId || '');
      setBirthPlace('');
      setBirthDate('');
      setIsDeceased(false);
      setDeathDate('');
      setSpouse('');
      setSpouseMemberId('');
      setAddress('');
      setAvatarUrl('');
      setNotes('');
      setHideAddressAndBirth(false);
    }
    setError(null);
    setSuccessMsg(null);
    setImageLoadFailed(false);
  }, [memberToEdit, defaultParentId, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Nama lengkap wajib diisi.');
      return;
    }

    if (deathDate && birthDate && deathDate < birthDate) {
      setError('Tanggal wafat tidak boleh mendahului tanggal lahir.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const isRoot = !parentId || parentId.trim() === '';
    const cleanParentId = isRoot ? null : parentId.trim();

    try {
      await onSave({
        name: name.trim(),
        gender,
        parentId: cleanParentId,
        birthPlace: birthPlace.trim() || null,
        birthDate: birthDate || null,
        isDeceased,
        deathDate: isDeceased && deathDate ? deathDate : null,
        spouse: spouse.trim() || null,
        spouseMemberId: spouseMemberId.trim() || null,
        address: address.trim() || null,
        avatarUrl: avatarUrl.trim() || null,
        notes: notes.trim() || null,
        hideAddressAndBirth,
      });

      const successText = isRoot
        ? `Anggota keluarga "${name.trim()}" berhasil disimpan sebagai akar pohon!`
        : `Data anggota keluarga "${name.trim()}" berhasil disimpan!`;

      setSuccessMsg(successText);
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err: any) {
      setError(err?.message || 'Gagal menyimpan data anggota keluarga.');
    } finally {
      setLoading(false);
    }
  };

  const previewAvatar = avatarUrl ? getDisplayImageUrl(avatarUrl) : '';
  const photoStatus = getPhotoLinkStatus(avatarUrl);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-[14px] w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col text-[var(--ink)] my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--line)] sticky top-0 bg-[var(--surface)] z-10">
          <div>
            <h3 className="text-lg font-bold">
              {memberToEdit ? 'Edit Data Anggota' : 'Tambah Anggota Keluarga'}
            </h3>
            <p className="text-xs text-[var(--mute)]">
              {memberToEdit
                ? 'Perbarui informasi silsilah anggota keluarga'
                : 'Lengkapi biodata anggota baru untuk ditambahkan ke silsilah'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--mute)] hover:text-[var(--ink)] hover:bg-[var(--surface-secondary)] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="p-3 text-xs sm:text-sm bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-lg flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Nama Lengkap & Jenis Kelamin */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[var(--mute)] mb-1">
                Nama Lengkap <span className="text-[var(--danger)]">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Raden Soedirman"
                required
                className="w-full px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--bg)] text-sm focus:border-[var(--accent)] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--mute)] mb-1">
                Jenis Kelamin
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--bg)] text-sm focus:border-[var(--accent)] focus:outline-none"
              >
                <option value="male">Laki-laki</option>
                <option value="female">Perempuan</option>
                <option value="other">Lainnya</option>
              </select>
            </div>
          </div>

          {/* Orang Tua (Parent) Selector */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-[var(--mute)]">
                Orang Tua dalam Silsilah
              </label>
              {!parentId && (
                <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  Akar Pohon Silsilah
                </span>
              )}
            </div>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--bg)] text-sm focus:border-[var(--accent)] focus:outline-none"
            >
              <option value="">Tidak ada (Akar Pohon / Leluhur Utama)</option>
              {allMembers
                .filter((m) => !forbiddenParentIds.has(m.id))
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} {m.birthDate ? `(${m.birthDate.split('-')[0]})` : ''}
                  </option>
                ))}
            </select>
            <p className="text-[11px] text-[var(--mute)] mt-1">
              * Jika pilihan orang tua tidak dipilih, anggota akan disimpan sebagai akar pohon silsilah (leluhur utama).
            </p>
          </div>

          {/* Tempat & Tanggal Lahir */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--mute)] mb-1">
                Tempat Lahir
              </label>
              <input
                type="text"
                value={birthPlace}
                onChange={(e) => setBirthPlace(e.target.value)}
                placeholder="Contoh: Yogyakarta"
                className="w-full px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--bg)] text-sm focus:border-[var(--accent)] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--mute)] mb-1">
                Tanggal Lahir
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--bg)] text-sm focus:border-[var(--accent)] focus:outline-none"
              />
            </div>
          </div>

          {/* Status Meninggal & Tanggal Wafat */}
          <div className="p-3 rounded-xl border border-[var(--line)] bg-[var(--surface-secondary)]/50 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isDeceased}
                onChange={(e) => setIsDeceased(e.target.checked)}
                className="w-4 h-4 rounded text-[var(--accent)] focus:ring-[var(--accent)]"
              />
              <span className="text-xs sm:text-sm font-medium text-[var(--ink)]">
                Anggota ini telah berpulang (Almarhum / Almarhumah)
              </span>
            </label>

            {isDeceased && (
              <div className="pt-2">
                <label className="block text-xs font-semibold text-[var(--mute)] mb-1">
                  Tanggal Wafat
                </label>
                <input
                  type="date"
                  value={deathDate}
                  onChange={(e) => setDeathDate(e.target.value)}
                  className="w-full sm:w-1/2 px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--bg)] text-sm focus:border-[var(--accent)] focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Pasangan (Nama Teks atau Terhubung ke Member lain) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--mute)] mb-1">
                Nama Pasangan (Teks)
              </label>
              <input
                type="text"
                value={spouse}
                onChange={(e) => setSpouse(e.target.value)}
                placeholder="Contoh: Siti Aminah"
                className="w-full px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--bg)] text-sm focus:border-[var(--accent)] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--mute)] mb-1">
                Atau Hubungkan Pasangan Terdaftar
              </label>
              <select
                value={spouseMemberId}
                onChange={(e) => {
                  setSpouseMemberId(e.target.value);
                  if (e.target.value) {
                    const found = allMembers.find((m) => m.id === e.target.value);
                    if (found && !spouse) setSpouse(found.name);
                  }
                }}
                className="w-full px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--bg)] text-sm focus:border-[var(--accent)] focus:outline-none"
              >
                <option value="">-- Pilih dari anggota lain (opsional) --</option>
                {allMembers
                  .filter((m) => m.id !== memberToEdit?.id)
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Foto Profil Link Google Drive / Image */}
          <div>
            <label className="block text-xs font-semibold text-[var(--mute)] mb-1">
              Foto Profil (Link Google Drive / URL Gambar)
            </label>
            <div className="flex gap-3 items-center">
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => {
                  setAvatarUrl(e.target.value);
                  setImageLoadFailed(false);
                }}
                placeholder="https://drive.google.com/file/d/... atau https://..."
                className="flex-1 px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--bg)] text-sm focus:border-[var(--accent)] focus:outline-none"
              />
              {previewAvatar && (
                <div className="w-10 h-10 rounded-lg overflow-hidden border border-[var(--line)] shrink-0 bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
                  <img
                    src={previewAvatar}
                    alt="Preview"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    className="w-full h-full object-cover"
                    onError={() => setImageLoadFailed(true)}
                    onLoad={() => setImageLoadFailed(false)}
                  />
                </div>
              )}
            </div>

            {/* Teks bantuan di bawah input */}
            <p className="text-[11px] text-[var(--mute)] mt-1.5 leading-relaxed">
              Di Google Drive: klik kanan foto &gt; Bagikan &gt; ubah akses ke &apos;Siapa saja yang memiliki link&apos; &gt; Salin link.
            </p>

            {/* Pesan status validasi link foto */}
            {photoStatus === 'google_photos' && (
              <div className="mt-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <span>
                  Link Google Photos tidak bisa tampil sebagai gambar. Unggah foto ke Google Drive lalu salin link-nya, atau gunakan alamat gambar langsung.
                </span>
              </div>
            )}

            {photoStatus === 'drive_no_id' && (
              <div className="mt-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <span>
                  Link Google Drive tidak memuat ID file yang dikenali. Pastikan link diperoleh dari menu &apos;Bagikan&apos; &gt; &apos;Salin link&apos;.
                </span>
              </div>
            )}

            {photoStatus === 'invalid' && (
              <div className="mt-2 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                <span>
                  Format link tidak valid. Pastikan link diawali dengan http:// atau https://.
                </span>
              </div>
            )}

            {/* Pesan jika preview gambar gagal dimuat (onError) */}
            {imageLoadFailed && (
              <div className="mt-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <span>
                  Foto tidak bisa dimuat. Pastikan akses file di Drive diatur &apos;Siapa saja yang memiliki link&apos;.
                </span>
              </div>
            )}
          </div>

          {/* Alamat */}
          <div>
            <label className="block text-xs font-semibold text-[var(--mute)] mb-1">
              Alamat Tempat Tinggal
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Contoh: Jl. Malioboro No. 45, Yogyakarta"
              className="w-full px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--bg)] text-sm focus:border-[var(--accent)] focus:outline-none"
            />
          </div>

          {/* Catatan Biografi */}
          <div>
            <label className="block text-xs font-semibold text-[var(--mute)] mb-1">
              Catatan / Riwayat Hidup Singkat
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan keahlian, prestasi, atau kisah keluarga..."
              className="w-full px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--bg)] text-sm focus:border-[var(--accent)] focus:outline-none"
            />
          </div>

          {/* Opsi Privasi Publik */}
          <div className="p-3 rounded-xl border border-[var(--line)] bg-[var(--surface-secondary)]/50">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hideAddressAndBirth}
                onChange={(e) => setHideAddressAndBirth(e.target.checked)}
                className="w-4 h-4 rounded text-[var(--accent)] focus:ring-[var(--accent)]"
              />
              <div>
                <span className="text-xs sm:text-sm font-semibold text-[var(--ink)] flex items-center gap-1.5">
                  <EyeOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  Sembunyikan alamat dan tanggal lahir dari publik
                </span>
                <p className="text-[11px] text-[var(--mute)]">
                  Jika dicentang, pengunjung umum (tanpa login admin) tidak akan melihat tanggal lahir lengkap dan alamat anggota ini.
                </p>
              </div>
            </label>
          </div>

          {/* Buttons */}
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
              {loading ? 'Menyimpan...' : 'Simpan Data'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
