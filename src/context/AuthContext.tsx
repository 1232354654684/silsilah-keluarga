import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updatePassword,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { AdminRole, AdminStatus, AdminUser, AuditLogItem } from '../types';

interface AuthContextType {
  currentUser: User | null;
  adminProfile: AdminUser | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  loading: boolean;
  login: (identity: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  sendResetEmail: (email: string) => Promise<void>;
  changeMyPassword: (newPass: string) => Promise<void>;
  createAdminAccount: (data: {
    name: string;
    username: string;
    email: string;
    role: AdminRole;
  }) => Promise<void>;
  updateAdminAccount: (
    uid: string,
    data: Partial<Pick<AdminUser, 'name' | 'role' | 'status'>>
  ) => Promise<void>;
  deleteAdminAccount: (uid: string) => Promise<void>;
  logAuditAction: (
    type: 'user_management' | 'tree_change' | 'doc_news_change',
    action: string,
    description: string,
    targetId?: string,
    targetName?: string
  ) => Promise<void>;
  rateLimitInfo: {
    attempts: number;
    lockedUntil: number | null;
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const RATE_LIMIT_KEY = 'sk_login_attempts';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes lockout

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [adminProfile, setAdminProfile] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Rate limiting state
  const [rateLimitInfo, setRateLimitInfo] = useState<{
    attempts: number;
    lockedUntil: number | null;
  }>(() => {
    try {
      const stored = localStorage.getItem(RATE_LIMIT_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.lockedUntil && Date.now() < parsed.lockedUntil) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return { attempts: 0, lockedUntil: null };
  });

  const recordFailedAttempt = () => {
    setRateLimitInfo((prev) => {
      const newAttempts = prev.attempts + 1;
      let lockedUntil: number | null = null;
      if (newAttempts >= MAX_FAILED_ATTEMPTS) {
        lockedUntil = Date.now() + LOCKOUT_MS;
      }
      const updated = { attempts: newAttempts, lockedUntil };
      try {
        localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const resetFailedAttempts = () => {
    const updated = { attempts: 0, lockedUntil: null };
    setRateLimitInfo(updated);
    try {
      localStorage.removeItem(RATE_LIMIT_KEY);
    } catch {
      // ignore
    }
  };

  // Listen to Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const profileDoc = await getDoc(doc(db, 'admins', user.uid));
          if (profileDoc.exists()) {
            const data = profileDoc.data() as AdminUser;
            setAdminProfile({ ...data, id: user.uid });
            await updateDoc(doc(db, 'admins', user.uid), {
              lastLoginAt: new Date().toISOString(),
            }).catch(() => {});
          } else {
            const isOwner = user.email === 'ardiansyahroni017@gmail.com' || user.email === 'admin@silsilah.app';
            const fallbackProfile: AdminUser = {
              id: user.uid,
              name: user.email === 'admin@silsilah.app' ? 'Administrator' : user.displayName || (user.email ? user.email.split('@')[0] : 'Admin Utama'),
              username: user.email === 'admin@silsilah.app' ? 'admin' : (user.email ? user.email.split('@')[0].toLowerCase() : 'superadmin'),
              email: user.email || '',
              role: isOwner ? 'superadmin' : 'admin',
              status: 'active',
              lastLoginAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
            };
            await setDoc(doc(db, 'admins', user.uid), fallbackProfile).catch(() => {});
            setAdminProfile(fallbackProfile);
          }
        } catch (err) {
          console.error('Error fetching admin profile:', err);
          if (user.email === 'ardiansyahroni017@gmail.com' || user.email === 'admin@silsilah.app') {
            setAdminProfile({
              id: user.uid,
              name: 'Administrator',
              username: 'admin',
              email: user.email,
              role: 'superadmin',
              status: 'active',
            });
          }
        }
      } else {
        setAdminProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const isAdmin = useMemo(() => {
    if (!currentUser) return false;
    if (currentUser.email === 'ardiansyahroni017@gmail.com' || currentUser.email === 'admin@silsilah.app') return true;
    return !!adminProfile && adminProfile.status === 'active';
  }, [currentUser, adminProfile]);

  const isSuperAdmin = useMemo(() => {
    if (!currentUser) return false;
    if (currentUser.email === 'ardiansyahroni017@gmail.com' || currentUser.email === 'admin@silsilah.app') return true;
    return !!adminProfile && adminProfile.status === 'active' && adminProfile.role === 'superadmin';
  }, [currentUser, adminProfile]);

  // Login with Email OR Username
  const login = async (identity: string, password: string) => {
    if (rateLimitInfo.lockedUntil && Date.now() < rateLimitInfo.lockedUntil) {
      const waitMinutes = Math.ceil((rateLimitInfo.lockedUntil - Date.now()) / 60000);
      throw new Error(
        `Terlalu banyak percobaan gagal. Akun dikunci sementara demi keamanan. Coba lagi dalam ${waitMinutes} menit.`
      );
    }

    const trimmed = identity.trim();
    let emailToUse = trimmed;

    if (!trimmed.includes('@')) {
      if (trimmed.toLowerCase() === 'admin') {
        emailToUse = 'admin@silsilah.app';
      } else {
        const usernameDoc = await getDoc(doc(db, 'usernames', trimmed.toLowerCase())).catch((err) => {
          handleFirestoreError(err, OperationType.GET, `usernames/${trimmed.toLowerCase()}`);
        });
        if (usernameDoc && usernameDoc.exists()) {
          const uData = usernameDoc.data();
          if (uData?.email) {
            emailToUse = uData.email;
          } else {
            recordFailedAttempt();
            throw new Error('Username tidak ditemukan.');
          }
        } else {
          const adminsSnap = await getDocs(collection(db, 'admins')).catch(() => null);
          let found = false;
          if (adminsSnap) {
            adminsSnap.forEach((docItem) => {
              const data = docItem.data();
              if (data.username && data.username.toLowerCase() === trimmed.toLowerCase()) {
                emailToUse = data.email;
                found = true;
              }
            });
          }
          if (!found) {
            recordFailedAttempt();
            throw new Error('Username tidak ditemukan.');
          }
        }
      }
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, emailToUse, password);
      resetFailedAttempts();

      const profileSnap = await getDoc(doc(db, 'admins', userCredential.user.uid));
      if (profileSnap.exists()) {
        const data = profileSnap.data() as AdminUser;
        if (data.status === 'inactive' && data.email !== 'ardiansyahroni017@gmail.com' && data.email !== 'admin@silsilah.app') {
          await signOut(auth);
          throw new Error('Akun Anda dinonaktifkan oleh Admin Utama. Hubungi administrator.');
        }
      }
    } catch (err: any) {
      recordFailedAttempt();
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        throw new Error('Password salah. Silakan periksa kembali kata sandi Anda.');
      } else if (err.code === 'auth/user-not-found') {
        throw new Error('Pengguna dengan email ini tidak ditemukan.');
      } else if (err.code === 'auth/too-many-requests') {
        throw new Error('Terlalu banyak percobaan masuk yang gagal. Silakan tunggu beberapa saat.');
      }
      throw err;
    }
  };

  const logout = async () => {
    await signOut(auth);
    setAdminProfile(null);
  };

  const sendResetEmail = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  };

  const changeMyPassword = async (newPass: string) => {
    if (!auth.currentUser) throw new Error('Tidak ada pengguna yang sedang masuk.');
    await updatePassword(auth.currentUser, newPass);
  };

  const logAuditAction = async (
    type: 'user_management' | 'tree_change' | 'doc_news_change',
    action: string,
    description: string,
    targetId?: string,
    targetName?: string
  ) => {
    try {
      const logId = 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      const logItem: AuditLogItem = {
        id: logId,
        type,
        action,
        description,
        performedBy: adminProfile?.name || currentUser?.email || 'Admin',
        performedByUid: currentUser?.uid,
        performedByRole: adminProfile?.role || (isSuperAdmin ? 'superadmin' : 'admin'),
        targetId,
        targetName,
        timestamp: new Date().toISOString(),
      };
      await setDoc(doc(db, 'audit_logs', logId), logItem);
    } catch (e) {
      console.warn('Gagal mencatat log audit:', e);
    }
  };

  const createAdminAccount = async (data: {
    name: string;
    username: string;
    email: string;
    role: AdminRole;
  }) => {
    if (!isSuperAdmin) throw new Error('Hanya Admin Utama yang berhak membuat akun admin baru.');

    const cleanUsername = data.username.toLowerCase().trim();
    const cleanEmail = data.email.toLowerCase().trim();

    const usernameSnap = await getDoc(doc(db, 'usernames', cleanUsername));
    if (usernameSnap.exists()) {
      throw new Error(`Username "${cleanUsername}" sudah digunakan oleh pengelola lain.`);
    }

    const pseudoUid = 'u_' + cleanUsername.replace(/[^a-z0-9]/g, '_');
    const newProfile: AdminUser = {
      id: pseudoUid,
      name: data.name.trim(),
      username: cleanUsername,
      email: cleanEmail,
      role: data.role,
      status: 'active',
      createdAt: new Date().toISOString(),
      createdBy: adminProfile?.name || currentUser?.email || 'Admin Utama',
    };

    await setDoc(doc(db, 'admins', pseudoUid), newProfile);
    await setDoc(doc(db, 'usernames', cleanUsername), {
      username: cleanUsername,
      email: cleanEmail,
      uid: pseudoUid,
    });

    await logAuditAction(
      'user_management',
      'TAMBAH_AKUN',
      `Menambahkan akun admin baru "${data.name}" (${cleanUsername}) sebagai ${
        data.role === 'superadmin' ? 'Admin Utama' : 'Pengelola'
      }`,
      pseudoUid,
      data.name
    );
  };

  const updateAdminAccount = async (
    uid: string,
    data: Partial<Pick<AdminUser, 'name' | 'role' | 'status'>>
  ) => {
    if (!isSuperAdmin) throw new Error('Hanya Admin Utama yang berhak mengubah status akun admin.');

    if (currentUser?.uid === uid && data.status === 'inactive') {
      throw new Error('Anda tidak dapat menonaktifkan akun Anda sendiri.');
    }
    if (currentUser?.uid === uid && data.role === 'admin' && adminProfile?.role === 'superadmin') {
      throw new Error('Anda tidak dapat menurunkan peran akun Anda sendiri.');
    }

    if (data.status === 'inactive' || data.role === 'admin') {
      const snap = await getDocs(collection(db, 'admins'));
      let superAdminCount = 0;
      snap.forEach((d) => {
        const item = d.data() as AdminUser;
        if (item.role === 'superadmin' && item.status === 'active' && d.id !== uid) {
          superAdminCount++;
        }
      });
      if (superAdminCount === 0) {
        throw new Error('Harus selalu tersisa minimal satu Admin Utama yang aktif.');
      }
    }

    await updateDoc(doc(db, 'admins', uid), data);
    await logAuditAction(
      'user_management',
      'UBAH_AKUN',
      `Memperbarui profil/status admin ID ${uid}: ${JSON.stringify(data)}`,
      uid
    );
  };

  const deleteAdminAccount = async (uid: string) => {
    if (!isSuperAdmin) throw new Error('Hanya Admin Utama yang berhak menghapus akun admin.');

    if (currentUser?.uid === uid) {
      throw new Error('Anda tidak dapat menghapus akun Anda sendiri.');
    }

    const targetDoc = await getDoc(doc(db, 'admins', uid));
    if (targetDoc.exists()) {
      const targetData = targetDoc.data() as AdminUser;
      if (targetData.role === 'superadmin') {
        const snap = await getDocs(collection(db, 'admins'));
        let superAdminCount = 0;
        snap.forEach((d) => {
          const item = d.data() as AdminUser;
          if (item.role === 'superadmin' && item.status === 'active' && d.id !== uid) {
            superAdminCount++;
          }
        });
        if (superAdminCount === 0) {
          throw new Error('Tidak bisa menghapus akun: Harus selalu tersisa minimal satu Admin Utama aktif.');
        }
      }

      if (targetData.username) {
        await deleteDoc(doc(db, 'usernames', targetData.username.toLowerCase())).catch(() => {});
      }
    }

    await deleteDoc(doc(db, 'admins', uid));
    await logAuditAction(
      'user_management',
      'HAPUS_AKUN',
      `Menghapus akun admin ID ${uid}`,
      uid
    );
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        adminProfile,
        isAdmin,
        isSuperAdmin,
        loading,
        login,
        logout,
        sendResetEmail,
        changeMyPassword,
        createAdminAccount,
        updateAdminAccount,
        deleteAdminAccount,
        logAuditAction,
        rateLimitInfo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
