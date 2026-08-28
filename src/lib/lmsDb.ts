import { 
  getDoc,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  query
} from "firebase/firestore";
import {  db } from './firebase';
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
    try {
      await deleteDoc(doc(db, USERS_COL, id));
    } catch (err) {
      console.warn(`Error deleting default user ${id}:`, err);
    }
  }
}

// Helper to seed database if empty
export async function seedInitialDataIfEmpty() {
  forcePurgeMockContent();
  const deletedSet = getDeletedIds();
  // Always clean up old default test users from Firestore server
  await purgeDefaultUsersFromDb();

  try {
    const usersSnap = await getDocs(collection(db, USERS_COL));
    if (usersSnap.empty) {
      for (const item of MOCK_USERS) {
        if (!deletedSet.has(item.id) && !OLD_DEFAULT_USER_IDS.includes(item.id)) {
          await setDoc(doc(db, USERS_COL, item.id), cleanData(item));
        }
      }
    }
  } catch (err) {
    console.warn('Notice: user collection seeding skipped or already initialized:', err);
  }

  try {
    const matSnap = await getDocs(collection(db, MATERIALS_COL));
    if (matSnap.empty) {
      for (const item of MOCK_MATERIALS) {
        if (!deletedSet.has(item.id)) {
          await setDoc(doc(db, MATERIALS_COL, item.id), cleanData(item));
        }
      }
    }
  } catch (err) {
    console.warn('Notice: materials collection seeding check:', err);
  }

  try {
    const quizSnap = await getDocs(collection(db, QUIZZES_COL));
    if (quizSnap.empty) {
      for (const item of MOCK_QUIZZES) {
        if (!deletedSet.has(item.id)) {
          await setDoc(doc(db, QUIZZES_COL, item.id), cleanData(item));
        }
      }
    }
  } catch (err) {
    console.warn('Notice: quizzes collection seeding check:', err);
  }

  try {
    const bookSnap = await getDocs(collection(db, BOOKS_COL));
    if (bookSnap.empty) {
      for (const item of MOCK_BOOKS) {
        if (!deletedSet.has(item.id)) {
          await setDoc(doc(db, BOOKS_COL, item.id), cleanData(item));
        }
      }
    }
  } catch (err) {
    console.warn('Notice: books collection seeding check:', err);
  }

  try {
    const vidSnap = await getDocs(collection(db, VIDEOS_COL));
    if (vidSnap.empty) {
      for (const item of MOCK_VIDEOS) {
        if (!deletedSet.has(item.id)) {
          await setDoc(doc(db, VIDEOS_COL, item.id), cleanData(item));
        }
      }
    }
  } catch (err) {
    console.warn('Notice: videos collection seeding check:', err);
  }

  try {
    const annSnap = await getDocs(collection(db, ANNOUNCEMENTS_COL));
    if (annSnap.empty) {
      for (const item of MOCK_ANNOUNCEMENTS) {
        if (!deletedSet.has(item.id)) {
          await setDoc(doc(db, ANNOUNCEMENTS_COL, item.id), cleanData(item));
        }
      }
    }
  } catch (err) {
    console.warn('Notice: announcements collection seeding check:', err);
  }

  try {
    const schedSnap = await getDocs(collection(db, SCHEDULES_COL));
    if (schedSnap.empty) {
      for (const item of MOCK_SCHEDULES) {
        if (!deletedSet.has(item.id)) {
          await setDoc(doc(db, SCHEDULES_COL, item.id), cleanData(item));
        }
      }
    }
  } catch (err) {
    console.warn('Notice: schedules collection seeding check:', err);
  }
}

