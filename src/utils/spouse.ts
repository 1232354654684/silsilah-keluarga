import { Member } from '../types';

/**
 * Mengambil objek Member pasangan yang ditautkan melalui spouseMemberId
 */
export function getLinkedSpouse(
  member: Member | null | undefined,
  allMembers: Member[]
): Member | null {
  if (!member || !member.spouseMemberId) return null;
  return allMembers.find((m) => m.id === member.spouseMemberId) || null;
}

/**
 * Mengambil nama tampilan pasangan dengan prioritas:
 * 1. Nama dari anggota yang ditautkan (jika spouseMemberId valid dan profilnya ada)
 * 2. Teks manual member.spouse (jika belum ditautkan ke anggota lain)
 * 3. String kosong jika tidak ada pasangan
 */
export function getSpouseDisplayName(
  member: Member | null | undefined,
  allMembers: Member[]
): string {
  if (!member) return '';
  const linked = getLinkedSpouse(member, allMembers);
  if (linked) return linked.name;
  return (member.spouse || '').trim();
}

/**
 * Menentukan apakah seorang anggota berstatus sebagai "pendamping" (menantu/pasangan sampingan):
 * - isInLaw === true dan spouseMemberId menunjuk ke anggota yang ada.
 * - Data lama tanpa flag: anggota tanpa parentId yang memiliki pasangan tertaut yang punya parentId.
 * - Pasangan leluhur akar (sama-sama tanpa parentId dan tidak ada flag isInLaw):
 *   Anggota dengan tanggal lahir lebih tua (atau ID lebih kecil jika tanggal sama/kosong) menjadi utama,
 *   sedangkan pasangannya menjadi pendamping.
 */
export function isCompanionMember(
  member: Member | null | undefined,
  allMembers: Member[]
): boolean {
  if (!member || !member.spouseMemberId) return false;
  const partner = allMembers.find((p) => p.id === member.spouseMemberId);
  if (!partner) return false;

  // 1. Jika secara eksplisit ditandai isInLaw
  if (member.isInLaw) return true;
  if (partner.isInLaw) return false;

  // 2. Data lama tanpa flag: anggota tanpa parentId yang punya pasangan tertaut yang memiliki parentId
  if (!member.parentId && partner.parentId) return true;
  if (member.parentId && !partner.parentId) return false;

  // 3. Dua leluhur akar (keduanya tanpa parentId)
  if (!member.parentId && !partner.parentId) {
    const dateA = member.birthDate ? member.birthDate.trim() : '';
    const dateB = partner.birthDate ? partner.birthDate.trim() : '';

    if (dateA && dateB && dateA !== dateB) {
      // Yang lebih tua adalah utama (tanggal lebih kecil).
      // Jadi jika dateA > dateB, member lebih muda -> member adalah pendamping!
      return dateA > dateB;
    }
    if (dateA && !dateB) return false;
    if (!dateA && dateB) return true;

    // Jika tanggal sama atau sama-sama kosong, gunakan ID terkecil sebagai utama
    return member.id > partner.id;
  }

  // 4. Jika keduanya punya parentId (misal pernikahan antar cabang):
  return member.id > partner.id;
}

/**
 * Memeriksa apakah dua anggota valid untuk menjadi pasangan:
 * - Tidak boleh diri sendiri (a !== b)
 * - Bukan leluhur langsung atau keturunan langsung dari anggota tersebut (mencegah relasi sedarah / siklus)
 */
export function canBeSpouses(
  a: Member | string | null | undefined,
  b: Member | string | null | undefined,
  allMembers: Member[]
): boolean {
  if (!a || !b) return false;
  const aId = typeof a === 'string' ? a : a.id;
  const bId = typeof b === 'string' ? b : b.id;

  if (aId === bId) return false;

  const memberMap = new Map<string, Member>();
  allMembers.forEach((m) => memberMap.set(m.id, m));

  // Cek apakah 'a' adalah leluhur dari 'b'
  const isAncestor = (ancestorId: string, descendantId: string): boolean => {
    let curr: Member | undefined = memberMap.get(descendantId);
    const visited = new Set<string>();
    while (curr && curr.parentId) {
      if (curr.parentId === ancestorId) return true;
      if (visited.has(curr.parentId)) break; // Cegah loop tak terbatas
      visited.add(curr.parentId);
      curr = memberMap.get(curr.parentId);
    }
    return false;
  };

  if (isAncestor(aId, bId) || isAncestor(bId, aId)) {
    return false;
  }

  return true;
}

