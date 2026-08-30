import { 
  getDoc,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  query,
  disableNetwork,
  setLogLevel
} from "firebase/firestore";
import { db, storage } from './firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { 
  isGoogleSheetsEnabled, 
  getSpreadsheetId, 
  getSheetsAccessToken, 
  fetchBooksFromGoogleSheets, 
  syncBooksToGoogleSheets, 
  addBookToGoogleSheets 
} from './sheetsService';
import { 
  LearningMaterial,
  QuizExam,
  DigitalBook,
  LearningVideo,
  UserProfile,
  SystemAnnouncement,
  AttendanceRecord,
  ClassSchedule,
  StudentQuizSubmission,
  SchoolSettings,
  ContentLearningProgress
} from '../types';
import { 
  MOCK_MATERIALS,
  MOCK_QUIZZES,
  MOCK_BOOKS,
  MOCK_VIDEOS,
  MOCK_USERS,
  MOCK_ANNOUNCEMENTS,
  MOCK_SCHEDULES,
  DEFAULT_SCHOOL_SETTINGS
} from '../data/mockData';

const MATERIALS_COL = 'materials';
const QUIZZES_COL = 'quizzes';
const BOOKS_COL = 'books';
const VIDEOS_COL = 'videos';
const USERS_COL = 'users';
const ANNOUNCEMENTS_COL = 'announcements';
const ATTENDANCE_COL = 'attendance';
const SCHEDULES_COL = 'schedules';
const SUBMISSIONS_COL = 'quiz_submissions';
const SETTINGS_COL = 'settings';
const STUDENT_PROGRESS_COL = 'student_progress';

const DELETED_IDS_KEY = 'edusmart_lms_deleted_ids';
const SETTINGS_LOCAL_KEY = 'edusmart_lms_school_settings';
const SEED_FLAG_KEY = 'edusmart_db_seeded_v3';

// Quota and Error Circuit Breaker
const QUOTA_EXCEEDED_KEY = 'edusmart_quota_exceeded_flag';
const QUOTA_TIMESTAMP_KEY = 'edusmart_quota_exceeded_timestamp';

let isQuotaExceeded = false;
if (typeof window !== 'undefined') {
  try {
    const flag = localStorage.getItem(QUOTA_EXCEEDED_KEY);
    const timestamp = localStorage.getItem(QUOTA_TIMESTAMP_KEY);
    if (flag === 'true' && timestamp) {
      const elapsed = Date.now() - parseInt(timestamp, 10);
      // Keep the quota exceeded state if elapsed time is less than 12 hours
      if (elapsed < 43200000) {
        isQuotaExceeded = true;
        try {
          setLogLevel('silent');
        } catch {}
        disableNetwork(db).catch(console.error);
        console.warn('[EduSmart LMS] Firestore daily write quota limit previously reached. Loaded in offline-first mode.');
      } else {
        localStorage.removeItem(QUOTA_EXCEEDED_KEY);
        localStorage.removeItem(QUOTA_TIMESTAMP_KEY);
        try {
          setLogLevel('silent');
        } catch {}
      }
    } else {
      try {
        setLogLevel('silent');
      } catch {}
    }
  } catch (e) {
    console.error('Error reading quota state from localStorage', e);
  }
}

export function isFirestoreQuotaExceeded(): boolean {
  return isQuotaExceeded;
}

export function handleFirestoreError(err: any, context?: string): boolean {
  if (!err) return false;
  const msg = String(err?.message || err || '');
  const code = String(err?.code || '');
  
  if (
    code === 'resource-exhausted' ||
    msg.includes('resource-exhausted') ||
    msg.includes('Quota limit exceeded') ||
    msg.includes('Quota exceeded') ||
    msg.includes('Free daily write units')
  ) {
    if (!isQuotaExceeded) {
      isQuotaExceeded = true;
      try {
        setLogLevel('silent');
      } catch {}
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(QUOTA_EXCEEDED_KEY, 'true');
          localStorage.setItem(QUOTA_TIMESTAMP_KEY, Date.now().toString());
        } catch (e) {
          console.error('Error saving quota state to localStorage', e);
        }
      }
      disableNetwork(db).catch(console.error);
      console.warn(
        `[EduSmart LMS] Firestore daily write quota limit reached (${context || 'operation'}). Automatically active local-first cache mode. All LMS features, readings, quiz, and lessons work uninterrupted.`
      );
    }
    return true;
  }
  return false;
}

function cleanData(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(cleanData);
  const result: any = {};
  for (const key of Object.keys(obj)) {
    if (obj[key] !== undefined) {
      result[key] = cleanData(obj[key]);
    }
  }
  return result;
}

// Local Cache Helpers
function getLocalCache<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(`edusmart_cache_${key}`);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function setLocalCache<T>(key: string, items: T[]) {
  try {
    localStorage.setItem(`edusmart_cache_${key}`, JSON.stringify(items));
  } catch (e) {
    // If local storage is full (e.g., big Base64 files), keep lightweight cache
    try {
      if (Array.isArray(items)) {
        const lightweight = items.slice(0, 50);
        localStorage.setItem(`edusmart_cache_${key}`, JSON.stringify(lightweight));
      }
    } catch {}
  }
}

// Subscribers Dispatcher for Offline / Local-first state synchronization
type SubCallback<T> = (items: T) => void;
const localSubscribers: Record<string, Set<SubCallback<any>>> = {
  materials: new Set(),
  quizzes: new Set(),
  books: new Set(),
  videos: new Set(),
  users: new Set(),
  announcements: new Set(),
  schedules: new Set(),
  attendance: new Set(),
  submissions: new Set(),
  settings: new Set(),
};

function notifyLocalSubscribers(key: string, data: any) {
  const subs = localSubscribers[key];
  if (subs) {
    subs.forEach(cb => {
      try { cb(data); } catch {}
    });
  }
}

export function getDeletedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_IDS_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

