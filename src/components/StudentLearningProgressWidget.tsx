import React from 'react';
import { motion } from 'motion/react';
import { 
  Award, BookOpen, CheckCircle2, ChevronRight, FileText, 
  GraduationCap, HelpCircle, Play, Sparkles, Star, TrendingUp,
  BookCheck, Compass, ArrowRight, Zap, Target
} from 'lucide-react';
import { ContentLearningProgress, DigitalBook, LearningMaterial, LearningVideo, QuizExam, UserProfile } from '../types';

interface StudentLearningProgressWidgetProps {
  currentUser: UserProfile;
  materials: LearningMaterial[];
  quizzes: QuizExam[];
  books: DigitalBook[];
  videos: LearningVideo[];
  studentProgressMap: Record<string, ContentLearningProgress>;
  onOpenMaterial: (mat: LearningMaterial) => void;
  onOpenBook: (book: DigitalBook, targetPage?: number) => void;
  onOpenQuiz: (quiz: QuizExam) => void;
  onOpenVideo: (video: LearningVideo) => void;
  onOpenDetailModal: () => void;
  onNavigateTab: (tab: 'materials' | 'quizzes' | 'books' | 'videos' | 'courses') => void;
}

export const StudentLearningProgressWidget: React.FC<StudentLearningProgressWidgetProps> = ({
  currentUser,
  materials,
  quizzes,
  books,
  videos,
  studentProgressMap,
  onOpenMaterial,
  onOpenBook,
  onOpenQuiz,
  onOpenVideo,
  onOpenDetailModal,
  onNavigateTab
}) => {
  // 1. Materials Progress
  const completedMaterials = materials.filter(m => {
    const prog = studentProgressMap[`material_${m.id}`];
    return prog?.isCompleted === true;
  });
  const totalMaterials = materials.length || 1;
  const materialsPercent = Math.round((completedMaterials.length / totalMaterials) * 100);

  // 2. Books Progress
  const booksProgressList = books.map(b => {
    const prog = studentProgressMap[`book_${b.id}`];
    const total = b.totalPages || 20;
    const curPage = prog?.currentPage || 1;
    const isCompleted = prog?.isCompleted === true || curPage >= total;
    const percent = isCompleted ? 100 : (prog?.percent || (curPage > 1 ? Math.round((curPage / total) * 100) : 0));
    return { ...b, curPage, total, isCompleted, percent, prog };
  });
  const booksCompleted = booksProgressList.filter(b => b.isCompleted).length;
  const booksActive = booksProgressList.filter(b => b.percent > 0).length;
  const totalBooks = books.length || 1;
  const booksPercent = books.length > 0
    ? Math.round(booksProgressList.reduce((acc, b) => acc + b.percent, 0) / books.length)
    : 0;

  // 3. Quizzes Progress
  const completedQuizzes = quizzes.filter(q => q.completedScore !== undefined);
  const totalQuizzes = quizzes.length || 1;
  const quizzesPercent = Math.round((completedQuizzes.length / totalQuizzes) * 100);

  // 4. Videos Progress
  const watchedVideos = videos.filter(v => {
    const prog = studentProgressMap[`video_${v.id}`];
    return prog?.isCompleted === true || (prog?.percent || 0) >= 80;
  });
  const totalVideos = videos.length || 1;
  const videosPercent = Math.round((watchedVideos.length / totalVideos) * 100);

  // 5. Total Overall Progress Calculation (Weighted)
  const overallPercent = Math.min(100, Math.max(0, Math.round(
    (materialsPercent * 0.40) +
    (quizzesPercent * 0.35) +
    (booksPercent * 0.15) +
    (videosPercent * 0.10)
  )));

  // Motivational level badge
  const getLevelInfo = (pct: number) => {
    if (pct >= 85) return { label: 'Juara Pintar', color: 'from-amber-400 to-orange-500', desc: 'Luar biasa! Pemahamanmu sangat tinggi.' };
    if (pct >= 60) return { label: 'Pelajar Aktif', color: 'from-emerald-400 to-teal-500', desc: 'Bagus sekali! Terus lanjutkan belajarmu.' };
    if (pct >= 30) return { label: 'Penjelajah Materi', color: 'from-sky-400 to-blue-500', desc: 'Ayo selesaikan modul berikutnya hari ini!' };
    return { label: 'Langkah Awal', color: 'from-indigo-400 to-purple-500', desc: 'Mulai dengan membaca materi pertama.' };
  };

  const level = getLevelInfo(overallPercent);

  // Find most recently accessed content item
  const progressList = Object.values(studentProgressMap || {}) as ContentLearningProgress[];
  const recentItems = [...progressList].sort((a, b) => {
    const timeB = b.lastAccessedAt ? new Date(b.lastAccessedAt).getTime() : 0;
    const timeA = a.lastAccessedAt ? new Date(a.lastAccessedAt).getTime() : 0;
    return timeB - timeA;
  });
  const lastItem = recentItems[0];

  return (
    <div className="rounded-3xl p-6 sm:p-7 glass-card border-2 border-sky-500/35 shadow-xl relative overflow-hidden space-y-6">
      {/* Glow Effects */}
      <div className="absolute -right-12 -top-12 w-64 h-64 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-12 -bottom-12 w-64 h-64 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/30 shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-extrabold text-white font-display">
                Kemajuan Belajar Saya
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold text-white bg-gradient-to-r ${level.color} shadow-xs`}>
                ⭐ {level.label}
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium mt-0.5">
              {level.desc}
            </p>
          </div>
        </div>

        {/* Action Button: Open Detailed Report Modal */}
        <button
          onClick={onOpenDetailModal}
          className="px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-sky-500/20 transition-all cursor-pointer hover:scale-[1.02] shrink-0"
        >
          <Award className="w-4 h-4" />
          <span>Lihat Rapor & Statistik Lengkap</span>
          <ChevronRight className="w-4 h-4 ml-0.5" />
        </button>
      </div>

      {/* Overall Progress Gauge & Metric Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center relative z-10">
        {/* Left: Big Circular / Radial Metric */}
        <div className="lg:col-span-4 bg-slate-900/80 rounded-2xl p-5 border border-sky-500/30 flex flex-col items-center justify-center text-center relative shadow-inner">
          <div className="relative w-36 h-36 flex items-center justify-center">
            {/* SVG Circle Gauge */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r="50"
                className="stroke-slate-800"
                strokeWidth="10"
                fill="transparent"
              />
              <circle
                cx="60"
                cy="60"
                r="50"
                stroke="url(#progress-gradient)"
                strokeWidth="10"
                strokeDasharray={2 * Math.PI * 50}
                strokeDashoffset={2 * Math.PI * 50 * (1 - overallPercent / 100)}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-1000 ease-out"
              />
              <defs>
                <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="50%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
            </svg>

            {/* Gauge Inner Text */}
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-extrabold text-white font-display tracking-tight">
                {overallPercent}%
              </span>
              <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">
                Total Selesai
              </span>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs text-slate-300 font-semibold">
            <Target className="w-3.5 h-3.5 text-sky-400" />
            <span>Target Semester: 100% Selesai</span>
          </div>
        </div>

        {/* Right: 4 Interactive Progress Cards */}
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* 1. Bahan Ajar */}
          <div 
            onClick={() => onNavigateTab('materials')}
            className="p-4 rounded-2xl bg-slate-900/80 border border-sky-500/30 hover:border-sky-400/60 hover:bg-slate-800/80 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 group-hover:scale-110 transition-transform">
                  <BookOpen className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-200">Modul Bahan Ajar</span>
              </div>
              <span className="text-xs font-mono font-bold text-sky-400">{materialsPercent}%</span>
            </div>
            
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-2">
              <div 
                className="h-full bg-gradient-to-r from-sky-500 to-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${materialsPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>{completedMaterials.length} dari {totalMaterials} Modul Selesai</span>
              <span className="text-sky-400 font-semibold group-hover:translate-x-0.5 transition-transform">Buka &rarr;</span>
            </div>
          </div>

          {/* 2. Tugas & Kuis */}
          <div 
            onClick={() => onNavigateTab('quizzes')}
            className="p-4 rounded-2xl bg-slate-900/80 border border-amber-500/30 hover:border-amber-400/60 hover:bg-slate-800/80 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 group-hover:scale-110 transition-transform">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-200">Tugas & Kuis</span>
              </div>
              <span className="text-xs font-mono font-bold text-amber-400">{quizzesPercent}%</span>
            </div>
            
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-2">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
                style={{ width: `${quizzesPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>{completedQuizzes.length} dari {totalQuizzes} Paket Selesai</span>
              <span className="text-amber-400 font-semibold group-hover:translate-x-0.5 transition-transform">Buka &rarr;</span>
            </div>
          </div>

          {/* 3. Buku Digital E-Book */}
          <div 
            onClick={() => onNavigateTab('books')}
            className="p-4 rounded-2xl bg-slate-900/80 border border-indigo-500/30 hover:border-indigo-400/60 hover:bg-slate-800/80 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 group-hover:scale-110 transition-transform">
                  <BookCheck className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-200">Buku Digital E-Book</span>
              </div>
              <span className="text-xs font-mono font-bold text-indigo-400">{booksPercent}%</span>
            </div>
            
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-2">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${booksPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>{booksCompleted} Selesai • {booksActive} Dibaca</span>
              <span className="text-indigo-400 font-semibold group-hover:translate-x-0.5 transition-transform">Buka &rarr;</span>
            </div>
          </div>

          {/* 4. Ruang Video */}
          <div 
            onClick={() => onNavigateTab('videos')}
            className="p-4 rounded-2xl bg-slate-900/80 border border-emerald-500/30 hover:border-emerald-400/60 hover:bg-slate-800/80 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
                  <Play className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-200">Ruang Video</span>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400">{videosPercent}%</span>
            </div>
            
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-2">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                style={{ width: `${videosPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>{watchedVideos.length} dari {totalVideos} Video Ditonton</span>
              <span className="text-emerald-400 font-semibold group-hover:translate-x-0.5 transition-transform">Buka &rarr;</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: "Lanjutkan Belajar Terakhir" Quick Action Banner */}
      {lastItem && (
        <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative z-10 bg-slate-900/50 p-3.5 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Lanjutkan Belajar Terakhir</span>
                <span className="text-[10px] text-slate-400">• {lastItem.subject}</span>
              </div>
              <p className="text-xs font-extrabold text-white truncate max-w-sm sm:max-w-md">
                {lastItem.title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
            <span className="text-xs font-mono font-bold text-emerald-400">
              {lastItem.percent}% Selesai {lastItem.currentPage ? `(Hal ${lastItem.currentPage})` : ''}
            </span>
            <button
              onClick={() => {
                if (lastItem.contentType === 'book') {
                  const b = books.find(item => item.id === lastItem.contentId);
                  if (b) onOpenBook(b, lastItem.currentPage);
                } else if (lastItem.contentType === 'material') {
                  const m = materials.find(item => item.id === lastItem.contentId);
                  if (m) onOpenMaterial(m);
                } else if (lastItem.contentType === 'quiz') {
                  const q = quizzes.find(item => item.id === lastItem.contentId);
                  if (q) onOpenQuiz(q);
                } else if (lastItem.contentType === 'video') {
                  const v = videos.find(item => item.id === lastItem.contentId);
                  if (v) onOpenVideo(v);
                }
              }}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <span>Lanjutkan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
