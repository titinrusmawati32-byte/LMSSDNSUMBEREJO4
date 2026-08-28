import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, X, ChevronLeft, ChevronRight, Download, 
  ZoomIn, ZoomOut, Maximize2, Minimize2, ExternalLink,
  RotateCw, LayoutGrid, FileText, AlertCircle, RefreshCw,
  Search, Check, ChevronsLeft, ChevronsRight, Eye, ShieldCheck, ListTree,
  ChevronDown, ChevronUp, ArrowDown, ArrowUp
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { DigitalBook, LearningMaterial } from '../types';
import { downloadLargeFileFromFirestore } from "../lib/lmsDb";
import { getPdfBlob, getPdfArrayBuffer, getPdfBlobUrl } from '../lib/pdfStorage';
import { resolvePdfSource, ParsedPdfSource } from '../lib/pdfHelper';

interface ChapterItem {
  title: string;
  page: number;
  children?: ChapterItem[];
}

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  } catch (e) {
    console.warn('PDF Worker setup note:', e);
  }
}

interface BookReaderModalProps {
  isOpen: boolean;
  book: DigitalBook | LearningMaterial | null;
  onClose: () => void;
  allowDownload?: boolean;
  headerBadge?: string;
  initialPage?: number;
  isCompleted?: boolean;
  onProgressUpdate?: (contentId: string, percent: number, isCompleted: boolean, currentPage: number, totalPages: number) => void;
}

