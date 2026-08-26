import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, CheckCircle2, AlertCircle, Award, X, ArrowRight, ArrowLeft, HelpCircle, Image as ImageIcon, ZoomIn, Send } from 'lucide-react';
import { QuizExam, UserProfile, StudentQuizSubmission } from '../types';
import { addSubmissionToDb } from '../lib/lmsDb';

interface QuizExamModalProps {
  isOpen: boolean;
  quiz: QuizExam | null;
  currentUser?: UserProfile | null;
  onClose: () => void;
  onCompleteQuiz: (quizId: string, score: number) => void;
}

export const QuizExamModal: React.FC<QuizExamModalProps> = ({
  isOpen,
  quiz,
  currentUser,
  onClose,
  onCompleteQuiz
}) => {
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<{ url: string; caption?: string } | null>(null);

  useEffect(() => {
    if (quiz) {
      setCurrentQuestionIdx(0);
      setSelectedAnswers({});
      setIsFinished(false);
      setShowConfirmModal(false);
      setTimeLeftSeconds(quiz.durationMinutes * 60);
    }
  }, [quiz]);

  useEffect(() => {
    if (!isOpen || isFinished || timeLeftSeconds <= 0) return;
    const timer = setInterval(() => {
      setTimeLeftSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          confirmFinalSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, isFinished, timeLeftSeconds]);

  if (!isOpen || !quiz) return null;

  const questions = quiz.questions || [];
  const currentQ = questions[currentQuestionIdx];

  const handleSelectAnswer = (optionIdx: number) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [currentQuestionIdx]: optionIdx
    });
  };

  const handlePromptSubmitQuiz = () => {
    setShowConfirmModal(true);
  };

  const confirmFinalSubmit = () => {
    let correctCount = 0;
    questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctAnswerIndex) {
        correctCount += 1;
      }
    });

    const score = Math.round((correctCount / (questions.length || 1)) * 100);
    setFinalScore(score);
    setIsFinished(true);
    setShowConfirmModal(false);

    if (currentUser) {
      const submission: StudentQuizSubmission = {
        id: `${currentUser.id}_${quiz.id}`,
        studentId: currentUser.id,
        studentName: currentUser.name,
        studentNisn: currentUser.identifierNumber || '0087612301',
        studentClass: currentUser.departmentOrClass || 'Kelas 5A',
        quizId: quiz.id,
        quizTitle: quiz.title,
        subject: quiz.subject,
        score: score,
        submittedAt: new Date().toISOString(),
        status: 'submitted'
      };
      addSubmissionToDb(submission);
    }

    onCompleteQuiz(quiz.id, score);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl bg-[#ebf3fc] dark:bg-slate-900 rounded-3xl shadow-2xl border border-blue-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] glass-card"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-[#e2ecf8]/80 dark:bg-slate-900 text-slate-900 flex items-center justify-between border-b border-blue-200 dark:border-slate-800">
          <div>
            <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200 rounded-full">
              {quiz.type.toUpperCase()} • {quiz.subject}
            </span>
            <h3 className="font-bold text-base mt-1 text-slate-900 dark:text-white">{quiz.title}</h3>
          </div>

          <div className="flex items-center gap-4">
            {!isFinished && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100/80 text-amber-900 border border-amber-200 font-mono text-xs font-bold">
                <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
                <span>{formatTime(timeLeftSeconds)}</span>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-blue-100/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {!isFinished ? (
            currentQ ? (
              <div className="space-y-6">
                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                    <span>Soal Nomor {currentQuestionIdx + 1} dari {questions.length}</span>
                    <span>{Math.round(((currentQuestionIdx + 1) / questions.length) * 100)}% Selesai</span>
                  </div>
                  <div className="w-full h-2 bg-blue-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#005da7] transition-all duration-300"
                      style={{ width: `${((currentQuestionIdx + 1) / questions.length) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Question Text */}
                <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-slate-800/50 border border-blue-200/80 dark:border-slate-700/80 space-y-3">
                  <p className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white leading-relaxed">
                    {currentQ.questionText}
                  </p>

                  {/* Question Image (Diagram, Graph, Science illustration, etc.) */}
                  {currentQ.imageUrl && (
                    <div className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-950/80 max-w-lg mx-auto">
                      <img
                        src={currentQ.imageUrl}
                        alt="Ilustrasi Soal"
                        className="w-full max-h-64 object-contain mx-auto cursor-pointer hover:opacity-95 transition-opacity"
                        onClick={() => setZoomedImage({ url: currentQ.imageUrl!, caption: currentQ.imageCaption })}
                      />
                      
                      <div className="absolute top-2 right-2 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setZoomedImage({ url: currentQ.imageUrl!, caption: currentQ.imageCaption })}
                          className="px-2.5 py-1 bg-black/70 hover:bg-black/90 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 backdrop-blur-sm shadow"
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                          <span>Perbesar Gambar</span>
                        </button>
                      </div>

                      {currentQ.imageCaption && (
                        <div className="px-3 py-1.5 bg-slate-900/90 border-t border-slate-800 text-center">
                          <span className="text-[11px] text-slate-300 italic font-medium">
                            {currentQ.imageCaption}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Options list */}
                <div className="space-y-2.5">
                  {currentQ.options.map((option, optIdx) => {
                    const isSelected = selectedAnswers[currentQuestionIdx] === optIdx;
                    const optionLetter = String.fromCharCode(65 + optIdx); // A, B, C, D
                    return (
                      <button
                        key={optIdx}
                        onClick={() => handleSelectAnswer(optIdx)}
                        className={`w-full p-3.5 rounded-xl border text-left text-xs sm:text-sm font-medium flex items-center gap-3 transition-all ${
                          isSelected
                            ? 'bg-[#005da7] text-white border-[#005da7] shadow-md shadow-blue-500/20'
                            : 'bg-blue-50/50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 border-blue-200/80 dark:border-slate-700/80 hover:border-blue-500/50 hover:bg-blue-100/50'
                        }`}
                      >
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-blue-100 dark:bg-slate-700 text-[#005da7] dark:text-slate-300'
                        }`}>
                          {optionLetter}
                        </span>
                        <span>{option}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null
          ) : (
            /* Results Screen */
            <div className="text-center py-8 space-y-4">
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/20">
                <Award className="w-10 h-10" />
              </div>

              <div>
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-bold border border-emerald-500/20">
                  Ujian / Quiz Selesai
                </span>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                  Hasil Perolehan Nilai Anda
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Nilai otomatis tersimpan dalam portofolio e-learning siswa.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-blue-50/70 dark:bg-slate-800/80 border border-blue-200 dark:border-slate-700 max-w-sm mx-auto space-y-1">
                <p className="text-xs text-slate-500 font-medium">SKOR AKHIR</p>
                <p className="text-5xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {finalScore} <span className="text-sm font-normal text-slate-400">/ 100</span>
                </p>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 pt-2">
                  {finalScore >= 75 ? 'Selamat! Anda Memenuhi KKM Minimal.' : 'Perlu Belajar Lebih Giat Lagi.'}
                </p>
              </div>

              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-[#005da7] hover:bg-[#004883] text-white text-xs font-bold rounded-xl shadow-lg transition-all"
              >
                Selesai & Kembali ke Portal
              </button>
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        {!isFinished && (
          <div className="px-6 py-4 bg-[#e2ecf8]/80 dark:bg-slate-900 border-t border-blue-200 dark:border-slate-800 flex items-center justify-between">
            <button
              onClick={() => setCurrentQuestionIdx(prev => Math.max(0, prev - 1))}
              disabled={currentQuestionIdx === 0}
              className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Sebelumnya</span>
            </button>

            {currentQuestionIdx < questions.length - 1 ? (
              <button
                onClick={() => setCurrentQuestionIdx(prev => Math.min(questions.length - 1, prev + 1))}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow"
              >
                <span>Selanjutnya</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handlePromptSubmitQuiz}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer transition-all active:scale-95"
              >
                <Send className="w-4 h-4" />
                <span>Kumpulkan Jawaban</span>
              </button>
            )}
          </div>
        )}
      </motion.div>

      {/* Confirmation Modal Before Submission */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-slate-900 border-2 border-emerald-500/50 rounded-3xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl relative"
            >
              <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/40 shadow-inner">
                <Send className="w-8 h-8" />
              </div>

              <div>
                <h3 className="font-extrabold text-lg text-white">Konfirmasi Kumpulkan Kuis</h3>
                <p className="text-xs text-slate-300 leading-relaxed mt-2">
                  Anda telah menjawab <span className="font-bold text-amber-400">{Object.keys(selectedAnswers).length}</span> dari <span className="font-bold text-sky-400">{questions.length}</span> soal.
                </p>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-slate-400 text-[11px] mt-3 space-y-1 text-left">
                  <p className="font-semibold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Penting:
                  </p>
                  <p>Setelah Anda klik <b>"KUMPULKAN SEKARANG"</b>, nilai kuis akan otomatis tercatat di portal guru dan rekapitulasi nilai Excel.</p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer transition-colors"
                >
                  Periksa Lagi
                </button>
                <button
                  type="button"
                  onClick={confirmFinalSubmit}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>KUMPULKAN SEKARANG</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Fullscreen Image Lightbox Modal for Students */}
      <AnimatePresence>
        {zoomedImage && (
          <div
            onClick={() => setZoomedImage(null)}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-4xl max-h-[90vh] flex flex-col items-center"
            >
              <img
                src={zoomedImage.url}
                alt="Gambar Soal Diperbesar"
                className="max-w-full max-h-[80vh] object-contain rounded-2xl border border-slate-700 shadow-2xl bg-black"
              />
              {zoomedImage.caption && (
                <p className="text-white text-xs font-semibold mt-3 bg-slate-900/90 px-4 py-1.5 rounded-full border border-slate-700 text-center">
                  {zoomedImage.caption}
                </p>
              )}
              <button
                onClick={() => setZoomedImage(null)}
                className="absolute -top-3 -right-3 p-2 bg-rose-600 hover:bg-rose-500 text-white rounded-full shadow-lg transition-colors"
                title="Tutup Pratinjau"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
