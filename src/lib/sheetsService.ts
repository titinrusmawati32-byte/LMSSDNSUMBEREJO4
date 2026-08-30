import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { auth } from './firebase';
import { DigitalBook } from '../types';

// In-memory cache for OAuth Access Token
let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Spreadsheet configuration keys in localStorage
const SPREADSHEET_ID_KEY = 'edusmart_books_spreadsheet_id';
const SHEETS_ENABLED_KEY = 'edusmart_sheets_integration_enabled';

// Setup Google Auth Provider with Scopes
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive');
provider.addScope('https://www.googleapis.com/auth/drive.file');

/**
 * Check if Google Sheets integration is enabled
 */
export function isGoogleSheetsEnabled(): boolean {
  return localStorage.getItem(SHEETS_ENABLED_KEY) === 'true';
}

/**
 * Enable or disable Google Sheets integration
 */
export function setGoogleSheetsEnabled(enabled: boolean) {
  localStorage.setItem(SHEETS_ENABLED_KEY, enabled ? 'true' : 'false');
}

/**
 * Get configured Spreadsheet ID
 */
export function getSpreadsheetId(): string | null {
  return localStorage.getItem(SPREADSHEET_ID_KEY);
}

/**
 * Set Spreadsheet ID
 */
export function setSpreadsheetId(id: string | null) {
  if (id) {
    localStorage.setItem(SPREADSHEET_ID_KEY, id.trim());
  } else {
    localStorage.removeItem(SPREADSHEET_ID_KEY);
  }
}

/**
 * Initialize Google Auth listener
 */
export function initGoogleAuth(
  onSuccess?: (user: User, token: string) => void,
  onFailure?: () => void
) {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      if (cachedAccessToken) {
        if (onSuccess) onSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Token might need a refresh or was not retrieved through popup in this session
        if (onFailure) onFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onFailure) onFailure();
    }
  });
}

/**
 * Trigger Google Sign In with Sheets/Drive scopes
 */
export async function signInWithGoogleSheets(): Promise<{ user: User; accessToken: string } | null> {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan token akses Google Sheets dari Firebase Auth.');
    }
    cachedAccessToken = credential.accessToken;
    setGoogleSheetsEnabled(true);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Sign-in Google Sheets error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
}

/**
 * Log out Google Sheets session
 */
export async function logoutGoogleSheets() {
  cachedAccessToken = null;
  setGoogleSheetsEnabled(false);
  // Optional: do not trigger global firebase signout unless intended, just clear sheet local preference
}

/**
 * Get current cached access token or request it
 */
export async function getSheetsAccessToken(): Promise<string | null> {
  if (cachedAccessToken) return cachedAccessToken;
  
  // Try to silently refresh token if user is signed in with Google
  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      // In Firebase SDK we can re-authenticate or trigger token retrieval, 
      // but for absolute robustness we usually ask the user to click connect if the session expired.
    } catch (e) {
      console.warn('Silent token retrieval skipped:', e);
    }
  }
  return cachedAccessToken;
}

// Columns order in Sheet
const COLUMNS = [
  'id',
  'title',
  'author',
  'subject',
  'totalPages',
  'coverImage',
  'description',
  'fileSize',
  'rating',
  'readCount',
  'fileName',
  'fileUrl',
  'uploadDate',
  'targetClass',
  'teacherInstruction',
  'storageType'
];

/**
 * Create a new Google Spreadsheet for storing digital books
 */
export async function createDigitalBooksSpreadsheet(token: string): Promise<string> {
  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        title: 'EDUSMART_LMS_DIGITAL_BOOKS'
      },
      sheets: [
        {
          properties: {
            title: 'DigitalBooks'
          }
        }
      ]
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Gagal membuat spreadsheet baru: ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const spreadsheetId = data.spreadsheetId;
  
  // Populate Headers
  await writeSpreadsheetHeaders(spreadsheetId, token);
  
  setSpreadsheetId(spreadsheetId);
  return spreadsheetId;
}

/**
 * Helper to write headers to the sheet
 */
async function writeSpreadsheetHeaders(spreadsheetId: string, token: string) {
  const range = 'DigitalBooks!A1:P1';
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        range,
        majorDimension: 'ROWS',
        values: [COLUMNS]
      })
    }
  );

  if (!response.ok) {
    throw new Error('Gagal mengisi baris header spreadsheet.');
  }
}