export function markIdAsDeleted(id: string) {
  try {
    const set = getDeletedIds();
    set.add(id);
    localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {
    console.error('Failed to mark deleted id:', e);
  }
}

export function unmarkIdAsDeleted(id: string) {
  try {
    const set = getDeletedIds();
    set.delete(id);
    localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {
    console.error('Failed to unmark deleted id:', e);
  }
}

export const OLD_DEFAULT_USER_IDS = ['usr-2', 'usr-3', 'usr-4', 'usr-5'];

export async function purgeDefaultUsersFromDb() {
  const deletedSet = getDeletedIds();
  for (const id of OLD_DEFAULT_USER_IDS) {
    markIdAsDeleted(id);
    if (!isQuotaExceeded) {
      try {
        await deleteDoc(doc(db, USERS_COL, id));
      } catch (err) {
        handleFirestoreError(err, 'purgeDefaultUsers');
      }
    }
  }
}

// Helper to seed database gently only once
export async function seedInitialDataIfEmpty() {
  if (typeof window === 'undefined') return;

  // Initialize local cache if not yet loaded
  if (!localStorage.getItem(`edusmart_cache_${MATERIALS_COL}`)) {
    setLocalCache(MATERIALS_COL, MOCK_MATERIALS);
  }
  if (!localStorage.getItem(`edusmart_cache_${QUIZZES_COL}`)) {
    setLocalCache(QUIZZES_COL, MOCK_QUIZZES);
  }
  if (!localStorage.getItem(`edusmart_cache_${BOOKS_COL}`)) {
    setLocalCache(BOOKS_COL, MOCK_BOOKS);
  }
  if (!localStorage.getItem(`edusmart_cache_${VIDEOS_COL}`)) {
    setLocalCache(VIDEOS_COL, MOCK_VIDEOS);
  }
  if (!localStorage.getItem(`edusmart_cache_${USERS_COL}`)) {
    setLocalCache(USERS_COL, MOCK_USERS);
  }
  if (!localStorage.getItem(`edusmart_cache_${ANNOUNCEMENTS_COL}`)) {
    setLocalCache(ANNOUNCEMENTS_COL, MOCK_ANNOUNCEMENTS);
  }
  if (!localStorage.getItem(`edusmart_cache_${SCHEDULES_COL}`)) {
    setLocalCache(SCHEDULES_COL, MOCK_SCHEDULES);
  }

  // If already seeded or quota is exceeded, do not perform expensive write sweeps
  if (localStorage.getItem(SEED_FLAG_KEY) || isQuotaExceeded) {
    return;
  }

  const deletedSet = getDeletedIds();

  try {
    const usersSnap = await getDocs(collection(db, USERS_COL));
    const existingIds = new Set(usersSnap.docs.map(d => d.id));
    for (const item of MOCK_USERS) {
      if (!deletedSet.has(item.id) && !OLD_DEFAULT_USER_IDS.includes(item.id) && !existingIds.has(item.id)) {
        await setDoc(doc(db, USERS_COL, item.id), cleanData(item));
      }
    }
    localStorage.setItem(SEED_FLAG_KEY, 'true');
  } catch (err) {
    handleFirestoreError(err, 'seedInitialData');
    localStorage.setItem(SEED_FLAG_KEY, 'true');
  }
}

// Reset all database data to fresh default deployment state
export async function resetAllDatabaseData() {
  try {
    localStorage.removeItem(DELETED_IDS_KEY);
    localStorage.removeItem(SEED_FLAG_KEY);
  } catch {}

  setLocalCache(MATERIALS_COL, MOCK_MATERIALS);
  setLocalCache(QUIZZES_COL, MOCK_QUIZZES);
  setLocalCache(BOOKS_COL, MOCK_BOOKS);
  setLocalCache(VIDEOS_COL, MOCK_VIDEOS);
  setLocalCache(USERS_COL, MOCK_USERS);
  setLocalCache(ANNOUNCEMENTS_COL, MOCK_ANNOUNCEMENTS);
  setLocalCache(SCHEDULES_COL, MOCK_SCHEDULES);
  setLocalCache(ATTENDANCE_COL, []);
  setLocalCache(SUBMISSIONS_COL, []);

  notifyLocalSubscribers('materials', MOCK_MATERIALS);
  notifyLocalSubscribers('quizzes', MOCK_QUIZZES);
  notifyLocalSubscribers('books', MOCK_BOOKS);
  notifyLocalSubscribers('videos', MOCK_VIDEOS);
  notifyLocalSubscribers('users', MOCK_USERS);
  notifyLocalSubscribers('announcements', MOCK_ANNOUNCEMENTS);
  notifyLocalSubscribers('schedules', MOCK_SCHEDULES);

  if (isQuotaExceeded) return;

  const collectionsToClear = [
    MATERIALS_COL,
    QUIZZES_COL,
    BOOKS_COL,
    VIDEOS_COL,
    USERS_COL,
    ANNOUNCEMENTS_COL,
    ATTENDANCE_COL,
    SCHEDULES_COL
  ];

  for (const colName of collectionsToClear) {
    try {
      const snap = await getDocs(collection(db, colName));
      for (const d of snap.docs) {
        await deleteDoc(doc(db, colName, d.id));
      }
    } catch (err) {
      handleFirestoreError(err, `clear_${colName}`);
    }
  }

  // Re-seed default clean state
  try {
    for (const item of MOCK_MATERIALS) await setDoc(doc(db, MATERIALS_COL, item.id), cleanData(item));
    for (const item of MOCK_QUIZZES) await setDoc(doc(db, QUIZZES_COL, item.id), cleanData(item));
    for (const item of MOCK_BOOKS) await setDoc(doc(db, BOOKS_COL, item.id), cleanData(item));
    for (const item of MOCK_VIDEOS) await setDoc(doc(db, VIDEOS_COL, item.id), cleanData(item));
    for (const item of MOCK_USERS) await setDoc(doc(db, USERS_COL, item.id), cleanData(item));
    for (const item of MOCK_ANNOUNCEMENTS) await setDoc(doc(db, ANNOUNCEMENTS_COL, item.id), cleanData(item));
    for (const item of MOCK_SCHEDULES) await setDoc(doc(db, SCHEDULES_COL, item.id), cleanData(item));
  } catch (err) {
    handleFirestoreError(err, 'reset_reseed');
  }
}

// ----------------------------------------------------------------------
// Materials
// ----------------------------------------------------------------------
export function subscribeMaterials(callback: (items: LearningMaterial[]) => void) {
  localSubscribers['materials'].add(callback);
  const deletedSet = getDeletedIds();
  const initial = getLocalCache(MATERIALS_COL, MOCK_MATERIALS).filter(m => !deletedSet.has(m.id));
  callback(initial);

  if (isQuotaExceeded) {
    return () => {
      localSubscribers['materials'].delete(callback);
    };
  }

  const q = query(collection(db, MATERIALS_COL));
  const unsub = onSnapshot(q, (snapshot) => {
    const currentDeleted = getDeletedIds();
    const items: LearningMaterial[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data() as LearningMaterial;
      if (!currentDeleted.has(data.id)) {
        items.push(data);
      }
    });
    if (items.length > 0) {
      setLocalCache(MATERIALS_COL, items);
      callback(items);
    } else if (snapshot.empty) {
      const fallback = MOCK_MATERIALS.filter(m => !currentDeleted.has(m.id));
      callback(fallback);
    } else {
      callback([]);
    }
  }, (err) => {
    handleFirestoreError(err, 'materials_subscribe');
    const currentDeleted = getDeletedIds();
    const fallback = getLocalCache(MATERIALS_COL, MOCK_MATERIALS).filter(m => !currentDeleted.has(m.id));
    callback(fallback);
  });

  return () => {
    localSubscribers['materials'].delete(callback);
    unsub();
  };
}

function getStorageUrl(id: string): string | null {
  return storageUrls[id] || (typeof window !== 'undefined' ? localStorage.getItem(`edusmart_storage_url_${id}`) : null);
}

export async function addMaterialToDb(material: LearningMaterial) {
  unmarkIdAsDeleted(material.id);
  const storageUrl = getStorageUrl(material.id);
  if (storageUrl) {
    material.fileUrl = storageUrl;
  }
  const current = getLocalCache<LearningMaterial>(MATERIALS_COL, MOCK_MATERIALS).filter(m => m.id !== material.id);
  const updated = [material, ...current];
  setLocalCache(MATERIALS_COL, updated);
  notifyLocalSubscribers('materials', updated);

  if (isQuotaExceeded) return;
  try {
    await setDoc(doc(db, MATERIALS_COL, material.id), cleanData(material));
  } catch (err) {
    handleFirestoreError(err, 'addMaterialToDb');
  }
}

export async function updateMaterialInDb(material: LearningMaterial) {
  unmarkIdAsDeleted(material.id);
  const storageUrl = getStorageUrl(material.id);
  if (storageUrl) {
    material.fileUrl = storageUrl;
  }
  const current = getLocalCache<LearningMaterial>(MATERIALS_COL, MOCK_MATERIALS);
  const index = current.findIndex(m => m.id === material.id);
  let updated: LearningMaterial[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = { ...updated[index], ...material };
  } else {
    updated = [material, ...current];
  }
  setLocalCache(MATERIALS_COL, updated);
  notifyLocalSubscribers('materials', updated);

  if (isQuotaExceeded) return;
  try {
    await setDoc(doc(db, MATERIALS_COL, material.id), cleanData(material), { merge: true });
  } catch (err) {
    handleFirestoreError(err, 'updateMaterialInDb');
  }
}

export async function deleteMaterialFromDb(id: string) {
  markIdAsDeleted(id);
  const current = getLocalCache<LearningMaterial>(MATERIALS_COL, MOCK_MATERIALS);
  const updated = current.filter(m => m.id !== id);
  setLocalCache(MATERIALS_COL, updated);
  notifyLocalSubscribers('materials', updated);

  if (isQuotaExceeded) return;
  try {
    await deleteDoc(doc(db, MATERIALS_COL, id));
    for (let i = 0; i < 60; i++) {
      const chunkId = `${id}_chunk_${i}`;
      deleteDoc(doc(db, 'file_chunks', chunkId)).catch(() => {});
    }
  } catch (err) {
    handleFirestoreError(err, 'deleteMaterialFromDb');
  }
}

// ----------------------------------------------------------------------
// Quizzes
// ----------------------------------------------------------------------
export function subscribeQuizzes(callback: (items: QuizExam[]) => void) {
  localSubscribers['quizzes'].add(callback);
  const deletedSet = getDeletedIds();
  const initial = getLocalCache(QUIZZES_COL, MOCK_QUIZZES).filter(q => !deletedSet.has(q.id));
  callback(initial);

  if (isQuotaExceeded) {
    return () => {
      localSubscribers['quizzes'].delete(callback);
    };
  }

  const q = query(collection(db, QUIZZES_COL));
  const unsub = onSnapshot(q, (snapshot) => {
    const currentDeleted = getDeletedIds();
    const items: QuizExam[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data() as QuizExam;
      if (!currentDeleted.has(data.id)) {
        items.push(data);
      }
    });
    if (items.length > 0) {
      setLocalCache(QUIZZES_COL, items);
      callback(items);
    } else if (snapshot.empty) {
      callback(MOCK_QUIZZES.filter(q => !currentDeleted.has(q.id)));
    } else {
      callback([]);
    }
  }, (err) => {
    handleFirestoreError(err, 'quizzes_subscribe');
    const currentDeleted = getDeletedIds();
    callback(getLocalCache(QUIZZES_COL, MOCK_QUIZZES).filter(q => !currentDeleted.has(q.id)));
  });

  return () => {
    localSubscribers['quizzes'].delete(callback);
    unsub();
  };
}