export interface SpouseLinkUpdate {
  memberId: string;
  data: {
    spouseMemberId: string | null;
    spouse: string | null;
  };
}

/**
 * Menghasilkan daftar pembaruan dokumen Firestore untuk menjaga tautan pasangan DUA ARAH:
 * - A.spouseMemberId = B & A.spouse = B.name
 * - B.spouseMemberId = A & B.spouse = A.name
 * - Jika A sebelumnya punya pasangan C (C !== B): C.spouseMemberId = null, C.spouse = null
 * - Jika B sebelumnya punya pasangan D (D !== A): D.spouseMemberId = null, D.spouse = null
 * - Jika newSpouseId kosong: putuskan tautan dua arah, A.spouseMemberId = null (A.spouse bisa diisi manualSpouseText)
 */
export function buildSpouseLinkWrites(
  memberId: string,
  newSpouseId: string | null | undefined,
  allMembers: Member[],
  manualSpouseText?: string | null
): SpouseLinkUpdate[] {
  const memberMap = new Map<string, Member>();
  allMembers.forEach((m) => memberMap.set(m.id, m));

  const A = memberMap.get(memberId);
  const updates = new Map<string, { spouseMemberId: string | null; spouse: string | null }>();

  const currentSpouseOfA = A?.spouseMemberId || null;

  if (newSpouseId && newSpouseId.trim() !== '') {
    const BId = newSpouseId.trim();
    const B = memberMap.get(BId);

    if (B && B.id !== memberId) {
      const currentSpouseOfB = B.spouseMemberId || null;

      // Putuskan pasangan lama A jika bukan B
      if (currentSpouseOfA && currentSpouseOfA !== BId) {
        updates.set(currentSpouseOfA, {
          spouseMemberId: null,
          spouse: null,
        });
      }

      // Putuskan pasangan lama B jika bukan A
      if (currentSpouseOfB && currentSpouseOfB !== memberId) {
        updates.set(currentSpouseOfB, {
          spouseMemberId: null,
          spouse: null,
        });
      }

      // Tautkan A ke B
      updates.set(memberId, {
        spouseMemberId: BId,
        spouse: B.name,
      });

      // Tautkan B ke A
      updates.set(BId, {
        spouseMemberId: memberId,
        spouse: A ? A.name : null,
      });
    }
  } else {
    // Putuskan tautan pasangan
    if (currentSpouseOfA) {
      updates.set(currentSpouseOfA, {
        spouseMemberId: null,
        spouse: null,
      });
    }

    updates.set(memberId, {
      spouseMemberId: null,
      spouse: manualSpouseText && manualSpouseText.trim() ? manualSpouseText.trim() : null,
    });
  }

  return Array.from(updates.entries()).map(([mId, data]) => ({
    memberId: mId,
    data,
  }));
}

export type SpouseIssueType =
  | 'name_mismatch'
  | 'one_way_link'
  | 'deleted_target'
  | 'duplicate_link';

export interface SpouseInconsistencyAction {
  label: string;
  description: string;
  variant?: 'primary' | 'secondary' | 'danger';
  updates: SpouseLinkUpdate[];
}

export interface SpouseInconsistency {
  id: string;
  type: SpouseIssueType;
  title: string;
  description: string;
  memberA: Member;
  memberB?: Member | null;
  actions: SpouseInconsistencyAction[];
}

/**
 * Memindai inkonsistensi data pasangan pada seluruh anggota:
 * 1. Teks spouse berbeda dengan nama profil anggota yang ditautkan
 * 2. Tautan satu arah (A menunjuk B, tapi B tidak menunjuk A)
 * 3. spouseMemberId menunjuk anggota yang sudah tidak ada / terhapus
 * 4. Dua anggota atau lebih menunjuk ke pasangan yang sama
 */