export const BookReaderModal: React.FC<BookReaderModalProps> = ({ 
  isOpen, 
  book, 
  onClose,
  allowDownload = false,
  headerBadge,
  initialPage: propInitialPage,
  isCompleted: propIsCompleted = false,
  onProgressUpdate
}) => {
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [externalSource, setExternalSource] = useState<ParsedPdfSource | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageInputVal, setPageInputVal] = useState<string>('1');
  const [scale, setScale] = useState<number>(1.6);
  const [rotation, setRotation] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showThumbnails, setShowThumbnails] = useState<boolean>(false);
  const [rawBlobUrl, setRawBlobUrl] = useState<string | null>(null);
  const [pageRendering, setPageRendering] = useState<boolean>(false);
  const [pageLabels, setPageLabels] = useState<string[] | null>(null);
  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [showChaptersSidebar, setShowChaptersSidebar] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [canScrollDown, setCanScrollDown] = useState<boolean>(false);
  const [canScrollUp, setCanScrollUp] = useState<boolean>(false);
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [isMarkedCompleted, setIsMarkedCompleted] = useState<boolean>(propIsCompleted);
  const lastUpdatedProgressRef = useRef<{ page: number; done: boolean; bookId: string } | null>(null);

  // Sync completion prop
  useEffect(() => {
    setIsMarkedCompleted(propIsCompleted);
  }, [propIsCompleted, book?.id]);

  // Compute read progress percentage based on current page and total pages
  const readProgressPercent = React.useMemo(() => {
    if (isMarkedCompleted) return 100;
    const total = numPages || (book && 'totalPages' in book && book.totalPages) || 1;
    if (total <= 1) return 100;
    return Math.min(100, Math.max(0, Math.round((currentPage / total) * 100)));
  }, [currentPage, numPages, book, isMarkedCompleted]);

  // Trigger progress updates only when page or completion status actually changes
  useEffect(() => {
    if (isOpen && book && onProgressUpdate && numPages > 0) {
      const prev = lastUpdatedProgressRef.current;
      if (prev && prev.bookId === book.id && prev.page === currentPage && prev.done === isMarkedCompleted) {
        return;
      }
      lastUpdatedProgressRef.current = { page: currentPage, done: isMarkedCompleted, bookId: book.id };
      const total = numPages || 1;
      const pct = isMarkedCompleted ? 100 : Math.min(100, Math.max(0, Math.round((currentPage / total) * 100)));
      onProgressUpdate(book.id, pct, isMarkedCompleted || pct >= 100, currentPage, total);
    }
  }, [isOpen, currentPage, numPages, isMarkedCompleted, book?.id]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const renderTaskRef = useRef<any>(null);
  const scrollIntervalRef = useRef<any>(null);

  // Monitor scroll position in reader viewport
  const handleContainerScroll = useCallback(() => {
    const el = containerRef.current || document.getElementById('book-reader-scroll-container');
    if (el) {
      const { scrollTop, scrollHeight, clientHeight } = el;
      setCanScrollUp(scrollTop > 20);
      setCanScrollDown(scrollTop + clientHeight < scrollHeight - 20);
      const totalScrollable = scrollHeight - clientHeight;
      if (totalScrollable > 0) {
        setScrollProgress(Math.min(100, Math.max(0, (scrollTop / totalScrollable) * 100)));
      } else {
        setScrollProgress(100);
      }
    }
  }, []);

  // Universal rock-solid scroll helper
  const performScroll = useCallback((delta: number) => {
    const el = containerRef.current || document.getElementById('book-reader-scroll-container');
    if (el) {
      const initialScroll = el.scrollTop;
      const targetScroll = initialScroll + delta;
      
      try {
        el.scrollBy({ top: delta, behavior: 'smooth' });
      } catch {
        el.scrollTop = targetScroll;
      }

      // Instant fallback in case smooth scrolling is unresponsive in iframe
      setTimeout(() => {
        if (el && Math.abs(el.scrollTop - initialScroll) < 5 && delta !== 0) {
          el.scrollTop = targetScroll;
        }
      }, 70);
    }
  }, []);

  const handleScrollStepDown = useCallback(() => {
    performScroll(380);
  }, [performScroll]);

  const handleScrollStepUp = useCallback(() => {
    performScroll(-380);
  }, [performScroll]);

  const handleScrollToTop = useCallback(() => {
    const el = containerRef.current || document.getElementById('book-reader-scroll-container');
    if (el) {
      try {
        el.scrollTo({ top: 0, behavior: 'smooth' });
      } catch {
        el.scrollTop = 0;
      }
      setTimeout(() => {
        if (el) el.scrollTop = 0;
      }, 70);
    }
  }, []);

  const handleScrollToBottom = useCallback(() => {
    const el = containerRef.current || document.getElementById('book-reader-scroll-container');
    if (el) {
      const maxScroll = el.scrollHeight;
      try {
        el.scrollTo({ top: maxScroll, behavior: 'smooth' });
      } catch {
        el.scrollTop = maxScroll;
      }
      setTimeout(() => {
        if (el) el.scrollTop = el.scrollHeight;
      }, 70);
    }
  }, []);

  // Hold-to-scroll support for continuous scrolling
  const startContinuousScroll = useCallback((direction: 'up' | 'down') => {
    stopContinuousScroll();
    performScroll(direction === 'down' ? 120 : -120);
    scrollIntervalRef.current = setInterval(() => {
      performScroll(direction === 'down' ? 80 : -80);
    }, 60);
  }, [performScroll]);

  const stopContinuousScroll = useCallback(() => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  }, []);

  // Jump to specific percentage when user clicks on scroll track
  const handleScrollTrackClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const ratio = Math.max(0, Math.min(1, clickY / rect.height));
    const el = containerRef.current || document.getElementById('book-reader-scroll-container');
    if (el) {
      const maxScroll = el.scrollHeight - el.clientHeight;
      if (maxScroll > 0) {
        const target = maxScroll * ratio;
        try {
          el.scrollTo({ top: target, behavior: 'smooth' });
        } catch {
          el.scrollTop = target;
        }
        setTimeout(() => {
          if (el) el.scrollTop = target;
        }, 70);
      }
    }
  }, []);

  // Keyboard navigation for scroll and page flip
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        handleScrollStepDown();
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        handleScrollStepUp();
      } else if (e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)) {
        e.preventDefault();
        performScroll(450);
      } else if (e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)) {
        e.preventDefault();
        performScroll(-450);
      } else if (e.key === 'Home') {
        e.preventDefault();
        handleScrollToTop();
      } else if (e.key === 'End') {
        e.preventDefault();
        handleScrollToBottom();
      } else if (e.key === 'ArrowRight') {
        if (currentPage < (pdfDoc ? numPages : (book?.totalPages || 10))) {
          setCurrentPage(prev => prev + 1);
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentPage > 1) {
          setCurrentPage(prev => prev - 1);
        }
      } else if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      stopContinuousScroll();
    };
  }, [isOpen, isFullscreen, currentPage, numPages, pdfDoc, book, handleScrollStepDown, handleScrollStepUp, handleScrollToTop, handleScrollToBottom, performScroll, stopContinuousScroll]);

  // Reset scroll to top whenever page changes
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      // Recheck scroll state after rendering completes
      const timer = setTimeout(handleContainerScroll, 300);
      return () => clearTimeout(timer);
    }
  }, [currentPage, handleContainerScroll]);

  // Load PDF Document
  useEffect(() => {
    let isCancelled = false;

    async function loadPdf() {
      if (!isOpen || !book) return;

      setIsLoading(true);
      setLoadError(null);
      setPdfDoc(null);
      
      const initialPage = (typeof propInitialPage === 'number' && propInitialPage >= 1)
        ? propInitialPage
        : (('targetPage' in book && typeof book.targetPage === 'number') ? book.targetPage : 1);
      setCurrentPage(initialPage);
      setPageInputVal(initialPage.toString());

      try {
        let pdfData: ArrayBuffer | string | null = null;
        let blobUrl: string | null = null;

        // 1. Try to load from IndexedDB as ArrayBuffer
        const buffer = await getPdfArrayBuffer(book.id);
        if (buffer) {
          pdfData = buffer;
          const blob = await getPdfBlob(book.id);
          if (blob) {
            blobUrl = URL.createObjectURL(blob);
            setRawBlobUrl(blobUrl);
          }
        } else if (book.fileChunks && book.fileChunks > 0) {
          // 1.5 Download chunks from Firestore
          try {
            const fullB64 = await downloadLargeFileFromFirestore(book.id, book.fileChunks);
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
        } else if (book.fileData && book.fileData.startsWith('data:')) {
          // 2. Base64 data URL
          const parts = book.fileData.split(',');
          if (parts[1]) {
            const base64Data = parts[1];
            const binaryString = window.atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            pdfData = bytes.buffer;
          }
        } else if (book.fileUrl && !book.fileUrl.startsWith('data:')) {
          // 3. Remote URL
          pdfData = book.fileUrl;
        }

        if (!pdfData) {
          const parsedSource = resolvePdfSource(book.fileUrl || book.fileUrl, book.fileData);
          if (parsedSource.type !== 'fallback' && parsedSource.embedUrl) {
             setExternalSource(parsedSource);
             setIsLoading(false);
             setPdfDoc(null);
             setNumPages(1); // Usually we don't know total pages for iframe
             return;
          }

          // No binary PDF found, this is a simulated starter book
          if (!isCancelled) {
            const total = book.totalPages || 10;
            const simChapters: ChapterItem[] = [];
            for (let i = 1; i <= total; i++) {
              simChapters.push({
                title: i === 1 ? 'Cover & Pengantar Utama' : `Bagian ${i}: Pembahasan Materi`,
                page: i
              });
            }
            setChapters(simChapters);
            setIsLoading(false);
            setPdfDoc(null);
          }
          return;
        }

        // Load with PDF.js
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
            const containerWidth = containerRef.current?.clientWidth || window.innerWidth || 360;
            const isMob = window.innerWidth < 768;
            const padding = isMob ? 16 : 60;
            const minScale = isMob ? 0.45 : 1.4;
            const maxScale = isMob ? 1.1 : 2.2;
            const calculatedScale = Math.min(Math.max((containerWidth - padding) / viewport1.width, minScale), maxScale);
            setScale(calculatedScale);
          } catch (e) {
            setScale(window.innerWidth < 768 ? 0.6 : 1.6);
          }
          
          let targetPg = ('targetPage' in book && typeof book.targetPage === 'number') ? book.targetPage : 1;
          try {
            const labels = await loadedDoc.getPageLabels();
            if (labels && labels.length > 0) {
              setPageLabels(labels);
              const foundIndex = labels.findIndex(lbl => lbl === targetPg.toString());
              if (foundIndex !== -1) {
                targetPg = foundIndex + 1;
              }
            }
          } catch (e) {
            console.warn('Page labels note:', e);
          }

          // Extract Outline / Chapters
          try {
            const outline = await loadedDoc.getOutline();
            if (outline && outline.length > 0) {
              const parsedChapters: ChapterItem[] = [];
              for (const item of outline) {
                let pageNum = 1;
                let dest = item.dest;
                if (typeof dest === 'string') {
                  dest = await loadedDoc.getDestination(dest);
                }
                if (Array.isArray(dest) && dest[0]) {
                  try {
                    const pIndex = await loadedDoc.getPageIndex(dest[0]);
                    pageNum = pIndex + 1;
                  } catch (err) {}
                }
                const childrenChapters: ChapterItem[] = [];
                if (item.items && item.items.length > 0) {
                  for (const subItem of item.items) {
                    let subPageNum = pageNum;
                    let subDest = subItem.dest;
                    if (typeof subDest === 'string') {
                      subDest = await loadedDoc.getDestination(subDest);
                    }
                    if (Array.isArray(subDest) && subDest[0]) {
                      try {
                        const spIndex = await loadedDoc.getPageIndex(subDest[0]);
                        subPageNum = spIndex + 1;
                      } catch (err) {}
                    }
                    childrenChapters.push({
                      title: subItem.title,
                      page: subPageNum
                    });
                  }
                }
                parsedChapters.push({
                  title: item.title,
                  page: pageNum,
                  children: childrenChapters.length > 0 ? childrenChapters : undefined
                });
              }
              setChapters(parsedChapters);
            } else {
              const fallback: ChapterItem[] = [];
              const totalP = loadedDoc.numPages;
              const step = Math.max(1, Math.floor(totalP / 8));
              for (let p = 1; p <= totalP; p += step) {
                fallback.push({
                  title: `Bagian / Halaman ${p}`,
                  page: p
                });
              }
              setChapters(fallback);
            }
          } catch (e) {
            const fallback: ChapterItem[] = [];
            for (let p = 1; p <= loadedDoc.numPages; p += Math.max(1, Math.floor(loadedDoc.numPages / 8))) {
              fallback.push({
                title: `Halaman ${p}`,
                page: p
              });
            }
            setChapters(fallback);
          }

          setCurrentPage(targetPg);
          setPageInputVal(targetPg.toString());
          setIsLoading(false);
        }
      } catch (err: any) {
        console.warn('PDF loading notice, applying reader fallback:', err);
        if (!isCancelled) {
          const total = ('totalPages' in book && book.totalPages) ? book.totalPages : 10;
          const simChapters: ChapterItem[] = [];
          for (let i = 1; i <= total; i++) {
            simChapters.push({
              title: i === 1 ? 'Cover & Pengantar Utama' : `Bagian ${i}: Pembahasan Materi`,
              page: i
            });
          }
          setChapters(simChapters);
          setNumPages(total);
          setPdfDoc(null);
          setIsLoading(false);
          setLoadError(null);
        }
      }
    }

    loadPdf();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch (e) {
          // ignore cancel error
        }
      }
    };
  }, [isOpen, book]);

  // Render current PDF page onto canvas
  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdfDoc || !canvasRef.current) return;

    try {
      setPageRendering(true);

      // Cancel any ongoing render task
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch (e) {
          // Ignore
        }
      }

      const page = await pdfDoc.getPage(pageNum);
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const viewport = page.getViewport({ scale, rotation });
      const pixelRatio = window.devicePixelRatio || 1;

      canvas.height = viewport.height * pixelRatio;
      canvas.width = viewport.width * pixelRatio;
      canvas.style.height = `${viewport.height}px`;
      canvas.style.width = `${viewport.width}px`;

      ctx.save();
      // Fill background with white to prevent black artifacts
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(pixelRatio, pixelRatio);

      const renderContext = {
        canvasContext: ctx,
        viewport: viewport,
      };

      const renderTask = page.render(renderContext);
      renderTaskRef.current = renderTask;

      await renderTask.promise;
      ctx.restore();
      setPageRendering(false);
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.warn('PDF Page Render note:', err);
      }
      setPageRendering(false);
    }
  }, [pdfDoc, scale, rotation]);

  // Trigger page render when page, scale, or rotation changes
  useEffect(() => {
    if (pdfDoc && numPages > 0) {
      let safePage = currentPage;
      if (safePage < 1) safePage = 1;
      if (safePage > numPages) safePage = numPages;
      
      if (safePage !== currentPage) {
        setCurrentPage(safePage);
      } else {
        renderPage(safePage);
        setPageInputVal(safePage.toString());
      }
    }
  }, [pdfDoc, currentPage, scale, rotation, renderPage, numPages]);

  if (!isOpen || !book) return null;

  const authorName = 'author' in book ? book.author : ((book as any).teacherName || 'Guru Pengampu');
  const coverImg = ('coverImage' in book && book.coverImage) ? book.coverImage : 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80';
  const totalDisplayPages = pdfDoc ? numPages : (('totalPages' in book && book.totalPages) ? book.totalPages : 8);

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalDisplayPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInputVal(e.target.value);
  };

  const handlePageInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const page = parseInt(pageInputVal, 10);
      const maxP = totalDisplayPages;
      if (!isNaN(page) && page >= 1 && page <= maxP) {
        setCurrentPage(page);
      } else {
        setPageInputVal(currentPage.toString());
      }
    }
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 3.0));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.5));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleFitWidth = () => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth - (isMobile ? 24 : 64);
      // standard page width is ~595px
      const targetScale = Math.max(0.6, Math.min(2.5, containerWidth / 620));
      setScale(targetScale);
    }
  };

  const handleFitHeight = () => {
    if (containerRef.current) {
      const containerHeight = containerRef.current.clientHeight - (isMobile ? 40 : 90);
      // standard page height is ~842px
      const targetScale = Math.max(0.45, Math.min(2.0, containerHeight / 842));
      setScale(targetScale);
      handleScrollToTop();
    }
  };

  const handleDownload = () => {
    if (rawBlobUrl) {
      const a = document.createElement('a');
      a.href = rawBlobUrl;
      a.download = book.fileName || `${book.title}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      alert(`Mengunduh dokumen "${book.title}"...`);
    }
  };

  const handleOpenNewTab = () => {
    if (rawBlobUrl) {
      window.open(rawBlobUrl, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className={`w-full bg-[#ebf3fc] shadow-2xl border-blue-200 overflow-hidden flex flex-col transition-all duration-200 text-slate-800 glass-card ${
          isMobile 
            ? 'fixed inset-0 h-full w-full rounded-none border-0' 
            : (isFullscreen ? 'fixed inset-1 z-50 h-[calc(100vh-8px)] rounded-3xl border' : 'max-w-6xl h-[90vh] rounded-3xl border')
        }`}
      >
        {/* Header Bar */}
        <div className="px-4 sm:px-6 py-2.5 bg-[#e2ecf8]/85 border-b border-blue-200 flex items-center justify-between text-slate-900 gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 bg-indigo-100/80 text-indigo-700 rounded-lg border border-indigo-200 shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 truncate max-w-[150px] sm:max-w-md">
                {book.title}
              </h3>
              <p className="text-[10px] sm:text-[11px] text-slate-600 truncate">
                {authorName} {(!isMobile && book.subject) ? `• ${book.subject}` : ''}
              </p>
            </div>
          </div>

          {/* Action & Reader Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
            

            

            

            {/* Download & External links - Desktop Only */}
            {allowDownload && !isMobile && (
              <>
                {rawBlobUrl && (
                  <button
                    onClick={handleOpenNewTab}
                    className="p-1.5 rounded-xl text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:border-slate-300 text-xs cursor-pointer"
                    title="Buka PDF di Tab Baru"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={handleDownload}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Unduh PDF</span>
                </button>
              </>
            )}

            <button
                onClick={() => setShowChaptersSidebar(!showChaptersSidebar)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                  showChaptersSidebar 
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:text-slate-900'
                }`}
                title="Daftar Bab & Topik Buku"
              >
                <ListTree className="w-4 h-4" />
                <span className="hidden sm:inline">Daftar Bab</span>
              </button>

            {/* Full Screen Button for Immersive Reading */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className={`p-1.5 sm:px-3 sm:py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer shadow-sm ${
                isFullscreen
                  ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-amber-500/20 ring-2 ring-amber-400/40'
                  : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-indigo-600 border-slate-200 hover:border-indigo-300'
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
                  <Maximize2 className="w-4 h-4 text-indigo-600" />
                  <span className="hidden sm:inline">Layar Penuh</span>
                </>
              )}
            </button>

            {/* Learning Progress Indicator & Mark Completed */}
            <div className="hidden md:flex items-center gap-2 px-2.5 py-1 bg-slate-100/90 border border-slate-200 rounded-xl">
              <div className="flex flex-col text-left min-w-[90px]">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-700">
                  <span>Progres:</span>
                  <span className="font-mono text-indigo-600">{readProgressPercent}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mt-0.5">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${readProgressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                const nextState = !isMarkedCompleted;
                setIsMarkedCompleted(nextState);
                if (book && onProgressUpdate) {
                  const total = numPages || 1;
                  const pct = nextState ? 100 : Math.min(100, Math.max(0, Math.round((currentPage / total) * 100)));
                  onProgressUpdate(book.id, pct, nextState, currentPage, total);
                }
              }}
              className={`p-1.5 sm:px-3 sm:py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer shadow-sm ${
                isMarkedCompleted
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-emerald-500/20'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
              }`}
              title={isMarkedCompleted ? 'Materi telah selesai dipelajari (Klik untuk batalkan)' : 'Tandai materi ini sudah selesai dipelajari'}
            >
              <Check className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isMarkedCompleted ? 'Selesai' : 'Tandai Selesai'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 bg-white border border-slate-200 ml-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="flex-1 bg-slate-100/70 flex overflow-hidden relative">
          {/* Chapters Sidebar */}
          <AnimatePresence>
            {showChaptersSidebar && (
              <motion.div
                initial={{ x: -280, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -280, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className={`${isMobile ? 'absolute inset-y-0 left-0 w-80 max-w-[85vw]' : 'w-72'} bg-white border-r border-slate-200 flex flex-col z-40 shadow-2xl`}
              >
                <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
                  <div className="flex items-center gap-2">
                    <ListTree className="w-4 h-4 text-indigo-600" />
                    <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Daftar Bab & Isi</h3>
                  </div>
                  <button
                    onClick={() => setShowChaptersSidebar(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
                  {chapters.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400">
                      Tidak ada daftar bab ditemukan.
                    </div>
                  ) : (
                    chapters.map((ch, idx) => {
                      const isCurrent = currentPage === ch.page || (idx < chapters.length - 1 && currentPage >= ch.page && currentPage < chapters[idx + 1].page);
                      return (
                        <div key={idx} className="space-y-1">
                          <button
                            onClick={() => {
                              setCurrentPage(ch.page);
                              setPageInputVal(ch.page.toString());
                            }}
                            className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center justify-between group cursor-pointer ${
                              isCurrent
                                ? 'bg-indigo-50 text-indigo-900 border border-indigo-200 font-semibold shadow-xs'
                                : 'text-slate-700 hover:bg-slate-100/80 border border-transparent'
                            }`}
                          >
                            <span className="truncate pr-2">{ch.title}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-mono shrink-0 ${
                              isCurrent ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                            }`}>
                              Hal. {(pageLabels && pageLabels[ch.page - 1]) ? pageLabels[ch.page - 1] : ch.page}
                            </span>
                          </button>

                          {/* Sub-items */}
                          {ch.children && ch.children.length > 0 && (
                            <div className="pl-4 space-y-1 border-l-2 border-indigo-100 my-1">
                              {ch.children.map((sub, sIdx) => {
                                const isSubCurrent = currentPage === sub.page;
                                return (
                                  <button
                                    key={sIdx}
                                    onClick={() => {
                                      setCurrentPage(sub.page);
                                      setPageInputVal(sub.page.toString());
                                    }}
                                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] transition-all flex items-center justify-between cursor-pointer ${
                                      isSubCurrent
                                        ? 'bg-indigo-100/70 text-indigo-900 font-semibold'
                                        : 'text-slate-600 hover:bg-slate-100'
                                    }`}
                                  >
                                    <span className="truncate pr-1">{sub.title}</span>
                                    <span className="text-[10px] font-mono text-slate-500">
                                      {(pageLabels && pageLabels[sub.page - 1]) ? pageLabels[sub.page - 1] : sub.page}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Reading Canvas Container with Smooth Scroll & Fixed Height Wrapper */}
          <div
            ref={containerRef}
            id="book-reader-scroll-container"
            onScroll={handleContainerScroll}
            className={`flex-1 overflow-y-auto overflow-x-hidden flex flex-col items-center justify-start bg-[#ebf3fc]/30 relative smooth-scroll custom-reader-scrollbar ${isMobile ? 'p-2' : 'p-4'}`}
          >
            {isLoading ? (
              <div className="flex flex-col items-center justify-center my-auto space-y-3 py-20 text-slate-500">
                <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
                <p className="text-sm font-medium text-slate-700">Sedang membaca dan memproses dokumen PDF...</p>
                <p className="text-xs text-slate-400">Mempersiapkan halaman dan render resolusi tinggi</p>
              </div>
            ) : loadError ? (
              <div className="flex flex-col items-center justify-center my-auto p-6 max-w-md text-center bg-white border border-rose-200 rounded-2xl space-y-3 shadow-sm">
                <AlertCircle className="w-10 h-10 text-rose-500" />
                <h4 className="font-bold text-slate-900 text-sm">Gagal Menampilkan PDF</h4>
                <p className="text-xs text-slate-500 leading-relaxed">{loadError}</p>
                {rawBlobUrl && allowDownload && (
                  <button
                    onClick={handleOpenNewTab}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 mt-2"
                  >
                    <ExternalLink className="w-4 h-4" /> Buka PDF di Tab Baru
                  </button>
                )}
              </div>
            ) : externalSource ? (
              <div className="flex flex-col items-center w-full h-[85vh] py-2">
                <div className="w-full h-full max-w-5xl bg-white rounded-xl overflow-hidden shadow-2xl border border-slate-200">
                  <iframe 
                    src={externalSource.embedUrl} 
                    className="w-full h-full border-0"
                    title="PDF Reader Viewer"
                    allow="autoplay"
                  ></iframe>
                </div>
                <div className="mt-4 flex flex-wrap justify-center gap-3">
                  <a href={externalSource.downloadUrl} target="_blank" rel="noreferrer" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2">
                     <ExternalLink className="w-4 h-4" /> Buka di Tab Baru
                  </a>
                </div>
              </div>
            ) : pdfDoc ? (
              /* High-DPI Canvas Rendering Engine with Generous pb-48 Bottom Scroll Margin */
              <div className="flex flex-col items-center py-2 pb-48 min-h-full w-full">
                <div className="relative shadow-2xl rounded-lg overflow-hidden border border-slate-200 bg-white">
                  {pageRendering && (
                    <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-10">
                      <div className="p-2 bg-slate-800 text-white rounded-xl text-xs flex items-center gap-2 shadow-lg">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                        <span>Merender Halaman {currentPage}...</span>
                      </div>
                    </div>
                  )}
                  <canvas ref={canvasRef} className="block mx-auto" />
                </div>

                <div className="mt-4 flex items-center gap-3 text-xs text-slate-600 bg-white/80 px-4 py-1.5 rounded-full border border-blue-200 shadow-xs">
                  <span>Halaman Buku: {(pageLabels && pageLabels[currentPage - 1]) ? pageLabels[currentPage - 1] : currentPage} {pageLabels ? `(PDF: ${currentPage} dari ${numPages})` : `dari ${numPages}`}</span>
                  <span>•</span>
                  <span>Skala: {Math.round(scale * 100)}%</span>
                  {rotation > 0 && (
                    <>
                      <span>•</span>
                      <span>Rotasi: {rotation}°</span>
                    </>
                  )}
                </div>

                </div>
            ) : (
              /* Beautiful Simulated Book/Material Reader (For items without raw binary upload) */
              <div className="w-full flex justify-center py-2 sm:py-6 pb-48">
                <div
                  className={`bg-white text-slate-900 border border-slate-200 rounded-2xl shadow-xl space-y-6 transition-all duration-300 ${
                    isMobile ? 'p-4 w-full min-h-[400px]' : 'p-6 sm:p-12 max-w-3xl w-full min-h-[520px]'
                  }`}
                  style={isMobile ? undefined : { transform: `scale(${scale})`, transformOrigin: 'top center' }}
                >
                  <div className="flex justify-between items-center text-[11px] text-slate-400 border-b border-slate-100 pb-3 font-mono">
                    <span className="truncate max-w-[180px] sm:max-w-xs">{book.title}</span>
                    <span>Halaman {currentPage} dari {totalDisplayPages}</span>
                  </div>

                  {currentPage === 1 ? (
                    <div className="text-center py-6 sm:py-10 space-y-4">
                      <img
                        src={coverImg}
                        alt={book.title}
                        className="w-36 h-52 sm:w-44 sm:h-60 object-cover rounded-xl shadow-xl mx-auto border border-slate-200"
                      />
                      <h2 className="text-lg sm:text-xl font-bold text-slate-900">{book.title}</h2>
                      <p className="text-xs text-slate-500 font-medium">Bahan Ajar & Modul Siswa • {authorName}</p>
                      
                      {book.fileName && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 rounded-full font-mono text-[11px] border border-slate-200">
                          <FileText className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{book.fileName} ({book.fileSize})</span>
                        </div>
                      )}

                      <div className="p-4 bg-slate-50 rounded-xl text-xs text-slate-600 leading-relaxed max-w-lg mx-auto text-left border border-slate-100">
                        <p className="font-semibold text-slate-800 mb-1">Deskripsi & Pokok Pembahasan:</p>
                        {book.description || 'Materi ajar ini disiapkan oleh guru untuk dibaca dan dipahami langsung oleh siswa melalui webapp.'}
                      </div>
                    </div>
            ) : (
                    <div className="space-y-4 text-slate-800 text-xs sm:text-sm leading-relaxed">
                      <h3 className="font-bold text-base text-slate-900 border-b border-slate-100 pb-2">
                        BAGIAN {currentPage - 1}: Pembahasan Modul & Ringkasan Materi
                      </h3>
                      <p>
                        Modul ini membahas topik penting dalam mata pelajaran <strong>{book.subject}</strong>. Siswa cukup membaca dan mempelajari ringkasan materi langsung dari webapp tanpa perlu mengunduh berkas.
                      </p>
                      <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl space-y-2 text-xs">
                        <span className="font-bold text-indigo-900 uppercase flex items-center gap-1.5">
                          💡 Catatan & Panduan Belajar Siswa:
                        </span>
                        <p className="text-indigo-950 leading-relaxed">
                          Pahami konsep-konsep kunci yang telah dirangkum oleh guru ({authorName}) pada bahan ajar ini sebagai bekal mengerjakan kuis dan ujian.
                        </p>
                      </div>
                      <p>
                        Jika ada materi atau latihan soal yang belum dipahami, siswa dapat mencatat dan menanyakannya langsung kepada guru pengampu pada jadwal tatap muka kelas.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        {/* UNIVERSAL FLOATING PAGINATION PILL */}
        <div className="absolute bottom-6 sm:bottom-10 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 sm:gap-3 bg-slate-900/90 backdrop-blur-md px-3 sm:px-5 py-2 sm:py-3 rounded-full border border-slate-700/50 shadow-[0_10px_40px_rgba(0,0,0,0.3)] text-white">
          <button onClick={handlePrevPage} disabled={currentPage <= 1 || isLoading} className="p-1 sm:p-2 hover:bg-slate-700 active:bg-slate-600 rounded-full disabled:opacity-30 transition-colors">
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          
          <div className="flex items-center gap-2 px-1 sm:px-2">
            <input 
              type="number"
              value={pageInputVal}
              onChange={handlePageInputChange}
              onKeyDown={handlePageInputKeyDown}
              onBlur={() => setPageInputVal(currentPage.toString())}
              disabled={isLoading}
              className="w-12 sm:w-14 text-center bg-slate-800 text-white rounded-lg border border-slate-600 focus:outline-none focus:border-blue-500 text-sm sm:text-base py-1 font-bold font-mono transition-colors"
            />
            <span className="text-slate-400 text-sm sm:text-base font-bold font-mono">/ {totalDisplayPages}</span>
          </div>

          <button onClick={handleNextPage} disabled={currentPage >= totalDisplayPages || isLoading} className="p-1 sm:p-2 hover:bg-slate-700 active:bg-slate-600 rounded-full disabled:opacity-30 transition-colors">
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          
          {pdfDoc && (
            <>
              <div className="w-[2px] h-6 bg-slate-700 mx-1 sm:mx-2 rounded-full" />
              <button onClick={handleZoomOut} className="p-1 sm:p-2 hover:bg-slate-700 active:bg-slate-600 rounded-full text-slate-300 transition-colors" title="Perkecil (-)">
                <ZoomOut className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <span className="text-xs sm:text-sm font-bold font-mono text-slate-300 w-10 sm:w-12 text-center">{Math.round(scale * 100)}%</span>
              <button onClick={handleZoomIn} className="p-1 sm:p-2 hover:bg-slate-700 active:bg-slate-600 rounded-full text-slate-300 transition-colors" title="Perbesar (+)">
                <ZoomIn className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </>
          )}
        </div>

      </motion.div>
    </div>
  );
};