export async function addQuizToDb(quiz: QuizExam) {
  unmarkIdAsDeleted(quiz.id);
  const current = getLocalCache<QuizExam>(QUIZZES_COL, MOCK_QUIZZES).filter(q => q.id !== quiz.id);
  const updated = [quiz, ...current];
  setLocalCache(QUIZZES_COL, updated);
  notifyLocalSubscribers('quizzes', updated);

  if (isQuotaExceeded) return;
  try {
    await setDoc(doc(db, QUIZZES_COL, quiz.id), cleanData(quiz));
  } catch (err) {
    handleFirestoreError(err, 'addQuizToDb');
  }
}

export async function updateQuizInDb(quiz: QuizExam) {
  unmarkIdAsDeleted(quiz.id);
  const current = getLocalCache<QuizExam>(QUIZZES_COL, MOCK_QUIZZES);
  const index = current.findIndex(q => q.id === quiz.id);
  let updated: QuizExam[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = { ...updated[index], ...quiz };
  } else {
    updated = [quiz, ...current];
  }
  setLocalCache(QUIZZES_COL, updated);
  notifyLocalSubscribers('quizzes', updated);

  if (isQuotaExceeded) return;
  try {
    await setDoc(doc(db, QUIZZES_COL, quiz.id), cleanData(quiz), { merge: true });
  } catch (err) {
    handleFirestoreError(err, 'updateQuizInDb');
  }
}

export async function deleteQuizFromDb(id: string) {
  markIdAsDeleted(id);
  const current = getLocalCache<QuizExam>(QUIZZES_COL, MOCK_QUIZZES);
  const updated = current.filter(q => q.id !== id);
  setLocalCache(QUIZZES_COL, updated);
  notifyLocalSubscribers('quizzes', updated);

  if (isQuotaExceeded) return;
  try {
    await deleteDoc(doc(db, QUIZZES_COL, id));
  } catch (err) {
    handleFirestoreError(err, 'deleteQuizFromDb');
  }
}

// ----------------------------------------------------------------------
// Books
// ----------------------------------------------------------------------
export function subscribeBooks(callback: (items: DigitalBook[]) => void) {
  localSubscribers['books'].add(callback);
  const deletedSet = getDeletedIds();
  const initial = getLocalCache(BOOKS_COL, MOCK_BOOKS).filter(b => !deletedSet.has(b.id));
  callback(initial);

  // Async load from Google Sheets if enabled
  if (isGoogleSheetsEnabled()) {
    const spreadsheetId = getSpreadsheetId();
    if (spreadsheetId) {
      getSheetsAccessToken().then(token => {
        if (token) {
          fetchBooksFromGoogleSheets(spreadsheetId, token)
            .then(books => {
              const currentDeleted = getDeletedIds();
              const activeBooks = books.filter(b => !currentDeleted.has(b.id));
              setLocalCache(BOOKS_COL, activeBooks);
              callback(activeBooks);
            })
            .catch(err => {
              console.warn('Gagal memuat buku dari Google Sheets:', err);
            });
        }
      }).catch(() => {});
    }
    // Return unsubscribe function for local subscriber
    return () => {
      localSubscribers['books'].delete(callback);
    };
  }

  if (isQuotaExceeded) {
    return () => {
      localSubscribers['books'].delete(callback);
    };
  }

  const q = query(collection(db, BOOKS_COL));
  const unsub = onSnapshot(q, (snapshot) => {
    const currentDeleted = getDeletedIds();
    const items: DigitalBook[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data() as DigitalBook;
      if (!currentDeleted.has(data.id)) {
        items.push(data);
      }
    });
    if (items.length > 0) {
      setLocalCache(BOOKS_COL, items);
      callback(items);
    } else if (snapshot.empty) {
      callback(MOCK_BOOKS.filter(b => !currentDeleted.has(b.id)));
    } else {
      callback([]);
    }
  }, (err) => {
    handleFirestoreError(err, 'books_subscribe');
    const currentDeleted = getDeletedIds();
    callback(getLocalCache(BOOKS_COL, MOCK_BOOKS).filter(b => !currentDeleted.has(b.id)));
  });

  return () => {
    localSubscribers['books'].delete(callback);
    unsub();
  };
}

export async function addBookToDb(book: DigitalBook) {
  unmarkIdAsDeleted(book.id);
  const storageUrl = getStorageUrl(book.id);
  if (storageUrl) {
    book.fileUrl = storageUrl;
  }
  const current = getLocalCache<DigitalBook>(BOOKS_COL, MOCK_BOOKS).filter(b => b.id !== book.id);
  const updated = [book, ...current];
  setLocalCache(BOOKS_COL, updated);
  notifyLocalSubscribers('books', updated);

  if (isGoogleSheetsEnabled()) {
    try {
      const spreadsheetId = getSpreadsheetId();
      const token = await getSheetsAccessToken();
      if (spreadsheetId && token) {
        await addBookToGoogleSheets(spreadsheetId, token, book);
      }
    } catch (err) {
      console.error('Gagal menambahkan buku ke Google Sheets:', err);
    }
    return;
  }

  if (isQuotaExceeded) return;
  try {
    await setDoc(doc(db, BOOKS_COL, book.id), cleanData(book));
  } catch (err) {
    handleFirestoreError(err, 'addBookToDb');
  }
}

