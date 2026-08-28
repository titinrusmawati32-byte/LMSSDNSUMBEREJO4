import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, X, ChevronLeft, ChevronRight, Download, 
  ZoomIn, ZoomOut, Maximize2, Minimize2, ExternalLink,
  RotateCw, LayoutGrid, FileText, AlertCircle, RefreshCw,
  Search, Check, ChevronsLeft, ChevronsRight, Eye, ShieldCheck,
  Volume2, VolumeX, Sparkles, HelpCircle, CheckCircle2,
  Bookmark, Edit3, Save, Share2, Printer, Award, Lightbulb,
  FileCheck, ArrowRight, Sun, Moon, Coffee, Info, Layers
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { LearningMaterial } from '../types';
import { downloadLargeFileFromFirestore } from "../lib/lmsDb";
import { getPdfBlob, getPdfArrayBuffer } from '../lib/pdfStorage';
import { resolvePdfSource, ParsedPdfSource } from '../lib/pdfHelper';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  } catch (e) {
    console.warn('PDF Worker setup note:', e);
  }
}

interface MaterialDetailModalProps {
  isOpen: boolean;
  material: LearningMaterial | null;
  onClose: () => void;
  onToggleStudied?: (materialId: string, isStudied: boolean) => void;
  isStudied?: boolean;
}

type ActiveTab = 'reader' | 'summary' | 'notes' | 'quiz';
type ReadingTheme = 'light' | 'sepia' | 'dark';

