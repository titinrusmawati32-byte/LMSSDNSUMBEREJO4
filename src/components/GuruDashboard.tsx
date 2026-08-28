import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { 
  GraduationCap, BookOpen, Users, CheckSquare, PlusCircle, LogOut, 
  Clock, Calendar, Award, CheckCircle2, FileText, Send, Sparkles, AlertCircle,
  FileUp, HelpCircle, Book, Video, Upload, Trash2, Eye, Check, Menu, X,
  KeyRound, UserPlus, Bell, Copy, UserCheck, Search, Image as ImageIcon,
  ArrowRight, Plus, FileSpreadsheet, Download, Edit, UploadCloud, RefreshCw,
  ExternalLink, ChevronRight, Filter, Play, Flame, ShieldAlert, Sparkle
} from 'lucide-react';
import { 
  UserProfile, AttendanceRecord, LearningMaterial, QuizExam, 
  DigitalBook, LearningVideo, QuizQuestion, SystemAnnouncement, 
  ClassSchedule, StudentQuizSubmission, SchoolSettings 
} from '../types';
import { MOCK_USERS } from '../data/mockData';
import { 
  subscribeAttendance, updateAttendanceInDb, subscribeUsers, 
  addUserToDb, deleteUserFromDb, updateUserInDb, subscribeSubmissions, 
  uploadLargeFileToFirestore 
} from '../lib/lmsDb';
import { DeleteConfirmModal, DeleteSuccessModal } from './DeleteModal';
import { WordQuizImportModal } from './WordQuizImportModal';
import { BookReaderModal } from './BookReaderModal';
import { MaterialDetailModal } from './MaterialDetailModal';
import { VideoPlayerModal } from './VideoPlayerModal';
import { UserProfileModal } from './UserProfileModal';
import { GuruScheduleManager } from './GuruScheduleManager';
import { FeatureHeaderBanner } from './FeatureHeaderBanner';
import { savePdfBlob } from '../lib/pdfStorage';

interface GuruDashboardProps {
  currentUser: UserProfile;
  materials: LearningMaterial[];
  quizzes: QuizExam[];
  books: DigitalBook[];
  videos: LearningVideo[];
  announcements?: SystemAnnouncement[];
  schedules?: ClassSchedule[];
  onAddMaterial: (item: LearningMaterial) => void;
  onAddQuiz: (item: QuizExam) => void;
  onAddBook: (item: DigitalBook) => void;
  onAddVideo: (item: LearningVideo) => void;
  onAddSchedule?: (item: ClassSchedule) => void;
  onUpdateSchedule?: (item: ClassSchedule) => void;
  onDeleteSchedule?: (id: string) => void;
  onDeleteMaterial?: (id: string) => void;
  onDeleteQuiz?: (id: string) => void;
  onDeleteBook?: (id: string) => void;
  onDeleteVideo?: (id: string) => void;
  onLogout: () => void;
  onUpdateCurrentUser?: (updatedUser: UserProfile) => void;
  isMobile?: boolean;
  schoolSettings?: SchoolSettings;
}

