import { SystemAnnouncement, Course, Assignment, UserProfile, LearningMaterial, QuizExam, DigitalBook, LearningVideo, ClassSchedule, SchoolSettings } from '../types';

export const DEFAULT_SCHOOL_SETTINGS: SchoolSettings = {
  schoolName: 'SD NEGERI SUMBEREJO 04',
  schoolTagline: 'Portal E-Learning & Manajemen Akademik',
  logoUrl: 'https://lh3.googleusercontent.com/aida/AEtjO1V_O1LkqpNTKLUgY46lUQNZ-98AfOCi-LyzExN_kh011sCNAEG7gS1zMhoI0e9f5thxqvJIXWDLwNX18QdX6PlK24ANim_2_jj_Q6Z9Oa_KUxEcDW41TTC8NsyQysJsnq_E5CU0zsQRxSTqbhz7N5xF8G4OM26zdNzz5kRadSxlsfYxU26L07DfDphdMt7y-Yv-tJOIvogq6ozlFOeFUossp0VF8tSoOq4VClwC1f5b_JNLVjfk70mJ7Hc',
  loginBgUrl: '',
  gdriveUrl: '',
  updatedAt: new Date().toISOString()
};

export const MOCK_USERS: UserProfile[] = [
  {
    id: 'usr-1',
    name: 'Administrator Pusat (Admin)',
    role: 'admin',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
    identifierNumber: 'admin',
    departmentOrClass: 'Divisi IT & Kurikulum',
    lastLogin: 'Hari ini, 14:15 WIB',
    status: 'active'
  }
];

export const MOCK_ANNOUNCEMENTS: SystemAnnouncement[] = [];

export const MOCK_COURSES: Course[] = [
  {
    id: 'crs-101',
    code: 'MAT-XI',
    title: 'Matematika Peminatan XI',
    teacherName: 'Siti Rahmawati, S.Pd., M.Si.',
    className: 'XI IPA 2',
    studentsCount: 36,
    schedule: 'Senin, 07:30 - 09:30 WIB',
    progressPercentage: 78,
    bannerColor: 'from-blue-600 to-indigo-700'
  },
  {
    id: 'crs-102',
    code: 'FIS-XI',
    title: 'Fisika Terapan XI',
    teacherName: 'Siti Rahmawati, S.Pd., M.Si.',
    className: 'XI IPA 2',
    studentsCount: 36,
    schedule: 'Rabu, 10:00 - 12:00 WIB',
    progressPercentage: 62,
    bannerColor: 'from-teal-600 to-emerald-700'
  },
  {
    id: 'crs-103',
    code: 'INF-XI',
    title: 'Informatika & Pemrograman Web',
    teacherName: 'Budi Santoso, S.T.',
    className: 'XI IPA 2',
    studentsCount: 36,
    schedule: 'Kamis, 08:00 - 10:00 WIB',
    progressPercentage: 85,
    bannerColor: 'from-purple-600 to-pink-700'
  },
  {
    id: 'crs-104',
    code: 'BIG-XI',
    title: 'Bahasa Inggris Tingkat Lanjut',
    teacherName: 'Dewi Lestari, M.Hum.',
    className: 'XI IPA 2',
    studentsCount: 36,
    schedule: 'Jumat, 08:00 - 09:30 WIB',
    progressPercentage: 90,
    bannerColor: 'from-amber-600 to-orange-700'
  }
];

export const MOCK_ASSIGNMENTS: Assignment[] = [
  {
    id: 'asg-1',
    courseTitle: 'Matematika Peminatan XI',
    title: 'Latihan 3: Persamaan Trigonometri & Sudut Ganda',
    deadline: '25 Agustus 2026, 23:59 WIB',
    status: 'pending',
    maxScore: 100
  },
  {
    id: 'asg-2',
    courseTitle: 'Fisika Terapan XI',
    title: 'Laporan Praktikum Gelombang Bunyi & Cahaya',
    deadline: '20 Agustus 2026, 17:00 WIB',
    status: 'graded',
    score: 92,
    maxScore: 100
  },
  {
    id: 'asg-3',
    courseTitle: 'Informatika',
    title: 'Proyek HTML & Tailwind CSS Responsif',
    deadline: '28 Agustus 2026, 23:59 WIB',
    status: 'submitted',
    maxScore: 100
  }
];

export const MOCK_MATERIALS: LearningMaterial[] = [];

export const MOCK_QUIZZES: QuizExam[] = [];

export const MOCK_BOOKS: DigitalBook[] = [];

export const MOCK_VIDEOS: LearningVideo[] = [];

export const MOCK_SCHEDULES: ClassSchedule[] = [];