// Reset all database data to fresh default deployment state
export async function resetAllDatabaseData() {
  try {
    localStorage.removeItem(DELETED_IDS_KEY);
  } catch {}

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
      console.error(`Error clearing collection ${colName}:`, err);
    }
  }

  // Re-seed default clean state
  for (const item of MOCK_MATERIALS) {
    await setDoc(doc(db, MATERIALS_COL, item.id), cleanData(item));
  }
  for (const item of MOCK_QUIZZES) {
    await setDoc(doc(db, QUIZZES_COL, item.id), cleanData(item));
  }
  for (const item of MOCK_BOOKS) {
    await setDoc(doc(db, BOOKS_COL, item.id), cleanData(item));
  }
  for (const item of MOCK_VIDEOS) {
    await setDoc(doc(db, VIDEOS_COL, item.id), cleanData(item));
  }
  for (const item of MOCK_USERS) {
    await setDoc(doc(db, USERS_COL, item.id), cleanData(item));
  }
  for (const item of MOCK_ANNOUNCEMENTS) {
    await setDoc(doc(db, ANNOUNCEMENTS_COL, item.id), cleanData(item));
  }
  for (const item of MOCK_SCHEDULES) {
    await setDoc(doc(db, SCHEDULES_COL, item.id), cleanData(item));
  }
}

// Materials
export function subscribeMaterials(callback: (items: LearningMaterial[]) => void) {
  const q = query(collection(db, MATERIALS_COL));
  return onSnapshot(q, (snapshot) => {
    const deletedSet = getDeletedIds();
    const items: LearningMaterial[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data() as LearningMaterial;
      if (!deletedSet.has(data.id)) {
        items.push(data);
      }
    });
    if (items.length > 0) {
      callback(items);
    } else if (snapshot.empty) {
      callback(MOCK_MATERIALS.filter(m => !deletedSet.has(m.id)));
    } else {
      callback([]);
    }
  }, (err) => {
    console.warn('Firestore materials snapshot notice:', err);
    const deletedSet = getDeletedIds();
    callback(MOCK_MATERIALS.filter(m => !deletedSet.has(m.id)));
  });
}

export async function addMaterialToDb(material: LearningMaterial) {
  unmarkIdAsDeleted(material.id);
  try {
    await setDoc(doc(db, MATERIALS_COL, material.id), cleanData(material));
  } catch (err) {
    console.warn('addMaterialToDb error:', err);
  }
}

export async function deleteMaterialFromDb(id: string) {
  markIdAsDeleted(id);
  try {
    await deleteDoc(doc(db, MATERIALS_COL, id));
    // Clean up associated file chunks if any
    for (let i = 0; i < 60; i++) {
      const chunkId = `${id}_chunk_${i}`;
      deleteDoc(doc(db, 'file_chunks', chunkId)).catch(() => {});
    }
  } catch (err) {
    console.warn('deleteMaterialFromDb error:', err);
  }
}

// Quizzes
export function subscribeQuizzes(callback: (items: QuizExam[]) => void) {
  const q = query(collection(db, QUIZZES_COL));
  return onSnapshot(q, (snapshot) => {
    const deletedSet = getDeletedIds();
    const items: QuizExam[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data() as QuizExam;
      if (!deletedSet.has(data.id)) {
        items.push(data);
      }
    });
    if (items.length > 0) {
      callback(items);
    } else if (snapshot.empty) {
      callback(MOCK_QUIZZES.filter(q => !deletedSet.has(q.id)));
    } else {
      callback([]);
    }
  }, (err) => {
    console.warn('Firestore quizzes snapshot notice:', err);
    const deletedSet = getDeletedIds();
    callback(MOCK_QUIZZES.filter(q => !deletedSet.has(q.id)));
  });
}

export async function addQuizToDb(quiz: QuizExam) {
  unmarkIdAsDeleted(quiz.id);
  try {
    await setDoc(doc(db, QUIZZES_COL, quiz.id), cleanData(quiz));
  } catch (err) {
    console.warn('addQuizToDb error:', err);
  }
}

export async function deleteQuizFromDb(id: string) {
  markIdAsDeleted(id);
  try {
    await deleteDoc(doc(db, QUIZZES_COL, id));
  } catch (err) {
    console.warn('deleteQuizFromDb error:', err);
  }
}