export async function updateBookInDb(book: DigitalBook) {
  unmarkIdAsDeleted(book.id);
  const storageUrl = getStorageUrl(book.id);
  if (storageUrl) {
    book.fileUrl = storageUrl;
  }
  const current = getLocalCache<DigitalBook>(BOOKS_COL, MOCK_BOOKS);
  const index = current.findIndex(b => b.id === book.id);
  let updated: DigitalBook[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = { ...updated[index], ...book };
  } else {
    updated = [book, ...current];
  }
  setLocalCache(BOOKS_COL, updated);
  notifyLocalSubscribers('books', updated);

  if (isGoogleSheetsEnabled()) {
    try {
      const spreadsheetId = getSpreadsheetId();
      const token = await getSheetsAccessToken();
      if (spreadsheetId && token) {
        await syncBooksToGoogleSheets(spreadsheetId, token, updated);
      }
    } catch (err) {
      console.error('Gagal memperbarui buku di Google Sheets:', err);
    }
    return;
  }

  if (isQuotaExceeded) return;
  try {
    await setDoc(doc(db, BOOKS_COL, book.id), cleanData(book), { merge: true });
  } catch (err) {
    handleFirestoreError(err, 'updateBookInDb');
  }
}

export async function deleteBookFromDb(id: string) {
  markIdAsDeleted(id);
  const current = getLocalCache<DigitalBook>(BOOKS_COL, MOCK_BOOKS);
  const updated = current.filter(b => b.id !== id);
  setLocalCache(BOOKS_COL, updated);
  notifyLocalSubscribers('books', updated);

  if (isGoogleSheetsEnabled()) {
    try {
      const spreadsheetId = getSpreadsheetId();
      const token = await getSheetsAccessToken();
      if (spreadsheetId && token) {
        await syncBooksToGoogleSheets(spreadsheetId, token, updated);
      }
    } catch (err) {
      console.error('Gagal menghapus buku dari Google Sheets:', err);
    }
    return;
  }

  if (isQuotaExceeded) return;
  try {
    await deleteDoc(doc(db, BOOKS_COL, id));
    for (let i = 0; i < 60; i++) {
      const chunkId = `${id}_chunk_${i}`;
      deleteDoc(doc(db, 'file_chunks', chunkId)).catch(() => {});
    }
  } catch (err) {
    handleFirestoreError(err, 'deleteBookFromDb');
  }
}

// ----------------------------------------------------------------------
// Videos
// ----------------------------------------------------------------------
export function subscribeVideos(callback: (items: LearningVideo[]) => void) {
  localSubscribers['videos'].add(callback);
  const deletedSet = getDeletedIds();
  const initial = getLocalCache(VIDEOS_COL, MOCK_VIDEOS).filter(v => !deletedSet.has(v.id));
  callback(initial);

  if (isQuotaExceeded) {
    return () => {
      localSubscribers['videos'].delete(callback);
    };
  }

  const q = query(collection(db, VIDEOS_COL));
  const unsub = onSnapshot(q, (snapshot) => {
    const currentDeleted = getDeletedIds();
    const items: LearningVideo[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data() as LearningVideo;
      if (!currentDeleted.has(data.id)) {
        items.push(data);
      }
    });
    if (items.length > 0) {
      setLocalCache(VIDEOS_COL, items);
      callback(items);
    } else if (snapshot.empty) {
      callback(MOCK_VIDEOS.filter(v => !currentDeleted.has(v.id)));
    } else {
      callback([]);
    }
  }, (err) => {
    handleFirestoreError(err, 'videos_subscribe');
    const currentDeleted = getDeletedIds();
    callback(getLocalCache(VIDEOS_COL, MOCK_VIDEOS).filter(v => !currentDeleted.has(v.id)));
  });

  return () => {
    localSubscribers['videos'].delete(callback);
    unsub();
  };
}

export async function addVideoToDb(video: LearningVideo) {
  unmarkIdAsDeleted(video.id);
  const current = getLocalCache<LearningVideo>(VIDEOS_COL, MOCK_VIDEOS).filter(v => v.id !== video.id);
  const updated = [video, ...current];
  setLocalCache(VIDEOS_COL, updated);
  notifyLocalSubscribers('videos', updated);

  if (isQuotaExceeded) return;
  try {
    await setDoc(doc(db, VIDEOS_COL, video.id), cleanData(video));
  } catch (err) {
    handleFirestoreError(err, 'addVideoToDb');
  }
}

export async function updateVideoInDb(video: LearningVideo) {
  unmarkIdAsDeleted(video.id);
  const current = getLocalCache<LearningVideo>(VIDEOS_COL, MOCK_VIDEOS);
  const index = current.findIndex(v => v.id === video.id);
  let updated: LearningVideo[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = { ...updated[index], ...video };
  } else {
    updated = [video, ...current];
  }
  setLocalCache(VIDEOS_COL, updated);
  notifyLocalSubscribers('videos', updated);

  if (isQuotaExceeded) return;
  try {
    await setDoc(doc(db, VIDEOS_COL, video.id), cleanData(video), { merge: true });
  } catch (err) {
    handleFirestoreError(err, 'updateVideoInDb');
  }
}

export async function deleteVideoFromDb(id: string) {
  markIdAsDeleted(id);
  const current = getLocalCache<LearningVideo>(VIDEOS_COL, MOCK_VIDEOS);
  const updated = current.filter(v => v.id !== id);
  setLocalCache(VIDEOS_COL, updated);
  notifyLocalSubscribers('videos', updated);

  if (isQuotaExceeded) return;
  try {
    await deleteDoc(doc(db, VIDEOS_COL, id));
  } catch (err) {
    handleFirestoreError(err, 'deleteVideoFromDb');
  }
}

// ----------------------------------------------------------------------
// Users
// ----------------------------------------------------------------------
export function subscribeUsers(callback: (items: UserProfile[]) => void) {
  localSubscribers['users'].add(callback);
  const deletedSet = getDeletedIds();
  const initial = getLocalCache(USERS_COL, MOCK_USERS).filter(u => !deletedSet.has(u.id) && !OLD_DEFAULT_USER_IDS.includes(u.id));
  callback(initial);

  if (isQuotaExceeded) {
    return () => {
      localSubscribers['users'].delete(callback);
    };
  }

  const q = query(collection(db, USERS_COL));
  const unsub = onSnapshot(q, (snapshot) => {
    const currentDeleted = getDeletedIds();
    const firestoreUsersMap = new Map<string, UserProfile>();
    
    snapshot.forEach((doc) => {
      const data = doc.data() as UserProfile;
      if (data && data.id && !currentDeleted.has(data.id) && !OLD_DEFAULT_USER_IDS.includes(data.id)) {
        firestoreUsersMap.set(data.id, {
          ...data,
          role: data.role || 'siswa',
          name: data.name || 'Pengguna',
          identifierNumber: data.identifierNumber || '',
          email: data.email || '',
          avatar: data.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
          status: data.status || 'active'
        });
      }
    });

    const mergedMap = new Map<string, UserProfile>();
    MOCK_USERS.forEach(u => {
      if (!currentDeleted.has(u.id) && !OLD_DEFAULT_USER_IDS.includes(u.id)) {
        mergedMap.set(u.id, u);
      }
    });

    firestoreUsersMap.forEach((user, id) => {
      mergedMap.set(id, user);
    });

    const items = Array.from(mergedMap.values());
    setLocalCache(USERS_COL, items);
    callback(items);
  }, (err) => {
    handleFirestoreError(err, 'users_subscribe');
    const currentDeleted = getDeletedIds();
    callback(getLocalCache(USERS_COL, MOCK_USERS).filter(u => !currentDeleted.has(u.id) && !OLD_DEFAULT_USER_IDS.includes(u.id)));
  });

  return () => {
    localSubscribers['users'].delete(callback);
    unsub();
  };
}

