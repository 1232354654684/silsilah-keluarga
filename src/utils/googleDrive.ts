/**
 * Utility to extract Google Drive file ID and convert to direct displayable image URL
 */
export function extractGoogleDriveId(url?: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  // Matching formats:
  // https://drive.google.com/file/d/FILE_ID/view
  // https://drive.google.com/open?id=FILE_ID
  // https://drive.google.com/uc?id=FILE_ID
  // https://drive.google.com/thumbnail?id=FILE_ID
  const matchFile = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchFile && matchFile[1]) return matchFile[1];

  const matchId = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchId && matchId[1]) return matchId[1];

  const matchDirect = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (matchDirect && matchDirect[1]) return matchDirect[1];

  return null;
}

export function getDisplayImageUrl(url?: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  const driveId = extractGoogleDriveId(trimmed);
  if (driveId) {
    // lh3.googleusercontent.com or drive.google.com thumbnail endpoint gives high reliability for images
    return `https://drive.google.com/thumbnail?id=${driveId}&sz=w600`;
  }
  return trimmed;
}

export function isValidHttpUrl(string: string): boolean {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
