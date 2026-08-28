/**
 * Utility functions for handling PDF files, Google Drive links, and fallback viewer engines.
 */

export interface ParsedPdfSource {
  type: 'base64' | 'gdrive' | 'direct_url' | 'fallback';
  viewUrl: string;
  embedUrl: string;
  downloadUrl: string;
  isDirectPdf: boolean;
}

/**
 * Converts various Google Drive link formats to embeddable preview or direct download links.
 */
export function convertGoogleDriveUrl(url: string): { previewUrl: string; downloadUrl: string; fileId: string | null } {
  if (!url) return { previewUrl: '', downloadUrl: '', fileId: null };

  const trimmed = url.trim();

  // Match /file/d/FILE_ID or id=FILE_ID
  const matchFileD = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  const matchIdParam = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  const matchOpenId = trimmed.match(/open\?id=([a-zA-Z0-9_-]+)/);

  const fileId = (matchFileD && matchFileD[1]) || (matchIdParam && matchIdParam[1]) || (matchOpenId && matchOpenId[1]);

  if (fileId) {
    return {
      fileId,
      previewUrl: `https://drive.google.com/file/d/${fileId}/preview`,
      downloadUrl: `https://drive.google.com/uc?export=download&id=${fileId}`
    };
  }

  return {
    fileId: null,
    previewUrl: trimmed,
    downloadUrl: trimmed
  };
}

/**
 * Parses any PDF source (Base64 data URI, Google Drive, Direct HTTP URL, or Cloud link).
 */
export function resolvePdfSource(fileUrl?: string, fileData?: string): ParsedPdfSource {
  // If we have base64 or blob data
  if (fileData && (fileData.startsWith('data:') || fileData.startsWith('blob:'))) {
    return {
      type: 'base64',
      viewUrl: fileData,
      embedUrl: fileData,
      downloadUrl: fileData,
      isDirectPdf: true
    };
  }

  const rawUrl = (fileUrl || '').trim();

  // If Google Drive link
  if (rawUrl.includes('drive.google.com')) {
    const gdrive = convertGoogleDriveUrl(rawUrl);
    return {
      type: 'gdrive',
      viewUrl: gdrive.previewUrl,
      embedUrl: gdrive.previewUrl,
      downloadUrl: gdrive.downloadUrl,
      isDirectPdf: false
    };
  }

  // If direct online URL (Firebase, Cloudinary, AWS S3, etc.)
  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
    // If it is a direct PDF link
    const isPdf = rawUrl.toLowerCase().includes('.pdf');
    return {
      type: 'direct_url',
      viewUrl: rawUrl,
      // Provide Google Docs Viewer as fallback embed for CORS-restricted servers
      embedUrl: isPdf ? `https://docs.google.com/viewer?url=${encodeURIComponent(rawUrl)}&embedded=true` : rawUrl,
      downloadUrl: rawUrl,
      isDirectPdf: isPdf
    };
  }

  return {
    type: 'fallback',
    viewUrl: '',
    embedUrl: '',
    downloadUrl: '',
    isDirectPdf: false
  };
}

/**
 * Format bytes to readable string (e.g. 2.4 MB)
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