export async function addUserToDb(user: UserProfile) {
  unmarkIdAsDeleted(user.id);
  const current = getLocalCache<UserProfile>(USERS_COL, MOCK_USERS).filter(u => u.id !== user.id);
  const updated = [user, ...current];
  setLocalCache(USERS_COL, updated);
  notifyLocalSubscribers('users', updated);

  if (isQuotaExceeded) return;
  try {
    await setDoc(doc(db, USERS_COL, user.id), cleanData(user));
  } catch (err) {
    handleFirestoreError(err, 'addUserToDb');
  }
}

export async function updateUserInDb(user: UserProfile) {
  unmarkIdAsDeleted(user.id);
  const current = getLocalCache<UserProfile>(USERS_COL, MOCK_USERS);
  const index = current.findIndex(u => u.id === user.id);
  let updated: UserProfile[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = { ...updated[index], ...user };
  } else {
    updated = [user, ...current];
  }
  setLocalCache(USERS_COL, updated);
  notifyLocalSubscribers('users', updated);

  if (isQuotaExceeded) return;
  try {
    const remotePromise = setDoc(doc(db, USERS_COL, user.id), cleanData(user), { merge: true })
      .catch(err => {
        handleFirestoreError(err, 'updateUserInDb_background');
      });

    // Gunakan race dengan timeout 400ms agar UI merespon secara instan
    await Promise.race([
      remotePromise,
      new Promise((resolve) => setTimeout(resolve, 400))
    ]);
  } catch (err) {
    console.warn('Firestore write slow or delayed, saved to local cache:', err);
  }
}

export async function deleteUserFromDb(id: string) {
  markIdAsDeleted(id);
  const current = getLocalCache<UserProfile>(USERS_COL, MOCK_USERS);
  const updated = current.filter(u => u.id !== id);
  setLocalCache(USERS_COL, updated);
  notifyLocalSubscribers('users', updated);

  if (isQuotaExceeded) return;
  try {
    await deleteDoc(doc(db, USERS_COL, id));
  } catch (err) {
    handleFirestoreError(err, 'deleteUserFromDb');
  }
}

// ----------------------------------------------------------------------
// Announcements
// ----------------------------------------------------------------------
export function subscribeAnnouncements(callback: (items: SystemAnnouncement[]) => void) {
  localSubscribers['announcements'].add(callback);
  const deletedSet = getDeletedIds();
  const initial = getLocalCache(ANNOUNCEMENTS_COL, MOCK_ANNOUNCEMENTS).filter(a => !deletedSet.has(a.id));
  callback(initial);

  if (isQuotaExceeded) {
    return () => {
      localSubscribers['announcements'].delete(callback);
    };
  }

  const q = query(collection(db, ANNOUNCEMENTS_COL));
  const unsub = onSnapshot(q, (snapshot) => {
    const currentDeleted = getDeletedIds();
    const items: SystemAnnouncement[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data() as SystemAnnouncement;
      if (!currentDeleted.has(data.id)) {
        items.push(data);
      }
    });
    if (items.length > 0) {
      setLocalCache(ANNOUNCEMENTS_COL, items);
      callback(items);
    } else if (snapshot.empty) {
      callback(MOCK_ANNOUNCEMENTS.filter(a => !currentDeleted.has(a.id)));
    } else {
      callback([]);
    }
  }, (err) => {
    handleFirestoreError(err, 'announcements_subscribe');
    const currentDeleted = getDeletedIds();
    callback(getLocalCache(ANNOUNCEMENTS_COL, MOCK_ANNOUNCEMENTS).filter(a => !currentDeleted.has(a.id)));
  });

  return () => {
    localSubscribers['announcements'].delete(callback);
    unsub();
  };
}

export async function addAnnouncementToDb(announcement: SystemAnnouncement) {
  unmarkIdAsDeleted(announcement.id);
  const current = getLocalCache<SystemAnnouncement>(ANNOUNCEMENTS_COL, MOCK_ANNOUNCEMENTS).filter(a => a.id !== announcement.id);
  const updated = [announcement, ...current];
  setLocalCache(ANNOUNCEMENTS_COL, updated);
  notifyLocalSubscribers('announcements', updated);

  if (isQuotaExceeded) return;
  try {
    await setDoc(doc(db, ANNOUNCEMENTS_COL, announcement.id), cleanData(announcement));
  } catch (err) {
    handleFirestoreError(err, 'addAnnouncementToDb');
  }
}

export async function updateAnnouncementInDb(announcement: SystemAnnouncement) {
  unmarkIdAsDeleted(announcement.id);
  const current = getLocalCache<SystemAnnouncement>(ANNOUNCEMENTS_COL, MOCK_ANNOUNCEMENTS);
  const index = current.findIndex(a => a.id === announcement.id);
  let updated: SystemAnnouncement[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = { ...updated[index], ...announcement };
  } else {
    updated = [announcement, ...current];
  }
  setLocalCache(ANNOUNCEMENTS_COL, updated);
  notifyLocalSubscribers('announcements', updated);

  if (isQuotaExceeded) return;
  try {
    await setDoc(doc(db, ANNOUNCEMENTS_COL, announcement.id), cleanData(announcement), { merge: true });
  } catch (err) {
    handleFirestoreError(err, 'updateAnnouncementInDb');
  }
}

export async function deleteAnnouncementFromDb(id: string) {
  markIdAsDeleted(id);
  const current = getLocalCache<SystemAnnouncement>(ANNOUNCEMENTS_COL, MOCK_ANNOUNCEMENTS);
  const updated = current.filter(a => a.id !== id);
  setLocalCache(ANNOUNCEMENTS_COL, updated);
  notifyLocalSubscribers('announcements', updated);

  if (isQuotaExceeded) return;
  try {
    await deleteDoc(doc(db, ANNOUNCEMENTS_COL, id));
  } catch (err) {
    handleFirestoreError(err, 'deleteAnnouncementFromDb');
  }
}

// ----------------------------------------------------------------------
// Attendance
// ----------------------------------------------------------------------
export function subscribeAttendance(callback: (items: AttendanceRecord[]) => void) {
  localSubscribers['attendance'].add(callback);
  callback(getLocalCache<AttendanceRecord>(ATTENDANCE_COL, []));

  if (isQuotaExceeded) {
    return () => {
      localSubscribers['attendance'].delete(callback);
    };
  }

  const q = query(collection(db, ATTENDANCE_COL));
  const unsub = onSnapshot(q, (snapshot) => {
    const items: AttendanceRecord[] = [];
    snapshot.forEach((doc) => {
      items.push(doc.data() as AttendanceRecord);
    });
    setLocalCache(ATTENDANCE_COL, items);
    callback(items);
  }, (err) => {
    handleFirestoreError(err, 'attendance_subscribe');
    callback(getLocalCache<AttendanceRecord>(ATTENDANCE_COL, []));
  });

  return () => {
    localSubscribers['attendance'].delete(callback);
    unsub();
  };
}

