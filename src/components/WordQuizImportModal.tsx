import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, Upload, Sparkles, CheckCircle2, AlertCircle, Trash2, Plus, 
  Check, ArrowRight, RefreshCw, HelpCircle, FileType, Edit3, Award, Clock,
  Image as ImageIcon, ZoomIn, X, Camera, Layers, BookOpen, Calendar, Eye
} from 'lucide-react';
import { QuizExam, QuizQuestion, ClassSchedule } from '../types';
import { 
  parseWordDocumentToQuiz, 
  parseRawTextToQuiz, 
  parseImageToQuiz, 
  parseMultipleImagesToQuiz, 
  fileToBase64,
  ParseWordQuizResult 
} from '../lib/aiWordParserService';

interface WordQuizImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacherName: string;
  schedules?: ClassSchedule[];
  onSaveQuiz: (newQuiz: QuizExam) => void;
}

export const WordQuizImportModal: React.FC<WordQuizImportModalProps> = ({
  isOpen,
  onClose,
  teacherName,
  schedules = [],
  onSaveQuiz,
}) => {
  // Source tabs before extraction
  const [activeTab, setActiveTab] = useState<'word' | 'paste' | 'blank'>('word');
  
  // Word state
  const [selectedWordFile, setSelectedWordFile] = useState<File | null>(null);
  
  // Image state
  const [selectedImageFiles, setSelectedImageFiles] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  
  // Paste text state
  const [pastedText, setPastedText] = useState('');
  
  // AI extra instruction
  const [customInstruction, setCustomInstruction] = useState('');
  
  // Processing status
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [parsedSource, setParsedSource] = useState<string | null>(null);
  const [parsedNotice, setParsedNotice] = useState<string | null>(null);

  // STEP 2: Dedicated "Menu Edit Soal" state
  const [isEditMode, setIsEditMode] = useState(false);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizSubject, setQuizSubject] = useState('');
  const [quizType, setQuizType] = useState<'quiz' | 'ujian'>('quiz');
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [deadline, setDeadline] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);

  // Image zoom modal
  const [zoomedImage, setZoomedImage] = useState<{ url: string; caption?: string } | null>(null);

  // Hidden file inputs
  const wordFileInputRef = useRef<HTMLInputElement>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const questionImageInputRef = useRef<HTMLInputElement>(null);
  const [targetQuestionIndexForImage, setTargetQuestionIndexForImage] = useState<number | null>(null);

  if (!isOpen) return null;

  // Drag & drop router that auto-detects file type
  const handleUniversalFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    setErrorMessage(null);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const firstFile = files[0];

    // If word document
    if (
      firstFile.name.endsWith('.docx') || 
      firstFile.name.endsWith('.doc') || 
      firstFile.type.includes('document') ||
      firstFile.type.includes('msword')
    ) {
      setActiveTab('word');
      setSelectedWordFile(firstFile);
      return;
    }

    // If image(s)
    if (firstFile.type.startsWith('image/')) {
      setActiveTab('image');
      const validImages: File[] = [];
      const validUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        if (f.type.startsWith('image/')) {
          validImages.push(f);
          validUrls.push(URL.createObjectURL(f));
        }
      }

      setSelectedImageFiles((prev) => [...prev, ...validImages]);
      setImagePreviewUrls((prev) => [...prev, ...validUrls]);
      return;
    }

    setErrorMessage('Format berkas tidak didukung. Silakan unggah dokumen Word (.docx) atau foto soal (.png, .jpg, .webp)');
  };

  const handleWordFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedWordFile(e.target.files[0]);
      setErrorMessage(null);
    }
  };

  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setErrorMessage(null);

    const validFiles: File[] = [];
    const validUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (f.type.startsWith('image/')) {
        validFiles.push(f);
        validUrls.push(URL.createObjectURL(f));
      }
    }

    if (validFiles.length === 0) {
      setErrorMessage('Pilihlah berkas berformat gambar (.png, .jpg, .jpeg, .webp)');
      return;
    }

    setSelectedImageFiles((prev) => [...prev, ...validFiles]);
    setImagePreviewUrls((prev) => [...prev, ...validUrls]);
  };

  const handleRemoveImageFile = (index: number) => {
    setSelectedImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  // Start Extraction based on active tab
  const handleStartExtraction = async () => {
    setErrorMessage(null);
    setParsedNotice(null);
    setIsLoading(true);

    try {
      let res;

      if (activeTab === 'word') {
        if (!selectedWordFile) {
          setErrorMessage('Silakan pilih file Word (.docx) terlebih dahulu.');
          setIsLoading(false);
          return;
        }
        res = await parseWordDocumentToQuiz(selectedWordFile, customInstruction);
        setParsedSource(`Naskah Word (${selectedWordFile.name})`);
      } else if (activeTab === 'image') {
        if (selectedImageFiles.length === 0) {
          setErrorMessage('Silakan unggah minimal 1 foto/gambar lembar soal.');
          setIsLoading(false);
          return;
        }
        if (selectedImageFiles.length === 1) {
          res = await parseImageToQuiz(selectedImageFiles[0], customInstruction);
        } else {
          res = await parseMultipleImagesToQuiz(selectedImageFiles, customInstruction);
        }
        setParsedSource(`Foto Soal & Diagram (${selectedImageFiles.length} Gambar)`);
      } else if (activeTab === 'paste') {
        if (!pastedText.trim()) {
          setErrorMessage('Silakan tempelkan teks naskah soal terlebih dahulu.');
          setIsLoading(false);
          return;
        }
        res = await parseRawTextToQuiz(pastedText, quizTitle || 'Soal Ujian AI', customInstruction);
        setParsedSource('Teks Naskah Tempel (Paste)');
      }

      if (res && res.data) {
        setQuizTitle(res.data.title || 'Ujian / Quiz Baru');
        setQuizSubject(res.data.subject || 'Mata Pelajaran Umum');
        setQuizType(res.data.type || 'quiz');
        setDurationMinutes(res.data.durationMinutes || 45);
        setQuestions(res.data.questions || []);
        setParsedNotice(res.notice || null);
        setIsEditMode(true);
      }
    } catch (err: any) {
      console.error('Extraction error:', err);
      setErrorMessage(err.message || 'Gagal mengekstrak soal dari berkas.');
    } finally {
      setIsLoading(false);
    }
  };

  // Jump straight to manual question editor
  const handleStartBlankEditor = () => {
    setQuizTitle('Quiz / Ujian Baru');
    setQuizSubject('Ilmu Pengetahuan Alam');
    setQuizType('quiz');
    setDurationMinutes(45);
    setParsedSource('Editor Mandiri');
    setQuestions([
      {
        id: `q-${Date.now()}-1`,
        questionText: 'Pertanyaan butir nomor 1...',
        options: ['Pilihan Jawaban A', 'Pilihan Jawaban B', 'Pilihan Jawaban C', 'Pilihan Jawaban D'],
        correctAnswerIndex: 0,
      }
    ]);
    setIsEditMode(true);
  };

  // Question editing actions
  const handleUpdateQuestionText = (idx: number, text: string) => {
    const updated = [...questions];
    updated[idx].questionText = text;
    setQuestions(updated);
  };

  const handleUpdateCaption = (idx: number, caption: string) => {
    const updated = [...questions];
    updated[idx].imageCaption = caption;
    setQuestions(updated);
  };

  const handleUpdateOption = (qIdx: number, optIdx: number, val: string) => {
    const updated = [...questions];
    updated[qIdx].options[optIdx] = val;
    setQuestions(updated);
  };

  const handleAddOption = (qIdx: number) => {
    const updated = [...questions];
    if (updated[qIdx].options.length >= 5) return;
    const letter = String.fromCharCode(65 + updated[qIdx].options.length);
    updated[qIdx].options.push(`Pilihan Jawaban ${letter}`);
    setQuestions(updated);
  };

  const handleRemoveOption = (qIdx: number, optIdx: number) => {
    const updated = [...questions];
    if (updated[qIdx].options.length <= 2) return;
    updated[qIdx].options.splice(optIdx, 1);
    if (updated[qIdx].correctAnswerIndex >= updated[qIdx].options.length) {
      updated[qIdx].correctAnswerIndex = 0;
    }
    setQuestions(updated);
  };

  const handleSetCorrectAnswer = (qIdx: number, optIdx: number) => {
    const updated = [...questions];
    updated[qIdx].correctAnswerIndex = optIdx;
    setQuestions(updated);
  };

  const handleAddQuestion = () => {
    const newQ: QuizQuestion = {
      id: `q-${Date.now()}-${questions.length + 1}`,
      questionText: `Pertanyaan butir nomor ${questions.length + 1}...`,
      options: ['Pilihan A', 'Pilihan B', 'Pilihan C', 'Pilihan D'],
      correctAnswerIndex: 0,
    };
    setQuestions([...questions, newQ]);
  };

  const handleRemoveQuestion = (idx: number) => {
    if (questions.length <= 1) {
      setErrorMessage('Quiz harus memiliki minimal 1 butir pertanyaan.');
      return;
    }
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  // Image attachment for individual question
  const handleTriggerQuestionImageUpload = (qIdx: number) => {
    setTargetQuestionIndexForImage(qIdx);
    if (questionImageInputRef.current) {
      questionImageInputRef.current.value = '';
      questionImageInputRef.current.click();
    }
  };

  const handleQuestionImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || targetQuestionIndexForImage === null) return;

    try {
      const b64 = await fileToBase64(file);
      const updated = [...questions];
      updated[targetQuestionIndexForImage].imageUrl = b64;
      if (!updated[targetQuestionIndexForImage].imageCaption) {
        updated[targetQuestionIndexForImage].imageCaption = `Diagram/Gambar Soal ${targetQuestionIndexForImage + 1}`;
      }
      setQuestions(updated);
    } catch (err) {
      console.error('Error loading question image:', err);
    }
  };

  const handleRemoveQuestionImage = (qIdx: number) => {
    const updated = [...questions];
    updated[qIdx].imageUrl = undefined;
    setQuestions(updated);
  };

  const handlePasteQuestionImage = async (qIdx: number, e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          try {
            const b64 = await fileToBase64(file);
            const updated = [...questions];
            updated[qIdx].imageUrl = b64;
            if (!updated[qIdx].imageCaption) {
              updated[qIdx].imageCaption = `Gambar Soal ${qIdx + 1} (Hasil Paste Clipboard)`;
            }
            setQuestions(updated);
          } catch (err) {
            console.error('Error pasting image:', err);
          }
        }
        break;
      }
    }
  };

  // Save to LMS
  const handleSaveToLms = () => {
    if (!quizTitle.trim()) {
      setErrorMessage('Judul quiz/ujian tidak boleh kosong.');
      return;
    }
    if (questions.length === 0) {
      setErrorMessage('Minimal harus ada 1 butir soal.');
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].questionText.trim()) {
        setErrorMessage(`Pertanyaan nomor ${i + 1} tidak boleh kosong.`);
        return;
      }
      if (questions[i].options.length < 2) {
        setErrorMessage(`Pertanyaan nomor ${i + 1} harus memiliki minimal 2 opsi.`);
        return;
      }
    }

    const createdQuiz: QuizExam = {
      id: `quiz-${Date.now()}`,
      title: quizTitle.trim(),
      subject: quizSubject.trim() || 'Umum',
      type: quizType,
      durationMinutes: Number(durationMinutes) || 45,
      totalQuestions: questions.length,
      deadline: deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      teacherName: teacherName || 'Guru Pengampu',
      questions,
      status: 'active',
    };

    onSaveQuiz(createdQuiz);
    onClose();
  };

  const handleBackToUpload = () => {
    setIsEditMode(false);
    setErrorMessage(null);
    setParsedNotice(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        className="w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-200 my-auto"
      >
        {/* Hidden File Input for Question Image Attachment */}
        <input
          type="file"
          ref={questionImageInputRef}
          onChange={handleQuestionImageSelected}
          accept="image/*"
          className="hidden"
        />

        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">
                  {isEditMode ? 'Menu Edit Soal (Hasil Ekstraksi AI)' : 'Impor & Upload Naskah Soal (Word, Gambar & Diagram AI)'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {isEditMode ? 'Tahap Review & Edit' : 'Multi-Format AI'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {isEditMode
                  ? 'Periksa butir pertanyaan, sesuaikan diagram/gambar pendukung, edit pilihan jawaban, dan tentukan kunci jawaban.'
                  : 'Unggah file Word (.docx), foto soal bergambar/diagram fisik, atau tempelkan teks ujian untuk diekstrak otomatis.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <div className="flex-1">
                <span className="font-semibold">Perhatian: </span>
                {errorMessage}
              </div>
              <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-200">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAHAP 1: SEBELUM EKSTRAKSI (PILIH SUMBER: WORD / GAMBAR / TEKS / KOSONG) */}
          {/* ========================================================================= */}
          {!isEditMode && (
            <div className="space-y-5">
              {/* Source Navigation Tabs */}
              <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-950 rounded-2xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('word')}
                  className={`flex-1 min-w-[130px] py-2.5 px-3 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
                    activeTab === 'word'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <FileType className="w-4 h-4 text-indigo-300" />
                  <span>Naskah Word (.docx)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('paste')}
                  className={`flex-1 min-w-[130px] py-2.5 px-3 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
                    activeTab === 'paste'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <FileText className="w-4 h-4 text-indigo-300" />
                  <span>Paste / Tempel Teks</span>
                </button>

                <button
                  type="button"
                  onClick={handleStartBlankEditor}
                  className="py-2.5 px-4 text-xs font-semibold rounded-xl text-slate-300 hover:text-white hover:bg-slate-900 border border-slate-800 transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 text-slate-400" />
                  <span>Buat Manual</span>
                </button>
              </div>

              {/* TAB 1: WORD UPLOAD */}
              {activeTab === 'word' && (
                <div className="space-y-4">
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleUniversalFileDrop}
                    onClick={() => wordFileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${
                      isDragOver
                        ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]'
                        : selectedWordFile
                        ? 'border-emerald-500/60 bg-emerald-500/5'
                        : 'border-slate-700/80 hover:border-indigo-500/50 bg-slate-950/60 hover:bg-slate-950'
                    }`}
                  >
                    <input
                      ref={wordFileInputRef}
                      type="file"
                      accept=".docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
                      onChange={handleWordFileSelect}
                      className="hidden"
                    />

                    {selectedWordFile ? (
                      <div className="space-y-3">
                        <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                          <CheckCircle2 className="w-7 h-7" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{selectedWordFile.name}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {(selectedWordFile.size / 1024).toFixed(1)} KB • Berkas Word siap diekstrak oleh Google AI
                          </p>
                        </div>
                        <span className="inline-block px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs text-indigo-300 font-medium">
                          Klik untuk mengganti file
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                          <Upload className="w-6 h-6 animate-bounce" />
                        </div>
                        <div>
                          <h4 className="text-sm sm:text-base font-bold text-white">
                            Tarik & Letakkan File Word (.docx) di Sini
                          </h4>
                          <p className="text-xs text-slate-400 mt-1">
                            atau klik untuk memilih berkas naskah soal dari komputer Anda
                          </p>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Mendukung dokumen Microsoft Word (.docx, .doc) standar dengan format soal pilihan ganda.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: IMAGE UPLOAD (VISION AI) */}
              {activeTab === 'image' && (
                <div className="space-y-4">
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleUniversalFileDrop}
                    onClick={() => imageFileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${
                      isDragOver
                        ? 'border-purple-500 bg-purple-500/10 scale-[1.01]'
                        : selectedImageFiles.length > 0
                        ? 'border-purple-500/60 bg-purple-500/5'
                        : 'border-slate-700/80 hover:border-purple-500/50 bg-slate-950/60 hover:bg-slate-950'
                    }`}
                  >
                    <input
                      ref={imageFileInputRef}
                      type="file"
                      accept="image/png, image/jpeg, image/jpg, image/webp"
                      multiple
                      onChange={handleImageFileSelect}
                      className="hidden"
                    />

                    <div className="w-14 h-14 mx-auto rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20 mb-3">
                      <Camera className="w-6 h-6 animate-pulse" />
                    </div>

                    <h4 className="text-sm sm:text-base font-bold text-white">
                      Tarik & Letakkan Foto / Scan Soal Bergambar di Sini
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                      Mendukung foto lembar ujian fisik, tangkapan layar naskah soal, diagram rangkaian listrik, grafik matematika, atau ilustrasi sains (.png, .jpg, .webp).
                    </p>

                    <div className="mt-4 flex items-center justify-center gap-2">
                      <span className="px-3.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold shadow">
                        Pilih File Gambar
                      </span>
                      <span className="text-[11px] text-slate-500">Bisa memilih beberapa foto sekaligus</span>
                    </div>
                  </div>

                  {/* Image Grid Previews */}
                  {selectedImageFiles.length > 0 && (
                    <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                          <ImageIcon className="w-4 h-4" />
                          {selectedImageFiles.length} Foto/Gambar Terpilih
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedImageFiles([]);
                            setImagePreviewUrls([]);
                          }}
                          className="text-[11px] text-slate-400 hover:text-rose-400 flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Hapus Semua
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {imagePreviewUrls.map((url, idx) => (
                          <div
                            key={idx}
                            className="relative group rounded-xl overflow-hidden border border-slate-700 bg-slate-900 aspect-video flex items-center justify-center"
                          >
                            <img src={url} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-1">
                              <button
                                type="button"
                                onClick={() => setZoomedImage({ url, caption: selectedImageFiles[idx]?.name })}
                                className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500"
                                title="Perbesar"
                              >
                                <ZoomIn className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveImageFile(idx)}
                                className="p-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-500"
                                title="Hapus"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <span className="absolute bottom-1 left-1 bg-black/70 px-1.5 py-0.5 rounded text-[9px] font-mono text-slate-200">
                              #{idx + 1}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: PASTE TEXT */}
              {activeTab === 'paste' && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-300">
                    Tempelkan teks naskah soal dari dokumen Anda:
                  </label>
                  <textarea
                    rows={8}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Contoh format:&#10;1. Apa fungsi dari organ mitokondria?&#10;A. Penghasil energi sel&#10;B. Sintesis protein&#10;C. Pembelahan sel&#10;D. Ekskresi zat&#10;Kunci: A&#10;&#10;2. ..."
                    className="w-full p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono resize-none"
                  />
                </div>
              )}

              {/* Optional Custom Instructions */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Instruksi Tambahan untuk Google AI (Opsional)
                </label>
                <input
                  type="text"
                  value={customInstruction}
                  onChange={(e) => setCustomInstruction(e.target.value)}
                  placeholder="Contoh: Soal Biologi SMA Kelas 11, pastikan kunci jawaban dan opsi A-E terdeteksi dengan rapi."
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* How it works info */}
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300">
                  <HelpCircle className="w-4 h-4" />
                  <span>Alur Kerja Ekstraksi & Editor:</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  1. Pilih berkas Word (.docx), foto lembar soal bergambar, atau tempel teks naskah. <br />
                  2. Google AI mengekstrak butir pertanyaan, gambar/diagram, pilihan ganda, dan kunci jawaban. <br />
                  3. Sistem otomatis membuka <strong>Menu Edit Soal</strong> agar Anda dapat meninjau, mengedit teks/gambar, dan mengatur kunci sebelum diterbitkan ke LMS.
                </p>
              </div>

              {/* Extraction Trigger Button */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-all"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={
                    isLoading ||
                    (activeTab === 'word' && !selectedWordFile) ||
                    (activeTab === 'image' && selectedImageFiles.length === 0) ||
                    (activeTab === 'paste' && !pastedText.trim())
                  }
                  onClick={handleStartExtraction}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:opacity-90 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Mengekstrak Soal dengan Google AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Ekstrak & Buka Menu Edit Soal</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAHAP 2: MENU EDIT SOAL (SETELAH SOAL BERHASIL DIEKSTRAK DARI DOKUMEN/GAMBAR) */}
          {/* ========================================================================= */}
          {isEditMode && (
            <div className="space-y-5">
              {/* Success Notification Bar */}
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-white text-xs sm:text-sm flex items-center gap-2">
                      <span>Berhasil Mengekstrak {questions.length} Butir Soal</span>
                      {parsedSource && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 font-normal border border-slate-700">
                          Sumber: {parsedSource}
                        </span>
                      )}
                    </h5>
                    <p className="text-[11px] text-emerald-300/80">
                      Silakan periksa teks pertanyaan, lampiran diagram/gambar, opsi jawaban, dan pastikan kunci jawaban sudah tepat.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleBackToUpload}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Ganti / Unggah Ulang</span>
                </button>
              </div>

              {parsedNotice && (
                <div className="px-4 py-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs flex items-center gap-2">
                  <Sparkles className="w-4 h-4 shrink-0 text-indigo-400" />
                  <span>{parsedNotice}</span>
                </div>
              )}

              {/* Quiz Metadata Configuration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-slate-950/80 border border-slate-800 rounded-2xl">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Judul Quiz / Ujian</label>
                  <input
                    type="text"
                    value={quizTitle}
                    onChange={(e) => setQuizTitle(e.target.value)}
                    placeholder="Judul Evaluasi Pembelajaran"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Mata Pelajaran (Sesuai Jadwal)</label>
                  <input
                    type="text"
                    list="quiz-schedule-subjects"
                    value={quizSubject}
                    onChange={(e) => setQuizSubject(e.target.value)}
                    placeholder="Contoh: Matematika Dasar"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                  <datalist id="quiz-schedule-subjects">
                    {Array.from(new Set(schedules.map(s => s.subject?.trim()).filter(Boolean))).map(subj => (
                      <option key={subj} value={subj} />
                    ))}
                    <option value="Matematika Dasar" />
                    <option value="IPA & Eksperimen Sains" />
                    <option value="Bahasa Indonesia & Literasi" />
                    <option value="Informatika & Komputer" />
                    <option value="Pendidikan Agama & Budi Pekerti" />
                    <option value="Pendidikan Pancasila & Kewarganegaraan (PPKn)" />
                  </datalist>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Durasi Pengerjaan</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={5}
                      max={240}
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 30)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-xs text-slate-400 font-medium">Menit</span>
                  </div>
                </div>
              </div>

              {/* Questions List & Interactive Question Editor */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-400" />
                    <span>Daftar Butir Pertanyaan & Kunci Jawaban ({questions.length})</span>
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="px-3.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Butir Soal</span>
                  </button>
                </div>

                {questions.map((q, qIdx) => (
                  <div
                    key={q.id || qIdx}
                    onPaste={(e) => handlePasteQuestionImage(qIdx, e)}
                    className="p-4 sm:p-5 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3.5 hover:border-indigo-500/40 transition-colors relative"
                  >
                    {/* Header Question */}
                    <div className="flex items-start justify-between gap-3">
                      <span className="w-7 h-7 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold text-xs flex items-center justify-center shrink-0">
                        {qIdx + 1}
                      </span>
                      <div className="flex-1">
                        <textarea
                          rows={2}
                          value={q.questionText}
                          onChange={(e) => handleUpdateQuestionText(qIdx, e.target.value)}
                          placeholder="Ketik atau edit isi pertanyaan soal..."
                          className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(qIdx)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Hapus butir soal"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Question Diagram / Image Attachment Section */}
                    <div className="p-3 bg-slate-900/90 border border-slate-800/90 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        {q.imageUrl ? (
                          <div className="relative group w-16 h-16 rounded-lg overflow-hidden border border-slate-700 bg-black shrink-0">
                            <img
                              src={q.imageUrl}
                              alt="Gambar Soal"
                              className="w-full h-full object-cover cursor-pointer"
                              onClick={() => setZoomedImage({ url: q.imageUrl!, caption: q.imageCaption })}
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 transition-opacity">
                              <button
                                type="button"
                                onClick={() => setZoomedImage({ url: q.imageUrl!, caption: q.imageCaption })}
                                className="p-1 text-white bg-blue-600 rounded"
                                title="Perbesar"
                              >
                                <ZoomIn className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-lg border border-dashed border-slate-700 bg-slate-950 flex flex-col items-center justify-center text-slate-500 shrink-0">
                            <ImageIcon className="w-5 h-5 opacity-40" />
                            <span className="text-[9px] mt-1">Tanpa Foto</span>
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">
                            Keterangan Gambar / Diagram Pendukung (Bisa Ctrl+V untuk Tempel Gambar)
                          </label>
                          <input
                            type="text"
                            value={q.imageCaption || ''}
                            onChange={(e) => handleUpdateCaption(qIdx, e.target.value)}
                            placeholder="Contoh: Diagram Rangkaian Listrik (Bisa tekan Ctrl+V saat aktif di soal)"
                            className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleTriggerQuestionImageUpload(qIdx)}
                          className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                          title="Upload dari folder atau tempel gambar via Ctrl+V"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>{q.imageUrl ? 'Ganti Gambar' : 'Upload / Tempel Gambar (Ctrl+V)'}</span>
                        </button>
                        {q.imageUrl && (
                          <button
                            type="button"
                            onClick={() => handleRemoveQuestionImage(qIdx)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg"
                            title="Hapus Gambar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Options List with Key Selection */}
                    <div className="space-y-2 pl-1">
                      <p className="text-[11px] font-semibold text-slate-400">
                        Pilihan Ganda (Klik bulatan huruf untuk menetapkan kunci jawaban yang benar):
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.options.map((opt, optIdx) => {
                          const isCorrect = q.correctAnswerIndex === optIdx;
                          const letter = String.fromCharCode(65 + optIdx);
                          return (
                            <div
                              key={optIdx}
                              className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                                isCorrect
                                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200'
                                  : 'bg-slate-900 border-slate-800 text-slate-300'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => handleSetCorrectAnswer(qIdx, optIdx)}
                                className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 transition-colors ${
                                  isCorrect
                                    ? 'bg-emerald-500 text-white shadow-md'
                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                }`}
                                title={isCorrect ? 'Kunci Jawaban Benar' : 'Klik untuk jadikan kunci jawaban'}
                              >
                                {letter}
                              </button>

                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => handleUpdateOption(qIdx, optIdx, e.target.value)}
                                className="flex-1 bg-transparent text-xs text-slate-100 focus:outline-none"
                              />

                              {q.options.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveOption(qIdx, optIdx)}
                                  className="text-slate-500 hover:text-rose-400 p-1"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {q.options.length < 5 && (
                        <button
                          type="button"
                          onClick={() => handleAddOption(qIdx)}
                          className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 mt-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Tambah Opsi ({String.fromCharCode(65 + q.options.length)})</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
          >
            Batal
          </button>

          {isEditMode && (
            <button
              type="button"
              onClick={handleSaveToLms}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Simpan & Terbitkan Soal ke LMS</span>
            </button>
          )}
        </div>
      </motion.div>

      {/* Fullscreen Image Zoom Lightbox */}
      <AnimatePresence>
        {zoomedImage && (
          <div
            onClick={() => setZoomedImage(null)}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg"
          >
            <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
              <img
                src={zoomedImage.url}
                alt="Zoomed Diagram"
                className="max-w-full max-h-[80vh] object-contain rounded-2xl border border-slate-700 shadow-2xl"
              />
              {zoomedImage.caption && (
                <p className="text-white text-xs font-semibold mt-3 bg-slate-900/80 px-4 py-1.5 rounded-full border border-slate-700">
                  {zoomedImage.caption}
                </p>
              )}
              <button
                onClick={() => setZoomedImage(null)}
                className="absolute -top-3 -right-3 p-2 bg-rose-600 text-white rounded-full shadow-lg hover:bg-rose-500"
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