// Books
export function subscribeBooks(callback: (items: DigitalBook[]) => void) {
  const q = query(collection(db, BOOKS_COL));
  return onSnapshot(q, (snapshot) => {
    const deletedSet = getDeletedIds();
    const items: DigitalBook[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data() as DigitalBook;
      if (!deletedSet.has(data.id)) {
        items.push(data);
      }
    });
    if (items.length > 0) {
      callback(items);
    } else if (snapshot.empty) {
      callback(MOCK_BOOKS.filter(b => !deletedSet.has(b.id)));
    } else {
      callback([]);
    }
  }, (err) => {
    console.warn('Firestore books snapshot notice:', err);
    const deletedSet = getDeletedIds();
    callback(MOCK_BOOKS.filter(b => !deletedSet.has(b.id)));
  });
}

export async function addBookToDb(book: DigitalBook) {
  unmarkIdAsDeleted(book.id);
  try {
    await setDoc(doc(db, BOOKS_COL, book.id), cleanData(book));
  } catch (err) {
    console.warn('addBookToDb error:', err);
  }
}

export async function deleteBookFromDb(id: string) {
  markIdAsDeleted(id);
  try {
    await deleteDoc(doc(db, BOOKS_COL, id));
    // Clean up associated file chunks if any
    for (let i = 0; i < 60; i++) {
      const chunkId = `${id}_chunk_${i}`;
      deleteDoc(doc(db, 'file_chunks', chunkId)).catch(() => {});
    }
  } catch (err) {
    console.warn('deleteBookFromDb error:', err);
  }
}

// Videos
export function subscribeVideos(callback: (items: LearningVideo[]) => void) {
  const q = query(collection(db, VIDEOS_COL));
  return onSnapshot(q, (snapshot) => {
    const deletedSet = getDeletedIds();
    const items: LearningVideo[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data() as LearningVideo;
      if (!deletedSet.has(data.id)) {
        items.push(data);
      }
    });
    if (items.length > 0) {
      callback(items);
    } else if (snapshot.empty) {
      callback(MOCK_VIDEOS.filter(v => !deletedSet.has(v.id)));
    } else {
      callback([]);
    }
  }, (err) => {
    console.warn('Firestore videos snapshot notice:', err);
    const deletedSet = getDeletedIds();
    callback(MOCK_VIDEOS.filter(v => !deletedSet.has(v.id)));
  });
}

export async function addVideoToDb(video: LearningVideo) {
  unmarkIdAsDeleted(video.id);
  try {
    await setDoc(doc(db, VIDEOS_COL, video.id), cleanData(video));
  } catch (err) {
    console.warn('addVideoToDb error:', err);
  }
}

export async function deleteVideoFromDb(id: string) {
  markIdAsDeleted(id);
  try {
    await deleteDoc(doc(db, VIDEOS_COL, id));
  } catch (err) {
    console.warn('deleteVideoFromDb error:', err);
  }
}