export async function updateAttendanceInDb(attendance: AttendanceRecord) {
  const current = getLocalCache<AttendanceRecord>(ATTENDANCE_COL, []);
  const index = current.findIndex(a => a.id === attendance.id);
  let updated: AttendanceRecord[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = attendance;
  } else {
    updated = [attendance, ...current];
  }
  setLocalCache(ATTENDANCE_COL, updated);
  notifyLocalSubscribers('attendance', updated);

  if (isQuotaExceeded) return;
  try {
    await setDoc(doc(db, ATTENDANCE_COL, attendance.id), cleanData(attendance));
  } catch (err) {
    handleFirestoreError(err, 'updateAttendanceInDb');
  }
}

// ----------------------------------------------------------------------
// Schedules
// ----------------------------------------------------------------------
export function subscribeSchedules(callback: (items: ClassSchedule[]) => void) {
  localSubscribers['schedules'].add(callback);
  const deletedSet = getDeletedIds();
  const initial = getLocalCache(SCHEDULES_COL, MOCK_SCHEDULES).filter(s => !deletedSet.has(s.id));
  callback(initial);

  if (isQuotaExceeded) {
    return () => {
      localSubscribers['schedules'].delete(callback);
    };
  }

  const q = query(collection(db, SCHEDULES_COL));
  const unsub = onSnapshot(q, (snapshot) => {
    const currentDeleted = getDeletedIds();
    const items: ClassSchedule[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data() as ClassSchedule;
      if (!currentDeleted.has(data.id)) {
        items.push(data);
      }
    });
    if (items.length > 0) {
      setLocalCache(SCHEDULES_COL, items);
      callback(items);
    } else if (snapshot.empty) {
      callback(MOCK_SCHEDULES.filter(s => !currentDeleted.has(s.id)));
    } else {
      callback([]);
    }
  }, (err) => {
    handleFirestoreError(err, 'schedules_subscribe');
    const currentDeleted = getDeletedIds();
    callback(getLocalCache(SCHEDULES_COL, MOCK_SCHEDULES).filter(s => !currentDeleted.has(s.id)));
  });

  return () => {
    localSubscribers['schedules'].delete(callback);
    unsub();
  };
}

export async function addScheduleToDb(schedule: ClassSchedule) {
  unmarkIdAsDeleted(schedule.id);
  const current = getLocalCache<ClassSchedule>(SCHEDULES_COL, MOCK_SCHEDULES).filter(s => s.id !== schedule.id);
  const updated = [schedule, ...current];
  setLocalCache(SCHEDULES_COL, updated);
  notifyLocalSubscribers('schedules', updated);

  if (isQuotaExceeded) return;
  try {
    await setDoc(doc(db, SCHEDULES_COL, schedule.id), cleanData(schedule));
  } catch (err) {
    handleFirestoreError(err, 'addScheduleToDb');
  }
}

export async function updateScheduleInDb(schedule: ClassSchedule) {
  unmarkIdAsDeleted(schedule.id);
  const current = getLocalCache<ClassSchedule>(SCHEDULES_COL, MOCK_SCHEDULES);
  const index = current.findIndex(s => s.id === schedule.id);
  let updated: ClassSchedule[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = { ...updated[index], ...schedule };
  } else {
    updated = [schedule, ...current];
  }
  setLocalCache(SCHEDULES_COL, updated);
  notifyLocalSubscribers('schedules', updated);

  if (isQuotaExceeded) return;
  try {
    await setDoc(doc(db, SCHEDULES_COL, schedule.id), cleanData(schedule), { merge: true });
  } catch (err) {
    handleFirestoreError(err, 'updateScheduleInDb');
  }
}

export async function deleteScheduleFromDb(id: string) {
  markIdAsDeleted(id);
  const current = getLocalCache<ClassSchedule>(SCHEDULES_COL, MOCK_SCHEDULES);
  const updated = current.filter(s => s.id !== id);
  setLocalCache(SCHEDULES_COL, updated);
  notifyLocalSubscribers('schedules', updated);

  if (isQuotaExceeded) return;
  try {
    await deleteDoc(doc(db, SCHEDULES_COL, id));
  } catch (err) {
    handleFirestoreError(err, 'deleteScheduleFromDb');
  }
}

// ----------------------------------------------------------------------
// Submissions
// ----------------------------------------------------------------------
export function subscribeSubmissions(callback: (items: StudentQuizSubmission[]) => void) {
  localSubscribers['submissions'].add(callback);
  callback(getLocalCache<StudentQuizSubmission>(SUBMISSIONS_COL, []));

  if (isQuotaExceeded) {
    return () => {
      localSubscribers['submissions'].delete(callback);
    };
  }

  const q = query(collection(db, SUBMISSIONS_COL));
  const unsub = onSnapshot(q, (snapshot) => {
    const items: StudentQuizSubmission[] = [];
    snapshot.forEach((doc) => {
      items.push(doc.data() as StudentQuizSubmission);
    });
    setLocalCache(SUBMISSIONS_COL, items);
    callback(items);
  }, (err) => {
    handleFirestoreError(err, 'submissions_subscribe');
    callback(getLocalCache<StudentQuizSubmission>(SUBMISSIONS_COL, []));
  });

  return () => {
    localSubscribers['submissions'].delete(callback);
    unsub();
  };
}

export async function addSubmissionToDb(submission: StudentQuizSubmission) {
  const current = getLocalCache<StudentQuizSubmission>(SUBMISSIONS_COL, []);
  const updated = [submission, ...current.filter(s => s.id !== submission.id)];
  setLocalCache(SUBMISSIONS_COL, updated);
  notifyLocalSubscribers('submissions', updated);

  if (isQuotaExceeded) return;
  try {
    await setDoc(doc(db, SUBMISSIONS_COL, submission.id), cleanData(submission));
  } catch (err) {
    handleFirestoreError(err, 'addSubmissionToDb');
  }
}

export async function deleteSubmissionFromDb(id: string) {
  const current = getLocalCache<StudentQuizSubmission>(SUBMISSIONS_COL, []);
  const updated = current.filter(s => s.id !== id);
  setLocalCache(SUBMISSIONS_COL, updated);
  notifyLocalSubscribers('submissions', updated);

  if (isQuotaExceeded) return;
  try {
    await deleteDoc(doc(db, SUBMISSIONS_COL, id));
  } catch (err) {
    handleFirestoreError(err, 'deleteSubmissionFromDb');
  }
}

// ----------------------------------------------------------------------
// Student Learning Progress Functions
// ----------------------------------------------------------------------
export function getLocalStudentProgress(studentId: string): Record<string, ContentLearningProgress> {
  try {
    const raw = localStorage.getItem(`edusmart_student_progress_${studentId}`);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveLocalStudentProgress(studentId: string, progressMap: Record<string, ContentLearningProgress>) {
  try {
    localStorage.setItem(`edusmart_student_progress_${studentId}`, JSON.stringify(progressMap));
  } catch (e) {
    console.warn('Failed to save student progress to localStorage:', e);
  }
}

export function subscribeStudentProgress(
  studentId: string,
  callback: (progress: Record<string, ContentLearningProgress>) => void
) {
  if (!studentId) {
    callback({});
    return () => {};
  }

  const localInitial = getLocalStudentProgress(studentId);
  callback(localInitial);

  if (isQuotaExceeded) {
    return () => {};
  }

  const docRef = doc(db, STUDENT_PROGRESS_COL, studentId);
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      const serverItems = (data?.progressItems || {}) as Record<string, ContentLearningProgress>;
      const localItems = getLocalStudentProgress(studentId);
      const merged = { ...localItems, ...serverItems };
      saveLocalStudentProgress(studentId, merged);
      callback(merged);
    } else {
      const local = getLocalStudentProgress(studentId);
      callback(local);
    }
  }, (err) => {
    handleFirestoreError(err, 'student_progress_subscribe');
    callback(getLocalStudentProgress(studentId));
  });
}

