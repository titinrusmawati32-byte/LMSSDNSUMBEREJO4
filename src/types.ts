export type UserRole = 'admin' | 'guru' | 'siswa';

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
  avatar: string;
  identifierNumber: string; // NIP for Admin/Guru, NISN for Siswa
  departmentOrClass?: string;
  lastLogin?: string;
  status: 'active' | 'inactive';
  password?: string;
}

export interface SystemAnnouncement {
  id: string;
  title: string;
  content: string;
  targetRole: UserRole | 'all';
  date: string;
  author: string;
  important?: boolean;
}

export interface Course {
  id: string;
  code: string;
  title: string;
  teacherName: string;
  className: string;
  studentsCount: number;
  schedule: string;
  progressPercentage?: number;
  bannerColor: string;
}

export interface Assignment {
  id: string;
  courseTitle: string;
  title: string;
  deadline: string;
  status: 'pending' | 'submitted' | 'graded';
  score?: number;
  maxScore: number;
}

export interface AttendanceRecord {
  id: string;
  studentName: string;
  nisn: string;
  status: 'hadir' | 'izin' | 'sakit' | 'alpa';
  time?: string;
}

export interface LearningMaterial {
  id: string;
  title: string;
  subject: string;
  fileType: 'PDF' | 'PPT' | 'DOCX' | 'ZIP';
  fileSize: string;
  fileChunks?: number;
  uploadDate: string;
  teacherName: string;
  description: string;
  downloadCount: number;
  fileName?: string;
  fileUrl?: string;
  fileData?: string; // base64 or blob URL
}

export interface QuizQuestion {
  id: string;
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  imageUrl?: string;
  imageCaption?: string;
}

export interface QuizExam {
  id: string;
  title: string;
  subject: string;
  type: 'quiz' | 'ujian';
  durationMinutes: number;
  totalQuestions: number;
  deadline: string;
  teacherName: string;
  questions: QuizQuestion[];
  status: 'active' | 'closed';
  completedScore?: number;
}

export interface DigitalBook {
  id: string;
  title: string;
  author: string;
  subject: string;
  totalPages?: number;
  coverImage: string;
  description: string;
  fileSize: string;
  fileChunks?: number;
  rating: number;
  readCount: number;
  fileName?: string;
  fileUrl?: string;
  fileData?: string; // base64 or blob URL for uploaded PDF
  targetPage?: number;
  uploadDate?: string;
}

export interface LearningVideo {
  id: string;
  title: string;
  subject: string;
  duration: string;
  youtubeId: string;
  thumbnail: string;
  description: string;
  teacherName: string;
  uploadDate: string;
  viewsCount: number;
  videoUrl?: string;
  videoSourceType?: 'youtube' | 'gdrive' | 'url';
}

export type ScheduleDay = 'SENIN' | 'SELASA' | 'RABU' | 'KAMIS' | 'JUMAT' | 'SABTU';

export interface ClassSchedule {
  id: string;
  day: ScheduleDay;
  subject: string;
  className: string;
  timeStart: string;
  timeEnd: string;
  teacherName: string;
  roomOrNotes?: string;
  themeColor?: 'blue' | 'emerald' | 'purple' | 'amber' | 'rose' | 'indigo';
}

export interface StudentQuizSubmission {
  id: string; // `${studentId}_${quizId}`
  studentId: string;
  studentName: string;
  studentNisn: string;
  studentClass: string;
  quizId: string;
  quizTitle: string;
  subject: string;
  score: number;
  submittedAt: string;
  status: 'submitted';
}

export interface SchoolSettings {
  schoolName: string;
  schoolTagline: string;
  logoUrl?: string;
  loginBgUrl?: string;
  updatedAt?: string;
}



