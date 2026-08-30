import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookMarked, GraduationCap, Award, Calendar, CheckCircle2, Clock, LogOut, 
  FileText, ArrowRight, Bell, Sparkles, CheckSquare, Download, AlertCircle,
  FileUp, HelpCircle, Book, Video, Play, Eye, BookOpen, Star, Check, Menu, X,
  Image as ImageIcon, Search, ChevronRight, UserCheck, Flame, Trophy, Printer,
  MapPin, User
} from 'lucide-react';
import { UserProfile, LearningMaterial, QuizExam, DigitalBook, LearningVideo, SystemAnnouncement, ClassSchedule, ScheduleDay, SchoolSettings, StudentQuizSubmission, ContentLearningProgress } from '../types';
import { MOCK_COURSES, MOCK_ASSIGNMENTS } from '../data/mockData';
import { subscribeUsers, subscribeSubmissions, subscribeStudentProgress, updateStudentContentProgress, getLocalStudentProgress } from '../lib/lmsDb';
import { QuizExamModal } from './QuizExamModal';
import { BookReaderModal } from './BookReaderModal';
import { VideoPlayerModal } from './VideoPlayerModal';
import { UserProfileModal } from './UserProfileModal';
import { MaterialDetailModal } from './MaterialDetailModal';
import { FeatureHeaderBanner } from './FeatureHeaderBanner';
import { StudentLearningProgressWidget } from './StudentLearningProgressWidget';
import { LearningProgressDetailModal } from './LearningProgressDetailModal';

interface SiswaDashboardProps {
  currentUser: UserProfile;
  materials: LearningMaterial[];
  quizzes: QuizExam[];
  books: DigitalBook[];
  videos: LearningVideo[];
  announcements?: SystemAnnouncement[];
  schedules?: ClassSchedule[];
  onCompleteQuiz: (quizId: string, score: number) => void;
  onLogout: () => void;
  onUpdateCurrentUser?: (updatedUser: UserProfile) => void;
  isMobile?: boolean;
  schoolSettings?: SchoolSettings;
}