// Debounce timer map for Firestore progress writes
const progressDebounceTimers: Record<string, any> = {};

export async function updateStudentContentProgress(
  studentId: string,
  progressItem: ContentLearningProgress
) {
  if (!studentId || !progressItem.contentId) return;

  const key = `${progressItem.contentType}_${progressItem.contentId}`;
  const currentLocal = getLocalStudentProgress(studentId);
  const updatedLocal = {
    ...currentLocal,
    [key]: {
      ...progressItem,
      lastAccessedAt: new Date().toISOString()
    }
  };
  saveLocalStudentProgress(studentId, updatedLocal);

  // Sync studied materials list locally
  if (progressItem.contentType === 'material') {
    try {
      const studiedList: string[] = JSON.parse(localStorage.getItem('edusmart_studied_materials') || '[]');
      if (progressItem.isCompleted && !studiedList.includes(progressItem.contentId)) {
        localStorage.setItem('edusmart_studied_materials', JSON.stringify([...studiedList, progressItem.contentId]));
      } else if (!progressItem.isCompleted && studiedList.includes(progressItem.contentId)) {
        localStorage.setItem('edusmart_studied_materials', JSON.stringify(studiedList.filter(id => id !== progressItem.contentId)));
      }
    } catch {}
  }

  // Debounced cloud sync to save Firestore write units
  if (isQuotaExceeded) return;

  if (progressDebounceTimers[studentId]) {
    clearTimeout(progressDebounceTimers[studentId]);
  }

  progressDebounceTimers[studentId] = setTimeout(async () => {
    if (isQuotaExceeded) return;
    try {
      await setDoc(doc(db, STUDENT_PROGRESS_COL, studentId), {
        studentId,
        progressItems: updatedLocal,
        lastUpdated: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, 'updateStudentContentProgress');
    }
  }, 2500);
}

// ----------------------------------------------------------------------
// School Branding & System Settings
// ----------------------------------------------------------------------
export function getLocalSchoolSettings(): SchoolSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_LOCAL_KEY);
    if (!raw) return DEFAULT_SCHOOL_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SCHOOL_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SCHOOL_SETTINGS;
  }
}

export function saveLocalSchoolSettings(settings: SchoolSettings) {
  try {
    localStorage.setItem(SETTINGS_LOCAL_KEY, JSON.stringify(settings));
  } catch (e) {
    try {
      const lightweight: SchoolSettings = {
        ...settings,
        logoUrl: settings.logoUrl?.startsWith('data:') ? '' : settings.logoUrl,
        loginBgUrl: settings.loginBgUrl?.startsWith('data:') ? '' : settings.loginBgUrl
      };
      localStorage.setItem(SETTINGS_LOCAL_KEY, JSON.stringify(lightweight));
    } catch {}
  }
}

export function subscribeSchoolSettings(callback: (settings: SchoolSettings) => void) {
  localSubscribers['settings'].add(callback);
  callback(getLocalSchoolSettings());

  if (isQuotaExceeded) {
    return () => {
      localSubscribers['settings'].delete(callback);
    };
  }

  const docRef = doc(db, SETTINGS_COL, 'school_settings');
  const unsub = onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data() as SchoolSettings;
      const merged = { ...DEFAULT_SCHOOL_SETTINGS, ...data };
      saveLocalSchoolSettings(merged);
      callback(merged);
    } else {
      const current = getLocalSchoolSettings();
      callback(current);
    }
  }, (err) => {
    handleFirestoreError(err, 'school_settings_subscribe');
    callback(getLocalSchoolSettings());
  });

  return () => {
    localSubscribers['settings'].delete(callback);
    unsub();
  };
}

export async function updateSchoolSettingsInDb(newSettings: Partial<SchoolSettings>) {
  const current = getLocalSchoolSettings();
  const updated: SchoolSettings = {
    ...current,
    ...newSettings,
    updatedAt: new Date().toISOString()
  };
  saveLocalSchoolSettings(updated);
  notifyLocalSubscribers('settings', updated);

  if (isQuotaExceeded) return;
  try {
    const remotePromise = setDoc(doc(db, SETTINGS_COL, 'school_settings'), cleanData(updated), { merge: true })
      .catch(err => {
        handleFirestoreError(err, 'updateSchoolSettingsInDb_background');
      });

    // Gunakan race dengan timeout 400ms agar UI merespon secara instan
    await Promise.race([
      remotePromise,
      new Promise((resolve) => setTimeout(resolve, 400))
    ]);
  } catch (err) {
    console.warn('Firestore write slow or delayed, saved to local cache:', err);
  }
}

// ----------------------------------------------------------------------
// Full Database Backup & Restore & Stats
// ----------------------------------------------------------------------
export async function getFullDatabaseBackup(): Promise<Record<string, any>> {
  const backupData: Record<string, any[]> = {
    users: getLocalCache(USERS_COL, MOCK_USERS),
    materials: getLocalCache(MATERIALS_COL, MOCK_MATERIALS),
    quizzes: getLocalCache(QUIZZES_COL, MOCK_QUIZZES),
    books: getLocalCache(BOOKS_COL, MOCK_BOOKS),
    videos: getLocalCache(VIDEOS_COL, MOCK_VIDEOS),
    announcements: getLocalCache(ANNOUNCEMENTS_COL, MOCK_ANNOUNCEMENTS),
    schedules: getLocalCache(SCHEDULES_COL, MOCK_SCHEDULES),
    attendance: getLocalCache(ATTENDANCE_COL, []),
    quiz_submissions: getLocalCache(SUBMISSIONS_COL, []),
    settings: [getLocalSchoolSettings()],
    student_progress: []
  };

  return {
    exportedAt: new Date().toISOString(),
    schoolName: getLocalSchoolSettings().schoolName,
    databaseVersion: '2.5.0',
    data: backupData
  };
}

export async function restoreFullDatabaseBackup(backupPayload: any): Promise<{ success: boolean; totalRestored: number; message: string }> {
  try {
    const rawData = backupPayload?.data || backupPayload;
    let totalRestored = 0;

    const collectionsMapping: Record<string, string> = {
      users: USERS_COL,
      materials: MATERIALS_COL,
      quizzes: QUIZZES_COL,
      books: BOOKS_COL,
      videos: VIDEOS_COL,
      announcements: ANNOUNCEMENTS_COL,
      schedules: SCHEDULES_COL,
      attendance: ATTENDANCE_COL,
      quiz_submissions: SUBMISSIONS_COL,
      settings: SETTINGS_COL,
      student_progress: STUDENT_PROGRESS_COL,
    };

    for (const [key, colName] of Object.entries(collectionsMapping)) {
      const items = rawData[key];
      if (Array.isArray(items)) {
        setLocalCache(colName, items);
        notifyLocalSubscribers(key, items);
        for (const item of items) {
          const docId = item.id || (key === 'settings' ? 'school_settings' : undefined);
          if (docId) {
            unmarkIdAsDeleted(docId);
            if (!isQuotaExceeded) {
              try {
                await setDoc(doc(db, colName, docId), cleanData(item), { merge: true });
              } catch (err) {
                handleFirestoreError(err, 'restore');
              }
            }
            totalRestored++;
          }
        }
      }
    }

    return {
      success: true,
      totalRestored,
      message: `Berhasil memulihkan ${totalRestored} data ke database LMS.`
    };
  } catch (err: any) {
    console.error('Restore error:', err);
    return {
      success: false,
      totalRestored: 0,
      message: `Gagal memulihkan database: ${err?.message || 'Format JSON tidak valid'}`
    };
  }
}