// Users
export function subscribeUsers(callback: (items: UserProfile[]) => void) {
  const q = query(collection(db, USERS_COL));
  return onSnapshot(q, (snapshot) => {
    const deletedSet = getDeletedIds();
    const items: UserProfile[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data() as UserProfile;
      if (data && data.id && !deletedSet.has(data.id) && !OLD_DEFAULT_USER_IDS.includes(data.id)) {
        items.push({
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
    if (items.length > 0) {
      callback(items);
    } else if (snapshot.empty) {
      callback(MOCK_USERS.filter(u => !deletedSet.has(u.id) && !OLD_DEFAULT_USER_IDS.includes(u.id)));
    } else {
      callback([]);
    }
  }, (err) => {
    console.warn('Firestore users snapshot notice:', err);
    const deletedSet = getDeletedIds();
    callback(MOCK_USERS.filter(u => !deletedSet.has(u.id) && !OLD_DEFAULT_USER_IDS.includes(u.id)));
  });
}

export async function addUserToDb(user: UserProfile) {
  unmarkIdAsDeleted(user.id);
  try {
    await setDoc(doc(db, USERS_COL, user.id), cleanData(user));
  } catch (err) {
    console.warn('addUserToDb error:', err);
  }
}

export async function updateUserInDb(user: UserProfile) {
  unmarkIdAsDeleted(user.id);
  try {
    await setDoc(doc(db, USERS_COL, user.id), cleanData(user), { merge: true });
  } catch (err) {
    console.warn('updateUserInDb error:', err);
  }
}

export async function deleteUserFromDb(id: string) {
  markIdAsDeleted(id);
  try {
    await deleteDoc(doc(db, USERS_COL, id));
  } catch (err) {
    console.warn('deleteUserFromDb error:', err);
  }
}

// Announcements
export function subscribeAnnouncements(callback: (items: SystemAnnouncement[]) => void) {
  const q = query(collection(db, ANNOUNCEMENTS_COL));
  return onSnapshot(q, (snapshot) => {
    const deletedSet = getDeletedIds();
    const items: SystemAnnouncement[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data() as SystemAnnouncement;
      if (!deletedSet.has(data.id)) {
        items.push(data);
      }
    });
    if (items.length > 0) {
      callback(items);
    } else if (snapshot.empty) {
      callback(MOCK_ANNOUNCEMENTS.filter(a => !deletedSet.has(a.id)));
    } else {
      callback([]);
    }
  }, (err) => {
    console.warn('Firestore announcements snapshot notice:', err);
    const deletedSet = getDeletedIds();
    callback(MOCK_ANNOUNCEMENTS.filter(a => !deletedSet.has(a.id)));
  });
}

export async function addAnnouncementToDb(announcement: SystemAnnouncement) {
  unmarkIdAsDeleted(announcement.id);
  try {
    await setDoc(doc(db, ANNOUNCEMENTS_COL, announcement.id), cleanData(announcement));
  } catch (err) {
    console.warn('addAnnouncementToDb error:', err);
  }
}

export async function deleteAnnouncementFromDb(id: string) {
  markIdAsDeleted(id);
  try {
    await deleteDoc(doc(db, ANNOUNCEMENTS_COL, id));
  } catch (err) {
    console.warn('deleteAnnouncementFromDb error:', err);
  }
}

// Attendance
export function subscribeAttendance(callback: (items: AttendanceRecord[]) => void) {
  const q = query(collection(db, ATTENDANCE_COL));
  return onSnapshot(q, (snapshot) => {
    const items: AttendanceRecord[] = [];
    snapshot.forEach((doc) => {
      items.push(doc.data() as AttendanceRecord);
    });
    callback(items);
  }, (err) => {
    console.warn('Firestore attendance snapshot notice:', err);
  });
}

export async function updateAttendanceInDb(attendance: AttendanceRecord) {
  try {
    await setDoc(doc(db, ATTENDANCE_COL, attendance.id), cleanData(attendance));
  } catch (err) {
    console.warn('updateAttendanceInDb error:', err);
  }
}

// Schedules
export function subscribeSchedules(callback: (items: ClassSchedule[]) => void) {
  const q = query(collection(db, SCHEDULES_COL));
  return onSnapshot(q, (snapshot) => {
    const deletedSet = getDeletedIds();
    const items: ClassSchedule[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data() as ClassSchedule;
      if (!deletedSet.has(data.id)) {
        items.push(data);
      }
    });
    if (items.length > 0) {
      callback(items);
    } else if (snapshot.empty) {
      callback(MOCK_SCHEDULES.filter(s => !deletedSet.has(s.id)));
    } else {
      callback([]);
    }
  }, (err) => {
    console.warn('Firestore schedules snapshot notice:', err);
    const deletedSet = getDeletedIds();
    callback(MOCK_SCHEDULES.filter(s => !deletedSet.has(s.id)));
  });
}

export async function addScheduleToDb(schedule: ClassSchedule) {
  unmarkIdAsDeleted(schedule.id);
  try {
    await setDoc(doc(db, SCHEDULES_COL, schedule.id), cleanData(schedule));
  } catch (err) {
    console.warn('addScheduleToDb error:', err);
  }
}

export async function updateScheduleInDb(schedule: ClassSchedule) {
  unmarkIdAsDeleted(schedule.id);
  try {
    await setDoc(doc(db, SCHEDULES_COL, schedule.id), cleanData(schedule), { merge: true });
  } catch (err) {
    console.warn('updateScheduleInDb error:', err);
  }
}

export async function deleteScheduleFromDb(id: string) {
  markIdAsDeleted(id);
  try {
    await deleteDoc(doc(db, SCHEDULES_COL, id));
  } catch (err) {
    console.warn('deleteScheduleFromDb error:', err);
  }
}

// Submissions
export function subscribeSubmissions(callback: (items: StudentQuizSubmission[]) => void) {
  const q = query(collection(db, SUBMISSIONS_COL));
  return onSnapshot(q, (snapshot) => {
    const items: StudentQuizSubmission[] = [];
    snapshot.forEach((doc) => {
      items.push(doc.data() as StudentQuizSubmission);
    });
    callback(items);
  }, (err) => {
    console.warn('Firestore submissions snapshot error:', err);
    callback([]);
  });
}

export async function addSubmissionToDb(submission: StudentQuizSubmission) {
  try {
    await setDoc(doc(db, SUBMISSIONS_COL, submission.id), cleanData(submission));
  } catch (err) {
    console.warn('addSubmissionToDb error:', err);
  }
}

// Student Learning Progress Functions
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
    console.warn('Firestore student progress snapshot error:', err);
    callback(getLocalStudentProgress(studentId));
  });
}

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

  // If this is a material, also keep studied materials array in sync for backward compatibility
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

  try {
    await setDoc(doc(db, STUDENT_PROGRESS_COL, studentId), {
      studentId,
      progressItems: updatedLocal,
      lastUpdated: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('Firestore updateStudentContentProgress error:', err);
  }
}


// School Branding & System Settings
export function getLocalSchoolSettings(): SchoolSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_LOCAL_KEY);
    if (!raw) return DEFAULT_SCHOOL_SETTINGS;
    return { ...DEFAULT_SCHOOL_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SCHOOL_SETTINGS;
  }
}

