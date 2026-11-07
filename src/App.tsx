/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { FamilyTree } from './components/FamilyTree/FamilyTree';
import { MemberModal } from './components/FamilyTree/MemberModal';
import { MoveParentModal } from './components/FamilyTree/MoveParentModal';
import { NewsSection } from './components/News/NewsSection';
import { NewsModal } from './components/News/NewsModal';
import { DocsSection } from './components/Docs/DocsSection';
import { DocsModal } from './components/Docs/DocsModal';
import { AdminDashboard } from './components/Admin/AdminDashboard';
import { AdminUserModal } from './components/Admin/AdminUserModal';
import { LoginModal } from './components/Auth/LoginModal';
import { ProfileModal } from './components/Auth/ProfileModal';
import { Member, NewsItem, DocItem, AdminUser, AuditLogItem } from './types';
import {
  INITIAL_SAMPLE_MEMBERS,
  INITIAL_SAMPLE_DOCS,
  INITIAL_SAMPLE_NEWS,
} from './utils/sampleData';
import { cleanData, cleanMemberData } from './utils/cleanData';
import { CheckCircle2, AlertCircle } from 'lucide-react';

function MainApp() {
  const {
    currentUser,
    adminProfile,
    isAdmin,
    createAdminAccount,
    updateAdminAccount,
    deleteAdminAccount,
    sendResetEmail,
    logAuditAction,
  } = useAuth();

  // Dark mode
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('sk_theme');
      if (stored) return stored === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      if (darkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('sk_theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('sk_theme', 'light');
      }
    } catch {
      // ignore
    }
  }, [darkMode]);

  // Main navigation tab
  const [activeTab, setActiveTab] = useState<'tree' | 'news' | 'docs' | 'admin'>('tree');

  // Firestore Data State
  const [members, setMembers] = useState<Member[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [docsList, setDocsList] = useState<DocItem[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);

  // Selected member in tree
  const [focusedMemberId, setFocusedMemberId] = useState<string | null>(null);

  // Modals state
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<Member | null>(null);
  const [defaultParentId, setDefaultParentId] = useState<string | null | undefined>(undefined);

  const [isMoveParentModalOpen, setIsMoveParentModalOpen] = useState(false);
  const [memberToMove, setMemberToMove] = useState<Member | null>(null);

  const [isNewsModalOpen, setIsNewsModalOpen] = useState(false);
  const [newsToEdit, setNewsToEdit] = useState<NewsItem | null>(null);

  const [isDocsModalOpen, setIsDocsModalOpen] = useState(false);
  const [docToEdit, setDocToEdit] = useState<DocItem | null>(null);

  const [isAdminUserModalOpen, setIsAdminUserModalOpen] = useState(false);
  const [adminUserToEdit, setAdminUserToEdit] = useState<AdminUser | null>(null);

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Real-time Firestore listeners
  useEffect(() => {
    const unsubMembers = onSnapshot(
      collection(db, 'members'),
      (snapshot) => {
        const list: Member[] = [];
        snapshot.forEach((d) => list.push(d.data() as Member));
        setMembers(list);
      },
      (error) => {
        console.warn('Members read error:', error);
      }
    );

    const unsubNews = onSnapshot(
      collection(db, 'news'),
      (snapshot) => {
        const list: NewsItem[] = [];
        snapshot.forEach((d) => list.push(d.data() as NewsItem));
        setNews(list);
      },
      (error) => {
        console.warn('News read error:', error);
      }
    );

    const unsubDocs = onSnapshot(
      collection(db, 'docs'),
      (snapshot) => {
        const list: DocItem[] = [];
        snapshot.forEach((d) => list.push(d.data() as DocItem));
        setDocsList(list);
      },
      (error) => {
        console.warn('Docs read error:', error);
      }
    );

    return () => {
      unsubMembers();
      unsubNews();
      unsubDocs();
    };
  }, []);

  // Listen to Admin users & Audit logs only when admin is signed in
  useEffect(() => {
    if (!isAdmin) {
      setAdminUsers([]);
      setAuditLogs([]);
      return;
    }

    const unsubAdmins = onSnapshot(
      collection(db, 'admins'),
      (snapshot) => {
        const list: AdminUser[] = [];
        snapshot.forEach((d) => list.push(d.data() as AdminUser));
        setAdminUsers(list);
      },
      (error) => {
        console.warn('Admins read error:', error);
      }
    );

    const unsubLogs = onSnapshot(
      collection(db, 'audit_logs'),
      (snapshot) => {
        const list: AuditLogItem[] = [];
        snapshot.forEach((d) => list.push(d.data() as AuditLogItem));
        list.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        setAuditLogs(list);
      },
      (error) => {
        console.warn('Audit logs read error:', error);
      }
    );

    return () => {
      unsubAdmins();
      unsubLogs();
    };
  }, [isAdmin]);

  // Load sample data into Firestore if desired
  const handleLoadSampleData = async () => {
    try {
      const batch = writeBatch(db);

      INITIAL_SAMPLE_MEMBERS.forEach((m) => {
        batch.set(doc(db, 'members', m.id), cleanMemberData(m));
      });

      INITIAL_SAMPLE_NEWS.forEach((n) => {
        batch.set(doc(db, 'news', n.id), cleanData(n));
      });

      INITIAL_SAMPLE_DOCS.forEach((d) => {
        batch.set(doc(db, 'docs', d.id), cleanData(d));
      });

      await batch.commit();

      setToast({
        type: 'success',
        message: 'Dataset contoh silsilah keluarga berhasil dimuat!',
      });
      setTimeout(() => setToast(null), 4000);

      if (isAdmin) {
        await logAuditAction(
          'tree_change',
          'MUAT_CONTOH',
          'Memuat dataset contoh silsilah keluarga, berita, dan dokumentasi.'
        );
      }
    } catch (err: any) {
      alert('Gagal memuat data contoh: ' + (err?.message || 'Error'));
    }
  };

  // MEMBER ACTIONS
  const handleSaveMember = async (memberData: Partial<Member>) => {
    const isEdit = !!memberToEdit;
    const memberId = isEdit
      ? memberToEdit.id
      : 'm_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

    const rawMember = {
      ...(memberToEdit || {}),
      ...memberData,
      id: memberId,
      name: (memberData.name || memberToEdit?.name || '').trim(),
      updatedAt: new Date().toISOString(),
      updatedBy: adminProfile?.name || currentUser?.email || 'Admin',
    };

    const cleanedMember = cleanMemberData(rawMember) as Member;

    await setDoc(doc(db, 'members', memberId), cleanedMember);

    if (cleanedMember.parentId && !isEdit) {
      setFocusedMemberId(cleanedMember.parentId);
    }

    const isRoot = !cleanedMember.parentId;
    setToast({
      type: 'success',
      message: isRoot
        ? `Anggota silsilah "${cleanedMember.name}" berhasil disimpan sebagai akar pohon!`
        : `Data anggota silsilah "${cleanedMember.name}" berhasil disimpan!`,
    });
    setTimeout(() => setToast(null), 4000);

    await logAuditAction(
      'tree_change',
      isEdit ? 'EDIT_ANGGOTA' : 'TAMBAH_ANGGOTA',
      `${isEdit ? 'Memperbarui' : 'Menambahkan'} anggota silsilah "${cleanedMember.name}"`,
      memberId,
      cleanedMember.name
    );
  };

  const handleDeleteMember = async (member: Member) => {
    const hasChildren = members.some((m) => m.parentId === member.id);
    if (hasChildren) {
      alert('Tidak dapat menghapus anggota yang masih memiliki keturunan/anak. Hapus atau pindahkan anak-anaknya terlebih dahulu.');
      return;
    }

    await deleteDoc(doc(db, 'members', member.id));

    if (focusedMemberId === member.id) {
      setFocusedMemberId(member.parentId || null);
    }

    await logAuditAction(
      'tree_change',
      'HAPUS_ANGGOTA',
      `Menghapus anggota silsilah "${member.name}"`,
      member.id,
      member.name
    );
  };

  const handleSaveMoveParent = async (memberId: string, newParentId: string | null) => {
    const target = members.find((m) => m.id === memberId);
    if (!target) return;

    const updatePayload = cleanData({
      parentId: newParentId && newParentId.trim() !== '' ? newParentId.trim() : null,
      updatedAt: new Date().toISOString(),
      updatedBy: adminProfile?.name || currentUser?.email || 'Admin',
    });

    await updateDoc(doc(db, 'members', memberId), updatePayload);

    const parentName = newParentId
      ? members.find((m) => m.id === newParentId)?.name || 'Leluhur Tertua'
      : 'Leluhur Tertua (Akar Pohon)';

    setToast({
      type: 'success',
      message: `Orang tua "${target.name}" berhasil dipindahkan ke "${parentName}".`,
    });
    setTimeout(() => setToast(null), 4000);

    await logAuditAction(
      'tree_change',
      'PINDAH_ORANG_TUA',
      `Memindahkan orang tua dari "${target.name}" ke "${parentName}"`,
      memberId,
      target.name
    );
  };

  // NEWS ACTIONS
  const handleSaveNews = async (newsData: Partial<NewsItem>) => {
    const isEdit = !!newsToEdit;
    const newsId = isEdit
      ? newsToEdit.id
      : 'n_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

    const fullNews = cleanData({
      ...(newsToEdit || {}),
      ...newsData,
      id: newsId,
      title: (newsData.title || '').trim(),
      date: newsData.date || new Date().toISOString().split('T')[0],
      body: newsData.body || '',
      updatedAt: new Date().toISOString(),
      createdBy: isEdit ? newsToEdit?.createdBy : adminProfile?.name || currentUser?.email || 'Admin',
    });

    await setDoc(doc(db, 'news', newsId), fullNews);
    setToast({
      type: 'success',
      message: `Berita "${fullNews.title}" berhasil disimpan!`,
    });
    setTimeout(() => setToast(null), 4000);

    await logAuditAction(
      'doc_news_change',
      isEdit ? 'EDIT_BERITA' : 'TAMBAH_BERITA',
      `${isEdit ? 'Memperbarui' : 'Menerbitkan'} berita kegiatan: "${fullNews.title}"`,
      newsId,
      fullNews.title
    );
  };

  const handleDeleteNews = async (id: string) => {
    const target = news.find((n) => n.id === id);
    await deleteDoc(doc(db, 'news', id));
    await logAuditAction(
      'doc_news_change',
      'HAPUS_BERITA',
      `Menghapus berita kegiatan "${target?.title || id}"`,
      id,
      target?.title
    );
  };

  // DOCS ACTIONS
  const handleSaveDoc = async (docData: Partial<DocItem>) => {
    const isEdit = !!docToEdit;
    const docId = isEdit
      ? docToEdit.id
      : 'd_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

    const fullDoc = cleanData({
      ...(docToEdit || {}),
      ...docData,
      id: docId,
      title: (docData.title || '').trim(),
      url: (docData.url || '').trim(),
      createdAt: isEdit ? docToEdit?.createdAt : new Date().toISOString(),
      createdBy: isEdit ? docToEdit?.createdBy : adminProfile?.name || currentUser?.email || 'Admin',
    });

    await setDoc(doc(db, 'docs', docId), fullDoc);
    setToast({
      type: 'success',
      message: `Dokumentasi "${fullDoc.title}" berhasil disimpan!`,
    });
    setTimeout(() => setToast(null), 4000);

    await logAuditAction(
      'doc_news_change',
      isEdit ? 'EDIT_DOKUMENTASI' : 'TAMBAH_DOKUMENTASI',
      `${isEdit ? 'Memperbarui' : 'Menambahkan'} dokumentasi: "${fullDoc.title}"`,
      docId,
      fullDoc.title
    );
  };

  const handleDeleteDoc = async (id: string) => {
    const target = docsList.find((d) => d.id === id);
    await deleteDoc(doc(db, 'docs', id));
    await logAuditAction(
      'doc_news_change',
      'HAPUS_DOKUMENTASI',
      `Menghapus dokumentasi kegiatan "${target?.title || id}"`,
      id,
      target?.title
    );
  };

  // ADMIN USER ACTIONS (SUPERADMIN)
  const handleSaveAdminUser = async (data: {
    name: string;
    username: string;
    email: string;
    role: any;
  }) => {
    if (adminUserToEdit) {
      await updateAdminAccount(adminUserToEdit.id, {
        name: data.name,
        role: data.role,
      });
    } else {
      await createAdminAccount({
        name: data.name,
        username: data.username,
        email: data.email,
        role: data.role,
      });
    }
  };

  const handleToggleAdminStatus = async (uid: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
    await updateAdminAccount(uid, { status: nextStatus });
  };

  const handleDeleteAdmin = async (uid: string) => {
    await deleteAdminAccount(uid);
  };

  const handleResetAdminPassword = async (email: string) => {
    await sendResetEmail(email);
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] flex flex-col transition-colors duration-200 relative">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 animate-in fade-in slide-in-from-top-3 duration-200 max-w-sm pointer-events-auto">
          <div
            className={`p-3.5 rounded-xl shadow-xl border flex items-center gap-2.5 text-xs sm:text-sm font-medium ${
              toast.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/90 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                : 'bg-red-50 dark:bg-red-950/90 border-red-300 dark:border-red-800 text-red-800 dark:text-red-200'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        members={members}
        onSelectMember={(id) => {
          setFocusedMemberId(id);
          setActiveTab('tree');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'tree' && (
          <FamilyTree
            members={members}
            isAdmin={isAdmin}
            focusedMemberId={focusedMemberId}
            setFocusedMemberId={setFocusedMemberId}
            onAddMember={(parentId) => {
              setMemberToEdit(null);
              setDefaultParentId(parentId);
              setIsMemberModalOpen(true);
            }}
            onEditMember={(m) => {
              setMemberToEdit(m);
              setDefaultParentId(m.parentId);
              setIsMemberModalOpen(true);
            }}
            onMoveParent={(m) => {
              setMemberToMove(m);
              setIsMoveParentModalOpen(true);
            }}
            onDeleteMember={handleDeleteMember}
            onLoadSampleData={members.length === 0 ? handleLoadSampleData : undefined}
          />
        )}

        {activeTab === 'news' && (
          <NewsSection
            news={news}
            isAdmin={isAdmin}
            onAddNews={() => {
              setNewsToEdit(null);
              setIsNewsModalOpen(true);
            }}
            onEditNews={(item) => {
              setNewsToEdit(item);
              setIsNewsModalOpen(true);
            }}
            onDeleteNews={handleDeleteNews}
          />
        )}

        {activeTab === 'docs' && (
          <DocsSection
            docs={docsList}
            isAdmin={isAdmin}
            onAddDoc={() => {
              setDocToEdit(null);
              setIsDocsModalOpen(true);
            }}
            onEditDoc={(item) => {
              setDocToEdit(item);
              setIsDocsModalOpen(true);
            }}
            onDeleteDoc={handleDeleteDoc}
          />
        )}

        {activeTab === 'admin' && isAdmin && (
          <AdminDashboard
            members={members}
            docs={docsList}
            news={news}
            adminUsers={adminUsers}
            auditLogs={auditLogs}
            onAddMember={() => {
              setMemberToEdit(null);
              setDefaultParentId(undefined);
              setIsMemberModalOpen(true);
            }}
            onEditMember={(m) => {
              setMemberToEdit(m);
              setDefaultParentId(m.parentId);
              setIsMemberModalOpen(true);
            }}
            onDeleteMember={handleDeleteMember}
            onViewInTree={(id) => {
              setFocusedMemberId(id);
              setActiveTab('tree');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onAddDoc={() => {
              setDocToEdit(null);
              setIsDocsModalOpen(true);
            }}
            onAddNews={() => {
              setNewsToEdit(null);
              setIsNewsModalOpen(true);
            }}
            onOpenCreateAdmin={() => {
              setAdminUserToEdit(null);
              setIsAdminUserModalOpen(true);
            }}
            onEditAdmin={(user) => {
              setAdminUserToEdit(user);
              setIsAdminUserModalOpen(true);
            }}
            onToggleAdminStatus={handleToggleAdminStatus}
            onDeleteAdmin={handleDeleteAdmin}
            onResetAdminPassword={handleResetAdminPassword}
          />
        )}
      </main>

      <footer className="mt-auto border-t border-[var(--line)] py-6 text-center text-xs text-[var(--mute)]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} Silsilah Keluarga Besar. Seluruh hak cipta dilindungi.</p>
          <p>
            {isAdmin ? (
              <span className="text-[var(--accent)] font-semibold">
                Masuk sebagai: {adminProfile?.role === 'superadmin' ? 'Admin Utama' : 'Pengelola'} (
                {adminProfile?.name || currentUser?.email})
              </span>
            ) : (
              <span>Halaman publik dapat diakses siapapun untuk melihat silsilah dan kabar keluarga.</span>
            )}
          </p>
        </div>
      </footer>

      {/* MODALS */}
      <MemberModal
        isOpen={isMemberModalOpen}
        onClose={() => {
          setIsMemberModalOpen(false);
          setMemberToEdit(null);
        }}
        onSave={handleSaveMember}
        memberToEdit={memberToEdit}
        defaultParentId={defaultParentId}
        allMembers={members}
      />

      <MoveParentModal
        isOpen={isMoveParentModalOpen}
        onClose={() => {
          setIsMoveParentModalOpen(false);
          setMemberToMove(null);
        }}
        member={memberToMove}
        allMembers={members}
        onSaveParent={handleSaveMoveParent}
      />

      <NewsModal
        isOpen={isNewsModalOpen}
        onClose={() => {
          setIsNewsModalOpen(false);
          setNewsToEdit(null);
        }}
        onSave={handleSaveNews}
        newsToEdit={newsToEdit}
      />

      <DocsModal
        isOpen={isDocsModalOpen}
        onClose={() => {
          setIsDocsModalOpen(false);
          setDocToEdit(null);
        }}
        onSave={handleSaveDoc}
        docToEdit={docToEdit}
      />

      <AdminUserModal
        isOpen={isAdminUserModalOpen}
        onClose={() => {
          setIsAdminUserModalOpen(false);
          setAdminUserToEdit(null);
        }}
        onSave={handleSaveAdminUser}
        userToEdit={adminUserToEdit}
      />

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
