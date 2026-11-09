export type Gender = 'male' | 'female' | 'other';
export type AdminRole = 'superadmin' | 'admin';
export type AdminStatus = 'active' | 'inactive';

export interface Member {
  id: string;
  name: string;
  birthPlace?: string | null;
  birthDate?: string | null; // YYYY-MM-DD
  isDeceased?: boolean;
  deathDate?: string | null; // YYYY-MM-DD
  address?: string | null;
  spouse?: string | null;
  spouseMemberId?: string | null; // ID of another member if linked
  isInLaw?: boolean | null; // True = Pasangan dari luar keluarga (menantu), bukan keturunan darah
  parentId?: string | null; // ID of parent or null for root ancestors
  gender?: Gender | null;
  avatarUrl?: string | null; // Google Drive image URL or regular URL
  notes?: string | null;
  hideAddressAndBirth?: boolean; // Privacy setting
  updatedAt?: string;
  updatedBy?: string;
}

export interface NewsItem {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  body: string;
  url?: string; // Google Drive or external link
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface DocItem {
  id: string;
  title: string;
  date?: string; // YYYY-MM-DD
  url: string; // Must start with https://
  note?: string;
  createdAt?: string;
  createdBy?: string;
}

export interface AdminUser {
  id: string; // uid
  name: string;
  username: string;
  email: string;
  role: AdminRole; // 'superadmin' (Admin utama) | 'admin' (Pengelola)
  status: AdminStatus; // 'active' | 'inactive'
  lastLoginAt?: string;
  createdAt?: string;
  createdBy?: string;
}

export interface AuditLogItem {
  id: string;
  type: 'user_management' | 'tree_change' | 'doc_news_change';
  action: string;
  description: string;
  performedBy: string;
  performedByUid?: string;
  performedByRole?: string;
  targetId?: string;
  targetName?: string;
  timestamp: string;
}