export function saveLocalSchoolSettings(settings: SchoolSettings) {
  try {
    localStorage.setItem(SETTINGS_LOCAL_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save local settings (quota exceeded), trying lightweight config:', e);
    try {
      // Create a lightweight copy without the heavy Base64 image data for localStorage fallback
      const lightweight: SchoolSettings = {
        ...settings,
        logoUrl: settings.logoUrl?.startsWith('data:') ? '' : settings.logoUrl,
        loginBgUrl: settings.loginBgUrl?.startsWith('data:') ? '' : settings.loginBgUrl
      };
      localStorage.setItem(SETTINGS_LOCAL_KEY, JSON.stringify(lightweight));
    } catch (fallbackErr) {
      console.error('Completely failed to save school settings to localStorage:', fallbackErr);
    }
  }
}

export function subscribeSchoolSettings(callback: (settings: SchoolSettings) => void) {
  const docRef = doc(db, SETTINGS_COL, 'school_settings');
  return onSnapshot(docRef, (snapshot) => {
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
    console.warn('Firestore school_settings snapshot error:', err);
    callback(getLocalSchoolSettings());
  });
}

export async function updateSchoolSettingsInDb(newSettings: Partial<SchoolSettings>) {
  const current = getLocalSchoolSettings();
  const updated: SchoolSettings = {
    ...current,
    ...newSettings,
    updatedAt: new Date().toISOString()
  };
  saveLocalSchoolSettings(updated);
  try {
    await setDoc(doc(db, SETTINGS_COL, 'school_settings'), cleanData(updated), { merge: true });
  } catch (err) {
    console.warn('updateSchoolSettingsInDb error:', err);
  }
}

export async function updateBookInDb(book: DigitalBook) {
  unmarkIdAsDeleted(book.id);
  try {
    await setDoc(doc(db, BOOKS_COL, book.id), cleanData(book), { merge: true });
  } catch (err) {
    console.warn('updateBookInDb error:', err);
  }
}

export async function updateMaterialInDb(material: LearningMaterial) {
  unmarkIdAsDeleted(material.id);
  try {
    await setDoc(doc(db, MATERIALS_COL, material.id), cleanData(material), { merge: true });
  } catch (err) {
    console.warn('updateMaterialInDb error:', err);
  }
}

export async function updateQuizInDb(quiz: QuizExam) {
  unmarkIdAsDeleted(quiz.id);
  try {
    await setDoc(doc(db, QUIZZES_COL, quiz.id), cleanData(quiz), { merge: true });
  } catch (err) {
    console.warn('updateQuizInDb error:', err);
  }
}

export async function updateVideoInDb(video: LearningVideo) {
  unmarkIdAsDeleted(video.id);
  try {
    await setDoc(doc(db, VIDEOS_COL, video.id), cleanData(video), { merge: true });
  } catch (err) {
    console.warn('updateVideoInDb error:', err);
  }
}

export async function updateAnnouncementInDb(announcement: SystemAnnouncement) {
  unmarkIdAsDeleted(announcement.id);
  try {
    await setDoc(doc(db, ANNOUNCEMENTS_COL, announcement.id), cleanData(announcement), { merge: true });
  } catch (err) {
    console.warn('updateAnnouncementInDb error:', err);
  }
}

export async function deleteSubmissionFromDb(id: string) {
  try {
    await deleteDoc(doc(db, SUBMISSIONS_COL, id));
  } catch (err) {
    console.warn('deleteSubmissionFromDb error:', err);
  }
}

// Complete Full-Database Backup (Exports all collections into a structured JSON)
export async function getFullDatabaseBackup(): Promise<Record<string, any>> {
  const backupData: Record<string, any[]> = {
    users: [],
    materials: [],
    quizzes: [],
    books: [],
    videos: [],
    announcements: [],
    schedules: [],
    attendance: [],
    quiz_submissions: [],
    settings: [],
    student_progress: []
  };

  const collectionsList = [
    { key: 'users', col: USERS_COL },
    { key: 'materials', col: MATERIALS_COL },
    { key: 'quizzes', col: QUIZZES_COL },
    { key: 'books', col: BOOKS_COL },
    { key: 'videos', col: VIDEOS_COL },
    { key: 'announcements', col: ANNOUNCEMENTS_COL },
    { key: 'schedules', col: SCHEDULES_COL },
    { key: 'attendance', col: ATTENDANCE_COL },
    { key: 'quiz_submissions', col: SUBMISSIONS_COL },
    { key: 'settings', col: SETTINGS_COL },
    { key: 'student_progress', col: STUDENT_PROGRESS_COL },
  ];

  for (const item of collectionsList) {
    try {
      const snap = await getDocs(collection(db, item.col));
      snap.forEach((docItem) => {
        backupData[item.key].push(docItem.data());
      });
    } catch (err) {
      console.warn(`Backup read error for ${item.key}:`, err);
    }
  }

  return {
    exportedAt: new Date().toISOString(),
    schoolName: getLocalSchoolSettings().schoolName,
    databaseVersion: '2.5.0',
    data: backupData
  };
}

// Full-Database Restore (Takes a JSON backup and restores all documents to Firestore)
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
        for (const item of items) {
          const docId = item.id || (key === 'settings' ? 'school_settings' : undefined);
          if (docId) {
            unmarkIdAsDeleted(docId);
            await setDoc(doc(db, colName, docId), cleanData(item), { merge: true });
            totalRestored++;
          }
        }
      }
    }

    return {
      success: true,
      totalRestored,
      message: `Berhasil memulihkan ${totalRestored} data ke Firestore Database.`
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

// Get Realtime Statistics of all collections from Firestore
export async function getDatabaseStats(): Promise<Record<string, number>> {
  const stats: Record<string, number> = {
    users: 0,
    materials: 0,
    quizzes: 0,
    books: 0,
    videos: 0,
    announcements: 0,
    schedules: 0,
    attendance: 0,
    submissions: 0
  };

  const mapList = [
    { key: 'users', col: USERS_COL },
    { key: 'materials', col: MATERIALS_COL },
    { key: 'quizzes', col: QUIZZES_COL },
    { key: 'books', col: BOOKS_COL },
    { key: 'videos', col: VIDEOS_COL },
    { key: 'announcements', col: ANNOUNCEMENTS_COL },
    { key: 'schedules', col: SCHEDULES_COL },
    { key: 'attendance', col: ATTENDANCE_COL },
    { key: 'submissions', col: SUBMISSIONS_COL },
  ];

  for (const item of mapList) {
    try {
      const snap = await getDocs(collection(db, item.col));
      stats[item.key] = snap.size;
    } catch {
      stats[item.key] = 0;
    }
  }

  return stats;
}

// Force Sync all mock data into Firestore ensuring 100% persistent storage on new deploy
export async function forceSyncAllToCloud(): Promise<number> {
  let count = 0;
  try {
    for (const item of MOCK_USERS) {
      if (!OLD_DEFAULT_USER_IDS.includes(item.id)) {
        await setDoc(doc(db, USERS_COL, item.id), cleanData(item), { merge: true });
        count++;
      }
    }
    for (const item of MOCK_MATERIALS) {
      await setDoc(doc(db, MATERIALS_COL, item.id), cleanData(item), { merge: true });
      count++;
    }
    for (const item of MOCK_QUIZZES) {
      await setDoc(doc(db, QUIZZES_COL, item.id), cleanData(item), { merge: true });
      count++;
    }
    for (const item of MOCK_BOOKS) {
      await setDoc(doc(db, BOOKS_COL, item.id), cleanData(item), { merge: true });
      count++;
    }
    for (const item of MOCK_VIDEOS) {
      await setDoc(doc(db, VIDEOS_COL, item.id), cleanData(item), { merge: true });
      count++;
    }
    for (const item of MOCK_ANNOUNCEMENTS) {
      await setDoc(doc(db, ANNOUNCEMENTS_COL, item.id), cleanData(item), { merge: true });
      count++;
    }
    for (const item of MOCK_SCHEDULES) {
      await setDoc(doc(db, SCHEDULES_COL, item.id), cleanData(item), { merge: true });
      count++;
    }
    const currentSettings = getLocalSchoolSettings();
    await setDoc(doc(db, SETTINGS_COL, 'school_settings'), cleanData(currentSettings), { merge: true });
    count++;
  } catch (err) {
    console.error('Error force syncing to cloud:', err);
  }
  return count;
}






export async function uploadLargeFileToFirestore(fileId: string, b64Data: string): Promise<number> {
  const CHUNK_SIZE = 900000;
  const chunks = Math.ceil(b64Data.length / CHUNK_SIZE);
  for (let i = 0; i < chunks; i++) {
    const chunkId = `${fileId}_chunk_${i}`;
    const chunkData = b64Data.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    await setDoc(doc(db, 'file_chunks', chunkId), {
       fileId,
       index: i,
       data: chunkData
    });
  }
  return chunks;
}

export async function downloadLargeFileFromFirestore(fileId: string, chunks: number): Promise<string> {
  let fullB64 = '';
  for (let i = 0; i < chunks; i++) {
    const chunkId = `${fileId}_chunk_${i}`;
    const snap = await getDoc(doc(db, 'file_chunks', chunkId));
    if (snap.exists()) {
      fullB64 += snap.data().data;
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

  try {
    for (const id of mockIds.materials) await deleteDoc(doc(db, MATERIALS_COL, id));
    for (const id of mockIds.books) await deleteDoc(doc(db, BOOKS_COL, id));
    for (const id of mockIds.videos) await deleteDoc(doc(db, VIDEOS_COL, id));
    for (const id of mockIds.quizzes) await deleteDoc(doc(db, QUIZZES_COL, id));
    for (const id of mockIds.announcements) await deleteDoc(doc(db, ANNOUNCEMENTS_COL, id));
    for (const id of mockIds.schedules) await deleteDoc(doc(db, SCHEDULES_COL, id));
    console.log('Mock content purged successfully');
  } catch (err) {
    console.warn('Error purging mock content:', err);
  }
}