export async function getDatabaseStats(): Promise<Record<string, number>> {
  return {
    users: getLocalCache(USERS_COL, MOCK_USERS).length,
    materials: getLocalCache(MATERIALS_COL, MOCK_MATERIALS).length,
    quizzes: getLocalCache(QUIZZES_COL, MOCK_QUIZZES).length,
    books: getLocalCache(BOOKS_COL, MOCK_BOOKS).length,
    videos: getLocalCache(VIDEOS_COL, MOCK_VIDEOS).length,
    announcements: getLocalCache(ANNOUNCEMENTS_COL, MOCK_ANNOUNCEMENTS).length,
    schedules: getLocalCache(SCHEDULES_COL, MOCK_SCHEDULES).length,
    attendance: getLocalCache(ATTENDANCE_COL, []).length,
    submissions: getLocalCache(SUBMISSIONS_COL, []).length
  };
}

export async function forceSyncAllToCloud(): Promise<number> {
  if (isQuotaExceeded) {
    return 0;
  }
  let count = 0;
  try {
    for (const item of getLocalCache(USERS_COL, MOCK_USERS)) {
      if (!OLD_DEFAULT_USER_IDS.includes(item.id)) {
        await setDoc(doc(db, USERS_COL, item.id), cleanData(item), { merge: true });
        count++;
      }
    }
    for (const item of getLocalCache(MATERIALS_COL, MOCK_MATERIALS)) {
      await setDoc(doc(db, MATERIALS_COL, item.id), cleanData(item), { merge: true });
      count++;
    }
    for (const item of getLocalCache(QUIZZES_COL, MOCK_QUIZZES)) {
      await setDoc(doc(db, QUIZZES_COL, item.id), cleanData(item), { merge: true });
      count++;
    }
    for (const item of getLocalCache(BOOKS_COL, MOCK_BOOKS)) {
      await setDoc(doc(db, BOOKS_COL, item.id), cleanData(item), { merge: true });
      count++;
    }
    for (const item of getLocalCache(VIDEOS_COL, MOCK_VIDEOS)) {
      await setDoc(doc(db, VIDEOS_COL, item.id), cleanData(item), { merge: true });
      count++;
    }
    for (const item of getLocalCache(ANNOUNCEMENTS_COL, MOCK_ANNOUNCEMENTS)) {
      await setDoc(doc(db, ANNOUNCEMENTS_COL, item.id), cleanData(item), { merge: true });
      count++;
    }
    for (const item of getLocalCache(SCHEDULES_COL, MOCK_SCHEDULES)) {
      await setDoc(doc(db, SCHEDULES_COL, item.id), cleanData(item), { merge: true });
      count++;
    }
  } catch (err) {
    handleFirestoreError(err, 'forceSyncAllToCloud');
  }
  return count;
}

const storageUrls: Record<string, string> = {};

export async function uploadLargeFileToFirestore(fileId: string, b64Data: string): Promise<number> {
  if (isQuotaExceeded) return 0;

  // Try Firebase Storage first (zero database costs, extremely fast streaming)
  try {
    const storageRef = ref(storage, `pdfs/${fileId}.pdf`);
    await uploadString(storageRef, b64Data, 'data_url');
    const downloadUrl = await getDownloadURL(storageRef);
    storageUrls[fileId] = downloadUrl;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`edusmart_storage_url_${fileId}`, downloadUrl);
      } catch (e) {
        console.warn('Failed to set localStorage URL for', fileId, e);
      }
    }
    console.log('[EduSmart LMS] Successfully uploaded PDF to Firebase Storage:', downloadUrl);
    return -999; // Special chunk count token indicating Firebase Storage
  } catch (storageErr) {
    console.warn('[EduSmart LMS] Firebase Storage upload failed, falling back to Firestore chunks:', storageErr);
  }

  // Fallback to traditional Firestore chunks if Storage is unavailable
  const CHUNK_SIZE = 800000;
  const chunks = Math.ceil(b64Data.length / CHUNK_SIZE);
  for (let i = 0; i < chunks; i++) {
    const chunkId = `${fileId}_chunk_${i}`;
    const chunkData = b64Data.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    try {
      await setDoc(doc(db, 'file_chunks', chunkId), {
        fileId,
        index: i,
        data: chunkData
      });
    } catch (err) {
      handleFirestoreError(err, 'uploadLargeFile');
      break;
    }
  }
  return chunks;
}

export async function downloadLargeFileFromFirestore(fileId: string, chunks: number): Promise<string> {
  // If the special -999 token is used, retrieve directly from Firebase Storage
  if (chunks === -999) {
    try {
      const cachedUrl = storageUrls[fileId] || (typeof window !== 'undefined' ? localStorage.getItem(`edusmart_storage_url_${fileId}`) : null);
      const url = cachedUrl || await getDownloadURL(ref(storage, `pdfs/${fileId}.pdf`));
      
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.error('[EduSmart LMS] Failed to download PDF from Firebase Storage, trying fallback chunks:', err);
    }
  }

  let fullB64 = '';
  for (let i = 0; i < chunks; i++) {
    const chunkId = `${fileId}_chunk_${i}`;
    try {
      const snap = await getDoc(doc(db, 'file_chunks', chunkId));
      if (snap.exists()) {
        fullB64 += snap.data().data;
      }
    } catch (err) {
      handleFirestoreError(err, 'downloadLargeFile');
    }
  }
  return fullB64;
}

export async function forcePurgeMockContent() {
  const mockIds = {
    materials: ['mat-1', 'mat-2', 'mat-3'],
    books: ['bk-1', 'bk-2', 'bk-3'],
    videos: ['vid-1', 'vid-2', 'vid-3', 'vid-4'],
    quizzes: ['qz-1', 'qz-2', 'qz-3'],
    announcements: ['ann-1', 'ann-2', 'ann-3', 'ann-4'],
    schedules: ['sch-1', 'sch-2', 'sch-3', 'sch-4', 'sch-5', 'sch-6']
  };

  if (isQuotaExceeded) return;
  try {
    for (const id of mockIds.materials) await deleteDoc(doc(db, MATERIALS_COL, id));
    for (const id of mockIds.books) await deleteDoc(doc(db, BOOKS_COL, id));
    for (const id of mockIds.videos) await deleteDoc(doc(db, VIDEOS_COL, id));
    for (const id of mockIds.quizzes) await deleteDoc(doc(db, QUIZZES_COL, id));
    for (const id of mockIds.announcements) await deleteDoc(doc(db, ANNOUNCEMENTS_COL, id));
    for (const id of mockIds.schedules) await deleteDoc(doc(db, SCHEDULES_COL, id));
  } catch (err) {
    handleFirestoreError(err, 'forcePurgeMockContent');
  }
}