export const GuruDashboard: React.FC<GuruDashboardProps> = ({
  currentUser,
  materials,
  quizzes,
  books,
  videos,
  announcements = [],
  schedules = [],
  onAddMaterial,
  onAddQuiz,
  onAddBook,
  onAddVideo,
  onAddSchedule,
  onUpdateSchedule,
  onDeleteSchedule,
  onDeleteMaterial,
  onDeleteQuiz,
  onDeleteBook,
  onDeleteVideo,
  onLogout,
  onUpdateCurrentUser,
  schoolSettings
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'materials' | 'quizzes' | 'books' | 'videos' | 'attendance' | 'students' | 'schedules'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Student management state
  const [studentsList, setStudentsList] = useState<UserProfile[]>([]);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [showGenerateSiswaModal, setShowGenerateSiswaModal] = useState(false);
  const [genSiswaName, setGenSiswaName] = useState('');
  const [genSiswaNisn, setGenSiswaNisn] = useState('');
  const [genSiswaClass, setGenSiswaClass] = useState('Kelas XI IPA 1');
  const [genSiswaPassword, setGenSiswaPassword] = useState('123456');
  const [createdSiswaCredential, setCreatedSiswaCredential] = useState<{
    name: string;
    username: string;
    password: string;
    className: string;
  } | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Submissions state
  const [submissionsList, setSubmissionsList] = useState<StudentQuizSubmission[]>([]);
  const [selectedQuizForSubmissions, setSelectedQuizForSubmissions] = useState<QuizExam | null>(null);

  // Excel Upload state
  const [showUploadSiswaExcelModal, setShowUploadSiswaExcelModal] = useState(false);

  // Student Edit state
  const [editingStudent, setEditingStudent] = useState<UserProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [editNisn, setEditNisn] = useState('');
  const [editClass, setEditClass] = useState('Kelas XI IPA 1');
  const [editStatus, setEditStatus] = useState<'active' | 'inactive'>('active');

  // Modals state
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [showWordQuizModal, setShowWordQuizModal] = useState(false);
  const [showBookModal, setShowBookModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedDocForReader, setSelectedDocForReader] = useState<DigitalBook | LearningMaterial | null>(null);
  const [selectedMaterialDetail, setSelectedMaterialDetail] = useState<LearningMaterial | null>(null);
  const [selectedVideoForPlay, setSelectedVideoForPlay] = useState<LearningVideo | null>(null);

  // Derive subjects directly from active class schedules
  const scheduleSubjects = useMemo(() => {
    return Array.from(new Set(schedules.map(s => s.subject?.trim()).filter(Boolean)));
  }, [schedules]);

  const defaultStandardSubjects = [
    'Matematika Dasar',
    'IPA & Eksperimen Sains',
    'Bahasa Indonesia & Literasi',
    'Informatika & Komputer',
    'Pendidikan Agama & Budi Pekerti',
    'Pendidikan Pancasila & Kewarganegaraan (PPKn)',
    'Pendidikan Jasmani & Kesehatan (PJOK)',
    'Seni Budaya & Prakarya (SBdP)',
    'Bahasa Inggris Dasar'
  ];

  const allSubjectOptions = useMemo(() => {
    return Array.from(new Set([...scheduleSubjects, ...defaultStandardSubjects]));
  }, [scheduleSubjects]);

  const defaultInitialSubject = allSubjectOptions[0] || 'Matematika Dasar';

  // Delete Modals state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string; type: string; category: 'material' | 'quiz' | 'book' | 'video' | 'student' } | null>(null);
  const [successDeletedTarget, setSuccessDeletedTarget] = useState<{ title: string; type: string } | null>(null);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleExecuteDelete = () => {
    if (!deleteTarget) return;
    const { id, title, type, category } = deleteTarget;
    if (category === 'material' && onDeleteMaterial) onDeleteMaterial(id);
    if (category === 'quiz' && onDeleteQuiz) onDeleteQuiz(id);
    if (category === 'book' && onDeleteBook) onDeleteBook(id);
    if (category === 'video' && onDeleteVideo) onDeleteVideo(id);
    if (category === 'student') {
      setStudentsList(prev => prev.filter(s => s.id !== id));
      deleteUserFromDb(id);
    }
    setDeleteTarget(null);
    setSuccessDeletedTarget({ title, type });
  };

  // Form State - Bahan Ajar (PDF)
  const [matTitle, setMatTitle] = useState('');
  const [matSubject, setMatSubject] = useState(defaultInitialSubject);
  const [matFileType, setMatFileType] = useState<'PDF' | 'PPT' | 'DOCX' | 'ZIP'>('PDF');
  const [matFileSize, setMatFileSize] = useState('3.5 MB');
  const [matPdfName, setMatPdfName] = useState('');
  const [matPdfFile, setMatPdfFile] = useState<File | null>(null);
  const [matDesc, setMatDesc] = useState('');

  // Form State - Quiz / Ujian
  const [quizTitle, setQuizTitle] = useState('');
  const [quizSubject, setQuizSubject] = useState(defaultInitialSubject);
  const [quizType, setQuizType] = useState<'quiz' | 'ujian'>('quiz');
  const [quizDuration, setQuizDuration] = useState(20);
  const [quizDeadline, setQuizDeadline] = useState('28 Agustus 2026, 23:59 WIB');
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([
    {
      id: 'q1',
      questionText: 'Berapakah nilai dari 25 x 4 + 50?',
      options: ['120', '150', '160', '100'],
      correctAnswerIndex: 1
    }
  ]);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [optA, setOptA] = useState('');
  const [optB, setOptB] = useState('');
  const [optC, setOptC] = useState('');
  const [optD, setOptD] = useState('');
  const [correctIdx, setCorrectIdx] = useState(0);

  // Form State - Buku Digital (PDF)
  const [bookTitle, setBookTitle] = useState('');
  const [bookAuthor, setBookAuthor] = useState(currentUser.name);
  const [bookSubject, setBookSubject] = useState(defaultInitialSubject);
  const [bookPdfName, setBookPdfName] = useState('');
  const [bookPdfSize, setBookPdfSize] = useState('12.4 MB');
  const [bookDesc, setBookDesc] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [bookPdfFile, setBookPdfFile] = useState<File | null>(null);
  const [targetPage, setTargetPage] = useState<string>('');

  // Form State - Video Pembelajaran
  const [vidTitle, setVidTitle] = useState('');
  const [vidSubject, setVidSubject] = useState(defaultInitialSubject);
  const [vidDuration, setVidDuration] = useState('12:45');
  const [vidUrlInput, setVidUrlInput] = useState('');
  const [vidSourceType, setVidSourceType] = useState<'youtube' | 'gdrive' | 'url'>('youtube');
  const [vidDesc, setVidDesc] = useState('');

  // Attendance checklist state
  const [dbAttendanceRecords, setDbAttendanceRecords] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    const unsubAttendance = subscribeAttendance((items) => {
      setDbAttendanceRecords(items || []);
    });
    const unsubUsers = subscribeUsers((users) => {
      const siswaOnly = users.filter(u => u.role === 'siswa');
      setStudentsList(siswaOnly);
    });
    const unsubSubs = subscribeSubmissions((subs) => {
      setSubmissionsList(subs || []);
    });
    return () => {
      unsubAttendance();
      unsubUsers();
      unsubSubs();
    };
  }, []);

  const attendanceList = useMemo(() => {
    const currentStudents = studentsList.length > 0 ? studentsList : MOCK_USERS.filter(u => u.role === 'siswa');
    return currentStudents.map((siswa) => {
      const record = dbAttendanceRecords.find(r => r.nisn === siswa.identifierNumber || r.id === siswa.id);
      return {
        id: siswa.id,
        studentName: siswa.name,
        nisn: siswa.identifierNumber || '',
        status: record ? record.status : 'hadir',
        time: record ? record.time : '07:30 WIB'
      } as AttendanceRecord;
    });
  }, [studentsList, dbAttendanceRecords]);

  const updateAttendance = (id: string, status: 'hadir' | 'izin' | 'sakit' | 'alpa') => {
    const timeVal = status === 'hadir' ? '07:30 WIB' : '-';
    const currentStudents = studentsList.length > 0 ? studentsList : MOCK_USERS.filter(u => u.role === 'siswa');
    const siswa = currentStudents.find(s => s.id === id);
    if (!siswa) return;
    const record: AttendanceRecord = {
      id: siswa.id,
      studentName: siswa.name,
      nisn: siswa.identifierNumber || '',
      status,
      time: timeVal
    };
    updateAttendanceInDb(record);
  };

  // PDF File Selection Handlers
  const handleMatPdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
        triggerToast('Hanya file format PDF yang diperbolehkan!');
        return;
      }
      setMatPdfFile(file);
      setMatPdfName(file.name);
      const sizeStr = file.size >= 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.max(1, Math.round(file.size / 1024))} KB`;
      setMatFileSize(sizeStr);
      setMatFileType('PDF');
      if (!matTitle) {
        setMatTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleBookPdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
        triggerToast('Hanya file format PDF yang diperbolehkan!');
        return;
      }
      setBookPdfFile(file);
      setBookPdfName(file.name);
      const sizeStr = file.size >= 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.max(1, Math.round(file.size / 1024))} KB`;
      setBookPdfSize(sizeStr);
      if (!bookTitle) {
        setBookTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  // Submit Handler: Bahan Ajar PDF
  const handleAddMaterialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = matTitle.trim();
    if (!cleanTitle) {
      triggerToast('Judul bahan ajar wajib diisi!');
      return;
    }
    setIsUploading(true);
    const newId = 'mat-' + Date.now();
    let fileDataStr: string | undefined = undefined;
    let calculatedChunks: number | undefined = undefined;
    let fileUrlStr: string | undefined = undefined;

    try {
      if (matPdfFile) {
        await savePdfBlob(newId, matPdfFile, matPdfName || (cleanTitle + '.pdf'));
        fileUrlStr = `/uploads/${newId}.pdf`;
        const b64 = await convertFileToBase64(matPdfFile);
        if (b64.length < 900000) {
          fileDataStr = b64;
        } else {
          calculatedChunks = Math.ceil(b64.length / 900000);
          uploadLargeFileToFirestore(newId, b64).catch(err => console.warn('Firestore chunk upload note:', err));
        }

        // Upload to server asynchronously in the background
        fetch('/api/upload-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileBase64: b64,
            fileName: matPdfFile.name,
            id: newId
          })
        }).catch(err => console.warn('Background server upload note:', err));
      }

      const newMat: LearningMaterial = {
        id: newId,
        title: cleanTitle,
        subject: matSubject,
        fileType: matFileType,
        fileSize: matFileSize || (matPdfFile ? `${(matPdfFile.size / (1024 * 1024)).toFixed(1)} MB` : '2.5 MB'),
        fileChunks: calculatedChunks,
        uploadDate: 'Hari ini',
        teacherName: currentUser.name,
        description: (matDesc || '').trim() || 'Materi ajar dapat dibaca langsung oleh siswa di webapp.',
        downloadCount: 0,
        fileName: matPdfName || (cleanTitle + '.pdf'),
        fileUrl: fileUrlStr,
        fileData: fileDataStr
      };

      onAddMaterial(newMat);
      setShowMaterialModal(false);
      setMatTitle('');
      setMatDesc('');
      setMatPdfName('');
      setMatFileSize('');
      setMatPdfFile(null);
      triggerToast('Bahan Ajar PDF berhasil diunggah dan disimpan!');
    } catch (err: any) {
      console.error('Error saving material:', err);
      triggerToast('Gagal mengunggah materi: ' + (err?.message || 'Terjadi kesalahan'));
    } finally {
      setIsUploading(false);
    }
  };

  // Submit Handler: Buku Digital PDF
  const handleAddBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = bookTitle.trim();
    if (!cleanTitle) {
      triggerToast('Judul buku teks wajib diisi!');
      return;
    }
    setIsUploading(true);

    try {
      const bookId = 'bk-' + Date.now();
      let fileDataStr: string | undefined = undefined;
      let calculatedChunks: number | undefined = undefined;
      let fileUrlStr: string | undefined = undefined;
      let detectedPages: number = 10;

      if (bookPdfFile) {
        // 1. Instantly save raw File Blob into browser IndexedDB (handles 100+ MBs instantaneously)
        await savePdfBlob(bookId, bookPdfFile, bookPdfName || (cleanTitle + '.pdf'));
        fileUrlStr = `/uploads/${bookId}.pdf`;

        // 2. Convert base64 and process in background
        const b64 = await convertFileToBase64(bookPdfFile);
        if (b64.length < 900000) {
          fileDataStr = b64;
        } else {
          calculatedChunks = Math.ceil(b64.length / 900000);
          uploadLargeFileToFirestore(bookId, b64).catch(err => console.warn('Firestore chunk upload note:', err));
        }

        // Upload to server asynchronously for cross-device support
        fetch('/api/upload-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileBase64: b64,
            fileName: bookPdfFile.name,
            id: bookId
          })
        }).catch(err => console.warn('Background server upload note:', err));
      }

      const parsedTargetPage = targetPage ? parseInt(targetPage, 10) : undefined;
      const validTargetPage = (parsedTargetPage && !isNaN(parsedTargetPage) && parsedTargetPage > 0)
        ? parsedTargetPage
        : undefined;

      const newBk: DigitalBook = {
        id: bookId,
        title: cleanTitle,
        author: (bookAuthor || '').trim() || currentUser.name,
        subject: bookSubject || 'Tematik / Umum',
        totalPages: detectedPages,
        coverImage: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=400',
        description: (bookDesc || '').trim() || 'E-Book PDF modul acuan pembelajaran siswa.',
        fileSize: bookPdfSize || (bookPdfFile ? `${(bookPdfFile.size / (1024 * 1024)).toFixed(1)} MB` : '15.0 MB'),
        fileChunks: calculatedChunks,
        rating: 5.0,
        readCount: 0,
        fileName: bookPdfName || (cleanTitle + '.pdf'),
        fileUrl: fileUrlStr,
        fileData: fileDataStr,
        targetPage: validTargetPage,
        uploadDate: 'Hari ini'
      };

      onAddBook(newBk);
      setShowBookModal(false);
      setBookTitle('');
      setBookAuthor('');
      setBookDesc('');
      setBookPdfName('');
      setBookPdfSize('');
      setBookPdfFile(null);
      setTargetPage('');
      triggerToast('Buku digital berhasil disimpan di perpustakaan!');
    } catch (err: any) {
      console.error('Error saving digital book:', err);
      triggerToast('Gagal menyimpan buku: ' + (err?.message || 'Terjadi kesalahan'));
    } finally {
      setIsUploading(false);
    }
  };

  // Submit Handler: Quiz
  const handleAddQuizSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizTitle.trim()) return;
    const newQz: QuizExam = {
      id: 'qz-' + Date.now(),
      title: quizTitle,
      subject: quizSubject,
      type: quizType,
      durationMinutes: quizDuration,
      totalQuestions: quizQuestions.length,
      deadline: quizDeadline,
      teacherName: currentUser.name,
      questions: quizQuestions,
      status: 'active'
    };
    onAddQuiz(newQz);
    setShowQuizModal(false);
    setQuizTitle('');
    triggerToast('Quiz baru berhasil dibuat!');
  };

  const handleAddQuestionToQuiz = () => {
    if (!newQuestionText.trim() || !optA.trim() || !optB.trim()) return;
    const newQ: QuizQuestion = {
      id: 'q-' + Date.now(),
      questionText: newQuestionText,
      options: [optA, optB, optC || 'Pilihan C', optD || 'Pilihan D'],
      correctAnswerIndex: correctIdx
    };
    setQuizQuestions([...quizQuestions, newQ]);
    setNewQuestionText('');
    setOptA('');
    setOptB('');
    setOptC('');
    setOptD('');
    setCorrectIdx(0);
  };

  // Submit Handler: Video
  const handleAddVideoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vidTitle.trim() || !vidUrlInput.trim()) return;
    
    let ytId = 'dQw4w9WgXcQ';
    const match = vidUrlInput.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (match && match[1]) {
      ytId = match[1];
    }
    
    const newVid: LearningVideo = {
      id: 'vid-' + Date.now(),
      title: vidTitle,
      subject: vidSubject,
      duration: vidDuration,
      youtubeId: ytId,
      thumbnail: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
      description: vidDesc || 'Video materi pembelajaran interaktif.',
      teacherName: currentUser.name,
      uploadDate: 'Hari ini',
      viewsCount: 0,
      videoUrl: vidUrlInput,
      videoSourceType: vidSourceType
    };

    onAddVideo(newVid);
    setShowVideoModal(false);
    setVidTitle('');
    setVidUrlInput('');
    setVidDesc('');
    triggerToast('Video pembelajaran berhasil ditambahkan!');
  };

  // Student Creation
  const handleGenerateStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!genSiswaName.trim() || !genSiswaNisn.trim()) return;

    const newStudent: UserProfile = {
      id: 'usr-' + Date.now(),
      name: genSiswaName,
      identifierNumber: genSiswaNisn,
      role: 'siswa',
      departmentOrClass: genSiswaClass,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
      status: 'active',
      password: genSiswaPassword || '123456'
    };

    await addUserToDb(newStudent);
    setStudentsList(prev => [newStudent, ...prev]);
    setCreatedSiswaCredential({
      name: newStudent.name,
      username: newStudent.identifierNumber,
      password: newStudent.password || '123456',
      className: newStudent.departmentOrClass || genSiswaClass
    });
    setGenSiswaName('');
    setGenSiswaNisn('');
    setGenSiswaPassword('123456');
    triggerToast('Akun Siswa berhasil dibuat!');
  };

  // Excel Upload for Students
  const handleExcelFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        let addedCount = 0;
        for (const row of data) {
          const name = row['Nama Siswa'] || row['Nama'] || row['nama'] || row['name'];
          const nisn = String(row['NISN'] || row['nisn'] || row['NIS'] || row['nis'] || Date.now());
          const className = row['Kelas'] || row['kelas'] || 'Kelas XI IPA 1';
          const password = String(row['Password'] || row['password'] || '123456');

          if (name) {
            const newStudent: UserProfile = {
              id: 'usr-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
              name: String(name).trim(),
              identifierNumber: nisn.trim(),
              role: 'siswa',
              departmentOrClass: className,
              avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
              status: 'active',
              password
            };
            await addUserToDb(newStudent);
            setStudentsList(prev => [newStudent, ...prev]);
            addedCount++;
          }
        }
        setShowUploadSiswaExcelModal(false);
        triggerToast(`Berhasil mengimpor ${addedCount} data siswa dari file Excel!`);
      } catch (err) {
        alert('Gagal membaca file Excel. Pastikan format tabel memiliki kolom Nama dan NISN.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleExportStudentsExcel = () => {
    const exportData = studentsList.map((s, idx) => ({
      'No': idx + 1,
      'Nama Siswa': s.name,
      'NISN / No. Induk': s.identifierNumber,
      'Kelas': s.departmentOrClass || '-',
      'Status Akun': s.status === 'active' ? 'Aktif' : 'Nonaktif',
      'Password Akun': s.password || '123456'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Daftar Siswa');
    XLSX.writeFile(wb, `Data_Siswa_${schoolSettings?.schoolName?.replace(/\s+/g, '_') || 'EduSmart'}.xlsx`);
    triggerToast('File Excel siswa berhasil diunduh!');
  };

  // Filtered Students
  const filteredStudents = useMemo(() => {
    if (!studentSearchQuery || !studentSearchQuery.trim()) return studentsList;
    const q = studentSearchQuery.toLowerCase();
    return studentsList.filter(s => {
      if (!s) return false;
      return (
        (s.name || '').toLowerCase().includes(q) || 
        (s.identifierNumber || '').toLowerCase().includes(q) ||
        (s.departmentOrClass ? s.departmentOrClass.toLowerCase().includes(q) : false)
      );
    });
  }, [studentsList, studentSearchQuery]);

  const schoolName = schoolSettings?.schoolName || 'EduSmart LMS';

  return (
    <div className="min-h-screen bg-slate-950 flex font-sans text-slate-100 selection:bg-emerald-500 selection:text-white">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-emerald-600/90 text-white rounded-2xl shadow-xl backdrop-blur-md border border-emerald-400/30 text-sm font-medium"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-900/95 border-r border-slate-800/80 p-5 shrink-0 justify-between">
        <div className="space-y-6">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-900/20 text-white">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">{schoolName}</h2>
              <span className="text-[11px] font-medium text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/50">Portal Guru</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {[
              { id: 'dashboard', label: 'Dashboard Utama', icon: GraduationCap },
              { id: 'materials', label: 'Bahan Ajar & E-Book', icon: BookOpen },
              { id: 'quizzes', label: 'Bank Soal & Quiz', icon: Award },
              { id: 'videos', label: 'Video Pembelajaran', icon: Video },
              { id: 'attendance', label: 'Presensi Siswa', icon: CheckSquare },
              { id: 'students', label: 'Kelola Data Siswa', icon: Users },
              { id: 'schedules', label: 'Jadwal Mengajar', icon: Calendar }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive 
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="pt-4 border-t border-slate-800/80 space-y-3">
          <div 
            onClick={() => setShowProfileModal(true)}
            className="flex items-center gap-3 p-2 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition cursor-pointer border border-slate-700/40"
          >
            <img 
              src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'} 
              alt={currentUser.name} 
              className="w-9 h-9 rounded-xl object-cover border border-emerald-500/40"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
              <p className="text-[10px] text-slate-400 truncate">NIP: {currentUser.identifierNumber || '-'}</p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 bg-rose-950/30 hover:bg-rose-900/40 border border-rose-900/40 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar Akun</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Mobile Header Bar */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-slate-800/80 sticky top-0 z-30 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
              <GraduationCap className="w-5 h-5" />
            </div>
            <span className="font-bold text-sm text-white">{schoolName}</span>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </header>

        {/* Mobile Dropdown Nav */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-slate-900 border-b border-slate-800 p-4 space-y-2">
            {[
              { id: 'dashboard', label: 'Dashboard Utama', icon: GraduationCap },
              { id: 'materials', label: 'Bahan Ajar & E-Book', icon: BookOpen },
              { id: 'quizzes', label: 'Bank Soal & Quiz', icon: Award },
              { id: 'videos', label: 'Video Pembelajaran', icon: Video },
              { id: 'attendance', label: 'Presensi Siswa', icon: CheckSquare },
              { id: 'students', label: 'Kelola Data Siswa', icon: Users },
              { id: 'schedules', label: 'Jadwal Mengajar', icon: Calendar }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold ${
                    activeTab === tab.id ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-950/40"
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar Akun</span>
            </button>
          </div>
        )}

        {/* Body Container */}
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
          {/* Top Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900/90 to-emerald-950/40 p-6 rounded-3xl border border-slate-800/80 relative overflow-hidden">
            <div className="relative z-10 space-y-1">
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Selamat Datang di Dashboard Guru
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{currentUser.name}</h1>
              <p className="text-xs text-slate-400">
                {currentUser.departmentOrClass || 'Guru Mata Pelajaran'} &bull; {schoolName}
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 relative z-10">
              <button
                onClick={() => setShowBookModal(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-900/30 transition"
              >
                <Book className="w-4 h-4" />
                <span>+ Upload Buku PDF</span>
              </button>
              <button
                onClick={() => setShowMaterialModal(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/30 transition"
              >
                <FileUp className="w-4 h-4" />
                <span>+ Bahan Ajar PDF</span>
              </button>
              <button
                onClick={() => setShowWordQuizModal(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-900/30 transition"
              >
                <Sparkles className="w-4 h-4" />
                <span>⚡ Import Soal Word / AI</span>
              </button>
            </div>
          </div>

          {/* TAB 1: DASHBOARD OVERVIEW */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Stat Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                {[
                  { label: 'Total Siswa', val: studentsList.length, color: 'emerald', icon: Users, tab: 'students' },
                  { label: 'Bahan Ajar PDF', val: materials.length, color: 'blue', icon: FileText, tab: 'materials' },
                  { label: 'Buku Digital', val: books.length, color: 'indigo', icon: Book, tab: 'materials' },
                  { label: 'Bank Soal / Quiz', val: quizzes.length, color: 'amber', icon: Award, tab: 'quizzes' },
                  { label: 'Video Belajar', val: videos.length, color: 'purple', icon: Video, tab: 'videos' },
                  { label: 'Jadwal Mengajar', val: schedules.length, color: 'teal', icon: Calendar, tab: 'schedules' }
                ].map((st, i) => {
                  const Icon = st.icon;
                  return (
                    <div 
                      key={i}
                      onClick={() => setActiveTab(st.tab as any)}
                      className="bg-slate-900/80 hover:bg-slate-850 border border-slate-800/80 rounded-2xl p-4 cursor-pointer transition flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="text-[11px] font-medium">{st.label}</span>
                        <Icon className="w-4 h-4 text-emerald-400" />
                      </div>
                      <p className="text-2xl font-black text-white mt-2">{st.val}</p>
                    </div>
                  );
                })}
              </div>

              {/* Quick Actions & Recent Materials Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left 2 cols: Buku Digital & Bahan Ajar Terkini */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Book className="w-5 h-5 text-indigo-400" />
                        <h3 className="font-bold text-sm text-white">E-Book & Buku Digital Siswa</h3>
                      </div>
                      <button 
                        onClick={() => setActiveTab('materials')}
                        className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                      >
                        Lihat Semua ({books.length}) <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {books.length === 0 ? (
                      <div className="text-center py-8 bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
                        <Book className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                        <p className="text-xs text-slate-400">Belum ada buku digital yang diunggah.</p>
                        <button
                          onClick={() => setShowBookModal(true)}
                          className="mt-3 px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl"
                        >
                          + Unggah Buku PDF Sekarang
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {books.slice(0, 4).map(b => (
                          <div key={b.id} className="p-3.5 bg-slate-950/50 rounded-2xl border border-slate-800/60 flex items-start justify-between gap-3">
                            <div className="min-w-0 space-y-1">
                              <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-800/40">
                                {b.subject}
                              </span>
                              <h4 className="text-xs font-bold text-white truncate">{b.title}</h4>
                              <p className="text-[11px] text-slate-400 truncate">Penulis: {b.author || '-'}</p>
                              {b.targetPage && (
                                <span className="inline-block text-[10px] font-medium text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded">
                                  Halaman Buku: Hal {b.targetPage}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => setSelectedDocForReader(b)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shrink-0"
                            >
                              Baca PDF
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Bahan Ajar Terkini */}
                  <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-400" />
                        <h3 className="font-bold text-sm text-white">Bahan Ajar & Modul PDF Terkini</h3>
                      </div>
                      <button 
                        onClick={() => setActiveTab('materials')}
                        className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"
                      >
                        Lihat Semua ({materials.length}) <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-2">
                      {materials.slice(0, 3).map(m => (
                        <div key={m.id} className="p-3 bg-slate-950/50 rounded-2xl border border-slate-800/60 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-blue-950/80 text-blue-400 flex items-center justify-center font-bold text-xs border border-blue-800/40">
                              PDF
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-white truncate">{m.title}</h4>
                              <p className="text-[11px] text-slate-400 truncate">{m.subject} &bull; {m.fileSize || '2 MB'}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => setSelectedMaterialDetail(m)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shrink-0"
                          >
                            Buka Materi
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right col: Presensi Ringkas & Pengumuman */}
                <div className="space-y-6">
                  {/* Presensi Hari Ini */}
                  <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckSquare className="w-5 h-5 text-emerald-400" />
                        <h3 className="font-bold text-sm text-white">Presensi Siswa</h3>
                      </div>
                      <button 
                        onClick={() => setActiveTab('attendance')}
                        className="text-xs font-semibold text-emerald-400 hover:text-emerald-300"
                      >
                        Kelola
                      </button>
                    </div>

                    <div className="space-y-2">
                      {attendanceList.slice(0, 5).map((att) => (
                        <div key={att.id} className="flex items-center justify-between p-2.5 bg-slate-950/40 rounded-xl border border-slate-800/50 text-xs">
                          <span className="font-medium text-white truncate max-w-[120px]">{att.studentName}</span>
                          <div className="flex gap-1">
                            {(['hadir', 'izin', 'sakit', 'alpa'] as const).map(st => (
                              <button
                                key={st}
                                onClick={() => updateAttendance(att.id, st)}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize transition ${
                                  att.status === st
                                    ? st === 'hadir' ? 'bg-emerald-600 text-white' :
                                      st === 'izin' ? 'bg-amber-600 text-white' :
                                      st === 'sakit' ? 'bg-blue-600 text-white' : 'bg-rose-600 text-white'
                                    : 'bg-slate-850 text-slate-400 hover:bg-slate-800'
                                }`}
                              >
                                {st}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pengumuman */}
                  <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-amber-400" />
                      <h3 className="font-bold text-sm text-white">Pengumuman Sekolah</h3>
                    </div>
                    {announcements.slice(0, 2).map(ann => (
                      <div key={ann.id} className="p-3 bg-slate-950/40 rounded-2xl border border-slate-800/60 text-xs space-y-1">
                        <h5 className="font-bold text-white">{ann.title}</h5>
                        <p className="text-slate-400 text-[11px] line-clamp-2">{ann.content}</p>
                        <span className="text-[10px] text-slate-500 block pt-1">{ann.date} &bull; {ann.author}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BAHAN AJAR & BUKU DIGITAL */}
          {activeTab === 'materials' && (
            <div className="space-y-8">
              {/* Section 1: Buku Digital PDF */}
              <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                      <Book className="w-5 h-5 text-indigo-400" />
                      Perpustakaan & Buku Digital Siswa ({books.length})
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Buku teks kurikulum & modul referensi bacaan siswa dengan bookmark halaman.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowBookModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-900/20 transition self-start sm:self-auto"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Unggah Buku Digital PDF</span>
                  </button>
                </div>

                {books.length === 0 ? (
                  <div className="text-center py-12 bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
                    <Book className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                    <h4 className="text-sm font-bold text-white">Belum Ada Buku Digital</h4>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                      Klik tombol di atas untuk mengunggah berkas buku teks PDF kurikulum.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {books.map(book => (
                      <div 
                        key={book.id}
                        className="bg-slate-950/60 border border-slate-800/70 hover:border-indigo-500/40 rounded-2xl p-4 flex flex-col justify-between space-y-4 transition"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded-md border border-indigo-800/40">
                              {book.subject}
                            </span>
                            <span className="text-[10px] text-slate-500">{book.fileSize || 'PDF'}</span>
                          </div>
                          <h4 className="font-bold text-sm text-white line-clamp-2">{book.title}</h4>
                          <p className="text-xs text-slate-400">Penulis: {book.author || currentUser.name}</p>
                          {book.description && (
                            <p className="text-[11px] text-slate-400 line-clamp-2">{book.description}</p>
                          )}
                          {book.targetPage && (
                            <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                              <BookOpen className="w-3 h-3" />
                              <span>Target: Halaman {book.targetPage}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-slate-800/60">
                          <button
                            onClick={() => setSelectedDocForReader(book)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Baca Buku PDF</span>
                          </button>
                          <button
                            onClick={() => setDeleteTarget({ id: book.id, title: book.title, type: 'Buku Digital', category: 'book' })}
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition"
                            title="Hapus Buku"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 2: Bahan Ajar PDF */}
              <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-400" />
                      Bahan Ajar & Modul Pembelajaran ({materials.length})
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Materi dan modul PDF yang dapat dibuka dan dipelajari langsung oleh siswa.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowMaterialModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-900/20 transition self-start sm:self-auto"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Tambah Bahan Ajar PDF</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {materials.map(mat => (
                    <div 
                      key={mat.id}
                      className="bg-slate-950/60 border border-slate-800/70 hover:border-blue-500/40 rounded-2xl p-4 flex flex-col justify-between space-y-4 transition"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded-md border border-blue-800/40">
                            {mat.subject}
                          </span>
                          <span className="text-[10px] text-slate-500">{mat.fileSize || 'PDF'}</span>
                        </div>
                        <h4 className="font-bold text-sm text-white line-clamp-2">{mat.title}</h4>
                        <p className="text-[11px] text-slate-400 line-clamp-2">{mat.description}</p>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-800/60">
                        <button
                          onClick={() => setSelectedMaterialDetail(mat)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Buka Materi</span>
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ id: mat.id, title: mat.title, type: 'Bahan Ajar', category: 'material' })}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition"
                          title="Hapus Materi"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BANK SOAL & QUIZ */}
          {activeTab === 'quizzes' && (
            <div className="space-y-6">
              <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                      <Award className="w-5 h-5 text-amber-400" />
                      Bank Soal, Quiz & Ujian Online ({quizzes.length})
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Kelola soal ujian, import dokumen Word dengan AI Gemini, dan lihat rekap nilai siswa.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setShowWordQuizModal(true)}
                      className="flex items-center gap-2 px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-amber-900/20 transition"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>⚡ Import Word / AI</span>
                    </button>
                    <button
                      onClick={() => setShowQuizModal(true)}
                      className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-900/20 transition"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ Buat Manual</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {quizzes.map(qz => {
                    const quizSubmissions = submissionsList.filter(s => s.quizId === qz.id);
                    return (
                      <div key={qz.id} className="bg-slate-950/60 border border-slate-800/70 rounded-2xl p-5 space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded-md border border-amber-800/40 uppercase">
                                {qz.type}
                              </span>
                              <span className="text-[10px] text-slate-400">{qz.subject}</span>
                            </div>
                            <h4 className="font-bold text-sm text-white">{qz.title}</h4>
                            <p className="text-xs text-slate-400">
                              {qz.totalQuestions || qz.questions?.length || 0} Soal Pilihan Ganda &bull; Durasi: {qz.durationMinutes} Menit
                            </p>
                          </div>
                          <button
                            onClick={() => setDeleteTarget({ id: qz.id, title: qz.title, type: 'Quiz', category: 'quiz' })}
                            className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Submission status button */}
                        <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between">
                          <span className="text-xs text-slate-400">
                            {quizSubmissions.length} Siswa Sudah Mengerjakan
                          </span>
                          <button
                            onClick={() => setSelectedQuizForSubmissions(qz)}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white"
                          >
                            Lihat Rekap Nilai
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Submissions Modal / Drawer */}
              {selectedQuizForSubmissions && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div>
                        <h3 className="font-bold text-base text-white">Rekap Nilai: {selectedQuizForSubmissions.title}</h3>
                        <p className="text-xs text-slate-400">{selectedQuizForSubmissions.subject}</p>
                      </div>
                      <button 
                        onClick={() => setSelectedQuizForSubmissions(null)}
                        className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2">
                      {submissionsList.filter(s => s.quizId === selectedQuizForSubmissions.id).length === 0 ? (
                        <div className="text-center py-8 text-slate-400 text-xs">
                          Belum ada siswa yang mengumpulkan quiz ini.
                        </div>
                      ) : (
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
                            <tr>
                              <th className="p-3">Nama Siswa</th>
                              <th className="p-3">NISN</th>
                              <th className="p-3">Kelas</th>
                              <th className="p-3 text-right">Skor Nilai</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {submissionsList
                              .filter(s => s.quizId === selectedQuizForSubmissions.id)
                              .map((sub, i) => (
                                <tr key={i} className="hover:bg-slate-850/50">
                                  <td className="p-3 font-semibold text-white">{sub.studentName}</td>
                                  <td className="p-3 text-slate-400">{sub.studentNisn}</td>
                                  <td className="p-3 text-slate-400">{sub.studentClass}</td>
                                  <td className="p-3 text-right font-black text-emerald-400 text-sm">{sub.score} / 100</td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: VIDEO PEMBELAJARAN */}
          {activeTab === 'videos' && (
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <Video className="w-5 h-5 text-purple-400" />
                    Video Pembelajaran Interaktif ({videos.length})
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Tautkan video materi dari YouTube atau Google Drive untuk diputar siswa.
                  </p>
                </div>
                <button
                  onClick={() => setShowVideoModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-purple-900/20 transition self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Tambah Video Baru</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {videos.map(vid => (
                  <div key={vid.id} className="bg-slate-950/60 border border-slate-800/70 rounded-2xl overflow-hidden flex flex-col justify-between">
                    <div className="relative aspect-video bg-slate-900 group cursor-pointer" onClick={() => setSelectedVideoForPlay(vid)}>
                      <img src={vid.thumbnail} alt={vid.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 flex items-center justify-center transition">
                        <div className="w-12 h-12 rounded-full bg-purple-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition">
                          <Play className="w-5 h-5 fill-white ml-0.5" />
                        </div>
                      </div>
                      <span className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] px-2 py-0.5 rounded font-mono">
                        {vid.duration}
                      </span>
                    </div>

                    <div className="p-4 space-y-2">
                      <span className="text-[10px] font-bold text-purple-400 bg-purple-950/80 px-2 py-0.5 rounded border border-purple-800/40">
                        {vid.subject}
                      </span>
                      <h4 className="font-bold text-sm text-white line-clamp-2">{vid.title}</h4>
                      <p className="text-[11px] text-slate-400 line-clamp-2">{vid.description}</p>
                    </div>

                    <div className="px-4 pb-4 pt-2 flex items-center justify-between border-t border-slate-800/60">
                      <button
                        onClick={() => setSelectedVideoForPlay(vid)}
                        className="text-xs font-semibold text-purple-400 hover:text-purple-300"
                      >
                        Putar Video
                      </button>
                      <button
                        onClick={() => setDeleteTarget({ id: vid.id, title: vid.title, type: 'Video', category: 'video' })}
                        className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: PRESENSI SISWA */}
          {activeTab === 'attendance' && (
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-emerald-400" />
                    Daftar Presensi & Kehadiran Siswa
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Data tersinkronisasi otomatis secara real-time ke Cloud Firestore.
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Live Sync Active</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
                    <tr>
                      <th className="p-3">No</th>
                      <th className="p-3">Nama Siswa</th>
                      <th className="p-3">NISN</th>
                      <th className="p-3 text-center">Status Kehadiran</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {attendanceList.map((att, index) => (
                      <tr key={att.id} className="hover:bg-slate-850/40 transition">
                        <td className="p-3 text-slate-500">{index + 1}</td>
                        <td className="p-3 font-semibold text-white">{att.studentName}</td>
                        <td className="p-3 text-slate-400">{att.nisn}</td>
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-1.5">
                            {(['hadir', 'izin', 'sakit', 'alpa'] as const).map(statusKey => {
                              const isActive = att.status === statusKey;
                              return (
                                <button
                                  key={statusKey}
                                  onClick={() => updateAttendance(att.id, statusKey)}
                                  className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition ${
                                    isActive
                                      ? statusKey === 'hadir' ? 'bg-emerald-600 text-white shadow-sm' :
                                        statusKey === 'izin' ? 'bg-amber-600 text-white shadow-sm' :
                                        statusKey === 'sakit' ? 'bg-blue-600 text-white shadow-sm' : 'bg-rose-600 text-white shadow-sm'
                                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                  }`}
                                >
                                  {statusKey}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: KELOLA DATA SISWA */}
          {activeTab === 'students' && (
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-emerald-400" />
                    Manajemen Akun & Data Siswa ({studentsList.length})
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Buat akun login siswa, import dari file Excel, atau export data kelas.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setShowUploadSiswaExcelModal(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-800/60 hover:bg-emerald-700 text-emerald-200 border border-emerald-700/50 transition"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Upload Excel</span>
                  </button>
                  <button
                    onClick={handleExportStudentsExcel}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export Excel</span>
                  </button>
                  <button
                    onClick={() => setShowGenerateSiswaModal(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/30 transition"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>+ Tambah Siswa</span>
                  </button>
                </div>
              </div>

              {/* Search bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Cari siswa berdasarkan nama atau NISN..."
                  value={studentSearchQuery}
                  onChange={e => setStudentSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Nama Siswa</th>
                      <th className="p-3">NISN / Username</th>
                      <th className="p-3">Kelas</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredStudents.map(student => (
                      <tr key={student.id} className="hover:bg-slate-850/40 transition">
                        <td className="p-3 font-semibold text-white">{student.name}</td>
                        <td className="p-3 font-mono text-slate-400">{student.identifierNumber}</td>
                        <td className="p-3 text-slate-300">{student.departmentOrClass || '-'}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            student.status === 'active' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
                          }`}>
                            {student.status === 'active' ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>
                        <td className="p-3 text-right space-x-1">
                          <button
                            onClick={() => {
                              setEditingStudent(student);
                              setEditName(student.name);
                              setEditNisn(student.identifierNumber);
                              setEditClass(student.departmentOrClass || 'Kelas XI IPA 1');
                              setEditStatus(student.status);
                            }}
                            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                            title="Edit Data Siswa"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget({ id: student.id, title: student.name, type: 'Siswa', category: 'student' })}
                            className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-950/40"
                            title="Hapus Siswa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 7: JADWAL MENGAJAR */}
          {activeTab === 'schedules' && (
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-6">
              <GuruScheduleManager
                schedules={schedules}
                currentUser={currentUser}
                onAddSchedule={onAddSchedule}
                onUpdateSchedule={onUpdateSchedule}
                onDeleteSchedule={onDeleteSchedule}
              />
            </div>
          )}
        </main>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: TAMBAH BUKU DIGITAL (Matches user screenshot precisely!)        */}
      {/* ========================================================================= */}
      {showBookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl p-6 shadow-2xl text-slate-200 relative my-8 max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-5 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600/30 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                  <Book className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">Tambah Buku Digital</h3>
              </div>
              <button 
                onClick={() => setShowBookModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddBookSubmit} className="flex-1 overflow-y-auto custom-scrollbar smooth-scroll pr-1.5 space-y-4">
              {/* Dropzone File PDF */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Unggah Berkas PDF Buku Digital
                </label>
                <label className="border-2 border-dashed border-slate-700/80 hover:border-indigo-500/60 rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer bg-slate-950/40 transition group">
                  <input 
                    type="file" 
                    accept=".pdf" 
                    onChange={handleBookPdfChange} 
                    className="hidden" 
                  />
                  {bookPdfFile ? (
                    <div className="text-center space-y-1">
                      <div className="w-10 h-10 rounded-xl bg-indigo-950/80 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-700/50">
                        <FileText className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-white truncate max-w-xs">{bookPdfName}</p>
                      <span className="text-[10px] text-emerald-400 font-medium bg-emerald-950/60 px-2 py-0.5 rounded">
                        Ukuran: {bookPdfSize}
                      </span>
                    </div>
                  ) : (
                    <div className="text-center space-y-1">
                      <UploadCloud className="w-8 h-8 text-slate-500 group-hover:text-indigo-400 mx-auto transition" />
                      <p className="text-xs font-semibold text-slate-300">Klik atau seret file PDF buku ke sini</p>
                      <p className="text-[10px] text-slate-500">Mendukung file PDF kurikulum hingga puluhan Megabyte</p>
                    </div>
                  )}
                </label>
              </div>

              {/* Judul Buku Teks */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Judul Buku Teks <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Matematika-BS-KLS-IV"
                  value={bookTitle}
                  onChange={e => setBookTitle(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Mata Pelajaran */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Mata Pelajaran (Sesuai Jadwal Kelas)
                </label>
                <select
                  value={bookSubject}
                  onChange={e => setBookSubject(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {allSubjectOptions.map(sb => (
                    <option key={sb} value={sb}>{sb}</option>
                  ))}
                </select>
              </div>

              {/* Grid: Penulis & Target Halaman */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Penulis / Penerbit
                  </label>
                  <input
                    type="text"
                    placeholder="Nama penulis atau Kemendikbud"
                    value={bookAuthor}
                    onChange={e => setBookAuthor(e.target.value)}
                    className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Target Halaman Buku (Sesuai Cetakan Buku)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Contoh: 45"
                    value={targetPage}
                    onChange={e => setTargetPage(e.target.value)}
                    className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Nomor halaman yang tercetak di buku fisik (misal: 28).</p>
                </div>
              </div>

              {/* Deskripsi */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Deskripsi Ringkas
                </label>
                <textarea
                  rows={2}
                  placeholder="Rangkuman isi buku teks modul kurikulum..."
                  value={bookDesc}
                  onChange={e => setBookDesc(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800/80 shrink-0 sticky bottom-0 bg-slate-900 pb-1">
                <button
                  type="button"
                  onClick={() => setShowBookModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 bg-slate-800/80 hover:bg-slate-700 hover:text-white transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className={`px-5 py-2.5 rounded-xl text-xs font-semibold text-white shadow-lg transition flex items-center gap-2 cursor-pointer ${
                    isUploading 
                      ? 'bg-indigo-500/70 cursor-wait' 
                      : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/30'
                  }`}
                >
                  {isUploading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isUploading ? "Sedang Menyimpan..." : "Simpan Buku PDF Ke Perpustakaan"}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: TAMBAH BAHAN AJAR PDF                                            */}
      {/* ========================================================================= */}
      {showMaterialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl p-6 shadow-2xl text-slate-200 relative my-8 max-h-[90vh] flex flex-col"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-5 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600/30 text-blue-400 flex items-center justify-center border border-blue-500/30">
                  <FileUp className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">Tambah Bahan Ajar PDF</h3>
              </div>
              <button onClick={() => setShowMaterialModal(false)} className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMaterialSubmit} className="flex-1 overflow-y-auto custom-scrollbar smooth-scroll pr-1.5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Unggah Berkas PDF Materi</label>
                <label className="border-2 border-dashed border-slate-700/80 hover:border-blue-500/60 rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer bg-slate-950/40 transition group">
                  <input type="file" accept=".pdf" onChange={handleMatPdfChange} className="hidden" />
                  {matPdfFile ? (
                    <div className="text-center space-y-1">
                      <div className="w-10 h-10 rounded-xl bg-blue-950/80 text-blue-400 flex items-center justify-center mx-auto border border-blue-700/50">
                        <FileText className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-white truncate max-w-xs">{matPdfName}</p>
                      <span className="text-[10px] text-emerald-400 font-medium bg-emerald-950/60 px-2 py-0.5 rounded">Ukuran: {matFileSize}</span>
                    </div>
                  ) : (
                    <div className="text-center space-y-1">
                      <UploadCloud className="w-8 h-8 text-slate-500 group-hover:text-blue-400 mx-auto transition" />
                      <p className="text-xs font-semibold text-slate-300">Pilih berkas PDF bahan ajar</p>
                    </div>
                  )}
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Judul Bahan Ajar <span className="text-rose-400">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Modul Bab 3 Teorema Pythagoras"
                  value={matTitle}
                  onChange={e => setMatTitle(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Mata Pelajaran</label>
                <select
                  value={matSubject}
                  onChange={e => setMatSubject(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  {allSubjectOptions.map(sb => (
                    <option key={sb} value={sb}>{sb}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Deskripsi Singkat</label>
                <textarea
                  rows={2}
                  placeholder="Penjelasan ringkas isi modul materi..."
                  value={matDesc}
                  onChange={e => setMatDesc(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800/80 shrink-0 sticky bottom-0 bg-slate-900 pb-1">
                <button type="button" onClick={() => setShowMaterialModal(false)} className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 bg-slate-800/80 hover:bg-slate-700 cursor-pointer">
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition cursor-pointer"
                >
                  {isUploading ? "Sedang Menyimpan..." : "Simpan Bahan Ajar"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: TAMBAH QUIZ MANUAL                                               */}
      {/* ========================================================================= */}
      {showQuizModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl p-6 shadow-2xl text-slate-200 relative my-8 max-h-[90vh] flex flex-col"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-5 shrink-0">
              <div className="flex items-center gap-2.5">
                <Award className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Buat Quiz / Ujian Baru</h3>
              </div>
              <button onClick={() => setShowQuizModal(false)} className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddQuizSubmit} className="flex-1 overflow-y-auto custom-scrollbar smooth-scroll pr-1.5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Judul Quiz / Ujian</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Quiz Harian Matematika"
                    value={quizTitle}
                    onChange={e => setQuizTitle(e.target.value)}
                    className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Mata Pelajaran</label>
                  <select
                    value={quizSubject}
                    onChange={e => setQuizSubject(e.target.value)}
                    className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white"
                  >
                    {allSubjectOptions.map(sb => (
                      <option key={sb} value={sb}>{sb}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tipe Penilaian</label>
                  <select
                    value={quizType}
                    onChange={e => setQuizType(e.target.value as any)}
                    className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white"
                  >
                    <option value="quiz">Quiz Singkat</option>
                    <option value="ujian">Ujian Akhir / PTS</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Durasi (Menit)</label>
                  <input
                    type="number"
                    min="5"
                    value={quizDuration}
                    onChange={e => setQuizDuration(Number(e.target.value))}
                    className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white"
                  />
                </div>
              </div>

              {/* Questions List & Builder */}
              <div className="pt-2 border-t border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Daftar Soal ({quizQuestions.length})</span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto p-3 bg-slate-950/60 rounded-2xl border border-slate-800/60 custom-scrollbar">
                  {quizQuestions.map((q, idx) => (
                    <div key={q.id || idx} className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-xs flex justify-between gap-2">
                      <div className="space-y-1">
                        <p className="font-semibold text-white">{idx + 1}. {q.questionText}</p>
                        <p className="text-[10px] text-emerald-400">Kunci: Pilihan {String.fromCharCode(65 + q.correctAnswerIndex)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setQuizQuestions(quizQuestions.filter((_, i) => i !== idx))}
                        className="text-rose-400 hover:text-rose-300 text-xs cursor-pointer"
                      >
                        Hapus
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add new question box */}
                <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800/80 space-y-2">
                  <span className="text-[11px] font-bold text-slate-300">+ Tambah Butir Soal</span>
                  <input
                    type="text"
                    placeholder="Tuliskan pertanyaan..."
                    value={newQuestionText}
                    onChange={e => setNewQuestionText(e.target.value)}
                    className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-white"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" placeholder="Pilihan A" value={optA} onChange={e => setOptA(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white" />
                    <input type="text" placeholder="Pilihan B" value={optB} onChange={e => setOptB(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white" />
                    <input type="text" placeholder="Pilihan C" value={optC} onChange={e => setOptC(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white" />
                    <input type="text" placeholder="Pilihan D" value={optD} onChange={e => setOptD(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white" />
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-400">Kunci Jawaban:</span>
                      <select value={correctIdx} onChange={e => setCorrectIdx(Number(e.target.value))} className="bg-slate-800 text-white rounded px-2 py-1 text-xs">
                        <option value={0}>A</option>
                        <option value={1}>B</option>
                        <option value={2}>C</option>
                        <option value={3}>D</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddQuestionToQuiz}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      + Tambahkan Soal
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800/80 shrink-0 sticky bottom-0 bg-slate-900 pb-1">
                <button type="button" onClick={() => setShowQuizModal(false)} className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 bg-slate-800 cursor-pointer">
                  Batal
                </button>
                <button type="submit" className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 cursor-pointer">
                  Simpan Quiz
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: TAMBAH VIDEO PEMBELAJARAN                                        */}
      {/* ========================================================================= */}
      {showVideoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl text-slate-200 relative my-8 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4 shrink-0">
              <h3 className="text-base font-bold text-white">Tambah Video Pembelajaran</h3>
              <button onClick={() => setShowVideoModal(false)} className="p-1 rounded-lg bg-slate-800 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleAddVideoSubmit} className="flex-1 overflow-y-auto custom-scrollbar smooth-scroll pr-1.5 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Judul Video</label>
                <input type="text" required placeholder="Contoh: Eksperimen Gaya Gravitasi" value={vidTitle} onChange={e => setVidTitle(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Tautan / URL YouTube atau Google Drive</label>
                <input type="url" required placeholder="https://www.youtube.com/watch?v=..." value={vidUrlInput} onChange={e => setVidUrlInput(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Mata Pelajaran</label>
                  <select value={vidSubject} onChange={e => setVidSubject(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white">
                    {allSubjectOptions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Estimasi Durasi</label>
                  <input type="text" placeholder="12:30" value={vidDuration} onChange={e => setVidDuration(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Deskripsi Video</label>
                <textarea rows={2} placeholder="Penjelasan singkat video..." value={vidDesc} onChange={e => setVidDesc(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white" />
              </div>
              <div className="flex justify-end gap-2 pt-2 shrink-0 sticky bottom-0 bg-slate-900 pb-1">
                <button type="button" onClick={() => setShowVideoModal(false)} className="px-4 py-2 rounded-xl text-xs bg-slate-800 cursor-pointer">Batal</button>
                <button type="submit" className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white cursor-pointer">Simpan Video</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: TAMBAH SISWA MANUAL                                              */}
      {/* ========================================================================= */}
      {showGenerateSiswaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl text-slate-200 relative my-8 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4 shrink-0">
              <h3 className="text-base font-bold text-white">Buat Akun Siswa Baru</h3>
              <button onClick={() => { setShowGenerateSiswaModal(false); setCreatedSiswaCredential(null); }} className="p-1 rounded-lg bg-slate-800 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>

            {createdSiswaCredential ? (
              <div className="space-y-4 overflow-y-auto custom-scrollbar flex-1 pr-1">
                <div className="p-4 bg-emerald-950/60 border border-emerald-800 rounded-2xl text-xs space-y-2">
                  <p className="font-bold text-emerald-300">✅ Akun Berhasil Dibuat!</p>
                  <p className="text-slate-300">Nama: <strong>{createdSiswaCredential.name}</strong></p>
                  <p className="text-slate-300">NISN / Username: <strong className="font-mono">{createdSiswaCredential.username}</strong></p>
                  <p className="text-slate-300">Password: <strong className="font-mono">{createdSiswaCredential.password}</strong></p>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`Akun Siswa:\nNama: ${createdSiswaCredential.name}\nUsername/NISN: ${createdSiswaCredential.username}\nPassword: ${createdSiswaCredential.password}`);
                    setIsCopied(true);
                    setTimeout(() => setIsCopied(false), 2000);
                  }}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{isCopied ? 'Tersalin ke Clipboard!' : 'Salin Info Akun'}</span>
                </button>
                <button
                  onClick={() => setCreatedSiswaCredential(null)}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  + Tambah Siswa Lain
                </button>
              </div>
            ) : (
              <form onSubmit={handleGenerateStudentSubmit} className="flex-1 overflow-y-auto custom-scrollbar smooth-scroll pr-1.5 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Nama Lengkap Siswa</label>
                  <input type="text" required placeholder="Contoh: Ahmad Fauzan" value={genSiswaName} onChange={e => setGenSiswaName(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">NISN / No. Induk (Username Login)</label>
                  <input type="text" required placeholder="Contoh: 0081234567" value={genSiswaNisn} onChange={e => setGenSiswaNisn(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Kelas</label>
                  <input type="text" placeholder="Contoh: Kelas XI IPA 1" value={genSiswaClass} onChange={e => setGenSiswaClass(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Password Awal</label>
                  <input type="text" placeholder="123456" value={genSiswaPassword} onChange={e => setGenSiswaPassword(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white" />
                </div>
                <div className="flex justify-end gap-2 pt-2 shrink-0 sticky bottom-0 bg-slate-900 pb-1">
                  <button type="button" onClick={() => setShowGenerateSiswaModal(false)} className="px-4 py-2 rounded-xl text-xs bg-slate-800 cursor-pointer">Batal</button>
                  <button type="submit" className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer">Simpan Akun Siswa</button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: UPLOAD EXCEL SISWA                                               */}
      {/* ========================================================================= */}
      {showUploadSiswaExcelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl text-slate-200 relative my-8 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4 shrink-0">
              <h3 className="text-base font-bold text-white">Upload Data Siswa (.xlsx)</h3>
              <button onClick={() => setShowUploadSiswaExcelModal(false)} className="p-1 rounded-lg bg-slate-800 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar smooth-scroll pr-1.5">
              <p className="text-xs text-slate-400">
                Unggah berkas Excel dengan header kolom <strong>Nama Siswa</strong>, <strong>NISN</strong>, dan <strong>Kelas</strong>.
              </p>
              <label className="border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer bg-slate-950/60 transition">
                <input type="file" accept=".xlsx, .xls, .csv" onChange={handleExcelFileUpload} className="hidden" />
                <FileSpreadsheet className="w-10 h-10 text-emerald-400 mb-2" />
                <span className="text-xs font-bold text-white">Klik untuk memilih file Excel</span>
                <span className="text-[10px] text-slate-500">.xlsx / .xls</span>
              </label>
              <div className="flex justify-end pt-2">
                <button onClick={() => setShowUploadSiswaExcelModal(false)} className="px-4 py-2 rounded-xl text-xs bg-slate-800 cursor-pointer">Tutup</button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 7: EDIT SISWA                                                       */}
      {/* ========================================================================= */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl text-slate-200 relative my-8 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4 shrink-0">
              <h3 className="text-base font-bold text-white">Edit Data Siswa</h3>
              <button onClick={() => setEditingStudent(null)} className="p-1 rounded-lg bg-slate-800 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const updated: UserProfile = {
                ...editingStudent,
                name: editName,
                identifierNumber: editNisn,
                departmentOrClass: editClass,
                status: editStatus
              };
              await updateUserInDb(updated);
              setStudentsList(prev => prev.map(s => s.id === updated.id ? updated : s));
              setEditingStudent(null);
              triggerToast('Data siswa berhasil diperbarui!');
            }} className="flex-1 overflow-y-auto custom-scrollbar smooth-scroll pr-1.5 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nama Siswa</label>
                <input type="text" required value={editName} onChange={e => setEditName(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">NISN / No. Induk</label>
                <input type="text" required value={editNisn} onChange={e => setEditNisn(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Kelas</label>
                <input type="text" value={editClass} onChange={e => setEditClass(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Status Akun</label>
                <select value={editStatus} onChange={e => setEditStatus(e.target.value as any)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white">
                  <option value="active">Aktif</option>
                  <option value="inactive">Nonaktif</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2 shrink-0 sticky bottom-0 bg-slate-900 pb-1">
                <button type="button" onClick={() => setEditingStudent(null)} className="px-4 py-2 rounded-xl text-xs bg-slate-800 cursor-pointer">Batal</button>
                <button type="submit" className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer">Simpan Perubahan</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* OTHER GLOBAL MODALS (Word Quiz Import, Book Reader, Video Player, etc.)   */}
      {/* ========================================================================= */}
      {showWordQuizModal && (
        <WordQuizImportModal
          isOpen={showWordQuizModal}
          onClose={() => setShowWordQuizModal(false)}
          onAddQuiz={onAddQuiz}
          currentUser={currentUser}
          existingSubjects={allSubjectOptions}
        />
      )}

      {selectedDocForReader && (
        <BookReaderModal
          isOpen={Boolean(selectedDocForReader)}
          book={selectedDocForReader}
          onClose={() => setSelectedDocForReader(null)}
          allowDownload={true}
        />
      )}

      {selectedMaterialDetail && (
        <MaterialDetailModal
          isOpen={Boolean(selectedMaterialDetail)}
          material={selectedMaterialDetail}
          onClose={() => setSelectedMaterialDetail(null)}
        />
      )}

      {selectedVideoForPlay && (
        <VideoPlayerModal
          isOpen={Boolean(selectedVideoForPlay)}
          video={selectedVideoForPlay}
          onClose={() => setSelectedVideoForPlay(null)}
        />
      )}

      {showProfileModal && (
        <UserProfileModal
          isOpen={showProfileModal}
          user={currentUser}
          onClose={() => setShowProfileModal(false)}
          onUpdateUser={(up) => {
            if (onUpdateCurrentUser) onUpdateCurrentUser(up);
            setShowProfileModal(false);
          }}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          isOpen={Boolean(deleteTarget)}
          targetTitle={deleteTarget.title}
          targetType={deleteTarget.type}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleExecuteDelete}
        />
      )}

      {successDeletedTarget && (
        <DeleteSuccessModal
          isOpen={Boolean(successDeletedTarget)}
          targetTitle={successDeletedTarget.title}
          targetType={successDeletedTarget.type}
          onClose={() => setSuccessDeletedTarget(null)}
        />
      )}
    </div>
  );
};

export default GuruDashboard;
