/**
 * Utility helper to clean and sanitize objects before writing to Firestore.
 * 
 * Rules:
 * 1. Firestore rejects `undefined` values ("Unsupported field value: undefined").
 * 2. `cleanData()` recursively traverses objects and transforms any `undefined` value into `null`.
 * 3. `cleanMemberData()` specifically normalizes Member entities so that:
 *    - `parentId` is `null` if empty/undefined (root ancestor).
 *    - Optional fields (spouse, spouseMemberId, birthPlace, birthDate, deathDate, address, avatarUrl, notes)
 *      are set to `null` if empty/undefined.
 *    - Booleans (isDeceased, hideAddressAndBirth) default to boolean values.
 */

export function cleanData<T extends Record<string, any>>(obj: T): T {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return (obj === undefined ? null : obj) as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => cleanData(item)) as unknown as T;
  }

  const result: Record<string, any> = {};

  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined) {
      result[key] = null;
    } else if (val !== null && typeof val === 'object' && !(val instanceof Date)) {
      result[key] = cleanData(val);
    } else {
      result[key] = val;
    }
  }

  return result as T;
}

/**
 * Specifically cleans, normalizes, and validates a Member object for Firestore storage.
 */
export function cleanMemberData(raw: Record<string, any>): Record<string, any> {
  const normalizeStringOrNull = (val: any): string | null => {
    if (val === undefined || val === null) return null;
    if (typeof val === 'string') {
      const trimmed = val.trim();
      return trimmed === '' ? null : trimmed;
    }
    return String(val);
  };

  const isDeceased = Boolean(raw.isDeceased);

  const normalized: Record<string, any> = {
    ...raw,
    id: typeof raw.id === 'string' && raw.id ? raw.id : '',
    name: typeof raw.name === 'string' ? raw.name.trim() : '',
    gender: raw.gender === 'female' || raw.gender === 'other' ? raw.gender : 'male',
    // Specifically set parentId to null if not present or empty string
    parentId: normalizeStringOrNull(raw.parentId),
    // Optional details normalized to null if empty
    birthPlace: normalizeStringOrNull(raw.birthPlace),
    birthDate: normalizeStringOrNull(raw.birthDate),
    isDeceased,
    deathDate: isDeceased ? normalizeStringOrNull(raw.deathDate) : null,
    spouse: normalizeStringOrNull(raw.spouse),
    spouseMemberId: normalizeStringOrNull(raw.spouseMemberId),
    address: normalizeStringOrNull(raw.address),
    avatarUrl: normalizeStringOrNull(raw.avatarUrl),
    notes: normalizeStringOrNull(raw.notes),
    hideAddressAndBirth: Boolean(raw.hideAddressAndBirth),
    updatedAt: raw.updatedAt || new Date().toISOString(),
    updatedBy: raw.updatedBy || 'Admin',
  };

  return cleanData(normalized);
}
