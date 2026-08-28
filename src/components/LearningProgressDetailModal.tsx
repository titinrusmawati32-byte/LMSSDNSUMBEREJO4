import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Award, BookOpen, CheckCircle2, ChevronRight, FileText, 
  GraduationCap, HelpCircle, Play, Sparkles, Star, TrendingUp,
  BookCheck, Compass, ArrowRight, Zap, Target, X, Printer,
  Calendar, Clock, Check, BarChart3, PieChart, Layers, Bookmark
} from 'lucide-react';
import { ContentLearningProgress, DigitalBook, LearningMaterial, LearningVideo, QuizExam, SchoolSettings, UserProfile } from '../types';

interface LearningProgressDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  schoolSettings?: SchoolSettings;
  materials: LearningMaterial[];
  quizzes: QuizExam[];
  books: DigitalBook[];
  videos: LearningVideo[];
  studentProgressMap: Record<string, ContentLearningProgress>;
  onOpenMaterial: (mat: LearningMaterial) => void;
  onOpenBook: (book: DigitalBook, targetPage?: number) => void;
  onOpenQuiz: (quiz: QuizExam) => void;
  onOpenVideo: (video: LearningVideo) => void;
}

export const LearningProgressDetailModal: React.FC<LearningProgressDetailModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  schoolSettings,
  materials,
  quizzes,
  books,
  videos,
  studentProgressMap,
  onOpenMaterial,
  onOpenBook,
  onOpenQuiz,
  onOpenVideo,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'materials' | 'books' | 'quizzes' | 'videos' | 'certificate'>('overview');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  // 1. Calculate Materials Progress
  const materialsData = materials.map(m => {
    const prog = studentProgressMap[`material_${m.id}`];
    const isCompleted = prog?.isCompleted === true;
    const percent = isCompleted ? 100 : (prog?.percent || 0);
    return { ...m, isCompleted, percent, prog };
  });
  const completedMaterialsCount = materialsData.filter(m => m.isCompleted).length;
  const materialsPercent = materials.length > 0
    ? Math.round((completedMaterialsCount / materials.length) * 100)
    : 0;

  // 2. Calculate Books Progress
  const booksData = books.map(b => {
    const prog = studentProgressMap[`book_${b.id}`];
    const total = b.totalPages || 20;
    const curPage = prog?.currentPage || 1;
    const isCompleted = prog?.isCompleted === true || curPage >= total;
    const percent = isCompleted ? 100 : (prog?.percent || (curPage > 1 ? Math.round((curPage / total) * 100) : 0));
    return { ...b, curPage, total, isCompleted, percent, prog };
  });
  const completedBooksCount = booksData.filter(b => b.isCompleted).length;
  const readingBooksCount = booksData.filter(b => b.percent > 0 && !b.isCompleted).length;
  const booksPercent = books.length > 0
    ? Math.round(booksData.reduce((acc, b) => acc + b.percent, 0) / books.length)
    : 0;

  // 3. Calculate Quizzes Progress
  const quizzesData = quizzes.map(q => {
    const isDone = q.completedScore !== undefined;
    return { ...q, isDone, score: q.completedScore };
  });
  const completedQuizzesCount = quizzesData.filter(q => q.isDone).length;
  const averageQuizScore = completedQuizzesCount > 0
    ? Math.round(quizzesData.reduce((acc, q) => acc + (q.score || 0), 0) / completedQuizzesCount)
    : 0;
  const quizzesPercent = quizzes.length > 0
    ? Math.round((completedQuizzesCount / quizzes.length) * 100)
    : 0;

  // 4. Calculate Videos Progress
  const videosData = videos.map(v => {
    const prog = studentProgressMap[`video_${v.id}`];
    const isWatched = prog?.isCompleted === true || (prog?.percent || 0) >= 80;
    return { ...v, isWatched, percent: isWatched ? 100 : (prog?.percent || 0) };
  });
  const watchedVideosCount = videosData.filter(v => v.isWatched).length;
  const videosPercent = videos.length > 0
    ? Math.round((watchedVideosCount / videos.length) * 100)
    : 0;

  // 5. Total Overall Progress
  const overallPercent = Math.min(100, Math.max(0, Math.round(
    (materialsPercent * 0.40) +
    (quizzesPercent * 0.35) +
    (booksPercent * 0.15) +
    (videosPercent * 0.10)
  )));

  // 6. Subject-by-Subject Calculation
  const subjectsMap: Record<string, { totalItems: number; completedItems: number; materials: number; quizzes: number }> = {};
  materials.forEach(m => {
    const subj = m.subject || 'Umum';
    if (!subjectsMap[subj]) subjectsMap[subj] = { totalItems: 0, completedItems: 0, materials: 0, quizzes: 0 };
    subjectsMap[subj].totalItems += 1;
    subjectsMap[subj].materials += 1;
    const prog = studentProgressMap[`material_${m.id}`];
    if (prog?.isCompleted) subjectsMap[subj].completedItems += 1;
  });
  quizzes.forEach(q => {
    const subj = q.subject || 'Umum';
    if (!subjectsMap[subj]) subjectsMap[subj] = { totalItems: 0, completedItems: 0, materials: 0, quizzes: 0 };
    subjectsMap[subj].totalItems += 1;
    subjectsMap[subj].quizzes += 1;
    if (q.completedScore !== undefined) subjectsMap[subj].completedItems += 1;
  });

  const subjectProgressList = Object.entries(subjectsMap).map(([name, data]) => {
    const pct = data.totalItems > 0 ? Math.round((data.completedItems / data.totalItems) * 100) : 0;
    return { name, ...data, pct };
  }).sort((a, b) => b.pct - a.pct);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-5xl bg-slate-900 border-2 border-sky-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/30">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-white">Rapor Kemajuan Belajar Siswa</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  {currentUser.departmentOrClass || 'Kelas Siswa'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {currentUser.name} • {schoolSettings?.schoolName || 'SD Negeri Sumberejo 04'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Cetak Rapor / Piagam"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cetak</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="px-6 py-2 bg-slate-950/50 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Ikhtisar & Statistik</span>
          </button>

          <button
            onClick={() => setActiveTab('materials')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'materials'
                ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Bahan Ajar ({completedMaterialsCount}/{materials.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('books')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'books'
                ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <BookCheck className="w-3.5 h-3.5" />
            <span>Buku E-Book ({completedBooksCount}/{books.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('quizzes')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'quizzes'
                ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Kuis & Nilai ({completedQuizzesCount}/{quizzes.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('videos')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'videos'
                ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>Video ({watchedVideosCount}/{videos.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('certificate')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'certificate'
                ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Piagam Belajar</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Top Highlights Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-slate-800/60 border border-sky-500/30 space-y-1">
                  <span className="text-[11px] font-bold text-slate-400">Total Kemajuan</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold text-sky-400 font-display">{overallPercent}%</span>
                    <span className="text-[11px] text-slate-400">Terselesaikan</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden mt-1">
                    <div className="h-full bg-sky-400 rounded-full" style={{ width: `${overallPercent}%` }} />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-800/60 border border-emerald-500/30 space-y-1">
                  <span className="text-[11px] font-bold text-slate-400">Bahan Ajar Selesai</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold text-emerald-400 font-display">{completedMaterialsCount}</span>
                    <span className="text-[11px] text-slate-400">dari {materials.length} Modul</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden mt-1">
                    <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${materialsPercent}%` }} />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-800/60 border border-amber-500/30 space-y-1">
                  <span className="text-[11px] font-bold text-slate-400">Rata-Rata Kuis</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold text-amber-400 font-display">{averageQuizScore}</span>
                    <span className="text-[11px] text-slate-400">Poin / 100</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden mt-1">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: `${averageQuizScore}%` }} />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-800/60 border border-indigo-500/30 space-y-1">
                  <span className="text-[11px] font-bold text-slate-400">E-Book & Video</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold text-indigo-400 font-display">{completedBooksCount + watchedVideosCount}</span>
                    <span className="text-[11px] text-slate-400">Selesai Dipelajari</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden mt-1">
                    <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${Math.round((booksPercent + videosPercent) / 2)}%` }} />
                  </div>
                </div>
              </div>

              {/* Subject-by-Subject Progress Breakdown */}
              <div className="p-5 rounded-3xl bg-slate-800/40 border border-slate-700/80 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-sky-400" />
                    <h4 className="font-extrabold text-sm text-white">Kemajuan per Mata Pelajaran</h4>
                  </div>
                  <span className="text-xs text-slate-400 font-medium">
                    {subjectProgressList.length} Mata Pelajaran Terdata
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {subjectProgressList.map((subj) => (
                    <div key={subj.name} className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-200">{subj.name}</span>
                        <span className="font-mono text-xs font-bold text-sky-400">{subj.pct}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full transition-all duration-500"
                          style={{ width: `${subj.pct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                        <span>{subj.materials} Modul • {subj.quizzes} Kuis</span>
                        <span className="text-emerald-400 font-medium">{subj.completedItems}/{subj.totalItems} Selesai</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MATERIALS */}
          {activeTab === 'materials' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Daftar bahan ajar dan status penyelesaian membaca siswa</span>
                <span className="font-bold text-sky-400">{completedMaterialsCount} dari {materials.length} Selesai ({materialsPercent}%)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {materialsData.map((mat) => (
                  <div key={mat.id} className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex flex-col justify-between gap-3">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30">
                          {mat.subject}
                        </span>
                        {mat.isCompleted ? (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-500/30">
                            <Check className="w-3 h-3" /> 100% Selesai
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                            {mat.percent}% Belum Selesai
                          </span>
                        )}
                      </div>
                      <h5 className="font-bold text-xs text-white line-clamp-2">{mat.title}</h5>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">Guru: {mat.teacherName}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">{mat.fileType} • {mat.fileSize}</span>
                      <button
                        onClick={() => {
                          onClose();
                          onOpenMaterial(mat);
                        }}
                        className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <span>Baca</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: BOOKS */}
          {activeTab === 'books' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Daftar buku digital e-book dan kemajuan halaman yang dibaca</span>
                <span className="font-bold text-indigo-400">{completedBooksCount} Selesai • {readingBooksCount} Sedang Dibaca</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {booksData.map((b) => (
                  <div key={b.id} className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex flex-col justify-between gap-3">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {b.classGrade || 'Semua Kelas'} • {b.subject}
                        </span>
                        <span className="text-xs font-mono font-bold text-indigo-400">
                          {b.percent}%
                        </span>
                      </div>
                      <h5 className="font-bold text-xs text-white line-clamp-2">{b.title}</h5>
                      <div className="mt-2 w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${b.percent}%` }} />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Hal {b.curPage} dari {b.total}</span>
                      <button
                        onClick={() => {
                          onClose();
                          onOpenBook(b, b.curPage);
                        }}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <span>{b.curPage > 1 ? 'Lanjutkan' : 'Buka'}</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: QUIZZES */}
          {activeTab === 'quizzes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Daftar evaluasi kuis dan riwayat nilai pencapaian</span>
                <span className="font-bold text-amber-400">Rata-Rata: {averageQuizScore} / 100</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {quizzesData.map((q) => (
                  <div key={q.id} className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex flex-col justify-between gap-3">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {q.subject}
                        </span>
                        {q.isDone ? (
                          <span className="text-xs font-mono font-extrabold text-emerald-400 bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                            Nilai: {q.score}/100
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                            Belum Dikerjakan
                          </span>
                        )}
                      </div>
                      <h5 className="font-bold text-xs text-white line-clamp-2">{q.title}</h5>
                      <p className="text-[11px] text-slate-400 mt-1">{q.totalQuestions} Butir Soal • {q.durationMinutes} Menit</p>
                    </div>

                    <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">Batas: {q.deadline || 'Sesuai Jadwal'}</span>
                      <button
                        onClick={() => {
                          onClose();
                          onOpenQuiz(q);
                        }}
                        className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <span>{q.isDone ? 'Ulangi / Review' : 'Kerjakan'}</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: VIDEOS */}
          {activeTab === 'videos' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Daftar rekaman video materi pembelajaran</span>
                <span className="font-bold text-emerald-400">{watchedVideosCount} dari {videos.length} Ditonton</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {videosData.map((v) => (
                  <div key={v.id} className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex flex-col justify-between gap-3">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {v.subject}
                        </span>
                        {v.isWatched ? (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-500/30">
                            <Check className="w-3 h-3" /> Selesai Ditonton
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                            Belum Ditonton
                          </span>
                        )}
                      </div>
                      <h5 className="font-bold text-xs text-white line-clamp-2">{v.title}</h5>
                      <p className="text-[11px] text-slate-400 mt-1">Durasi: {v.duration}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">Guru: {v.teacherName}</span>
                      <button
                        onClick={() => {
                          onClose();
                          onOpenVideo(v);
                        }}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <span>Putar Video</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: CERTIFICATE / PIAGAM BELAJAR */}
          {activeTab === 'certificate' && (
            <div className="p-8 bg-gradient-to-br from-amber-950/30 via-slate-900 to-indigo-950/40 border-4 border-amber-500/40 rounded-3xl text-center space-y-5 relative shadow-2xl overflow-hidden print:border-black print:bg-white print:text-black">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-xl shadow-amber-500/30">
                <Award className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <span className="text-xs font-mono font-bold tracking-widest text-amber-400 uppercase">
                  Piagam Kemajuan Belajar Digital
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white font-serif">
                  Sertifikat Apresiasi Belajar
                </h3>
                <p className="text-xs text-slate-300">
                  Diberikan dengan bangga kepada peserta didik berprestasi:
                </p>
              </div>

              <div className="py-3 border-y-2 border-amber-500/30 max-w-md mx-auto">
                <h4 className="text-xl sm:text-2xl font-extrabold text-amber-300 font-display">
                  {currentUser.name}
                </h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  {currentUser.departmentOrClass || 'Peserta Didik'} • {schoolSettings?.schoolName || 'SD Negeri Sumberejo 04'}
                </p>
              </div>

              <p className="text-xs text-slate-300 max-w-lg mx-auto leading-relaxed">
                Telah berhasil mencapai tingkat kemajuan belajar sebesar <strong className="text-amber-400 font-bold">{overallPercent}%</strong> pada platform pembelajaran digital terpadu dengan menyelesaikan modul pembelajaran, tugas mandiri, dan evaluasi kuis secara aktif.
              </p>

              <div className="flex items-center justify-center gap-8 pt-4 text-xs text-slate-400">
                <div>
                  <p className="font-semibold text-slate-200">Tanggal Terbit</p>
                  <p>{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-200">Status Capaian</p>
                  <p className="text-emerald-400 font-bold">Aktif & Terverifikasi</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