export function scanSpouseInconsistencies(allMembers: Member[]): SpouseInconsistency[] {
  const memberMap = new Map<string, Member>();
  allMembers.forEach((m) => memberMap.set(m.id, m));

  const issues: SpouseInconsistency[] = [];
  const processedPairs = new Set<string>();

  // Map untuk mengecek duplikasi tautan ke target yang sama
  const targetToMembersMap = new Map<string, Member[]>();
  allMembers.forEach((m) => {
    if (m.spouseMemberId) {
      const list = targetToMembersMap.get(m.spouseMemberId) || [];
      list.push(m);
      targetToMembersMap.set(m.spouseMemberId, list);
    }
  });

  allMembers.forEach((A) => {
    if (!A.spouseMemberId) return;

    const targetB = memberMap.get(A.spouseMemberId);

    // Kasus 1: Target pasangan tidak ditemukan (sudah dihapus dari Firestore)
    if (!targetB) {
      issues.push({
        id: `deleted_${A.id}`,
        type: 'deleted_target',
        title: `Tautan Pasangan Tidak Ditemukan: ${A.name}`,
        description: `${A.name} memiliki tautan pasangan ke ID "${A.spouseMemberId}", tetapi anggota tersebut sudah tidak ada di database.`,
        memberA: A,
        memberB: null,
        actions: [
          {
            label: 'Lepas tautan (Pertahankan teks nama)',
            description: `Mengosongkan spouseMemberId dan mempertahankan teks "${A.spouse || '-'}" sebagai catatan manual.`,
            variant: 'primary',
            updates: [
              {
                memberId: A.id,
                data: { spouseMemberId: null, spouse: A.spouse || null },
              },
            ],
          },
          {
            label: 'Hapus data pasangan sepenuhnya',
            description: `Mengosongkan spouseMemberId dan teks nama pasangan pada ${A.name}.`,
            variant: 'danger',
            updates: [
              {
                memberId: A.id,
                data: { spouseMemberId: null, spouse: null },
              },
            ],
          },
        ],
      });
      return;
    }

    const pairKey = [A.id, targetB.id].sort().join('___');

    // Kasus 2: Tautan satu arah (A menunjuk B, tapi B tidak menunjuk A)
    if (targetB.spouseMemberId !== A.id) {
      if (!processedPairs.has(pairKey)) {
        processedPairs.add(pairKey);

        const actions: SpouseInconsistencyAction[] = [
          {
            label: 'Buat tautan dua arah',
            description: `Menautkan balik ${targetB.name} ke ${A.name} dan menyamakan nama pasangan pada kedua profil.`,
            variant: 'primary',
            updates: [
              {
                memberId: A.id,
                data: { spouseMemberId: targetB.id, spouse: targetB.name },
              },
              {
                memberId: targetB.id,
                data: { spouseMemberId: A.id, spouse: A.name },
              },
            ],
          },
          {
            label: 'Lepas tautan pada kedua anggota',
            description: `Memutuskan tautan pasangan antara ${A.name} dan ${targetB.name}.`,
            variant: 'secondary',
            updates: [
              {
                memberId: A.id,
                data: { spouseMemberId: null, spouse: A.spouse || null },
              },
              {
                memberId: targetB.id,
                data: { spouseMemberId: null, spouse: targetB.spouse || null },
              },
            ],
          },
        ];

        issues.push({
          id: `oneway_${pairKey}`,
          type: 'one_way_link',
          title: `Tautan Pasangan Satu Arah: ${A.name} ➔ ${targetB.name}`,
          description: `${A.name} menunjuk ${targetB.name} sebagai pasangannya, tetapi ${targetB.name} ${
            targetB.spouseMemberId
              ? `justru menunjuk anggota lain (ID: "${targetB.spouseMemberId}")`
              : 'belum menunjuk pasangan'
          }.`,
          memberA: A,
          memberB: targetB,
          actions,
        });
      }
    } else {
      // Pasangan dua arah, cek apakah teks nama pasangan sinkron
      if (!processedPairs.has(pairKey)) {
        processedPairs.add(pairKey);

        const aNameMismatch = A.spouse !== targetB.name;
        const bNameMismatch = targetB.spouse !== A.name;

        if (aNameMismatch || bNameMismatch) {
          issues.push({
            id: `mismatch_${pairKey}`,
            type: 'name_mismatch',
            title: `Teks Pasangan Tidak Sesuai Profil: ${A.name} & ${targetB.name}`,
            description: `Teks pada kartu/profil (${A.name}: "${A.spouse || '-'}", ${targetB.name}: "${
              targetB.spouse || '-'
            }") tidak sesuai dengan nama profil yang ditautkan.`,
            memberA: A,
            memberB: targetB,
            actions: [
              {
                label: 'Samakan dengan nama profil tertaut',
                description: `Perbarui teks pasangan: ${A.name} ➔ "${targetB.name}" dan ${targetB.name} ➔ "${A.name}".`,
                variant: 'primary',
                updates: [
                  {
                    memberId: A.id,
                    data: { spouseMemberId: targetB.id, spouse: targetB.name },
                  },
                  {
                    memberId: targetB.id,
                    data: { spouseMemberId: A.id, spouse: A.name },
                  },
                ],
              },
              {
                label: 'Lepas tautan (Gunakan teks bebas)',
                description: `Putuskan tautan ID dan biarkan teks pasangan masing-masing berdiri sendiri.`,
                variant: 'secondary',
                updates: [
                  {
                    memberId: A.id,
                    data: { spouseMemberId: null, spouse: A.spouse || null },
                  },
                  {
                    memberId: targetB.id,
                    data: { spouseMemberId: null, spouse: targetB.spouse || null },
                  },
                ],
              },
            ],
          });
        }
      }
    }
  });

  // Kasus 4: Dua anggota atau lebih menunjuk ke pasangan yang sama
  targetToMembersMap.forEach((membersPointingToTarget, targetId) => {
    if (membersPointingToTarget.length > 1) {
      const targetMember = memberMap.get(targetId);
      const names = membersPointingToTarget.map((m) => m.name).join(', ');

      const actions: SpouseInconsistencyAction[] = membersPointingToTarget.map((m) => ({
        label: `Tetapkan hanya untuk ${m.name}`,
        description: `Pertahankan pasangan untuk ${m.name}, dan lepaskan tautan pasangan pada anggota lainnya.`,
        variant: 'secondary',
        updates: [
          {
            memberId: targetId,
            data: { spouseMemberId: m.id, spouse: m.name },
          },
          {
            memberId: m.id,
            data: { spouseMemberId: targetId, spouse: targetMember?.name || null },
          },
          ...membersPointingToTarget
            .filter((other) => other.id !== m.id)
            .map((other) => ({
              memberId: other.id,
              data: { spouseMemberId: null, spouse: other.spouse || null },
            })),
        ],
      }));

      // Opsi lepas semua
      actions.push({
        label: 'Lepas semua tautan pasangan ini',
        description: `Putuskan tautan pasangan dari semua anggota yang berselisih.`,
        variant: 'danger',
        updates: [
          {
            memberId: targetId,
            data: { spouseMemberId: null, spouse: null },
          },
          ...membersPointingToTarget.map((m) => ({
            memberId: m.id,
            data: { spouseMemberId: null, spouse: m.spouse || null },
          })),
        ],
      });

      issues.push({
        id: `duplicate_${targetId}`,
        type: 'duplicate_link',
        title: `Konflik Pasangan Ganda: Menunjuk ${targetMember ? targetMember.name : targetId}`,
        description: `Terdapat ${membersPointingToTarget.length} anggota (${names}) yang semuanya menunjuk ${
          targetMember ? targetMember.name : targetId
        } sebagai pasangannya.`,
        memberA: membersPointingToTarget[0],
        memberB: targetMember || null,
        actions,
      });
    }
  });

  return issues;
}