/**
 * Map a row array from Google Sheet to DigitalBook object
 */
function rowToBook(row: any[]): DigitalBook {
  const book: any = {};
  COLUMNS.forEach((col, idx) => {
    let val = row[idx];
    if (val === undefined || val === null) {
      val = '';
    }
    
    // Parse numeric fields
    if (col === 'totalPages' || col === 'rating' || col === 'readCount' || col === 'fileChunks' || col === 'targetPage') {
      book[col] = val !== '' ? Number(val) : undefined;
    } else {
      book[col] = String(val);
    }
  });
  return book as DigitalBook;
}

/**
 * Map DigitalBook object to a row array
 */
function bookToRow(book: DigitalBook): any[] {
  return COLUMNS.map(col => {
    const val = (book as any)[col];
    return val !== undefined && val !== null ? val : '';
  });
}

/**
 * Fetch all digital books from Google Sheets
 */
export async function fetchBooksFromGoogleSheets(spreadsheetId: string, token: string): Promise<DigitalBook[]> {
  const range = 'DigitalBooks!A2:P1000';
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Spreadsheet atau sheet "DigitalBooks" tidak ditemukan.');
    }
    const err = await response.json().catch(() => ({}));
    throw new Error(`Gagal memuat buku dari Google Sheets: ${err.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const rows = data.values || [];
  return rows.map((row: any[]) => rowToBook(row));
}

/**
 * Write/Sync list of books to Google Sheets (Overwrite entire data A2:P1000)
 */
export async function syncBooksToGoogleSheets(spreadsheetId: string, token: string, books: DigitalBook[]) {
  // 1. Clear existing values
  const clearRange = 'DigitalBooks!A2:P1000';
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${clearRange}:clear`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (books.length === 0) return;

  // 2. Write new values
  const writeRange = `DigitalBooks!A2:P${books.length + 1}`;
  const values = books.map(b => bookToRow(b));
  
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${writeRange}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        range: writeRange,
        majorDimension: 'ROWS',
        values
      })
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Gagal menyinkronkan data buku ke Google Sheets: ${err.error?.message || response.statusText}`);
  }
}

/**
 * Add a digital book to Google Sheets
 */
export async function addBookToGoogleSheets(spreadsheetId: string, token: string, book: DigitalBook) {
  const range = 'DigitalBooks!A:P';
  const values = [bookToRow(book)];
  
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        range,
        majorDimension: 'ROWS',
        values
      })
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Gagal menambahkan buku ke Google Sheets: ${err.error?.message || response.statusText}`);
  }
}

/**
 * Upload a File to Google Drive and return its download/web view link
 */
export async function uploadFileToGoogleDrive(token: string, file: File): Promise<{ fileId: string; webViewUrl: string; webContentUrl: string }> {
  // 1. Create a metadata part and a file content part
  const metadata = {
    name: file.name,
    mimeType: file.type || 'application/pdf',
  };

  const formData = new FormData();
  formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  formData.append('file', file);

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Gagal mengunggah file ke Google Drive: ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  
  // 2. Set file permissions to 'anyone with link can view' so students can view/download it!
  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${data.id}/permissions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone'
      })
    });
  } catch (err) {
    console.warn('Gagal mengatur hak akses berkas di Google Drive:', err);
  }

  return {
    fileId: data.id,
    webViewUrl: data.webViewLink,
    webContentUrl: data.webContentLink || `https://drive.google.com/uc?export=download&id=${data.id}`
  };
}

/**
 * Fetch PDF files from Google Drive (optionally filtered by folder ID)
 */
export async function fetchFilesFromGoogleDrive(token: string, folderId?: string | null): Promise<Array<{ id: string; name: string; webViewLink: string; webContentLink: string; size?: string }>> {
  let q = "mimeType = 'application/pdf' and trashed = false";
  if (folderId) {
    q += ` and '${folderId}' in parents`;
  }
  const encodedQ = encodeURIComponent(q);
  const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodedQ}&fields=files(id,name,webViewLink,webContentLink,size)&pageSize=50`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Gagal membaca berkas dari Google Drive: ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.files || [];
}