export const MaterialDetailModal: React.FC<MaterialDetailModalProps> = ({
  isOpen,
  material,
  onClose,
  onToggleStudied,
  isStudied: initialIsStudied = false,
}) => {
  // Navigation & Display State
  const [activeTab, setActiveTab] = useState<ActiveTab>('reader');
  const [readingTheme, setReadingTheme] = useState<ReadingTheme>('light');
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>('normal');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [studied, setStudied] = useState<boolean>(initialIsStudied);

  // PDF.js State
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [externalSource, setExternalSource] = useState<ParsedPdfSource | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageInputVal, setPageInputVal] = useState<string>('1');
  const [scale, setScale] = useState<number>(1.2);
  const [rotation, setRotation] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rawBlobUrl, setRawBlobUrl] = useState<string | null>(null);
  const [pageRendering, setPageRendering] = useState<boolean>(false);

  // Audio Narration State (Text-to-Speech)
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [speechSynthesisAvailable, setSpeechSynthesisAvailable] = useState<boolean>(false);

  // Student Notes State (Persisted in localStorage)
  const [studentNotes, setStudentNotes] = useState<string>('');
  const [noteSavedToast, setNoteSavedToast] = useState<boolean>(false);

  // Self-check Interactive Quiz State
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const renderTaskRef = useRef<any>(null);

  // Initialize Speech Synthesis availability
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setSpeechSynthesisAvailable(true);
    }
  }, []);

  // Sync studied state and load notes when material changes
  useEffect(() => {
    if (material) {
      // Check studied from localStorage if available
      try {
        const studiedList = JSON.parse(localStorage.getItem('edusmart_studied_materials') || '[]');
        setStudied(studiedList.includes(material.id));
      } catch (e) {
        setStudied(initialIsStudied);
      }

      // Load student notes from localStorage
      try {
        const savedNotes = localStorage.getItem(`edusmart_notes_${material.id}`);
        if (savedNotes) {
          setStudentNotes(savedNotes);
        } else {
          setStudentNotes(
            `# Catatan Belajar: ${material.title}\n\n` +
            `• Guru Pengampu: ${material.teacherName}\n` +
            `• Mata Pelajaran: ${material.subject}\n` +
            `• Tanggal Belajar: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}\n\n` +
            `## Poin Penting yang Dipahami:\n- Tuliskan ringkasan materi di sini...\n\n` +
            `## Pertanyaan untuk Guru:\n- `
          );
        }
      } catch (e) {
        // LocalStorage fallback
      }

      // Reset quiz
      setQuizAnswers({});
      setQuizSubmitted(false);
      setActiveTab('reader');
      setCurrentPage(1);
      setPageInputVal('1');
    }
  }, [material, initialIsStudied]);

  // Load PDF Document
  useEffect(() => {
    let isCancelled = false;

    async function loadPdf() {
      if (!isOpen || !material) return;

      setIsLoading(true);
      setLoadError(null);
      setPdfDoc(null);
      setCurrentPage(1);
      setPageInputVal('1');

      try {
        let pdfData: ArrayBuffer | string | null = null;
        let blobUrl: string | null = null;

        // 1. Try IndexedDB
        const buffer = await getPdfArrayBuffer(material.id);
        if (buffer) {
          pdfData = buffer;
          const blob = await getPdfBlob(material.id);
          if (blob) {
            blobUrl = URL.createObjectURL(blob);
            setRawBlobUrl(blobUrl);
          }
        } else if (material.fileChunks && material.fileChunks > 0) {
          // 1.5 Download chunks from Firestore
          try {
            const fullB64 = await downloadLargeFileFromFirestore(material.id, material.fileChunks);
            if (fullB64 && fullB64.startsWith('data:')) {
              const parts = fullB64.split(',');
              if (parts[1]) {
                const binaryString = window.atob(parts[1]);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
                }
                pdfData = bytes.buffer;
              }
            }
          } catch(err) {
            console.error('Failed to download PDF chunks', err);
          }
        } else if (material.fileData && material.fileData.startsWith('data:application/pdf;base64,')) {
          // 2. Base64 data URL
          const base64Data = material.fileData.split(',')[1];
          const binaryString = window.atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          pdfData = bytes.buffer;
        } else if (material.fileUrl && !material.fileUrl.startsWith('data:')) {
          // 3. Remote URL
          pdfData = material.fileUrl;
        }

        if (!pdfData) {
          const parsedSource = resolvePdfSource(material.fileUrl || material.fileUrl, material.fileData);
          if (parsedSource.type !== 'fallback' && parsedSource.embedUrl) {
             setExternalSource(parsedSource);
             setIsLoading(false);
             setPdfDoc(null);
             setNumPages(1);
             return;
          }

          // No binary PDF found, will use rich interactive presentation view
          if (!isCancelled) {
            setIsLoading(false);
            setPdfDoc(null);
          }
          return;
        }

        const loadingTask = pdfjsLib.getDocument(
          typeof pdfData === 'string' ? { url: pdfData } : { data: pdfData }
        );
        const loadedDoc = await loadingTask.promise;

        if (!isCancelled) {
          setPdfDoc(loadedDoc);
          setNumPages(loadedDoc.numPages);
          
          try {
            const page1 = await loadedDoc.getPage(1);
            const viewport1 = page1.getViewport({ scale: 1.0, rotation: 0 });
            const isMob = window.innerWidth < 768;
            const containerWidth = window.innerWidth - (isMob ? 32 : 120);
            const calculatedScale = Math.min(Math.max(containerWidth / viewport1.width, isMob ? 0.45 : 1.0), isMob ? 1.0 : 2.0);
            setScale(calculatedScale);
          } catch (e) {
            setScale(window.innerWidth < 768 ? 0.6 : 1.2);
          }
          
          setIsLoading(false);
        }
      } catch (err: any) {
        console.warn('PDF load note:', err);
        if (!isCancelled) {
          setLoadError(err?.message || 'Tidak dapat memuat PDF. Menampilkan modul interaktif.');
          setIsLoading(false);
        }
      }
    }

    loadPdf();

    return () => {
      isCancelled = true;
      if (rawBlobUrl) {
        URL.revokeObjectURL(rawBlobUrl);
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isOpen, material]);

  // Render current PDF page
  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdfDoc || !canvasRef.current || pageRendering) return;

    try {
      setPageRendering(true);
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }

      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale, rotation });

      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;

      const pixelRatio = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * pixelRatio);
      canvas.height = Math.floor(viewport.height * pixelRatio);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };

      const renderTask = page.render(renderContext);
      renderTaskRef.current = renderTask;

      await renderTask.promise;
      setPageRendering(false);
      setPageInputVal(String(pageNum));
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.warn('Render page error:', err);
      }
      setPageRendering(false);
    }
  }, [pdfDoc, scale, rotation, pageRendering]);

  useEffect(() => {
    if (pdfDoc && activeTab === 'reader') {
      renderPage(currentPage);
    }
  }, [pdfDoc, currentPage, scale, rotation, activeTab, renderPage]);

  // Stop speech on tab switch or close
  const stopAudio = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
    }
  };

  const handleToggleAudio = () => {
    if (!speechSynthesisAvailable || !material) return;

    if (isPlayingAudio) {
      stopAudio();
    } else {
      window.speechSynthesis.cancel();

      const textToSpeak = `Materi pembelajaran: ${material.title}. Mata pelajaran: ${material.subject}. Disusun oleh: ${material.teacherName}. ${material.description}. Ringkasan penting: Pahami seluruh konsep dasar pada modul ini, perhatikan contoh soal serta studi kasus yang diberikan, dan catat poin-poin utama untuk persiapan kuis harian.`;

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = 'id-ID';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      // Try to find Indonesian voice
      const voices = window.speechSynthesis.getVoices();
      const idVoice = voices.find(v => v.lang.includes('id') || v.lang.includes('ID'));
      if (idVoice) {
        utterance.voice = idVoice;
      }

      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);

      window.speechSynthesis.speak(utterance);
      setIsPlayingAudio(true);
    }
  };

  const handleSaveNotes = () => {
    if (!material) return;
    try {
      localStorage.setItem(`edusmart_notes_${material.id}`, studentNotes);
      setNoteSavedToast(true);
      setTimeout(() => setNoteSavedToast(false), 2500);
    } catch (e) {
      console.warn('Note save note:', e);
    }
  };

  const handleToggleStudied = () => {
    if (!material) return;
    const newStatus = !studied;
    setStudied(newStatus);
    try {
      const studiedList: string[] = JSON.parse(localStorage.getItem('edusmart_studied_materials') || '[]');
      let updated: string[];
      if (newStatus) {
        updated = Array.from(new Set([...studiedList, material.id]));
      } else {
        updated = studiedList.filter(id => id !== material.id);
      }
      localStorage.setItem('edusmart_studied_materials', JSON.stringify(updated));
    } catch (e) {
      // LocalStorage fallback
    }

    if (onToggleStudied) {
      onToggleStudied(material.id, newStatus);
    }
  };

  if (!isOpen || !material) return null;

  const totalInteractivePages = 5;
  const totalDisplayPages = pdfDoc ? numPages : totalInteractivePages;

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
      setPageInputVal(String(currentPage - 1));
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalDisplayPages) {
      setCurrentPage(prev => prev + 1);
      setPageInputVal(String(currentPage + 1));
    }
  };

  const handlePageInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const page = parseInt(pageInputVal, 10);
      if (!isNaN(page) && page >= 1 && page <= totalDisplayPages) {
        setCurrentPage(page);
      } else {
        setPageInputVal(String(currentPage));
      }
    }
  };

  // Pre-baked interactive self-check questions based on subject
  const sampleQuizQuestions = [
    {
      id: 1,
      question: `Apa tujuan utama dari modul "${material.title}" dalam mata pelajaran ${material.subject}?`,
      options: [
        `Memahami konsep fundamental dan penerapan praktis materi sesuai kurikulum.`,
        `Hanya untuk dihafal tanpa perlu dipraktikkan.`,
        `Sekadar pelengkap administrasi kelas tanpa evaluasi.`,
        `Materi opsional yang tidak diujikan.`
      ],
      correctIndex: 0,
      explanation: `Modul ini dirancang oleh guru (${material.teacherName}) untuk membangun pemahaman konsep yang kokoh dan aplikatif.`
    },
    {
      id: 2,
      question: `Langkah terbaik setelah membaca dan mempelajari modul ajar ini adalah...`,
      options: [
        `Menutup webapp tanpa mencatat poin penting.`,
        `Merangkum konsep kunci pada Catatan Siswa dan mengerjakan latihan soal mandiri.`,
        `Menunggu hingga hari ujian tanpa belajar lagi.`,
        `Menghapus riwayat belajar.`
      ],
      correctIndex: 1,
      explanation: `Mencatat poin penting dan menguji pemahaman secara berkala meningkatkan retensi daya ingat hingga 80%.`
    },
    {
      id: 3,
      question: `Bagaimana cara berkonsultasi jika ada bagian materi yang belum dipahami?`,
      options: [
        `Membiarkan materi tersebut terlewatkan.`,
        `Mencatat poin yang belum dimengerti dan menanyakannya kepada ${material.teacherName} saat sesi tatap muka.`,
        `Mencari jawaban acak di internet tanpa verifikasi.`,
        `Menyerah dan tidak mengerjakan tugas.`
      ],
      correctIndex: 1,
      explanation: `Guru siap membantu menjelaskan kembali konsep-konsep yang memerlukan pembahasan lebih mendalam.`
    }
  ];

  const calculateScore = () => {
    let correct = 0;
    sampleQuizQuestions.forEach((q, idx) => {
      if (quizAnswers[idx] === q.correctIndex) {
        correct++;
      }
    });
    return Math.round((correct / sampleQuizQuestions.length) * 100);
  };

  // Reading Theme Styling
  const getThemeClasses = () => {
    switch (readingTheme) {
      case 'sepia':
        return 'bg-[#fbf0d9] text-[#433422] border-[#ebd4b3]';
      case 'dark':
        return 'bg-slate-900 text-slate-100 border-slate-800';
      case 'light':
      default:
        return 'bg-[#ebf3fc] text-slate-900 border-blue-200';
    }
  };

  const getFontSizeClasses = () => {
    switch (fontSize) {
      case 'large':
        return 'text-base leading-relaxed';
      case 'xlarge':
        return 'text-lg leading-loose';
      case 'normal':
      default:
        return 'text-sm leading-normal';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className={`w-full bg-[#ebf3fc] border border-blue-200 rounded-3xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200 text-slate-800 glass-card ${
          isFullscreen ? 'fixed inset-0 rounded-none border-none h-full' : 'max-w-5xl h-[92vh]'
        }`}
      >
        {/* TOP HEADER */}
        <div className="px-4 sm:px-6 py-3.5 bg-[#e2ecf8]/80 border-b border-blue-200 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#005da7] to-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-[#005da7] border border-blue-200">
                  {material.subject}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200">
                  {material.fileType} • {material.fileSize}
                </span>
                {studied && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Selesai Dipelajari
                  </span>
                )}
              </div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 truncate max-w-sm sm:max-w-xl">
                {material.title}
              </h3>
              <p className="text-[11px] text-slate-500 truncate">
                Disusun oleh: <strong className="text-slate-700">{material.teacherName}</strong> • {material.uploadDate}
              </p>
            </div>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Studied Toggle */}
            <button
              onClick={handleToggleStudied}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                studied 
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200' 
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
              title={studied ? 'Tandai belum selesai' : 'Tandai sudah dipelajari'}
            >
              <CheckCircle2 className={`w-4 h-4 ${studied ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span className="hidden sm:inline">{studied ? 'Selesai' : 'Tandai Selesai'}</span>
            </button>

            {/* Audio Narration Button */}
            {speechSynthesisAvailable && (
              <button
                onClick={handleToggleAudio}
                className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                  isPlayingAudio
                    ? 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
                title={isPlayingAudio ? 'Hentikan Suara' : 'Dengarkan Ringkasan Suara'}
              >
                {isPlayingAudio ? <VolumeX className="w-4 h-4 text-amber-600" /> : <Volume2 className="w-4 h-4" />}
                <span className="hidden md:inline text-xs">{isPlayingAudio ? 'Stop Suara' : 'Dengarkan'}</span>
              </button>
            )}

            {/* Fullscreen Toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className={`p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border shadow-sm ${
                isFullscreen
                  ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-amber-500/20 ring-2 ring-amber-400/40'
                  : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-blue-600 border-slate-200 hover:border-blue-300'
              }`}
              title={isFullscreen ? 'Keluar dari Mode Layar Penuh' : 'Mode Layar Penuh (Fokus Maksimal)'}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-4 h-4 text-white" />
                  <span className="hidden sm:inline">Keluar Penuh</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4 text-blue-600" />
                  <span className="hidden sm:inline">Layar Penuh</span>
                </>
              )}
            </button>

            {/* Close Button */}
            <button
              onClick={() => {
                stopAudio();
                onClose();
              }}
              className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 bg-white border border-slate-200 cursor-pointer transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* SUB-HEADER / TAB NAVIGATION & CONTROLS */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Main Navigation Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-2xl border border-slate-200">
            <button
              onClick={() => setActiveTab('reader')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'reader'
                  ? 'bg-[#005da7] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Isi Modul</span>
            </button>

            <button
              onClick={() => setActiveTab('summary')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'summary'
                  ? 'bg-[#005da7] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>Rangkuman Inti</span>
            </button>

            <button
              onClick={() => setActiveTab('notes')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'notes'
                  ? 'bg-[#005da7] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Catatan Siswa</span>
            </button>

            <button
              onClick={() => setActiveTab('quiz')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'quiz'
                  ? 'bg-[#005da7] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Uji Pemahaman</span>
            </button>
          </div>

          {/* Reader Controls (Page Navigation & Formatting) */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Page Jump (Active in reader tab) */}
            {activeTab === 'reader' && (
              <div className="flex items-center bg-white px-2 py-1 rounded-xl border border-slate-200 text-xs">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage <= 1 || isLoading}
                  className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                  title="Halaman Awal"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage <= 1 || isLoading}
                  className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                  title="Halaman Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1 mx-2 text-slate-700 font-mono text-[11px]">
                  <input
                    type="text"
                    value={pageInputVal}
                    onChange={(e) => setPageInputVal(e.target.value)}
                    onKeyDown={handlePageInputKeyDown}
                    className="w-8 text-center bg-slate-50 text-slate-800 rounded px-1 py-0.5 border border-slate-300 focus:outline-none focus:border-blue-500"
                  />
                  <span>/ {totalDisplayPages}</span>
                </div>

                <button
                  onClick={handleNextPage}
                  disabled={currentPage >= totalDisplayPages || isLoading}
                  className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                  title="Halaman Selanjutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(totalDisplayPages)}
                  disabled={currentPage >= totalDisplayPages || isLoading}
                  className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                  title="Halaman Terakhir"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Reading Mode Theme Switcher */}
            <div className="hidden sm:flex items-center bg-white p-0.5 rounded-xl border border-slate-200 text-xs">
              <button
                onClick={() => setReadingTheme('light')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  readingTheme === 'light' ? 'bg-[#005da7] text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Tema Terang"
              >
                <Sun className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setReadingTheme('sepia')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  readingTheme === 'sepia' ? 'bg-[#ebd4b3] text-[#433422] shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Tema Sepia (Kenyamanan Mata)"
              >
                <Coffee className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setReadingTheme('dark')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  readingTheme === 'dark' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Tema Gelap"
              >
                <Moon className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Font Size Adjuster */}
            <div className="hidden md:flex items-center bg-white p-1 rounded-xl border border-slate-200 text-[11px] font-bold text-slate-500">
              <button
                onClick={() => setFontSize('normal')}
                className={`px-2 py-0.5 rounded transition-all cursor-pointer ${fontSize === 'normal' ? 'bg-[#005da7] text-white' : 'hover:text-slate-900'}`}
                title="Ukuran Font Standar"
              >
                A
              </button>
              <button
                onClick={() => setFontSize('large')}
                className={`px-2 py-0.5 rounded transition-all cursor-pointer ${fontSize === 'large' ? 'bg-[#005da7] text-white' : 'hover:text-slate-900'}`}
                title="Ukuran Font Sedang"
              >
                A+
              </button>
              <button
                onClick={() => setFontSize('xlarge')}
                className={`px-2 py-0.5 rounded transition-all cursor-pointer ${fontSize === 'xlarge' ? 'bg-[#005da7] text-white' : 'hover:text-slate-900'}`}
                title="Ukuran Font Besar"
              >
                A++
              </button>
            </div>
          </div>
        </div>

        {/* MAIN BODY CONTENT ACCORDING TO ACTIVE TAB */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/70 flex flex-col items-center smooth-scroll custom-reader-scrollbar">
          {/* TAB 1: MODUL & PDF / INTERACTIVE READER */}
          {activeTab === 'reader' && (
            <div className="w-full flex justify-center py-2">
              {externalSource ? (
                <div className="flex flex-col items-center w-full h-[70vh] py-2">
                  <div className="w-full h-full max-w-5xl bg-white rounded-xl overflow-hidden shadow-2xl border border-slate-200">
                    <iframe 
                      src={externalSource.embedUrl} 
                      className="w-full h-full border-0"
                      title="PDF Reader Viewer"
                      allow="autoplay"
                    ></iframe>
                  </div>
                  <div className="mt-4 flex justify-center">
                    <a href={externalSource.downloadUrl} target="_blank" rel="noreferrer" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md">Buka di Tab Baru</a>
                  </div>
                </div>
              ) : pdfDoc ? (
                /* Native PDF.js Rendering */
                <div className="flex flex-col items-center space-y-4">
                  <div
                    ref={containerRef}
                    className="p-3 bg-white border border-slate-200 rounded-2xl shadow-xl max-w-full overflow-auto flex justify-center items-center"
                  >
                    <canvas ref={canvasRef} className="shadow-md rounded-xl max-w-full h-auto bg-white" />
                  </div>
                  <p className="text-xs text-slate-500 font-mono">
                    Halaman {currentPage} dari {numPages} • Rendisi PDF HD
                  </p>
                </div>
              ) : (
                /* Rich Interactive Paginated Material View */
                <div
                  className={`w-full max-w-3xl rounded-3xl shadow-xl p-6 sm:p-10 space-y-6 transition-all duration-300 border ${getThemeClasses()} ${getFontSizeClasses()}`}
                >
                  {/* Page Header */}
                  <div className="flex justify-between items-center text-xs opacity-70 border-b pb-3 font-mono">
                    <span className="truncate max-w-xs">{material.title}</span>
                    <span>Bagian {currentPage} dari {totalDisplayPages}</span>
                  </div>

                  {/* Dynamic Page Content */}
                  {currentPage === 1 && (
                    <div className="space-y-6 text-center py-4">
                      <div className="w-20 h-20 rounded-3xl bg-blue-50 text-[#005da7] mx-auto flex items-center justify-center border border-blue-200 shadow-sm">
                        <BookOpen className="w-10 h-10" />
                      </div>
                      <div>
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-[#005da7] font-mono">
                          {material.subject}
                        </span>
                        <h2 className="text-xl sm:text-2xl font-black mt-3 mb-2 text-slate-900">
                          {material.title}
                        </h2>
                        <p className="text-xs text-slate-500">
                          Modul Pembelajaran Mandiri • Guru Pengampu: <strong className="text-slate-700">{material.teacherName}</strong>
                        </p>
                      </div>

                      <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-3">
                        <h4 className="font-bold text-sm flex items-center gap-2 text-slate-800">
                          <Info className="w-4 h-4 text-[#005da7]" />
                          Ringkasan & Tujuan Pembahasan:
                        </h4>
                        <p className="text-slate-600 leading-relaxed text-xs sm:text-sm">
                          {material.description || 'Materi ajar ini disusun secara sistematis untuk memfasilitasi kegiatan belajar mandiri siswa, dilengkapi ringkasan konsep inti, contoh soal terbimbing, serta pengujian pemahaman.'}
                        </p>
                        <div className="pt-2 flex flex-wrap gap-2 text-[11px] font-semibold">
                          <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-[#005da7]">
                            ⏱️ Estimasi Waktu Baca: ~8 Menit
                          </span>
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800">
                            ✨ Siap untuk Kuis & Ujian
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={handleNextPage}
                        className="px-6 py-2.5 bg-[#005da7] hover:bg-[#004883] text-white rounded-full font-bold text-xs sm:text-sm shadow-md cursor-pointer transition-all inline-flex items-center gap-2"
                      >
                        <span>Mulai Membaca Modul</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {currentPage === 2 && (
                    <div className="space-y-4">
                      <h3 className="text-base sm:text-lg font-extrabold border-b pb-2 flex items-center gap-2 text-slate-900">
                        <span className="w-6 h-6 rounded-full bg-[#005da7] text-white text-xs flex items-center justify-center">1</span>
                        Konsep Pokok & Fondasi Teori
                      </h3>
                      <p className="text-slate-700">
                        Pada bab ini, kita mendalami esensi dari materi <strong>{material.subject}</strong>. Konsep ini menjadi fondasi utama dalam memecahkan berbagai persoalan analitis di tingkat lanjutan.
                      </p>
                      
                      <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 space-y-2">
                        <h4 className="font-bold text-xs sm:text-sm uppercase tracking-wider text-[#005da7]">
                          📌 Definisi & Kaidah Utama:
                        </h4>
                        <p className="leading-relaxed text-xs sm:text-sm text-slate-700">
                          Setiap rumus dan hukum alam didasarkan pada hubungan sebab-akibat yang dapat dibuktikan secara matematis dan eksperimental. Pastikan siswa memahami alur penurunan rumus, bukan sekadar menghafal hasil akhir.
                        </p>
                      </div>

                      <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm text-slate-600 pl-2">
                        <li>Memahami definisi variabel dan satuan standar internasional yang digunakan.</li>
                        <li>Mengidentifikasi asumsi dasar yang berlaku pada kondisi ideal.</li>
                        <li>Menghubungkan teori buku dengan fenomena nyata yang terjadi di lingkungan sekitar.</li>
                      </ul>
                    </div>
                  )}

                  {currentPage === 3 && (
                    <div className="space-y-4">
                      <h3 className="text-base sm:text-lg font-extrabold border-b pb-2 flex items-center gap-2 text-slate-900">
                        <span className="w-6 h-6 rounded-full bg-[#005da7] text-white text-xs flex items-center justify-center">2</span>
                        Contoh Soal Terbimbing & Solusi Langkah demi Langkah
                      </h3>
                      <p className="text-slate-700">
                        Pelajari bagaimana cara mengaplikasikan teori ke dalam soal latihan dengan metodologi yang runtut:
                      </p>

                      <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 font-mono text-xs">
                        <div className="font-bold text-[#005da7]">
                          [CONTOH KASUS 01]
                        </div>
                        <p className="italic text-slate-700">
                          "Diberikan sebuah permasalahan terkait variabel X dan Y, tentukan nilai optimum menggunakan persamaan dasar materi {material.subject}."
                        </p>
                        <div className="pt-2 border-t border-slate-200 space-y-1 text-[11px] text-slate-700">
                          <p className="font-bold text-emerald-700">Solusi & Pembahasan:</p>
                          <p>1. Identifikasi data yang diketahui: X = 10, Y = 25</p>
                          <p>2. Substitusi ke rumus dasar: Hasil = √(X² + Y²)</p>
                          <p>3. Diperoleh nilai akhir dengan presisi pembulatan standar.</p>
                        </div>
                      </div>

                      <p className="text-xs text-slate-500">
                        💡 <em>Tips Guru:</em> Selalu tuliskan satuan pada hasil akhir perhitungan untuk menghindari pengurangan poin saat evaluasi.
                      </p>
                    </div>
                  )}

                  {currentPage === 4 && (
                    <div className="space-y-4">
                      <h3 className="text-base sm:text-lg font-extrabold border-b pb-2 flex items-center gap-2 text-slate-900">
                        <span className="w-6 h-6 rounded-full bg-[#005da7] text-white text-xs flex items-center justify-center">3</span>
                        Aplikasi Nyata & Studi Kasus Lapangan
                      </h3>
                      <p className="text-slate-700">
                        Mengapa materi ini penting untuk dipelajari? Mari telaah bagaimana konsep ini diterapkan pada industri teknologi, rekayasa, dan kehidupan sehari-hari.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                          <span className="text-xs font-bold text-[#005da7] flex items-center gap-1">
                            🏢 Industri & Rekayasa
                          </span>
                          <p className="text-[11px] text-slate-600 leading-relaxed">
                            Digunakan dalam kalkulasi struktur, analisis data sains, dan optimasi algoritma komputasi modern.
                          </p>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                          <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                            🌱 Kehidupan Sehari-hari
                          </span>
                          <p className="text-[11px] text-slate-600 leading-relaxed">
                            Membantu mengasah cara berpikir kritis, logis, dan analitis dalam mengambil keputusan sehari-hari.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {currentPage === 5 && (
                    <div className="space-y-5 text-center py-2">
                      <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center border border-emerald-200">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="text-lg font-extrabold text-slate-900">Selamat, Kamu Telah Menyelesaikan Modul Ini!</h3>
                        <p className="text-xs text-slate-500 mt-1">
                          Kamu telah membaca seluruh pembahasan bahan ajar {material.title}.
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                        <button
                          onClick={() => setActiveTab('notes')}
                          className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-blue-50 text-[#005da7] border border-blue-200 font-bold text-xs hover:bg-blue-100 cursor-pointer flex items-center justify-center gap-2"
                        >
                          <Edit3 className="w-4 h-4" />
                          <span>Buka Catatan Siswa</span>
                        </button>

                        <button
                          onClick={() => setActiveTab('quiz')}
                          className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md cursor-pointer flex items-center justify-center gap-2"
                        >
                          <Award className="w-4 h-4" />
                          <span>Uji Pemahaman Singkat</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: RANGKUMAN INTI & GLOSARIUM */}
          {activeTab === 'summary' && (
            <div className="w-full max-w-3xl space-y-5">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
                      <Lightbulb className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">Rangkuman Konsep Kunci</h3>
                      <p className="text-xs text-slate-500">Poin-poin penting untuk persiapan ujian dan kuis</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `Rangkuman ${material.title} (${material.subject}):\n- ${material.description}\n- Pelajari rumus dan contoh soal di modul.`
                      );
                      alert('Rangkuman berhasil disalin ke clipboard!');
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-200 cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Salin Rangkuman</span>
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#005da7]">
                      💡 Pokok Pembahasan Modul:
                    </span>
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                      {material.description || 'Materi ini memuat penjelasan konseptual, penurunan rumus fundamental, contoh soal terapan, dan studi kasus praktis.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <h4 className="font-bold text-xs text-amber-700 flex items-center gap-1.5">
                        <Award className="w-4 h-4" />
                        Target Capaian Belajar:
                      </h4>
                      <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                        <li>Mampu menjelaskan konsep inti dengan kata-kata sendiri.</li>
                        <li>Dapat menyelesaikan soal-soal hitungan / analitis tanpa bantuan rumus instan.</li>
                        <li>Memahami kesalahan umum yang sering terjadi saat ujian.</li>
                      </ul>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <h4 className="font-bold text-xs text-emerald-700 flex items-center gap-1.5">
                        <Check className="w-4 h-4" />
                        Tips dari {material.teacherName}:
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        "Kerjakan latihan soal secara mandiri sebelum melihat kunci jawaban. Jika ada kendala, catat pertanyaannya pada tab Catatan Siswa."
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CATATAN BELAJAR SISWA */}
          {activeTab === 'notes' && (
            <div className="w-full max-w-3xl space-y-4">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-blue-50 text-[#005da7] border border-blue-200">
                      <Edit3 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">Buku Catatan Pribadi Siswa</h3>
                      <p className="text-xs text-slate-500">Tersimpan otomatis di peramban untuk referensi belajarmu</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveNotes}
                      className="px-3.5 py-1.5 bg-[#005da7] hover:bg-[#004883] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Simpan Catatan</span>
                    </button>
                  </div>
                </div>

                {noteSavedToast && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center gap-2 font-medium"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Catatan berhasil disimpan ke perangkat lokal!</span>
                  </motion.div>
                )}

                <div className="space-y-2">
                  <textarea
                    rows={12}
                    value={studentNotes}
                    onChange={(e) => setStudentNotes(e.target.value)}
                    placeholder="Tuliskan catatan, rumus penting, atau pertanyaan untuk guru di sini..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs sm:text-sm text-slate-800 font-mono leading-relaxed focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-y"
                  />
                  <div className="flex justify-between items-center text-[11px] text-slate-400">
                    <span>{studentNotes.length} karakter</span>
                    <span>Format bebas • Dukungan Markdown sederhana</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: UJI PEMAHAMAN MANDIRI */}
          {activeTab === 'quiz' && (
            <div className="w-full max-w-3xl space-y-6">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-purple-50 text-purple-600 border border-purple-200">
                      <Award className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">Uji Pemahaman Singkat (3 Pertanyaan)</h3>
                      <p className="text-xs text-slate-500">Periksa pemahamanmu setelah membaca modul secara mandiri</p>
                    </div>
                  </div>

                  {quizSubmitted && (
                    <div className="px-3.5 py-1.5 rounded-full bg-purple-100 border border-purple-200 text-purple-800 font-bold text-xs font-mono">
                      Skor: {calculateScore()}%
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  {sampleQuizQuestions.map((q, qIndex) => {
                    const isSelected = quizAnswers[qIndex] !== undefined;
                    const selectedOpt = quizAnswers[qIndex];
                    const isCorrect = selectedOpt === q.correctIndex;

                    return (
                      <div
                        key={q.id}
                        className={`p-5 rounded-2xl border transition-all space-y-3 ${
                          quizSubmitted
                            ? isCorrect
                              ? 'bg-emerald-50 border-emerald-200'
                              : 'bg-rose-50 border-rose-200'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {qIndex + 1}
                          </span>
                          <p className="font-semibold text-xs sm:text-sm text-slate-800">
                            {q.question}
                          </p>
                        </div>

                        <div className="space-y-2 pl-8">
                          {q.options.map((opt, optIndex) => {
                            const isThisChecked = selectedOpt === optIndex;
                            let optStyle = 'bg-white border-slate-200 text-slate-700 hover:border-slate-300';

                            if (quizSubmitted) {
                              if (optIndex === q.correctIndex) {
                                optStyle = 'bg-emerald-100 border-emerald-300 text-emerald-900 font-bold';
                              } else if (isThisChecked && !isCorrect) {
                                optStyle = 'bg-rose-100 border-rose-300 text-rose-900';
                              }
                            } else if (isThisChecked) {
                              optStyle = 'bg-blue-50 border-blue-500 text-[#005da7] font-semibold';
                            }

                            return (
                              <button
                                key={optIndex}
                                disabled={quizSubmitted}
                                onClick={() => setQuizAnswers(prev => ({ ...prev, [qIndex]: optIndex }))}
                                className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-center justify-between cursor-pointer ${optStyle}`}
                              >
                                <span>{opt}</span>
                                {quizSubmitted && optIndex === q.correctIndex && (
                                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {quizSubmitted && (
                          <div className="pl-8 pt-2 text-xs text-slate-600 leading-relaxed border-t border-slate-200">
                            <strong className="text-slate-800">Penjelasan:</strong> {q.explanation}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Quiz Actions */}
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    {Object.keys(quizAnswers).length} dari {sampleQuizQuestions.length} pertanyaan dijawab
                  </span>

                  {!quizSubmitted ? (
                    <button
                      onClick={() => setQuizSubmitted(true)}
                      disabled={Object.keys(quizAnswers).length < sampleQuizQuestions.length}
                      className="px-5 py-2.5 bg-[#005da7] hover:bg-[#004883] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-full text-xs font-bold shadow-md cursor-pointer transition-all"
                    >
                      Periksa Jawaban
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setQuizAnswers({});
                        setQuizSubmitted(false);
                      }}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-bold border border-slate-200 cursor-pointer flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Ulangi Kuis</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
