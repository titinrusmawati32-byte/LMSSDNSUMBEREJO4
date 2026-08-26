import { SystemAnnouncement, Course, Assignment, UserProfile, LearningMaterial, QuizExam, DigitalBook, LearningVideo, ClassSchedule, SchoolSettings } from '../types';

export const DEFAULT_SCHOOL_SETTINGS: SchoolSettings = {
  schoolName: 'SD NEGERI SUMBEREJO 04',
  schoolTagline: 'Portal E-Learning & Manajemen Akademik',
  logoUrl: 'https://lh3.googleusercontent.com/aida/AEtjO1V_O1LkqpNTKLUgY46lUQNZ-98AfOCi-LyzExN_kh011sCNAEG7gS1zMhoI0e9f5thxqvJIXWDLwNX18QdX6PlK24ANim_2_jj_Q6Z9Oa_KUxEcDW41TTC8NsyQysJsnq_E5CU0zsQRxSTqbhz7N5xF8G4OM26zdNzz5kRadSxlsfYxU26L07DfDphdMt7y-Yv-tJOIvogq6ozlFOeFUossp0VF8tSoOq4VClwC1f5b_JNLVjfk70mJ7Hc',
  loginBgUrl: '',
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

export const MOCK_ANNOUNCEMENTS: SystemAnnouncement[] = [
  {
    id: 'anc-1',
    title: 'Jadwal Ujian Tengah Semester (UTS) Ganjil T.A. 2026/2027',
    content: 'Pengumuman untuk seluruh Guru dan Siswa, jadwal pelaksanaan UTS dapat diunduh pada portal LMS mulai tanggal 1 September 2026.',
    targetRole: 'all',
    date: '22 Agustus 2026',
    author: 'Bagian Kurikulum',
    important: true
  },
  {
    id: 'anc-2',
    title: 'Batas Pengumpulan Nilai Tugas Mandiri Matematika XI',
    content: 'Diingatkan kepada seluruh siswa kelas XI IPA 2 untuk menyelesaikan Tugas Trigonometri sebelum pukul 23:59 WIB.',
    targetRole: 'siswa',
    date: '23 Agustus 2026',
    author: 'Siti Rahmawati, S.Pd.'
  },
  {
    id: 'anc-3',
    title: 'Pemeliharaan Rutin Server LMS & Update Modul Evaluasi',
    content: 'Sistem akan mengalami pemeliharaan terjadwal pada hari Sabtu pukul 22:00 WIB selama 1 jam.',
    targetRole: 'admin',
    date: '20 Agustus 2026',
    author: 'Tim Tim IT Pusat'
  }
];

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

export const MOCK_MATERIALS: LearningMaterial[] = [
  {
    id: 'mat-1',
    title: 'Modul Bab 3: Persamaan & Identitas Trigonometri Lengkap',
    subject: 'Matematika Peminatan XI',
    fileType: 'PDF',
    fileSize: '4.2 MB',
    uploadDate: '21 Agustus 2026',
    teacherName: 'Siti Rahmawati, S.Pd., M.Si.',
    description: 'Panduan rumus trigonometri, contoh soal pembahasan beserta latihan mandiri siswa.',
    downloadCount: 142
  },
  {
    id: 'mat-2',
    title: 'Slide Presentasi: Hukum Newton & Gelombang Mekanik',
    subject: 'Fisika Terapan XI',
    fileType: 'PPT',
    fileSize: '8.5 MB',
    uploadDate: '19 Agustus 2026',
    teacherName: 'Siti Rahmawati, S.Pd., M.Si.',
    description: 'Materi visual interaktif untuk pertemuan ke-4 kelas XI IPA.',
    downloadCount: 98
  },
  {
    id: 'mat-3',
    title: 'Handout Rangkuman Syntax HTML5 & CSS Grid Layout',
    subject: 'Informatika',
    fileType: 'DOCX',
    fileSize: '1.8 MB',
    uploadDate: '18 Agustus 2026',
    teacherName: 'Budi Santoso, S.T.',
    description: 'Cheat sheet kode dasar web development untuk pemula.',
    downloadCount: 175
  }
];

export const MOCK_QUIZZES: QuizExam[] = [
  {
    id: 'qz-1',
    title: 'Quiz Harian 1: Konsep Dasar Trigonometri',
    subject: 'Matematika Peminatan XI',
    type: 'quiz',
    durationMinutes: 20,
    totalQuestions: 5,
    deadline: '26 Agustus 2026, 23:59 WIB',
    teacherName: 'Siti Rahmawati, S.Pd.',
    status: 'active',
    questions: [
      {
        id: 'q1',
        questionText: 'Berapakah nilai dari sin(30°) + cos(60°)?',
        options: ['0.5', '1.0', '1.5', '2.0'],
        correctAnswerIndex: 1
      },
      {
        id: 'q2',
        questionText: 'Identitas utama trigonometri menyatakan bahwa sin²(x) + cos²(x) = ...',
        options: ['0', '1', 'tan(x)', 'sec(x)'],
        correctAnswerIndex: 1
      },
      {
        id: 'q3',
        questionText: 'Jika tan(x) = 1 pada kuadran I, maka besar sudut x adalah ...',
        options: ['30°', '45°', '60°', '90°'],
        correctAnswerIndex: 1
      },
      {
        id: 'q4',
        questionText: 'Manakah turunan pertama dari fungsi f(x) = sin(x)?',
        options: ['cos(x)', '-cos(x)', 'tan(x)', '-sin(x)'],
        correctAnswerIndex: 0
      },
      {
        id: 'q5',
        questionText: 'Nilai dari cos(90°) adalah ...',
        options: ['1', '0.5', '0', '-1'],
        correctAnswerIndex: 2
      }
    ]
  },
  {
    id: 'qz-2',
    title: 'Ujian Tengah Semester (UTS) Fisika XI',
    subject: 'Fisika Terapan XI',
    type: 'ujian',
    durationMinutes: 60,
    totalQuestions: 3,
    deadline: '30 Agustus 2026, 12:00 WIB',
    teacherName: 'Siti Rahmawati, S.Pd.',
    status: 'active',
    questions: [
      {
        id: 'fq1',
        questionText: 'Satuan Standar Internasional (SI) untuk mengukur Gaya adalah ...',
        options: ['Joule', 'Pascal', 'Newton', 'Watt'],
        correctAnswerIndex: 2
      },
      {
        id: 'fq2',
        questionText: 'Rumus dasar Hukum II Newton adalah ...',
        options: ['F = m × a', 'E = m × c²', 'V = I × R', 'P = F / A'],
        correctAnswerIndex: 0
      },
      {
        id: 'fq3',
        questionText: 'Gelombang yang arah getarnya tegak lurus terhadap arah rambatnya disebut ...',
        options: ['Gelombang Longitudinal', 'Gelombang Transversal', 'Gelombang Stasioner', 'Gelombang Elektromagnetik'],
        correctAnswerIndex: 1
      }
    ]
  }
];

export const MOCK_BOOKS: DigitalBook[] = [
  {
    id: 'bk-1',
    title: 'Buku Siswa Matematika Peminatan Kelas XI (Kurikulum Merdeka)',
    author: 'Kementerian Pendidikan & Kebudayaan RI',
    subject: 'Matematika Peminatan XI',
    totalPages: 248,
    coverImage: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=400',
    description: 'Buku teks resmi pelajaran matematika peminatan tingkat SMA/MA kelas XI edisi revisi terbaru.',
    fileSize: '18.4 MB',
    rating: 4.9,
    readCount: 312
  },
  {
    id: 'bk-2',
    title: 'Fisika Modern & Terapan Untuk SMA/MA XI',
    author: 'Prof. Dr. Supriyadi & Tim Penulis',
    subject: 'Fisika Terapan XI',
    totalPages: 310,
    coverImage: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&q=80&w=400',
    description: 'Panduan eksperimen fisika laboratorium, teori mekanika quantum dasar dan optika.',
    fileSize: '22.1 MB',
    rating: 4.8,
    readCount: 240
  },
  {
    id: 'bk-3',
    title: 'Pemrograman Web Modern dengan HTML, CSS & JavaScript',
    author: 'Ir. Budi Raharjo & M. Rizal',
    subject: 'Informatika',
    totalPages: 180,
    coverImage: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=400',
    description: 'E-Book lengkap panduan praktis coding frontend dan backend untuk siswa SMK/SMA.',
    fileSize: '12.6 MB',
    rating: 5.0,
    readCount: 450
  }
];

export const MOCK_VIDEOS: LearningVideo[] = [
  {
    id: 'vid-1',
    title: 'Penjelasan Mudah Trigonometri: Persamaan & Sudut Rangkap',
    subject: 'Matematika Peminatan XI',
    duration: '14:25',
    youtubeId: 'dQw4w9WgXcQ',
    thumbnail: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=500',
    description: 'Video penjelasan papan tulis digital mengenai trik cepat menghafal rumus kuadran trigonometri.',
    teacherName: 'Siti Rahmawati, S.Pd.',
    uploadDate: '22 Agustus 2026',
    viewsCount: 289
  },
  {
    id: 'vid-2',
    title: 'Simulasi Lab Fisika: Hukum Pembiasan Cahaya & Lensa',
    subject: 'Fisika Terapan XI',
    duration: '18:40',
    youtubeId: 'dQw4w9WgXcQ',
    thumbnail: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&q=80&w=500',
    description: 'Demonstrasi pembiasan prisma dan penggunaan laser pointer dalam menentukan indeks bias medium.',
    teacherName: 'Siti Rahmawati, S.Pd.',
    uploadDate: '20 Agustus 2026',
    viewsCount: 195
  },
  {
    id: 'vid-3',
    title: 'Tutorial Flexbox & Grid CSS Responsif Dalam 15 Menit',
    subject: 'Informatika',
    duration: '15:10',
    youtubeId: 'dQw4w9WgXcQ',
    thumbnail: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=500',
    description: 'Kupas tuntas tata letak komponen website modern dari nol.',
    teacherName: 'Budi Santoso, S.T.',
    uploadDate: '17 Agustus 2026',
    viewsCount: 512
  }
];

export const MOCK_SCHEDULES: ClassSchedule[] = [
  {
    id: 'sch-1',
    day: 'SENIN',
    subject: 'Matematika Dasar & Logika',
    className: 'Kelas 5A',
    timeStart: '07:30',
    timeEnd: '09:30',
    teacherName: 'Siti Rahmawati, S.Pd.',
    roomOrNotes: 'Ruang Kelas 5A',
    themeColor: 'blue'
  },
  {
    id: 'sch-2',
    day: 'SELASA',
    subject: 'Pendidikan Pancasila & Kewarganegaraan',
    className: 'Kelas 5A',
    timeStart: '08:00',
    timeEnd: '09:30',
    teacherName: 'Siti Rahmawati, S.Pd.',
    roomOrNotes: 'Ruang Kelas 5A',
    themeColor: 'amber'
  },
  {
    id: 'sch-3',
    day: 'RABU',
    subject: 'IPA & Eksperimen Sains Alam',
    className: 'Kelas 5A',
    timeStart: '10:00',
    timeEnd: '12:00',
    teacherName: 'Siti Rahmawati, S.Pd.',
    roomOrNotes: 'Laboratorium IPA & Sains',
    themeColor: 'emerald'
  },
  {
    id: 'sch-4',
    day: 'KAMIS',
    subject: 'Informatika & Literasi Digital',
    className: 'Kelas 5A',
    timeStart: '08:00',
    timeEnd: '10:00',
    teacherName: 'Budi Santoso, S.T.',
    roomOrNotes: 'Lab Komputer & Multimedia',
    themeColor: 'purple'
  },
  {
    id: 'sch-5',
    day: 'JUMAT',
    subject: 'Bahasa Indonesia & Pojok Literasi',
    className: 'Kelas 5A',
    timeStart: '08:00',
    timeEnd: '09:30',
    teacherName: 'Dewi Lestari, M.Hum.',
    roomOrNotes: 'Ruang Kelas 5A',
    themeColor: 'indigo'
  },
  {
    id: 'sch-6',
    day: 'SABTU',
    subject: 'PJOK & Senam Kesegaran Jasmani',
    className: 'Kelas 5A',
    timeStart: '07:30',
    timeEnd: '09:00',
    teacherName: 'Budi Santoso, S.T.',
    roomOrNotes: 'Lapangan Olahraga Sekolah',
    themeColor: 'rose'
  }
];