export const SiswaDashboard: React.FC<SiswaDashboardProps> = ({
  currentUser,
  materials,
  quizzes,
  books,
  videos,
  announcements = [],
  schedules = [],
  onCompleteQuiz,
  onLogout,
  onUpdateCurrentUser,
  schoolSettings
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'materials' | 'quizzes' | 'books' | 'videos' | 'courses' | 'schedule'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showRaporModal, setShowRaporModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedScheduleDay, setSelectedScheduleDay] = useState<'ALL' | ScheduleDay>('ALL');
  const [courseFilterDay, setCourseFilterDay] = useState<'ALL' | 'TODAY' | ScheduleDay>('ALL');
  const [courseSearch, setCourseSearch] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [studentsList, setStudentsList] = useState<UserProfile[]>([]);
  const [submissionsList, setSubmissionsList] = useState<StudentQuizSubmission[]>([]);

  // Subscribe to real-time users list to get current count of registered students
  React.useEffect(() => {
    const unsub = subscribeUsers((users) => {
      const students = (users || []).filter(u => u && u.role === 'siswa');
      setStudentsList(students);
    });
    return () => unsub();
  }, []);

  // Subscribe to real-time quiz submissions to resolve student's completed scores
  React.useEffect(() => {
    const unsub = subscribeSubmissions((subs) => {
      setSubmissionsList(subs || []);
    });
    return () => unsub();
  }, []);

  // Map quizzes to include completed scores dynamically resolved from personal submissions
  const quizzesToUse = React.useMemo(() => {
    return quizzes.map(q => {
      const userSub = submissionsList.find(s => s.studentId === currentUser.id && s.quizId === q.id);
      return {
        ...q,
        completedScore: userSub ? userSub.score : undefined
      };
    });
  }, [quizzes, submissionsList, currentUser.id]);

  // Determine current day in Indonesian for SD Negeri Sumberejo 04
  const dayIndex = new Date().getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const DAYS_LIST: ScheduleDay[] = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
  const todayDayName: ScheduleDay | null = dayIndex >= 1 && dayIndex <= 6 ? DAYS_LIST[dayIndex - 1] : null;

  // Daily missions interactive state adapting dynamically to available content
  const [dailyMissions, setDailyMissions] = useState<Array<{ id: string; text: string; points: number; completed: boolean }>>([]);

  React.useEffect(() => {
    const list = [];
    if (materials && materials.length > 0) {
      list.push({ id: 'm-mat', text: `Pelajari Modul Bahan Ajar (${materials.length} Modul Available)`, points: 50, completed: false });
    }
    if (quizzesToUse && quizzesToUse.length > 0) {
      list.push({ id: 'm-quiz', text: `Kerjakan Kuis & Ujian (${quizzesToUse.length} Paket Soal)`, points: 75, completed: false });
    }
    if (books && books.length > 0) {
      list.push({ id: 'm-book', text: `Baca Buku Digital E-Book (${books.length} Buku Available)`, points: 40, completed: false });
    }
    if (videos && videos.length > 0) {
      list.push({ id: 'm-vid', text: `Saksikan Video Ruang Vidio (${videos.length} Video Available)`, points: 50, completed: false });
    }
    list.push({ id: 'm-att', text: 'Konfirmasi Presensi Kehadiran Harian', points: 30, completed: true });
    setDailyMissions(list);
  }, [materials.length, quizzesToUse.length, books.length, videos.length]);

  // Modal active objects
  const [selectedQuiz, setSelectedQuiz] = useState<QuizExam | null>(null);
  const [selectedBook, setSelectedBook] = useState<DigitalBook | null>(null);
  const [selectedBookTargetPage, setSelectedBookTargetPage] = useState<number | undefined>(undefined);
  const [selectedMaterialForReader, setSelectedMaterialForReader] = useState<LearningMaterial | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<LearningVideo | null>(null);
  const [showProgressDetailModal, setShowProgressDetailModal] = useState<boolean>(false);

  // Filter states for progress tabs
  const [materialProgressFilter, setMaterialProgressFilter] = useState<'ALL' | 'UNSTUDIED' | 'COMPLETED'>('ALL');
  const [bookProgressFilter, setBookProgressFilter] = useState<'ALL' | 'READING' | 'COMPLETED'>('ALL');

  // Studied Materials Tracking & Real-Time Student Progress Map
  const [studentProgressMap, setStudentProgressMap] = useState<Record<string, ContentLearningProgress>>(() => {
    return getLocalStudentProgress(currentUser.id);
  });

  const [studiedMaterialIds, setStudiedMaterialIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('edusmart_studied_materials') || '[]');
    } catch {
      return [];
    }
  });

  // Subscribe to real-time student progress
  React.useEffect(() => {
    if (!currentUser?.id) return;
    const unsub = subscribeStudentProgress(currentUser.id, (prog) => {
      if (prog) {
        setStudentProgressMap(prog);
        const completedIds = Object.values(prog)
          .filter(item => item.contentType === 'material' && item.isCompleted)
          .map(item => item.contentId);
        if (completedIds.length > 0) {
          setStudiedMaterialIds(prev => Array.from(new Set([...prev, ...completedIds])));
        }
      }
    });
    return () => unsub();
  }, [currentUser.id]);

  // Helper to record learning progress in real-time
  const handleRecordProgress = (
    contentId: string,
    contentType: 'material' | 'book' | 'video' | 'quiz',
    title: string,
    subject: string,
    percent: number,
    isCompleted: boolean,
    currentPage?: number,
    totalPages?: number,
    score?: number
  ) => {
    const item: ContentLearningProgress = {
      contentId,
      contentType,
      title,
      subject,
      percent: Math.min(100, Math.max(0, percent)),
      isCompleted,
      currentPage,
      totalPages,
      score,
      lastAccessedAt: new Date().toISOString()
    };
    updateStudentContentProgress(currentUser.id, item);

    // If it's a material completion, sync studiedMaterialIds
    if (contentType === 'material') {
      if (isCompleted) {
        setStudiedMaterialIds(prev => Array.from(new Set([...prev, contentId])));
      } else {
        setStudiedMaterialIds(prev => prev.filter(id => id !== contentId));
      }
    }
  };

  const handleToggleStudiedMaterial = (materialId: string, isStudied: boolean) => {
    const targetMat = materials.find(m => m.id === materialId);
    handleRecordProgress(
      materialId,
      'material',
      targetMat?.title || 'Bahan Ajar',
      targetMat?.subject || 'Umum',
      isStudied ? 100 : 0,
      isStudied
    );
  };

  // Group schedules by subject to dynamically compute Mata Pelajaran
  const subjectsMap = new Map<string, ClassSchedule[]>();
  schedules.forEach(sch => {
    const key = sch.subject.trim();
    if (!subjectsMap.has(key)) {
      subjectsMap.set(key, []);
    }
    subjectsMap.get(key)!.push(sch);
  });

  // Calculate subjects with dynamic schedule data and progress
  const subjectsWithSchedule = Array.from(subjectsMap.entries()).map(([subjectName, sessions]) => {
    const firstSession = sessions[0];
    const days = Array.from(new Set(sessions.map(s => s.day)));
    const isToday = todayDayName ? days.includes(todayDayName) : false;
    const themeColor = firstSession.themeColor || 'blue';
    const teacherName = firstSession.teacherName || 'Guru Pengampu';
    const className = firstSession.className || 'Kelas 5A';
    const timeSummary = sessions.map(s => `${s.day} (${s.timeStart} - ${s.timeEnd})`).join(', ');
    const roomSummary = Array.from(new Set(sessions.map(s => s.roomOrNotes).filter(Boolean))).join(', ') || 'Ruang Kelas';

    // Normalized keyword search for related items
    const normSubject = (subjectName || '').toLowerCase().replace(/[^a-z0-9]/g, ' ');
    const subjectKeywords = normSubject.split(' ').filter(k => k.length > 2);

    const matchesItem = (itemText?: string) => {
      if (!itemText) return false;
      const norm = itemText.toLowerCase().replace(/[^a-z0-9]/g, ' ');
      if (norm.includes(normSubject) || (normSubject && normSubject.includes(norm))) return true;
      return subjectKeywords.some(kw => norm.includes(kw));
    };

    const relatedMaterials = materials.filter(m => matchesItem(m.subject) || matchesItem(m.title));
    const relatedQuizzes = quizzesToUse.filter(q => matchesItem(q.subject) || matchesItem(q.title));
    const relatedVideos = videos.filter(v => matchesItem(v.subject) || matchesItem(v.title));
    const relatedBooks = books.filter(b => matchesItem(b.subject) || matchesItem(b.title));

    // Dynamic quiz submissions & scores for this subject
    const completedQuizzes = relatedQuizzes.filter(q => q.completedScore !== undefined);
    const totalQuizScore = completedQuizzes.reduce((acc, q) => acc + (q.completedScore || 0), 0);
    const avgScore = completedQuizzes.length > 0 ? Math.round(totalQuizScore / completedQuizzes.length) : null;

    // Exact dynamic progress calculation for this subject based on persistent progress
    const completedMatCount = relatedMaterials.filter(m => studentProgressMap[`material_${m.id}`]?.isCompleted || studiedMaterialIds.includes(m.id)).length;
    const completedQuizCount = completedQuizzes.length;
    const totalSubjectItems = relatedMaterials.length + relatedQuizzes.length + relatedBooks.length + relatedVideos.length;
    
    let progressPercentage = 0;
    if (totalSubjectItems > 0) {
      let earnedPoints = 0;
      let maxPoints = 0;
      
      if (relatedMaterials.length > 0) {
        maxPoints += relatedMaterials.length * 40;
        earnedPoints += completedMatCount * 40;
      }
      if (relatedQuizzes.length > 0) {
        maxPoints += relatedQuizzes.length * 35;
        earnedPoints += completedQuizCount * 35;
      }
      if (relatedBooks.length > 0) {
        maxPoints += relatedBooks.length * 15;
        const booksDone = relatedBooks.filter(b => studentProgressMap[`book_${b.id}`]?.isCompleted || (studentProgressMap[`book_${b.id}`]?.percent || 0) >= 50).length;
        earnedPoints += booksDone * 15;
      }
      if (relatedVideos.length > 0) {
        maxPoints += relatedVideos.length * 10;
        const vidsDone = relatedVideos.filter(v => studentProgressMap[`video_${v.id}`]?.isCompleted || (studentProgressMap[`video_${v.id}`]?.percent || 0) >= 80).length;
        earnedPoints += vidsDone * 10;
      }
      progressPercentage = maxPoints > 0 ? Math.round((earnedPoints / maxPoints) * 100) : 0;
    } else {
      progressPercentage = 0;
    }

    return {
      id: firstSession.id,
      subjectName,
      sessions,
      days,
      isToday,
      themeColor,
      teacherName,
      className,
      timeSummary,
      roomSummary,
      relatedMaterials,
      relatedQuizzes,
      completedQuizzes,
      relatedVideos,
      relatedBooks,
      avgScore,
      progressPercentage
    };
  });

  // Filtered courses based on day filter and search
  const filteredCourses = subjectsWithSchedule.filter(course => {
    const matchDay = 
      courseFilterDay === 'ALL' ? true :
      courseFilterDay === 'TODAY' ? course.isToday :
      course.days.includes(courseFilterDay);

    const qCourse = (courseSearch || '').toLowerCase();
    const matchSearch = 
      (course.subjectName || '').toLowerCase().includes(qCourse) ||
      (course.teacherName || '').toLowerCase().includes(qCourse) ||
      (course.roomSummary || '').toLowerCase().includes(qCourse) ||
      (course.timeSummary || '').toLowerCase().includes(qCourse);

    return matchDay && matchSearch;
  });

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const toggleMission = (id: string) => {
    setDailyMissions(prev => prev.map(m => {
      if (m.id === id) {
        const nextState = !m.completed;
        if (nextState) {
          triggerToast(`Hebat! Misi "${m.text}" selesai (+${m.points} Poin Pintar) 🌟`);
        }
        return { ...m, completed: nextState };
      }
      return m;
    }));
  };

  const totalPoints = dailyMissions
    .filter(m => m.completed)
    .reduce((acc, curr) => acc + curr.points, 250);

  const safeSearchQuery = (searchQuery || '').toLowerCase();

  // Filtered materials with progress filtering
  const filteredMaterials = materials.filter(m => {
    if (!m) return false;
    const isStudied = studiedMaterialIds.includes(m.id) || (studentProgressMap[`material_${m.id}`]?.isCompleted === true);
    if (materialProgressFilter === 'UNSTUDIED' && isStudied) return false;
    if (materialProgressFilter === 'COMPLETED' && !isStudied) return false;
    return (
      (m.title || '').toLowerCase().includes(safeSearchQuery) ||
      (m.subject || '').toLowerCase().includes(safeSearchQuery) ||
      (m.teacherName || '').toLowerCase().includes(safeSearchQuery)
    );
  });

  // Filtered books with progress filtering
  const filteredBooks = books.filter(b => {
    if (!b) return false;
    const prog = studentProgressMap[`book_${b.id}`];
    const isCompleted = prog?.isCompleted === true || (prog?.currentPage && b.totalPages && prog.currentPage >= b.totalPages);
    const isReading = (prog?.percent || 0) > 0 && !isCompleted;
    if (bookProgressFilter === 'READING' && !isReading) return false;
    if (bookProgressFilter === 'COMPLETED' && !isCompleted) return false;
    return (
      (b.title || '').toLowerCase().includes(safeSearchQuery) ||
      (b.subject || '').toLowerCase().includes(safeSearchQuery) ||
      (b.author || '').toLowerCase().includes(safeSearchQuery)
    );
  });

  // Filtered quizzes
  const filteredQuizzes = quizzesToUse.filter(q => {
    if (!q) return false;
    return (
      (q.title || '').toLowerCase().includes(safeSearchQuery) ||
      (q.subject || '').toLowerCase().includes(safeSearchQuery)
    );
  });

  return (
    <div 
      className="min-h-screen bg-slate-950 dark:bg-slate-950 text-slate-100 flex font-sans relative overflow-x-hidden"
      style={{
        backgroundImage: `linear-gradient(rgba(8, 13, 26, 0.93), rgba(15, 23, 42, 0.97)), url('https://lh3.googleusercontent.com/aida/AEtjO1VMSq-yEve9eDK-HbiX05XXM1tWNRQcmN1mGqMKXuI8x4tT7nGnbUONX7eVOYmsosb1t-vmahPyLUvGTFoHnJ75vJQmH_wfiYmkrjlrZkpuBTfxk9r9EwB3epWknIK973-hp1YuL9pAkAGCkommA2_ttG9xlIpp4a_1HstcoP_TLVi7P2uax87gdUc_AP1UalW0jx9P62jALfVL_-t18zTi-PM2jeJ3dEbbC_bWYSVs3sI7WzGmkLfFT6VR')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* SideNavBar (Desktop & Mobile Drawer) */}
      <aside className={`
        fixed md:sticky top-0 left-0 z-50 h-screen ${isSidebarCollapsed ? 'w-20' : 'w-72'} bg-slate-900/95 backdrop-blur-md border-r border-slate-800 
        flex flex-col justify-between p-4 sm:p-6 transition-all duration-300 ease-in-out shrink-0 glass-panel shadow-lg
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="flex flex-col h-full overflow-hidden">
          {/* School Brand Header */}
          <div className="flex flex-col items-center mb-6 pb-4 border-b border-slate-800 text-center relative">
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="md:hidden absolute right-0 top-0 p-1.5 text-slate-400 hover:text-white rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
            <img 
              alt="School Logo" 
              className={`${isSidebarCollapsed ? 'w-10 h-10 mb-1 p-1' : 'w-20 h-20 mb-3 p-2'} transition-all rounded-full bg-slate-800 shadow-3d border-2 border-slate-700 object-contain`} 
              src={schoolSettings?.logoUrl || "https://lh3.googleusercontent.com/aida/AEtjO1V_O1LkqpNTKLUgY46lUQNZ-98AfOCi-LyzExN_kh011sCNAEG7gS1zMhoI0e9f5thxqvJIXWDLwNX18QdX6PlK24ANim_2_jj_Q6Z9Oa_KUxEcDW41TTC8NsyQysJsnq_E5CU0zsQRxSTqbhz7N5xF8G4OM26zdNzz5kRadSxlsfYxU26L07DfDphdMt7y-Yv-tJOIvogq6ozlFOeFUossp0VF8tSoOq4VClwC1f5b_JNLVjfk70mJ7Hc"}
            />
            {!isSidebarCollapsed && (
              <>
                <h2 className="font-bold text-xl text-sky-400 tracking-tight leading-tight">
                  EduPortal Fun
                </h2>
              </>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="flex-grow flex flex-col gap-1.5 overflow-y-auto pr-1 pb-2">
            {/* 1. Dashboard Tab */}
            <button
              onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}
              title="Dashboard Siswa"
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center py-3' : 'justify-between px-3.5 py-2.5'} rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/25 font-extrabold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Sparkles className={`w-4 h-4 ${activeTab === 'dashboard' ? 'text-amber-800' : 'text-amber-400'}`} />
                {!isSidebarCollapsed && <span>Dashboard</span>}
              </div>
              {!isSidebarCollapsed && <span className={`w-2 h-2 rounded-full ${activeTab === 'dashboard' ? 'bg-amber-600' : 'bg-transparent'}`} />}
            </button>

            {/* 2. Bahan Ajar Tab */}
            <button
              onClick={() => { setActiveTab('materials'); setIsMobileMenuOpen(false); }}
              title="Bahan Ajar"
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center py-3' : 'justify-between px-3.5 py-2.5'} rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activeTab === 'materials'
                  ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/25 font-extrabold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <FileUp className="w-4 h-4" />
                {!isSidebarCollapsed && <span>Bahan Ajar</span>}
              </div>
              {!isSidebarCollapsed && (
                <span className={`px-2 py-0.5 text-[10px] rounded-full font-mono font-bold ${
                  activeTab === 'materials' ? 'bg-sky-500/20 text-white' : 'bg-slate-800 text-sky-400'
                }`}>{materials.length}</span>
              )}
            </button>

            {/* 3. Tugas & Kuis Tab */}
            <button
              onClick={() => { setActiveTab('quizzes'); setIsMobileMenuOpen(false); }}
              title="Tugas & Kuis"
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center py-3' : 'justify-between px-3.5 py-2.5'} rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activeTab === 'quizzes'
                  ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/25 font-extrabold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <HelpCircle className="w-4 h-4" />
                {!isSidebarCollapsed && <span>Tugas & Kuis</span>}
              </div>
              {!isSidebarCollapsed && (
                <span className={`px-2 py-0.5 text-[10px] rounded-full font-mono font-bold ${
                  activeTab === 'quizzes' ? 'bg-sky-500/20 text-white' : 'bg-slate-800 text-sky-400'
                }`}>{quizzes.length}</span>
              )}
            </button>

            {/* 4. Buku Digital Tab */}
            <button
              onClick={() => { setActiveTab('books'); setIsMobileMenuOpen(false); }}
              title="Buku Digital"
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center py-3' : 'justify-between px-3.5 py-2.5'} rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activeTab === 'books'
                  ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/25 font-extrabold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Book className="w-4 h-4" />
                {!isSidebarCollapsed && <span>Buku Digital</span>}
              </div>
              {!isSidebarCollapsed && (
                <span className={`px-2 py-0.5 text-[10px] rounded-full font-mono font-bold ${
                  activeTab === 'books' ? 'bg-sky-500/20 text-white' : 'bg-slate-800 text-sky-400'
                }`}>{books.length}</span>
              )}
            </button>

            {/* 5. Video Tab */}
            <button
              onClick={() => { setActiveTab('videos'); setIsMobileMenuOpen(false); }}
              title="Ruang Video"
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center py-3' : 'justify-between px-3.5 py-2.5'} rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activeTab === 'videos'
                  ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/25 font-extrabold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Video className="w-4 h-4" />
                {!isSidebarCollapsed && <span>Ruang Video</span>}
              </div>
              {!isSidebarCollapsed && (
                <span className={`px-2 py-0.5 text-[10px] rounded-full font-mono font-bold ${
                  activeTab === 'videos' ? 'bg-sky-500/20 text-white' : 'bg-slate-800 text-sky-400'
                }`}>{videos.length}</span>
              )}
            </button>

            {/* 6. Jadwal Kelas Tab */}
            <button
              onClick={() => { setActiveTab('schedule'); setIsMobileMenuOpen(false); }}
              title="Jadwal Kelas"
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center py-3' : 'justify-between px-3.5 py-2.5'} rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activeTab === 'schedule'
                  ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/25 font-extrabold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4" />
                {!isSidebarCollapsed && <span>Jadwal Kelas</span>}
              </div>
              {!isSidebarCollapsed && <span className={`w-2 h-2 rounded-full ${activeTab === 'schedule' ? 'bg-amber-600' : 'bg-transparent'}`} />}
            </button>

            {/* 7. Mata Pelajaran Tab */}
            <button
              onClick={() => { setActiveTab('courses'); setIsMobileMenuOpen(false); }}
              title="Mata Pelajaran"
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center py-3' : 'justify-between px-3.5 py-2.5'} rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activeTab === 'courses'
                  ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/25 font-extrabold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <BookOpen className="w-4 h-4" />
                {!isSidebarCollapsed && <span>Mata Pelajaran</span>}
              </div>
              {!isSidebarCollapsed && (
                <span className={`px-2 py-0.5 text-[10px] rounded-full font-mono font-bold ${
                  activeTab === 'courses' ? 'bg-sky-500/20 text-white' : 'bg-slate-800 text-sky-400'
                }`}>{subjectsWithSchedule.length}</span>
              )}
            </button>
          </nav>

          {/* Quick Action: Buka Rapor & Bottom Section */}
          <div className="pt-4 border-t border-slate-800 space-y-2">
            <button 
              onClick={() => setShowRaporModal(true)}
              title="Buka Rapor Siswa"
              className={`w-full bg-blue-600 hover:bg-blue-500 text-white ${isSidebarCollapsed ? 'py-3 px-0 justify-center' : 'py-3.5 px-4 justify-center gap-2'} rounded-full font-bold text-xs shadow-3d active:shadow-3d-pressed flex items-center cursor-pointer transition-all duration-100`}
            >
              <Trophy className="w-4 h-4 text-amber-300" />
              {!isSidebarCollapsed && <span>Buka Rapor Siswa</span>}
            </button>

            <button
              onClick={() => setShowProfileModal(true)}
              title="Profil Siswa"
              className={`w-full text-slate-300 hover:bg-slate-800 rounded-full ${isSidebarCollapsed ? 'py-2.5 px-0 justify-center' : 'py-2.5 px-4 gap-3'} font-bold text-xs flex items-center transition-all cursor-pointer`}
            >
              <GraduationCap className="w-4 h-4 text-sky-400" />
              {!isSidebarCollapsed && <span>Profil Siswa</span>}
            </button>

            <button
              onClick={onLogout}
              title="Logout"
              className={`w-full text-rose-400 hover:bg-rose-950/40 rounded-full ${isSidebarCollapsed ? 'py-2.5 px-0 justify-center' : 'py-2.5 px-4 gap-3'} font-bold text-xs flex items-center transition-all cursor-pointer`}
            >
              <LogOut className="w-4 h-4" />
              {!isSidebarCollapsed && <span>Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Backdrop for mobile drawer */}
      {isMobileMenuOpen && (
        <div 
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      {/* Main Content Container */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* TopNavBar */}
        <header className="bg-slate-900/90 backdrop-blur-md sticky top-0 z-30 shadow-sm flex items-center justify-between px-4 sm:px-8 py-3.5 w-full border-b border-slate-800 glass-panel">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden text-slate-200 p-2 rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="hidden md:flex items-center justify-center w-10 h-10 rounded-xl hover:bg-slate-800 transition-colors text-slate-300 hover:text-white cursor-pointer"
              title={isSidebarCollapsed ? "Buka Navigasi Samping" : "Tutup Navigasi Samping"}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <img 
                alt="School Logo" 
                className="w-8 h-8 rounded-full border border-slate-700 p-0.5 md:hidden object-contain bg-slate-900" 
                src={schoolSettings?.logoUrl || "https://lh3.googleusercontent.com/aida/AEtjO1V_O1LkqpNTKLUgY46lUQNZ-98AfOCi-LyzExN_kh011sCNAEG7gS1zMhoI0e9f5thxqvJIXWDLwNX18QdX6PlK24ANim_2_jj_Q6Z9Oa_KUxEcDW41TTC8NsyQysJsnq_E5CU0zsQRxSTqbhz7N5xF8G4OM26zdNzz5kRadSxlsfYxU26L07DfDphdMt7y-Yv-tJOIvogq6ozlFOeFUossp0VF8tSoOq4VClwC1f5b_JNLVjfk70mJ7Hc"}
              />
              <h1 className="font-extrabold text-lg sm:text-xl text-sky-400">
                {schoolSettings?.schoolName || "SD Negeri Sumberejo 04"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
            {/* Quick Search */}
            <div className="relative hidden sm:block">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-800 text-slate-100 placeholder-slate-500 rounded-full py-2 pl-11 pr-4 border-2 border-slate-700 focus:border-blue-500 focus:ring-0 focus:outline-none w-48 lg:w-64 text-xs font-semibold transition-all" 
                placeholder="Cari materi, kuis..." 
                type="text"
              />
            </div>

            {/* Poin Pintar Badge */}
            <div className="flex items-center gap-1.5 bg-amber-500/20 border border-amber-400/50 px-3 py-1.5 rounded-full shadow-xs">
              <Star className="w-4 h-4 text-amber-300 fill-amber-300" />
              <span className="text-xs font-extrabold text-amber-200">{totalPoints} Poin</span>
            </div>

            {/* Student Profile avatar */}
            <div className="flex items-center gap-3 border-l-2 border-slate-800 pl-3 sm:pl-5">
              <div className="text-right hidden sm:block">
                <p className="font-bold text-xs text-slate-100">{currentUser.name}</p>
                <p className="text-[11px] font-semibold text-amber-400">{currentUser.departmentOrClass || 'Kelas Siswa'}</p>
              </div>
              <img 
                onClick={() => setShowProfileModal(true)}
                className="w-10 h-10 rounded-full object-cover border-2 border-blue-500 p-0.5 cursor-pointer shadow-sm hover:scale-105 transition-transform" 
                alt={currentUser.name} 
                src={currentUser.avatar}
              />
            </div>
          </div>
        </header>

        {/* Main Content Body */}
        <main className="flex-1 p-4 sm:p-8 pb-24 sm:pb-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* TAB 0: DASHBOARD OVERVIEW (Bento Grid & Learning Progress) */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Header Greeting */}
              <div className="mb-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-1 font-display">
                  Halo, Sahabat Pintar! 👋
                </h1>
                <p className="text-sm sm:text-base text-slate-300 font-medium">
                  Siap untuk petualangan belajar hari ini?
                </p>
              </div>

              {/* Interactive Student Learning Progress Tracker Widget */}
              <StudentLearningProgressWidget
                currentUser={currentUser}
                materials={materials}
                quizzes={quizzesToUse}
                books={books}
                videos={videos}
                studentProgressMap={studentProgressMap}
                onOpenMaterial={(mat) => setSelectedMaterialForReader(mat)}
                onOpenBook={(bk, targetPage) => {
                  setSelectedBook(bk);
                  setSelectedBookTargetPage(targetPage);
                }}
                onOpenQuiz={(qz) => setSelectedQuiz(qz)}
                onOpenVideo={(vid) => setSelectedVideo(vid)}
                onOpenDetailModal={() => setShowProgressDetailModal(true)}
                onNavigateTab={(tab) => setActiveTab(tab)}
              />

              {/* Real-Time Visual Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Card 1: Jumlah Materi Aktif */}
                <div 
                  onClick={() => setActiveTab('materials')}
                  className="glass-card rounded-2xl p-5 border border-sky-500/30 relative overflow-hidden group hover:border-sky-400/60 transition-all shadow-md cursor-pointer"
                >
                  <div className="absolute -right-4 -top-4 w-20 h-20 bg-sky-500/15 rounded-full blur-xl group-hover:bg-sky-500/30 transition-all" />
                  <div className="flex justify-between items-start mb-2 relative z-10">
                    <span className="text-xs font-bold text-slate-300">Jumlah Materi Aktif</span>
                    <span className="flex items-center gap-1.5 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping"></span> Real-Time
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 relative z-10 mt-1">
                    <span className="text-3xl font-extrabold text-white font-display">{materials.length}</span>
                    <span className="text-xs text-sky-400 font-semibold">Modul Materi</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 relative z-10">
                    <span>Materi & Dokumen Belajar</span>
                    <BookOpen className="w-4 h-4 text-sky-400" />
                  </div>
                </div>

                {/* Card 2: Jumlah Kuis & Ujian Aktif */}
                <div 
                  onClick={() => setActiveTab('quizzes')}
                  className="glass-card rounded-2xl p-5 border border-amber-500/30 relative overflow-hidden group hover:border-amber-400/60 transition-all shadow-md cursor-pointer"
                >
                  <div className="absolute -right-4 -top-4 w-20 h-20 bg-amber-500/15 rounded-full blur-xl group-hover:bg-amber-500/30 transition-all" />
                  <div className="flex justify-between items-start mb-2 relative z-10">
                    <span className="text-xs font-bold text-slate-300">Jumlah Kuis & Ujian</span>
                    <span className="flex items-center gap-1.5 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span> Real-Time
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 relative z-10 mt-1">
                    <span className="text-3xl font-extrabold text-white font-display">{quizzes.length}</span>
                    <span className="text-xs text-amber-400 font-semibold">Paket Soal</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 relative z-10">
                    <span>Evaluasi & Ujian Siap</span>
                    <HelpCircle className="w-4 h-4 text-amber-400" />
                  </div>
                </div>

                {/* Card 3: Jumlah Siswa Terdaftar */}
                <div 
                  className="glass-card rounded-2xl p-5 border border-emerald-500/30 relative overflow-hidden group hover:border-emerald-400/60 transition-all shadow-md"
                >
                  <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-500/15 rounded-full blur-xl group-hover:bg-emerald-500/30 transition-all" />
                  <div className="flex justify-between items-start mb-2 relative z-10">
                    <span className="text-xs font-bold text-slate-300">Siswa Terdaftar</span>
                    <span className="flex items-center gap-1.5 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> Real-Time
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 relative z-10 mt-1">
                    <span className="text-3xl font-extrabold text-white font-display">{studentsList.length || 25}</span>
                    <span className="text-xs text-emerald-400 font-semibold">Teman Sekelas</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 relative z-10">
                    <span>Peserta Didik Aktif</span>
                    <GraduationCap className="w-4 h-4 text-emerald-400" />
                  </div>
                </div>
              </div>

              {/* Dashboard Grid (Bento Style) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: 6 Big Module Cards */}
                <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 content-start items-start">
                  {/* Card 1: Bahan Ajar */}
                  <div 
                    onClick={() => setActiveTab('materials')}
                    className="rounded-3xl p-5 flex flex-col items-center text-center shadow-lg hover:scale-105 transition-all cursor-pointer group bg-gradient-to-br from-sky-500/10 to-blue-600/5 border border-sky-500/30 hover:border-sky-400/50 hover:shadow-sky-500/20 relative overflow-hidden"
                  >
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-sky-500/20 rounded-full blur-2xl group-hover:bg-sky-500/30 transition-colors pointer-events-none" />
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-lg shadow-sky-500/30 relative z-10">
                      <BookOpen className="w-7 h-7" />
                    </div>
                    <h3 className="text-base font-extrabold text-sky-400 font-display mb-0.5 relative z-10">Bahan Ajar</h3>
                    <p className="text-[11px] text-slate-300 font-medium relative z-10">Materi & Dokumen</p>
                  </div>

                  {/* Card 2: Tugas & Kuis */}
                  <div 
                    onClick={() => setActiveTab('quizzes')}
                    className="rounded-3xl p-5 flex flex-col items-center text-center shadow-lg hover:scale-105 transition-all cursor-pointer group bg-gradient-to-br from-amber-500/10 to-orange-600/5 border border-amber-500/30 hover:border-amber-400/50 hover:shadow-amber-500/20 relative overflow-hidden"
                  >
                    <div className="absolute -left-4 -bottom-4 w-24 h-24 bg-amber-500/20 rounded-full blur-2xl group-hover:bg-amber-500/30 transition-colors pointer-events-none" />
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 text-white flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-lg shadow-amber-500/30 relative z-10">
                      <HelpCircle className="w-7 h-7" />
                    </div>
                    <h3 className="text-base font-extrabold text-amber-400 font-display mb-0.5 relative z-10">Tugas & Kuis</h3>
                    <p className="text-[11px] text-slate-300 font-medium relative z-10">Uji kemampuanmu!</p>
                  </div>

                  {/* Card 3: Buku Digital */}
                  <div 
                    onClick={() => setActiveTab('books')}
                    className="rounded-3xl p-5 flex flex-col items-center text-center shadow-lg hover:scale-105 transition-all cursor-pointer group bg-gradient-to-br from-indigo-500/10 to-purple-600/5 border border-indigo-500/30 hover:border-indigo-400/50 hover:shadow-indigo-500/20 relative overflow-hidden"
                  >
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500/20 rounded-full blur-2xl group-hover:bg-indigo-500/30 transition-colors pointer-events-none" />
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-lg shadow-indigo-500/30 relative z-10">
                      <Book className="w-7 h-7" />
                    </div>
                    <h3 className="text-base font-extrabold text-indigo-400 font-display mb-0.5 relative z-10">Buku Digital</h3>
                    <p className="text-[11px] text-slate-300 font-medium relative z-10">E-Book Kurikulum</p>
                  </div>

                  {/* Card 4: Ruang Video */}
                  <div 
                    onClick={() => setActiveTab('videos')}
                    className="rounded-3xl p-5 flex flex-col items-center text-center shadow-lg hover:scale-105 transition-all cursor-pointer group bg-gradient-to-br from-emerald-500/10 to-teal-600/5 border border-emerald-500/30 hover:border-emerald-400/50 hover:shadow-emerald-500/20 relative overflow-hidden"
                  >
                    <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-emerald-500/20 rounded-full blur-2xl group-hover:bg-emerald-500/30 transition-colors pointer-events-none" />
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-lg shadow-emerald-500/30 relative z-10">
                      <Play className="w-7 h-7 ml-0.5 fill-current" />
                    </div>
                    <h3 className="text-base font-extrabold text-emerald-400 font-display mb-0.5 relative z-10">Ruang Video</h3>
                    <p className="text-[11px] text-slate-300 font-medium relative z-10">Tonton & pelajari</p>
                  </div>

                  {/* Card 5: Jadwal Kelas */}
                  <div 
                    onClick={() => setActiveTab('schedule')}
                    className="rounded-3xl p-5 flex flex-col items-center text-center shadow-lg hover:scale-105 transition-all cursor-pointer group bg-gradient-to-br from-violet-500/15 to-purple-600/5 border border-violet-500/30 hover:border-violet-400/50 hover:shadow-violet-500/20 relative overflow-hidden"
                  >
                    <div className="absolute -left-4 -top-4 w-24 h-24 bg-violet-500/20 rounded-full blur-2xl group-hover:bg-violet-500/30 transition-colors pointer-events-none" />
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-500 to-purple-600 text-white flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-lg shadow-violet-500/30 relative z-10">
                      <Calendar className="w-7 h-7" />
                    </div>
                    <h3 className="text-base font-extrabold text-violet-400 font-display mb-0.5 relative z-10">Jadwal Kelas</h3>
                    <p className="text-[11px] text-slate-300 font-medium relative z-10">Agenda belajar</p>
                  </div>

                  {/* Card 6: Mata Pelajaran */}
                  <div 
                    onClick={() => setActiveTab('courses')}
                    className="rounded-3xl p-5 flex flex-col items-center text-center shadow-lg hover:scale-105 transition-all cursor-pointer group bg-gradient-to-br from-rose-500/15 to-pink-600/5 border border-rose-500/30 hover:border-rose-400/50 hover:shadow-rose-500/20 relative overflow-hidden"
                  >
                    <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-rose-500/20 rounded-full blur-2xl group-hover:bg-rose-500/30 transition-colors pointer-events-none" />
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-600 text-white flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-lg shadow-rose-500/30 relative z-10">
                      <GraduationCap className="w-7 h-7" />
                    </div>
                    <h3 className="text-base font-extrabold text-rose-400 font-display mb-0.5 relative z-10">Mata Pelajaran</h3>
                    <p className="text-[11px] text-slate-300 font-medium relative z-10">Daftar mapel</p>
                  </div>

                  {/* Pengumuman Sekolah Singkat di Bawah Card Modules */}
                  {announcements && announcements.length > 0 && (
                    <div className="sm:col-span-2 lg:col-span-3 rounded-3xl p-6 glass-card border border-sky-500/30 shadow-sm space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-700/60">
                        <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4 text-sky-500" />
                          <h3 className="font-bold text-sm text-white">Pengumuman Sekolah</h3>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400">
                          {announcements.length} Informasi
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {announcements.slice(0, 2).map((anc) => (
                          <div key={anc.id} className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-sm text-xs space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-white truncate">{anc.title}</span>
                              <span className="text-[10px] text-slate-400 shrink-0 ml-1">{anc.date}</span>
                            </div>
                            <p className="text-[11px] text-slate-300 line-clamp-2">{anc.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Misi Hari Ini & Petualangan Minggu Ini */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                  {/* Misi Hari Ini */}
                  <div className="rounded-3xl p-6 shadow-lg glass-card border border-slate-700/60 space-y-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-2">
                        <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
                        <h3 className="font-bold text-base text-white font-display">Misi Hari Ini</h3>
                      </div>
                      <span className="text-[11px] font-extrabold text-emerald-400 bg-emerald-500/20 px-2.5 py-1 rounded-full border border-emerald-500/30">
                        {dailyMissions.filter(m => m.completed).length}/{dailyMissions.length} Selesai
                      </span>
                    </div>

                    <div className="space-y-2.5 relative z-10">
                      {dailyMissions.map((m) => (
                        <label 
                          key={m.id}
                          onClick={() => toggleMission(m.id)}
                          className={`flex items-start gap-3 p-3 rounded-2xl transition-all cursor-pointer border ${m.completed ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-700/60 hover:border-slate-600'}`}
                        >
                          <input 
                            type="checkbox" 
                            checked={m.completed} 
                            onChange={() => {}}
                            className="mt-0.5 w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 border-slate-600 bg-slate-900 cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <span className={`text-xs font-semibold block truncate ${m.completed ? 'line-through text-slate-400' : 'text-white'}`}>
                              {m.text}
                            </span>
                            <span className={`text-[10px] font-bold mt-0.5 inline-block ${m.completed ? 'text-emerald-400' : 'text-amber-400'}`}>
                              {m.completed ? 'Selesai! 🎉' : `+${m.points} Poin Pintar`}
                            </span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: BAHAN AJAR */}
          {activeTab === 'materials' && (
            <div className="space-y-6">
              <FeatureHeaderBanner
                tagIcon={<BookOpen className="w-3.5 h-3.5" />}
                tagText="Bahan Ajar & Modul Digital"
                title="Materi & Bahan Ajar Guru"
                description="Pelajari modul pelajaran, ringkasan materi, dan lembar kerja langsung di dalam webapp tanpa perlu unduh file ke perangkat."
                stats={[
                  { label: 'Total Modul', value: materials.length, sublabel: 'Materi' },
                  { label: 'Telah Dipelajari', value: studiedMaterialIds.length, sublabel: 'Modul Selesai' },
                  { label: 'Sisa Modul', value: Math.max(0, materials.length - studiedMaterialIds.length), sublabel: 'Belum Dibaca' },
                  { label: 'Status Membaca', value: 'Siap Dibaca', statusDot: true }
                ]}
              />

              <div className="bg-slate-900/90 border-2 border-emerald-500/35 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="font-extrabold text-slate-100 text-lg">Daftar Materi Pembelajaran</h3>
                    <p className="text-xs text-slate-400">Modul yang disiapkan bapak/ibu guru untuk dipelajari</p>
                  </div>
                  
                  {/* Filter Pills for Material Progress */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setMaterialProgressFilter('ALL')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        materialProgressFilter === 'ALL'
                          ? 'bg-emerald-500 text-white shadow-sm'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      Semua ({materials.length})
                    </button>
                    <button
                      onClick={() => setMaterialProgressFilter('UNSTUDIED')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        materialProgressFilter === 'UNSTUDIED'
                          ? 'bg-amber-500 text-white shadow-sm'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      Belum Selesai ({Math.max(0, materials.length - studiedMaterialIds.length)})
                    </button>
                    <button
                      onClick={() => setMaterialProgressFilter('COMPLETED')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        materialProgressFilter === 'COMPLETED'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      Selesai ({studiedMaterialIds.length})
                    </button>
                  </div>
                </div>

                {/* Material Progress Summary Bar */}
                <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">Kemajuan Membaca Modul Siswa</span>
                      <span className="text-[11px] text-slate-400">
                        {studiedMaterialIds.length} dari {materials.length} modul selesai dipelajari
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="w-full sm:w-48 h-2.5 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                        style={{ width: `${materials.length > 0 ? Math.round((studiedMaterialIds.length / materials.length) * 100) : 0}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-400 shrink-0">
                      {materials.length > 0 ? Math.round((studiedMaterialIds.length / materials.length) * 100) : 0}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {filteredMaterials.map((mat) => {
                    const isStudied = studiedMaterialIds.includes(mat.id) || (studentProgressMap[`material_${mat.id}`]?.isCompleted === true);
                    return (
                      <div 
                        key={mat.id} 
                        className={`bg-slate-900/90 border-2 rounded-3xl p-5 space-y-3.5 shadow-lg hover:shadow-emerald-500/10 transition-all flex flex-col justify-between group ${
                          isStudied 
                            ? 'border-emerald-500/60 bg-gradient-to-b from-emerald-950/20 to-slate-900/90' 
                            : 'border-emerald-500/35 hover:border-emerald-400/80'
                        }`}
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/30">
                              {mat.fileType} • {mat.fileSize}
                            </span>
                            {isStudied ? (
                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-sans text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Selesai
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-mono">{mat.uploadDate}</span>
                            )}
                          </div>
                          <h4 
                            onClick={() => setSelectedMaterialForReader(mat)}
                            className="font-extrabold text-slate-100 text-sm line-clamp-2 cursor-pointer group-hover:text-emerald-300 transition-colors"
                          >
                            {mat.title}
                          </h4>
                          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                            {mat.description}
                          </p>
                          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800">
                            <span className="text-emerald-400 font-semibold truncate max-w-[160px]">
                              Guru: {mat.teacherName}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">⏱️ ~8 mnt</span>
                          </div>
                        </div>

                        <div className="pt-3 flex items-center justify-between gap-2 border-t border-slate-800/80">
                          <button
                            onClick={() => handleToggleStudiedMaterial(mat.id, !isStudied)}
                            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold flex items-center gap-1 border transition-all cursor-pointer ${
                              isStudied
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-700'
                            }`}
                            title={isStudied ? 'Telah selesai dipelajari' : 'Tandai sudah dipelajari'}
                          >
                            <Check className="w-3 h-3" />
                            <span>{isStudied ? 'Selesai' : 'Tandai'}</span>
                          </button>

                          <button
                            onClick={() => setSelectedMaterialForReader(mat)}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-all hover:scale-102"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>Baca di Webapp</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TUGAS & KUIS */}
          {activeTab === 'quizzes' && (
            <div className="space-y-6">
              <FeatureHeaderBanner
                tagIcon={<Sparkles className="w-3.5 h-3.5" />}
                tagText="Evaluasi & Latihan Mandiri"
                title="Daftar Tugas & Kuis Interaktif"
                description="Kerjakan latihan soal harian dan ujian online dengan timer otomatis untuk mengukur pemahaman materi dan raih Poin Pintar."
                stats={[
                  { label: 'Total Kuis', value: quizzes.length, sublabel: 'Paket Tes' },
                  { label: 'Selesai Dikerjakan', value: quizzes.filter(q => q.completedScore !== undefined).length, sublabel: 'Kuis Selesai' },
                  { 
                    label: 'Rata-Rata Nilai', 
                    value: Math.round(quizzes.filter(q => q.completedScore !== undefined).reduce((a, b) => a + (b.completedScore || 0), 0) / (quizzes.filter(q => q.completedScore !== undefined).length || 1)) || 0, 
                    sublabel: 'Poin' 
                  },
                  { label: 'Status Ujian', value: 'Ujian Aktif', statusDot: true }
                ]}
              />

              <div className="bg-slate-900/90 border-2 border-amber-500/35 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="font-extrabold text-slate-100 text-lg">Daftar Tugas & Kuis Siswa</h3>
                    <p className="text-xs text-slate-400">Kerjakan soal latihan harian dan ujian online secara mandiri</p>
                  </div>
                  <span className="px-3.5 py-1.5 bg-amber-500/15 text-amber-300 rounded-full text-xs font-mono font-bold border border-amber-500/30">
                    {quizzes.length} Tes Tersedia
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {filteredQuizzes.map((qz) => {
                    const hasImageQuestions = qz.questions?.some(q => !!q.imageUrl);
                    return (
                      <div key={qz.id} className="bg-slate-900/90 border-2 border-amber-500/35 hover:border-amber-400/80 rounded-3xl p-5 space-y-3 shadow-lg hover:shadow-amber-500/10 transition-all group">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-bold uppercase text-[10px] border border-amber-500/30">
                              {qz.type} • {qz.durationMinutes} Menit
                            </span>
                            {hasImageQuestions && (
                              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold text-[10px] border border-purple-500/30 flex items-center gap-1">
                                <ImageIcon className="w-3 h-3" />
                                Bergambar
                              </span>
                            )}
                          </div>
                          {qz.completedScore !== undefined ? (
                            <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 font-bold text-xs rounded-full border border-emerald-500/30">
                              Nilai: {qz.completedScore}/100
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              BELUM DIKERJAKAN
                            </span>
                          )}
                        </div>

                        <div>
                          <h4 className="font-bold text-slate-100 text-base group-hover:text-amber-300 transition-colors">{qz.title}</h4>
                          <p className="text-xs text-slate-400 mt-0.5">Mata Pelajaran: {qz.subject} • Guru: {qz.teacherName}</p>
                          <p className="text-xs text-slate-400 mt-0.5">Batas Pengumpulan: {qz.deadline}</p>
                        </div>

                        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                          <span className="text-xs text-slate-400 font-semibold">{qz.totalQuestions} Soal Pilihan Ganda</span>
                          <button
                            onClick={() => setSelectedQuiz(qz)}
                            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>{qz.completedScore !== undefined ? 'Ulangi Kuis' : 'Mulai Kerjakan'}</span>
                            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BUKU DIGITAL */}
          {activeTab === 'books' && (
            <div className="space-y-6">
              <FeatureHeaderBanner
                tagIcon={<Book className="w-3.5 h-3.5" />}
                tagText="Perpustakaan Digital Siswa"
                title="Perpustakaan Digital & E-Book"
                description="Baca buku teks kurikulum merdeka, ensiklopedia anak, dan buku cerita bergambar langsung di dalam webapp kapan pun."
                stats={[
                  { label: 'Koleksi E-Book', value: books.length, sublabel: 'Judul Buku' },
                  { label: 'Total Halaman', value: books.reduce((acc, b) => acc + (b.totalPages || 0), 0), sublabel: 'Halaman' },
                  { label: 'Mode Baca', value: 'Webapp Flipbook' },
                  { label: 'Akses Membaca', value: 'Bebas Akses', statusDot: true }
                ]}
              />

              <div className="bg-slate-900/90 border-2 border-sky-500/35 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="font-extrabold text-slate-100 text-lg">Perpustakaan Digital Siswa (E-Book)</h3>
                    <p className="text-xs text-slate-400">Baca buku paket kurikulum merdeka langsung di dalam portal</p>
                  </div>
                  
                  {/* Filter Pills for Book Progress */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setBookProgressFilter('ALL')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        bookProgressFilter === 'ALL'
                          ? 'bg-sky-500 text-white shadow-sm'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      Semua ({books.length})
                    </button>
                    <button
                      onClick={() => setBookProgressFilter('READING')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        bookProgressFilter === 'READING'
                          ? 'bg-amber-500 text-white shadow-sm'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      Sedang Dibaca ({books.filter(b => {
                        const p = studentProgressMap[`book_${b.id}`];
                        return (p?.percent || 0) > 0 && !p?.isCompleted;
                      }).length})
                    </button>
                    <button
                      onClick={() => setBookProgressFilter('COMPLETED')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        bookProgressFilter === 'COMPLETED'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      Selesai ({books.filter(b => studentProgressMap[`book_${b.id}`]?.isCompleted).length})
                    </button>
                  </div>
                </div>

                {/* Book Reading Overall Stats */}
                <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400">
                      <Book className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">Aktivitas Membaca Buku Digital</span>
                      <span className="text-[11px] text-slate-400">
                        {books.filter(b => studentProgressMap[`book_${b.id}`]?.isCompleted).length} dari {books.length} buku selesai dibaca
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="w-full sm:w-48 h-2.5 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full transition-all duration-500"
                        style={{ 
                          width: `${books.length > 0 ? Math.round((books.filter(b => studentProgressMap[`book_${b.id}`]?.isCompleted).length / books.length) * 100) : 0}%` 
                        }}
                      />
                    </div>
                    <span className="text-xs font-mono font-bold text-sky-400 shrink-0">
                      {books.length > 0 ? Math.round((books.filter(b => studentProgressMap[`book_${b.id}`]?.isCompleted).length / books.length) * 100) : 0}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {filteredBooks.map((bk) => {
                    const prog = studentProgressMap[`book_${bk.id}`];
                    const percent = prog?.percent || 0;
                    const curPage = prog?.currentPage || 1;
                    const isDone = prog?.isCompleted === true;

                    return (
                      <div key={bk.id} className="bg-slate-900/90 border-2 border-sky-500/35 hover:border-sky-400/80 rounded-3xl p-4 flex gap-4 shadow-lg hover:shadow-sky-500/10 transition-all group">
                        <img src={bk.coverImage} alt={bk.title} className="w-20 h-28 object-cover rounded-2xl shadow-sm shrink-0 border border-slate-700" />
                        <div className="space-y-2 flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between gap-1 flex-wrap">
                              <span className="text-[10px] font-bold text-sky-300 uppercase bg-sky-500/15 px-2 py-0.5 rounded-full border border-sky-500/30">
                                {bk.subject}
                              </span>
                              {isDone ? (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-sans text-[10px] font-bold border border-emerald-500/30 flex items-center gap-0.5">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Selesai
                                </span>
                              ) : percent > 0 ? (
                                <span className="text-[10px] font-mono font-bold text-amber-400">
                                  Hal {curPage} ({percent}%)
                                </span>
                              ) : null}
                            </div>

                            <h4 className="font-bold text-slate-100 text-xs line-clamp-2 group-hover:text-sky-300 transition-colors mt-1">{bk.title}</h4>
                            <p className="text-[11px] text-slate-400">{bk.author}</p>
                            
                            {/* Progress bar on book */}
                            <div className="mt-2 space-y-1">
                              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all ${isDone ? 'bg-emerald-500' : 'bg-sky-500'}`}
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              setSelectedBook(bk);
                              setSelectedBookTargetPage(curPage > 1 ? curPage : (bk.targetPage || 1));
                            }}
                            className="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition-all"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>
                              {isDone ? 'Baca Ulang' : percent > 0 ? `Lanjut Hal ${curPage}` : 'Baca E-Book'}
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: RUANG VIDEO */}
          {activeTab === 'videos' && (
            <div className="space-y-6">
              <FeatureHeaderBanner
                tagIcon={<Video className="w-3.5 h-3.5" />}
                tagText="Ruang Video Pembelajaran"
                title="Video Pembelajaran Interaktif"
                description="Tonton rekaman ceramah materi, penjelasan rumus, simulasi lab sains, dan animasi edukasi seru dari bapak/ibu guru."
                stats={[
                  { label: 'Total Video', value: videos.length, sublabel: 'Video Edukasi' },
                  { label: 'Estimasi Durasi', value: `~${videos.length * 15}`, sublabel: 'Menit Belajar' },
                  { label: 'Kualitas Video', value: 'HD 1080p' },
                  { label: 'Status Pemutar', value: 'Siap Diputar', statusDot: true }
                ]}
              />

              <div className="bg-slate-900/90 border-2 border-rose-500/35 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="font-extrabold text-slate-100 text-lg">Video Pembelajaran Interaktif Guru</h3>
                    <p className="text-xs text-slate-400">Tonton rekaman penjelasan materi, simulasi lab, dan animasi materi</p>
                  </div>
                  <span className="px-3.5 py-1.5 bg-rose-500/15 text-rose-300 rounded-full text-xs font-mono font-bold border border-rose-500/30">
                    {videos.length} Video
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {videos.map((vid) => (
                    <div key={vid.id} className="bg-slate-900/90 border-2 border-rose-500/35 hover:border-rose-400/80 rounded-3xl overflow-hidden shadow-lg hover:shadow-rose-500/10 transition-all flex flex-col justify-between group">
                      <div>
                        <div className="relative aspect-video bg-slate-950 group cursor-pointer" onClick={() => setSelectedVideo(vid)}>
                          <img src={vid.thumbnail} alt={vid.title} className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <div className="w-12 h-12 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                              <Play className="w-6 h-6 ml-0.5 fill-current" />
                            </div>
                          </div>
                          <span className="absolute bottom-2 right-2 bg-black/80 text-white font-mono text-[10px] px-2 py-0.5 rounded font-bold">
                            {vid.duration}
                          </span>
                        </div>

                        <div className="p-4 space-y-2">
                          <span className="text-[10px] font-bold text-rose-300 uppercase bg-rose-500/15 px-2 py-0.5 rounded-full border border-rose-500/30">{vid.subject}</span>
                          <h4 className="font-bold text-slate-100 text-xs line-clamp-2 group-hover:text-rose-300 transition-colors mt-1">{vid.title}</h4>
                          <p className="text-[11px] text-slate-400 line-clamp-2">{vid.description}</p>
                        </div>
                      </div>

                      <div className="p-4 pt-0">
                        <button
                          onClick={() => setSelectedVideo(vid)}
                          className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition-all"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Putar Video Sekarang</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: MATA PELAJARAN & PROGRES TERJADWAL */}
          {activeTab === 'courses' && (
            <div className="space-y-6">
              <FeatureHeaderBanner
                tagIcon={<GraduationCap className="w-3.5 h-3.5" />}
                tagText="Kurikulum & Capaian Belajar"
                title="Mata Pelajaran & Progres Belajar"
                description="Pantau capaian belajar, materi pelajaran, kuis, dan jadwal tatap muka harian sesuai kurikulum SD Negeri Sumberejo 04."
                stats={[
                  { label: 'Total Mapel', value: subjectsWithSchedule.length, sublabel: 'Pelajaran' },
                  { 
                    label: 'Rata-Rata Progres', 
                    value: `${Math.round(subjectsWithSchedule.reduce((a, b) => a + b.progressPercentage, 0) / (subjectsWithSchedule.length || 1))}%`, 
                    highlight: true 
                  },
                  { label: 'Jadwal Hari Ini', value: todayDayName ? subjectsWithSchedule.filter(s => s.isToday).length : 0, sublabel: 'Mapel Hari Ini' },
                  { label: 'Status Sinkron', value: 'Tersinkron Guru', statusDot: true }
                ]}
              />

              {/* Header & Metrics Banner */}
              <div className="glass-card rounded-3xl p-6 sm:p-8 border border-blue-100 dark:border-slate-800 shadow-sm space-y-6">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-5 border-b border-blue-100 dark:border-slate-800">
                  <div>
                    <div className="inline-flex items-center gap-1.5 text-sky-500 dark:text-blue-400 font-bold text-xs mb-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Sinkronisasi Otomatis dengan Jadwal Pelajaran Aktif</span>
                    </div>
                    <h3 className="font-extrabold text-white dark:text-white text-lg sm:text-xl">
                      Daftar Mata Pelajaran Aktif
                    </h3>
                    <p className="text-xs text-slate-400 dark:text-slate-400 mt-0.5">
                      Pilih mata pelajaran untuk melihat bahan ajar, kuis terkait, atau jadwal belajar
                    </p>
                  </div>

                  {/* Summary Metric Chips */}
                  <div className="flex items-center flex-wrap gap-2.5">
                    <div className="px-3.5 py-2 rounded-2xl bg-blue-50 dark:bg-slate-800/80 border border-blue-200 dark:border-slate-700 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-sky-500 dark:text-blue-400" />
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Total Pelajaran</p>
                        <p className="text-xs font-mono font-extrabold text-sky-500 dark:text-blue-300">{subjectsWithSchedule.length} Mapel</p>
                      </div>
                    </div>

                    <div className="px-3.5 py-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <div>
                        <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase">Rata-Rata Progres</p>
                        <p className="text-xs font-mono font-extrabold text-emerald-700 dark:text-emerald-300">
                          {Math.round(subjectsWithSchedule.reduce((a, b) => a + b.progressPercentage, 0) / (subjectsWithSchedule.length || 1))}%
                        </p>
                      </div>
                    </div>

                    {todayDayName && (
                      <div className="px-3.5 py-2 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center gap-2">
                        <Flame className="w-4 h-4 text-amber-500 fill-amber-400" />
                        <div>
                          <p className="text-[10px] text-amber-700 dark:text-amber-400 font-bold uppercase">Hari Ini ({todayDayName})</p>
                          <p className="text-xs font-mono font-extrabold text-amber-800 dark:text-amber-300">
                            {subjectsWithSchedule.filter(s => s.isToday).length} Mapel
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Filter and Search Controls */}
                <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                  {/* Day Filter Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                    <button
                      onClick={() => setCourseFilterDay('ALL')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                        courseFilterDay === 'ALL'
                          ? 'bg-sky-500 text-white shadow-md'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      Semua Mapel ({subjectsWithSchedule.length})
                    </button>

                    {todayDayName && (
                      <button
                        onClick={() => setCourseFilterDay('TODAY')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                          courseFilterDay === 'TODAY'
                            ? 'bg-amber-600 text-white shadow-md'
                            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800'
                        }`}
                      >
                        <Flame className="w-3.5 h-3.5 text-amber-400 fill-current" />
                        <span>Hari Ini ({todayDayName})</span>
                      </button>
                    )}

                    {DAYS_LIST.map((day) => {
                      const count = subjectsWithSchedule.filter(s => s.days.includes(day)).length;
                      return (
                        <button
                          key={day}
                          onClick={() => setCourseFilterDay(day)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                            courseFilterDay === day
                              ? 'bg-sky-500 text-white shadow-md'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          <span>{day}</span>
                          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                            courseFilterDay === day ? 'bg-white/25 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-300 dark:text-slate-300'
                          }`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Search Input for Courses */}
                  <div className="relative shrink-0 sm:w-60">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={courseSearch}
                      onChange={(e) => setCourseSearch(e.target.value)}
                      placeholder="Cari mata pelajaran / guru..."
                      className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-sky-500 focus:bg-slate-800 dark:focus:bg-slate-900 focus:outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Courses Grid */}
              {filteredCourses.length === 0 ? (
                <div className="glass-card rounded-3xl p-12 text-center border border-dashed border-blue-200 dark:border-slate-800 space-y-3">
                  <BookOpen className="w-12 h-12 text-slate-400 mx-auto" />
                  <p className="text-base font-bold text-slate-300 dark:text-slate-200">
                    Tidak ditemukan mata pelajaran yang sesuai filter
                  </p>
                  <p className="text-xs text-slate-400">
                    Coba ganti filter hari atau kata kunci pencarian mata pelajaran.
                  </p>
                  <button
                    onClick={() => { setCourseFilterDay('ALL'); setCourseSearch(''); }}
                    className="px-4 py-2 bg-sky-500 text-white rounded-full text-xs font-bold inline-block cursor-pointer shadow-sm hover:bg-sky-600"
                  >
                    Tampilkan Semua Mata Pelajaran
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredCourses.map((course) => {
                    const colorMap: Record<string, { badge: string; border: string; bg: string; bar: string; text: string; fillLight: string }> = {
                      blue: { badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 border-blue-200', border: 'border-blue-200 dark:border-blue-800', bg: 'bg-blue-50/40 dark:bg-blue-950/20', bar: 'bg-blue-600', text: 'text-blue-700 dark:text-blue-300', fillLight: 'bg-blue-100 dark:bg-blue-950' },
                      emerald: { badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 border-emerald-200', border: 'border-emerald-200 dark:border-emerald-800', bg: 'bg-emerald-50/40 dark:bg-emerald-950/20', bar: 'bg-emerald-600', text: 'text-emerald-700 dark:text-emerald-300', fillLight: 'bg-emerald-100 dark:bg-emerald-950' },
                      purple: { badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200 border-purple-200', border: 'border-purple-200 dark:border-purple-800', bg: 'bg-purple-50/40 dark:bg-purple-950/20', bar: 'bg-purple-600', text: 'text-purple-700 dark:text-purple-300', fillLight: 'bg-purple-100 dark:bg-purple-950' },
                      amber: { badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 border-amber-200', border: 'border-amber-200 dark:border-amber-800', bg: 'bg-amber-50/40 dark:bg-amber-950/20', bar: 'bg-amber-600', text: 'text-amber-700 dark:text-amber-300', fillLight: 'bg-amber-100 dark:bg-amber-950' },
                      rose: { badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200 border-rose-200', border: 'border-rose-200 dark:border-rose-800', bg: 'bg-rose-50/40 dark:bg-rose-950/20', bar: 'bg-rose-600', text: 'text-rose-700 dark:text-rose-300', fillLight: 'bg-rose-100 dark:bg-rose-950' },
                      indigo: { badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200 border-indigo-200', border: 'border-indigo-200 dark:border-indigo-800', bg: 'bg-indigo-50/40 dark:bg-indigo-950/20', bar: 'bg-indigo-600', text: 'text-indigo-700 dark:text-indigo-300', fillLight: 'bg-indigo-100 dark:bg-indigo-950' }
                    };
                    const theme = colorMap[course.themeColor] || colorMap.blue;

                    return (
                      <div
                        key={course.id}
                        className={`glass-card rounded-3xl p-6 sm:p-7 border ${theme.border} shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-5 relative overflow-hidden`}
                      >
                        {/* Top Indicator & Schedule Details */}
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${theme.badge}`}>
                                {course.days.join(' & ')}
                              </span>
                              {course.isToday && (
                                <span className="px-2.5 py-1 rounded-full bg-amber-500 text-white font-extrabold text-[10px] flex items-center gap-1 shadow-xs animate-pulse">
                                  <Flame className="w-3 h-3 fill-current" />
                                  JADWAL HARI INI
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-300 dark:text-slate-300">
                              <Clock className="w-3.5 h-3.5 text-sky-500 dark:text-blue-400" />
                              <span>{course.sessions.map(s => `${s.timeStart}-${s.timeEnd}`).join(', ')} WIB</span>
                            </div>
                          </div>

                          <div>
                            <h3 className="text-lg sm:text-xl font-extrabold text-white dark:text-white leading-tight">
                              {course.subjectName}
                            </h3>
                            <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-300 dark:text-slate-300 flex-wrap">
                              <span className="flex items-center gap-1 font-medium">
                                <User className="w-3.5 h-3.5 text-sky-500 dark:text-blue-400" />
                                {course.teacherName}
                              </span>
                              <span className="text-slate-300 dark:text-slate-300">•</span>
                              <span className="flex items-center gap-1 text-slate-400 dark:text-slate-400">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                {course.roomSummary}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Progress Section */}
                        <div className="space-y-2 p-4 rounded-2xl bg-white/70 dark:bg-slate-900/80 border border-blue-100 dark:border-slate-800">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300 dark:text-slate-400 font-bold flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                              Progres Belajar Kamu
                            </span>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                course.progressPercentage >= 85
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-blue-100 text-sky-500 dark:bg-slate-800 dark:text-blue-300'
                              }`}>
                                {course.progressPercentage >= 85 ? 'Sangat Baik 🏆' : course.progressPercentage >= 70 ? 'Aktif Belajar ✨' : 'Perlu Ditingkatkan'}
                              </span>
                              <span className="font-mono font-extrabold text-sm text-sky-500 dark:text-blue-400">
                                {course.progressPercentage}%
                              </span>
                            </div>
                          </div>

                          <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${theme.bar} rounded-full transition-all duration-500`}
                              style={{ width: `${course.progressPercentage}%` }}
                            />
                          </div>

                          <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-400">
                            <span>
                              {course.completedQuizzes.length > 0 ? (
                                <>
                                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                    {course.completedQuizzes.length}/{course.relatedQuizzes.length} Kuis Selesai
                                  </span>
                                  {course.avgScore !== null && ` • Rata-rata: ${course.avgScore}`}
                                </>
                              ) : (
                                <span>{course.relatedQuizzes.length} Kuis Tersedia</span>
                              )}
                            </span>
                            <span>{course.relatedMaterials.length} Bahan Ajar • {course.relatedVideos.length} Video</span>
                          </div>
                        </div>

                        {/* Interactive Action Shortcuts */}
                        <div className="pt-2 border-t border-slate-700/60/70 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {course.relatedMaterials.length > 0 && (
                              <button
                                onClick={() => {
                                  if (course.relatedMaterials.length === 1) {
                                    setSelectedMaterialForReader(course.relatedMaterials[0]);
                                  } else {
                                    setActiveTab('materials');
                                    setSearchQuery(course.subjectName.split(' ')[0]);
                                  }
                                }}
                                className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-slate-800 hover:bg-blue-100 text-sky-500 dark:text-blue-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-blue-200/60 dark:border-slate-700"
                              >
                                <FileUp className="w-3.5 h-3.5" />
                                <span>Bahan Ajar ({course.relatedMaterials.length})</span>
                              </button>
                            )}

                            {course.relatedQuizzes.length > 0 && (
                              <button
                                onClick={() => {
                                  if (course.relatedQuizzes.length === 1) {
                                    setSelectedQuiz(course.relatedQuizzes[0]);
                                  } else {
                                    setActiveTab('quizzes');
                                    setSearchQuery(course.subjectName.split(' ')[0]);
                                  }
                                }}
                                className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-amber-200 dark:border-amber-800/60"
                              >
                                <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
                                <span>Kuis ({course.relatedQuizzes.length})</span>
                              </button>
                            )}

                            {course.relatedVideos.length > 0 && (
                              <button
                                onClick={() => {
                                  if (course.relatedVideos.length === 1) {
                                    setSelectedVideo(course.relatedVideos[0]);
                                  } else {
                                    setActiveTab('videos');
                                  }
                                }}
                                className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-emerald-200 dark:border-emerald-800/60"
                              >
                                <Play className="w-3.5 h-3.5 text-emerald-600 fill-current" />
                                <span>Video ({course.relatedVideos.length})</span>
                              </button>
                            )}
                          </div>

                          <button
                            onClick={() => {
                              setActiveTab('schedule');
                              if (course.days.length > 0) {
                                setSelectedScheduleDay(course.days[0]);
                              }
                            }}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-300 dark:text-slate-300 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ml-auto"
                          >
                            <Calendar className="w-3.5 h-3.5 text-sky-500 dark:text-blue-400" />
                            <span>Jadwal</span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: JADWAL KELAS (DINAMIS DARI GURU) */}
          {activeTab === 'schedule' && (
            <div className="space-y-6">
              <FeatureHeaderBanner
                tagIcon={<Calendar className="w-3.5 h-3.5" />}
                tagText="Jadwal Pelajaran Mingguan"
                title="Jadwal Pelajaran Kelas Siswa"
                description="Periksa jadwal mata pelajaran, guru pengampu, ruang kelas, dan jam belajar harian kamu yang telah disinkronkan secara langsung oleh bapak/ibu guru."
                stats={[
                  { label: 'Total Sesi', value: schedules.length, sublabel: 'Jam Pelajaran' },
                  { label: 'Hari Aktif', value: new Set(schedules.map(s => s.day)).size, sublabel: 'Hari / Pekan' },
                  { label: 'Guru Pengampu', value: new Set(schedules.map(s => s.teacherName)).size, sublabel: 'Guru' },
                  { label: 'Status Sinkron', value: 'Real-Time Sync', statusDot: true }
                ]}
              />

              <div className="glass-card rounded-3xl p-6 sm:p-8 border border-blue-100 dark:border-slate-800 shadow-sm space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-blue-100 dark:border-slate-800">
                  <div>
                    <div className="inline-flex items-center gap-1.5 text-sky-500 dark:text-blue-400 font-bold text-xs mb-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Jadwal Resmi Diatur oleh Guru Pengampu</span>
                    </div>
                    <h3 className="font-extrabold text-white dark:text-white text-lg sm:text-xl">
                      Jadwal Pelajaran Mingguan (SD Negeri Sumberejo 04)
                    </h3>
                    <p className="text-xs text-slate-400 dark:text-slate-400 mt-0.5">
                      Periksa jadwal mata pelajaran, ruang kelas, dan jam belajar harian kamu
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-slate-800 text-sky-500 dark:text-blue-300 font-mono text-xs font-bold border border-blue-200 dark:border-slate-700">
                      {schedules.length} Sesi Terjadwal
                    </span>
                  </div>
                </div>

                {/* Day Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                  <button
                    onClick={() => setSelectedScheduleDay('ALL')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      selectedScheduleDay === 'ALL'
                        ? 'bg-sky-500 text-white shadow-md'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    Semua Hari ({schedules.length})
                  </button>
                  {(['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'] as ScheduleDay[]).map((day) => {
                    const count = schedules.filter(s => s.day === day).length;
                    return (
                      <button
                        key={day}
                        onClick={() => setSelectedScheduleDay(day)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                          selectedScheduleDay === day
                            ? 'bg-sky-500 text-white shadow-md'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        <span>{day}</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                          selectedScheduleDay === day ? 'bg-white/25 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-300 dark:text-slate-300'
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Dynamic Schedules Grid */}
                {schedules.filter(s => selectedScheduleDay === 'ALL' || s.day === selectedScheduleDay).length === 0 ? (
                  <div className="p-10 text-center rounded-3xl bg-slate-800/70 dark:bg-slate-800/50 border border-dashed border-slate-700/60 dark:border-slate-700 space-y-2">
                    <Calendar className="w-10 h-10 text-slate-400 mx-auto" />
                    <p className="text-sm font-bold text-slate-300 dark:text-slate-300">
                      Tidak ada jadwal pelajaran {selectedScheduleDay !== 'ALL' ? `pada hari ${selectedScheduleDay}` : ''}
                    </p>
                    <p className="text-xs text-slate-400">
                      Guru belum menambahkan jadwal untuk hari ini atau jadwal sedang diperbarui.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {schedules
                      .filter(s => selectedScheduleDay === 'ALL' || s.day === selectedScheduleDay)
                      .map((sch) => {
                        const dayColorMap: Record<string, { badge: string; border: string; bg: string }> = {
                          blue: { badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200', border: 'border-blue-200 dark:border-blue-800', bg: 'bg-blue-50/40 dark:bg-blue-950/20' },
                          emerald: { badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200', border: 'border-emerald-200 dark:border-emerald-800', bg: 'bg-emerald-50/40 dark:bg-emerald-950/20' },
                          purple: { badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200', border: 'border-purple-200 dark:border-purple-800', bg: 'bg-purple-50/40 dark:bg-purple-950/20' },
                          amber: { badge: 'bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200', border: 'border-amber-200 dark:border-amber-800', bg: 'bg-amber-50/40 dark:bg-amber-950/20' },
                          rose: { badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200', border: 'border-rose-200 dark:border-rose-800', bg: 'bg-rose-50/40 dark:bg-rose-950/20' },
                          indigo: { badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200', border: 'border-indigo-200 dark:border-indigo-800', bg: 'bg-indigo-50/40 dark:bg-indigo-950/20' }
                        };
                        const theme = dayColorMap[sch.themeColor || 'blue'] || dayColorMap.blue;

                        return (
                          <div
                            key={sch.id}
                            className={`p-5 rounded-2xl ${theme.bg} border ${theme.border} space-y-3 shadow-xs hover:shadow-md transition-all flex flex-col justify-between`}
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className={`text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full ${theme.badge}`}>
                                  {sch.day}
                                </span>
                                <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-slate-300 dark:text-slate-300">
                                  <Clock className="w-3.5 h-3.5 text-sky-500 dark:text-blue-400" />
                                  <span>{sch.timeStart} - {sch.timeEnd} WIB</span>
                                </div>
                              </div>

                              <h4 className="text-sm font-extrabold text-white dark:text-white leading-tight">
                                {sch.subject}
                              </h4>

                              <div className="flex items-center gap-2 pt-1">
                                <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-slate-800 text-sky-500 dark:text-blue-300 text-[10px] font-bold">
                                  {sch.className}
                                </span>
                                {sch.roomOrNotes && (
                                  <span className="text-[11px] text-slate-400 dark:text-slate-400 flex items-center gap-1">
                                    <MapPin className="w-3 h-3 text-slate-400" />
                                    {sch.roomOrNotes}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="pt-2.5 border-t border-slate-700/60/60 dark:border-slate-800/80 flex items-center gap-2 text-xs text-slate-300 dark:text-slate-300">
                              <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-slate-800 text-sky-500 dark:text-blue-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                                <User className="w-3 h-3" />
                              </div>
                              <span className="truncate text-[11px] font-medium">{sch.teacherName}</span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* RAPOR SISWA MODAL */}
      {showRaporModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-slate-700 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar smooth-scroll my-8">
            {/* Header Rapor */}
            <div className="flex items-start justify-between pb-4 border-b border-blue-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <img 
                  alt="School Logo" 
                  className="w-12 h-12 rounded-full border border-blue-200 p-0.5 object-contain" 
                  src="https://lh3.googleusercontent.com/aida/AEtjO1V_O1LkqpNTKLUgY46lUQNZ-98AfOCi-LyzExN_kh011sCNAEG7gS1zMhoI0e9f5thxqvJIXWDLwNX18QdX6PlK24ANim_2_jj_Q6Z9Oa_KUxEcDW41TTC8NsyQysJsnq_E5CU0zsQRxSTqbhz7N5xF8G4OM26zdNzz5kRadSxlsfYxU26L07DfDphdMt7y-Yv-tJOIvogq6ozlFOeFUossp0VF8tSoOq4VClwC1f5b_JNLVjfk70mJ7Hc"
                />
                <div>
                  <h3 className="font-extrabold text-base text-white dark:text-white">Laporan Hasil Belajar (Rapor Digital)</h3>
                  <p className="text-xs text-slate-400">SD Negeri Sumberejo 04 • Semester Ganjil 2025/2026</p>
                </div>
              </div>
              <button 
                onClick={() => setShowRaporModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Student Info Card */}
            <div className="bg-blue-50/80 dark:bg-slate-800/60 rounded-2xl p-4 flex flex-col sm:flex-row justify-between gap-3 text-xs">
              <div>
                <p className="text-slate-400">Nama Siswa: <span className="font-bold text-white dark:text-white">{currentUser.name}</span></p>
                <p className="text-slate-400 mt-1">NISN: <span className="font-mono font-bold text-sky-500">{currentUser.identifierNumber}</span></p>
              </div>
              <div>
                <p className="text-slate-400">Kelas: <span className="font-bold text-white dark:text-white">{currentUser.departmentOrClass || 'Kelas 5A'}</span></p>
                <p className="text-slate-400 mt-1">Peringkat Kelas: <span className="font-bold text-emerald-600">3 dari 32 Siswa 🏆</span></p>
              </div>
            </div>

            {/* Grades Table */}
            <div className="overflow-x-auto rounded-2xl border border-blue-100 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-blue-50 dark:bg-slate-800 text-slate-300 dark:text-slate-300 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Mata Pelajaran</th>
                    <th className="p-3 text-center">KKM</th>
                    <th className="p-3 text-center">Nilai Angka</th>
                    <th className="p-3 text-center">Predikat</th>
                    <th className="p-3">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-100 dark:divide-slate-800 text-white dark:text-slate-200">
                  <tr>
                    <td className="p-3 font-semibold">Matematika</td>
                    <td className="p-3 text-center font-mono">75</td>
                    <td className="p-3 text-center font-bold text-sky-500">92</td>
                    <td className="p-3 text-center font-bold text-emerald-600">A</td>
                    <td className="p-3 text-slate-400">Sangat mahir operasi bilangan & pecahan</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold">Ilmu Pengetahuan Alam (IPA)</td>
                    <td className="p-3 text-center font-mono">75</td>
                    <td className="p-3 text-center font-bold text-sky-500">88</td>
                    <td className="p-3 text-center font-bold text-emerald-600">A</td>
                    <td className="p-3 text-slate-400">Memahami konsep fotosintesis & ekosistem</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold">Bahasa Indonesia</td>
                    <td className="p-3 text-center font-mono">75</td>
                    <td className="p-3 text-center font-bold text-sky-500">95</td>
                    <td className="p-3 text-center font-bold text-emerald-600">A</td>
                    <td className="p-3 text-slate-400">Kemampuan literasi dan bercerita sangat baik</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold">Informatika & Komputer</td>
                    <td className="p-3 text-center font-mono">75</td>
                    <td className="p-3 text-center font-bold text-sky-500">90</td>
                    <td className="p-3 text-center font-bold text-emerald-600">A</td>
                    <td className="p-3 text-slate-400">Aktif menyelesaikan kuis dan modul digital</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Footer summary */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2">
              <div className="text-xs text-slate-400 text-center sm:text-left">
                Rata-rata Nilai: <span className="font-extrabold text-base text-sky-500 ml-1">91.25</span> (Sangat Baik)
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    triggerToast("Mencetak dokumen rapor siswa...");
                    window.print?.();
                  }}
                  className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-sky-500 font-bold text-xs rounded-full border border-blue-200 flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Rapor</span>
                </button>
                <button
                  onClick={() => setShowRaporModal(false)}
                  className="px-5 py-2 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-full shadow-md cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-24 md:bottom-6 right-4 md:right-6 z-50 bg-sky-600 text-white px-5 py-3 rounded-full text-xs font-bold shadow-2xl flex items-center gap-2 border border-blue-300/40 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* MODAL SOLVER QUIZ / UJIAN */}
      <QuizExamModal
        isOpen={Boolean(selectedQuiz)}
        quiz={selectedQuiz}
        currentUser={currentUser}
        onClose={() => setSelectedQuiz(null)}
        onCompleteQuiz={onCompleteQuiz}
      />

      {/* MODAL DETAIL & PEMBACA BAHAN AJAR INTERAKTIF DI WEBAPP (BACA TANPA PERLU DOWNLOAD) */}
      <MaterialDetailModal
        isOpen={Boolean(selectedMaterialForReader)}
        material={selectedMaterialForReader}
        onClose={() => setSelectedMaterialForReader(null)}
        onToggleStudied={handleToggleStudiedMaterial}
        isStudied={selectedMaterialForReader ? (studiedMaterialIds.includes(selectedMaterialForReader.id) || studentProgressMap[`material_${selectedMaterialForReader.id}`]?.isCompleted === true) : false}
      />

      {/* MODAL E-BOOK READER BUKU DIGITAL PAKET */}
      <BookReaderModal
        isOpen={Boolean(selectedBook)}
        book={selectedBook}
        initialPage={selectedBookTargetPage}
        isCompleted={selectedBook ? (studentProgressMap[`book_${selectedBook.id}`]?.isCompleted === true) : false}
        onClose={() => {
          setSelectedBook(null);
          setSelectedBookTargetPage(undefined);
        }}
        onProgressUpdate={(page, total, completed) => {
          if (selectedBook) {
            const pct = total > 0 ? Math.round((page / total) * 100) : 0;
            handleRecordProgress(
              selectedBook.id,
              'book',
              selectedBook.title,
              selectedBook.subject,
              completed ? 100 : pct,
              completed,
              page,
              total
            );
          }
        }}
        allowDownload={false}
      />

      {/* MODAL VIDEO PLAYER */}
      <VideoPlayerModal
        isOpen={Boolean(selectedVideo)}
        video={selectedVideo}
        onClose={() => setSelectedVideo(null)}
      />

      {/* MODAL DETAIL LAPORAN PROGRES KEMAJUAN BELAJAR SISWA */}
      <LearningProgressDetailModal
        isOpen={showProgressDetailModal}
        onClose={() => setShowProgressDetailModal(false)}
        currentUser={currentUser}
        materials={materials}
        quizzes={quizzesToUse}
        books={books}
        videos={videos}
        studentProgressMap={studentProgressMap}
        onOpenMaterial={(mat) => {
          setShowProgressDetailModal(false);
          setSelectedMaterialForReader(mat);
        }}
        onOpenBook={(bk, page) => {
          setShowProgressDetailModal(false);
          setSelectedBook(bk);
          setSelectedBookTargetPage(page);
        }}
        onOpenQuiz={(qz) => {
          setShowProgressDetailModal(false);
          setSelectedQuiz(qz);
        }}
        onOpenVideo={(vid) => {
          setShowProgressDetailModal(false);
          setSelectedVideo(vid);
        }}
      />

      {/* USER PROFILE MODAL */}
      <UserProfileModal
        isOpen={showProfileModal}
        user={currentUser}
        onClose={() => setShowProfileModal(false)}
        onUpdateUser={onUpdateCurrentUser}
        onLogout={onLogout}
        schoolSettings={schoolSettings}
      />

      {/* STICKY BOTTOM NAVIGATION BAR FOR MOBILE (HP) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 shadow-xl px-2 py-1.5 flex items-center justify-around h-16 pb-safe">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center gap-1 w-14 h-12 rounded-xl transition-all cursor-pointer ${
            activeTab === 'dashboard' ? 'text-sky-400 bg-sky-500/10' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-[10px] font-bold">Dasbor</span>
        </button>

        <button
          onClick={() => setActiveTab('materials')}
          className={`flex flex-col items-center justify-center gap-1 w-14 h-12 rounded-xl transition-all cursor-pointer ${
            activeTab === 'materials' ? 'text-sky-400 bg-sky-500/10' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          <span className="text-[10px] font-bold">Materi</span>
        </button>

        <button
          onClick={() => setActiveTab('quizzes')}
          className={`flex flex-col items-center justify-center gap-1 w-14 h-12 rounded-xl transition-all cursor-pointer ${
            activeTab === 'quizzes' ? 'text-sky-400 bg-sky-500/10' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <GraduationCap className="w-5 h-5" />
          <span className="text-[10px] font-bold">Kuis</span>
        </button>

        <button
          onClick={() => setActiveTab('books')}
          className={`flex flex-col items-center justify-center gap-1 w-14 h-12 rounded-xl transition-all cursor-pointer ${
            activeTab === 'books' ? 'text-sky-400 bg-sky-500/10' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Book className="w-5 h-5" />
          <span className="text-[10px] font-bold">E-Book</span>
        </button>

        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center gap-1 w-14 h-12 rounded-xl text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] font-bold">Menu</span>
        </button>
      </div>
    </div>
  );
};
