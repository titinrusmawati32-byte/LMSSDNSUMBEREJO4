import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import * as XLSX from 'xlsx';
import { 
  GraduationCap, BookOpen, Users, CheckSquare, PlusCircle, LogOut, 
  Clock, Calendar, Award, CheckCircle2, FileText, Send, Sparkles, AlertCircle,
  FileUp, HelpCircle, Book, Video, Upload, Trash2, Eye, Check, Menu, X,
  KeyRound, UserPlus, Bell, Copy, UserCheck, Search, Image as ImageIcon,
  ArrowRight, Plus, FileSpreadsheet, Download, Edit, UploadCloud
} from 'lucide-react';
import { UserProfile, AttendanceRecord, LearningMaterial, QuizExam, DigitalBook, LearningVideo, QuizQuestion, SystemAnnouncement, ClassSchedule, StudentQuizSubmission, SchoolSettings } from '../types';
import { MOCK_COURSES, MOCK_ASSIGNMENTS, MOCK_USERS } from '../data/mockData';
import { subscribeAttendance, updateAttendanceInDb, subscribeUsers, addUserToDb, deleteUserFromDb, updateUserInDb, subscribeSubmissions } from '../lib/lmsDb';
import { DeleteConfirmModal, DeleteSuccessModal } from './DeleteModal';
import { WordQuizImportModal } from './WordQuizImportModal';
import { BookReaderModal } from './BookReaderModal';
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
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

  // Excel Upload state
  const [showUploadSiswaExcelModal, setShowUploadSiswaExcelModal] = useState(false);

  // Student Edit state
  const [editingStudent, setEditingStudent] = useState<UserProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [editNisn, setEditNisn] = useState('');
  const [editClass, setEditClass] = useState('Kelas 5A');
  const [editStatus, setEditStatus] = useState<'active' | 'inactive'>('active');

  // Excel Export State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportClassFilter, setExportClassFilter] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Dynamic list of classes configured by teacher or present in data
  const teacherConfiguredClasses = Array.from(
    new Set([
      ...studentsList.map(s => s.departmentOrClass),
      ...schedules.map(s => s.className),
      currentUser.departmentOrClass
    ].filter(Boolean) as string[])
  ).sort();

  const handleDownloadStudentExcelTemplate = () => {
    const templateRows = [
      {
        'NISN': '0087612301',
        'Nama Lengkap': 'Budi Santoso',
        'Kelas': 'Kelas 5A'
      },
      {
        'NISN': '0087612302',
        'Nama Lengkap': 'Siti Rahmawati',
        'Kelas': 'Kelas 5A'
      },
      {
        'NISN': '0087612303',
        'Nama Lengkap': 'Ahmad Fauzi',
        'Kelas': 'Kelas 5B'
      },
      {
        'NISN': '0087612304',
        'Nama Lengkap': 'Dewi Lestari',
        'Kelas': 'Kelas 6'
      }
    ];

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(templateRows);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template Data Siswa");
    XLSX.writeFile(workbook, "Template_Data_Siswa_SDN_Sumberejo_04.xlsx");
    triggerToast("Berhasil mengunduh Template_Data_Siswa_SDN_Sumberejo_04.xlsx");
  };

  const handleImportStudentExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json<any>(worksheet);

        if (!rows || rows.length === 0) {
          alert("File Excel kosong atau format kolom tidak dikenali.");
          return;
        }

        let importedCount = 0;
        rows.forEach((row, idx) => {
          const nisn = String(row['NISN'] || row['nisn'] || row['Username'] || row['ID Siswa'] || `00876123${idx + 10}`).trim();
          const name = String(row['Nama Lengkap'] || row['Nama'] || row['name'] || row['Nama Siswa'] || '').trim();
          const cls = String(row['Kelas'] || row['Rombel'] || row['departmentOrClass'] || 'Kelas 5A').trim();

          if (name && nisn) {
            const newStudent: UserProfile = {
              id: `usr-siswa-${nisn}-${Date.now()}-${idx}`,
              name: name,
              role: 'siswa',
              avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
              identifierNumber: nisn,
              departmentOrClass: cls,
              lastLogin: 'Diimpor dari Excel',
              status: 'active'
            };

            setStudentsList(prev => [newStudent, ...prev.filter(s => s.identifierNumber !== nisn)]);
            addUserToDb(newStudent);
            importedCount++;
          }
        });

        triggerToast(`Berhasil mengimpor ${importedCount} data siswa dari Excel!`);
        setShowUploadSiswaExcelModal(false);
      } catch (err) {
        console.error('Import error:', err);
        alert('Gagal mengimpor file Excel. Pastikan format file sesuai template.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleOpenEditStudent = (siswa: UserProfile) => {
    setEditingStudent(siswa);
    setEditName(siswa.name);
    setEditNisn(siswa.identifierNumber || '');
    setEditClass(siswa.departmentOrClass || 'Kelas 5A');
    setEditStatus(siswa.status || 'active');
  };

  const handleSaveEditStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent || !editName || !editNisn) return;

    const updated: UserProfile = {
      ...editingStudent,
      name: editName,
      identifierNumber: editNisn,
      departmentOrClass: editClass,
      status: editStatus
    };

    setStudentsList(prev => prev.map(s => s.id === editingStudent.id ? updated : s));
    updateUserInDb(updated);

    if (onUpdateCurrentUser && currentUser.id === editingStudent.id) {
      onUpdateCurrentUser(updated);
    }

    triggerToast(`Data siswa ${editName} berhasil diperbarui!`);
    setEditingStudent(null);
  };

  const handleExportExcel = () => {
    if (!exportClassFilter) {
      alert("Silakan pilih kelas / rombel siswa terlebih dahulu.");
      return;
    }

    setIsExporting(true);
    try {
      const allStudents = studentsList.length > 0 ? studentsList : MOCK_USERS.filter(u => u.role === 'siswa');
      const filteredStudents = exportClassFilter === 'Semua Kelas'
        ? allStudents
        : allStudents.filter(s => (s.departmentOrClass || '').toLowerCase().trim() === exportClassFilter.toLowerCase().trim());

      // 1. Sheet Rekap Nilai Siswa
      const gradesRows = filteredStudents.map((st, idx) => {
        const studentSubs = submissionsList.filter(
          sub => sub.studentId === st.id || sub.studentNisn === st.identifierNumber
        );

        const hasSubmitted = studentSubs.length > 0;
        
        let avgScore = 0;
        let predicate = '-';
        let status = 'BELUM KUMPULKAN';
        let catatan = 'Siswa belum menekan tombol kumpulkan kuis';
        let kuis1: any = 'Belum Mengumpulkan';
        let kuis2: any = 'Belum Mengumpulkan';
        let tugasMandiri: any = 'Belum Mengumpulkan';

        if (hasSubmitted) {
          const totalScore = studentSubs.reduce((acc, curr) => acc + curr.score, 0);
          avgScore = Math.round(totalScore / studentSubs.length);
          predicate = avgScore >= 90 ? 'A (Sangat Baik)' : avgScore >= 80 ? 'B (Baik)' : avgScore >= 70 ? 'C (Cukup)' : 'D (Perlu Bimbingan)';
          status = avgScore >= 75 ? 'TUNTAS' : 'REMIDIAL';
          catatan = avgScore >= 85 ? 'Tuntas & mengumpulkan kuis tepat waktu' : 'Sudah mengumpulkan kuis';
          kuis1 = studentSubs[0] ? studentSubs[0].score : 'Belum Mengumpulkan';
          kuis2 = studentSubs[1] ? studentSubs[1].score : (studentSubs[0] ? studentSubs[0].score : 'Belum Mengumpulkan');
          tugasMandiri = Math.max(75, avgScore);
        }

        return {
          'No': idx + 1,
          'NISN / ID Siswa': st.identifierNumber || `008761230${idx + 1}`,
          'Nama Lengkap Siswa': st.name,
          'Kelas / Rombel': st.departmentOrClass || 'Kelas 5A',
          'Mata Pelajaran': currentUser.departmentOrClass || 'Semua Mata Pelajaran',
          'Kuis 1 (Formatif)': kuis1,
          'Kuis 2 (Sumatif)': kuis2,
          'Tugas Mandiri': tugasMandiri,
          'Rata-Rata Nilai': hasSubmitted ? avgScore : '-',
          'Predikat Capaian': predicate,
          'Status Ketuntasan': status,
          'Catatan Guru': catatan
        };
      });

      // 2. Sheet Data Kuis & Ujian
      const quizzesRows = quizzes.map((qz, idx) => ({
        'No': idx + 1,
        'ID Kuis': qz.id,
        'Judul Evaluasi': qz.title,
        'Mata Pelajaran': qz.subject,
        'Jenis Evaluasi': qz.type === 'ujian' ? 'Ujian Resmi / PAS' : 'Kuis Harian',
        'Jumlah Soal': qz.totalQuestions || qz.questions?.length || 0,
        'Durasi (Menit)': qz.durationMinutes,
        'Batas Waktu': qz.deadline,
        'Guru Pengampu': qz.teacherName || currentUser.name,
        'Status Kuis': qz.status === 'active' ? 'Aktif Terjadwal' : 'Selesai / Ditutup'
      }));

      // 3. Sheet Presensi Siswa
      const attendanceRows = attendanceList.map((att, idx) => ({
        'No': idx + 1,
        'NISN': att.nisn,
        'Nama Siswa': att.studentName,
        'Waktu Presensi': att.time || '07:30 WIB',
        'Status Kehadiran': att.status.toUpperCase()
      }));

      // Build XLSX Workbook
      const workbook = XLSX.utils.book_new();

      const worksheetGrades = XLSX.utils.json_to_sheet(gradesRows);
      XLSX.utils.book_append_sheet(workbook, worksheetGrades, "Rekap Nilai Siswa");

      if (quizzesRows.length > 0) {
        const worksheetQuizzes = XLSX.utils.json_to_sheet(quizzesRows);
        XLSX.utils.book_append_sheet(workbook, worksheetQuizzes, "Data Kuis & Ujian");
      }

      if (attendanceRows.length > 0) {
        const worksheetAttendance = XLSX.utils.json_to_sheet(attendanceRows);
        XLSX.utils.book_append_sheet(workbook, worksheetAttendance, "Rekap Presensi");
      }

      const fileDate = new Date().toISOString().slice(0, 10);
      const cleanClassName = (exportClassFilter || 'Semua_Kelas').replace(/\s+/g, '_');
      const fileName = `Rekap_Nilai_Siswa_SDN_Sumberejo_04_${cleanClassName}_${fileDate}.xlsx`;

      XLSX.writeFile(workbook, fileName);

      triggerToast(`Berhasil mengunduh ${fileName}`);
      setShowExportModal(false);
    } catch (err) {
      console.error('Export error:', err);
      alert('Gagal mengekspor file Excel. Silakan coba lagi.');
    } finally {
      setIsExporting(false);
    }
  };

  // Subscribe to real-time users list and submissions list
  useEffect(() => {
    const unsub = subscribeUsers((users) => {
      const students = (users || []).filter(u => u && u.role === 'siswa');
      setStudentsList(students);
    });
    const unsubSub = subscribeSubmissions((subs) => {
      setSubmissionsList(subs || []);
    });
    return () => {
      unsub();
      unsubSub();
    };
  }, []);

  const handleAutoGenerateNisn = () => {
    const randomNisn = `00${Math.floor(10000000 + Math.random() * 90000000)}`;
    setGenSiswaNisn(randomNisn);
  };

  const handleSaveGenerateSiswa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!genSiswaName || !genSiswaNisn) return;

    const newStudent: UserProfile = {
      id: `usr-siswa-${Date.now()}`,
      name: genSiswaName,
      role: 'siswa',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
      identifierNumber: genSiswaNisn,
      departmentOrClass: genSiswaClass,
      lastLogin: 'Baru saja dibuat oleh Guru',
      status: 'active'
    };

    setStudentsList(prev => [newStudent, ...prev]);
    addUserToDb(newStudent);

    setCreatedSiswaCredential({
      name: genSiswaName,
      username: genSiswaNisn,
      password: genSiswaPassword || '123456',
      className: genSiswaClass
    });

    setShowGenerateSiswaModal(false);
    setGenSiswaName('');
    setGenSiswaNisn('');
    setGenSiswaPassword('123456');
  };

  // Modals state
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [showWordQuizModal, setShowWordQuizModal] = useState(false);
  const [showBookModal, setShowBookModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);

  // Derive subjects directly from active class schedules
  const scheduleSubjects = Array.from(
    new Set(schedules.map(s => s.subject?.trim()).filter(Boolean))
  );

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

  const allSubjectOptions = Array.from(
    new Set([...scheduleSubjects, ...defaultStandardSubjects])
  );

  const defaultInitialSubject = scheduleSubjects[0] || 'Matematika Dasar';

  // Delete Modals state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string; type: string; category: 'material' | 'quiz' | 'book' | 'video' | 'student' } | null>(null);
  const [successDeletedTarget, setSuccessDeletedTarget] = useState<{ title: string; type: string } | null>(null);

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
  const [bookPdfFile, setBookPdfFile] = useState<File | null>(null);
  const [targetPage, setTargetPage] = useState<string>('');
  const [selectedDocForReader, setSelectedDocForReader] = useState<DigitalBook | LearningMaterial | null>(null);

  // Form State - Video Pembelajaran (YouTube / Google Drive URL)
  const [vidTitle, setVidTitle] = useState('');
  const [vidSubject, setVidSubject] = useState(defaultInitialSubject);
  const [vidDuration, setVidDuration] = useState('12:45');
  const [vidUrlInput, setVidUrlInput] = useState('');
  const [vidSourceType, setVidSourceType] = useState<'youtube' | 'gdrive'>('youtube');
  const [vidDesc, setVidDesc] = useState('');

  // Attendance checklist state - dynamically load and sync with Firestore & studentsList
  const [dbAttendanceRecords, setDbAttendanceRecords] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    const unsub = subscribeAttendance((items) => {
      setDbAttendanceRecords(items || []);
    });
    return () => unsub();
  }, []);

  const attendanceList = React.useMemo(() => {
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
      setMatPdfFile(file);
      setMatPdfName(file.name);
      setMatFileSize((file.size / (1024 * 1024)).toFixed(1) + ' MB');
      setMatFileType('PDF');
      if (!matTitle) {
        setMatTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleBookPdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setBookPdfFile(file);
      setBookPdfName(file.name);
      setBookPdfSize((file.size / (1024 * 1024)).toFixed(1) + ' MB');
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

  // Submit Handlers
  const handleAddMaterialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matTitle.trim()) return;
    const newId = 'mat-' + Date.now();
    let fileUrlFromServer: string | undefined = undefined;
    let fileDataStr: string | undefined = undefined;

    if (matPdfFile) {
      try {
        // First save locally to IndexedDB for instant preview/backup
        await savePdfBlob(newId, matPdfFile, matPdfFile.name);
        
        // Convert to base64
        const b64 = await convertFileToBase64(matPdfFile);
        // Only keep in firestore document if it is small enough (<900KB) to prevent document size errors
        if (b64.length < 900000) {
          fileDataStr = b64;
        }

        // Upload to Node/Express backend for multi-device synchronization
        const res = await fetch('/api/upload-pdf', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fileBase64: b64,
            fileName: matPdfFile.name,
            id: newId
          })
        });
        
        if (res.ok) {
          const data = await res.json();
          fileUrlFromServer = data.fileUrl;
        }
      } catch (err) {
        console.warn('Note: Server upload fallback', err);
      }
    }

    const newMat: LearningMaterial = {
      id: newId,
      title: matTitle,
      subject: matSubject,
      fileType: matFileType,
      fileSize: matFileSize,
      uploadDate: 'Hari ini',
      teacherName: currentUser.name,
      description: matDesc || 'Materi ajar dapat dibaca langsung oleh siswa di webapp.',
      downloadCount: 0,
      fileName: matPdfName || (matTitle + '.pdf'),
      fileUrl: fileUrlFromServer,
      fileData: fileDataStr
    };
    onAddMaterial(newMat);
    setShowMaterialModal(false);
    setMatTitle('');
    setMatDesc('');
    setMatPdfName('');
    setMatPdfFile(null);
    triggerToast('Bahan ajar berhasil diunggah dan disimpan!');
  };

  const handleAddQuestionToQuiz = () => {
    if (!newQuestionText.trim() || !optA || !optB || !optC || !optD) {
      alert('Mohon lengkapi teks soal dan seluruh opsi pilihan A, B, C, D.');
      return;
    }
    const q: QuizQuestion = {
      id: 'q-' + Date.now(),
      questionText: newQuestionText,
      options: [optA, optB, optC, optD],
      correctAnswerIndex: correctIdx
    };
    setQuizQuestions([...quizQuestions, q]);
    setNewQuestionText('');
    setOptA('');
    setOptB('');
    setOptC('');
    setOptD('');
  };

  const handleAddQuizSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizTitle.trim()) return;
    if (quizQuestions.length === 0) {
      alert('Tambahkan minimal 1 butir soal untuk quiz/ujian.');
      return;
    }
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
  };

  const handleAddBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookTitle.trim()) return;

    const bookId = 'bk-' + Date.now();
    let fileUrlFromServer: string | undefined = undefined;
    let fileDataStr: string | undefined = undefined;

    if (bookPdfFile) {
      try {
        // Save locally for instant view
        await savePdfBlob(bookId, bookPdfFile, bookPdfName || (bookTitle + '.pdf'));
        
        // Convert to base64
        const b64 = await convertFileToBase64(bookPdfFile);
        // Only keep in firestore document if it is small enough (<900KB) to prevent document size errors
        if (b64.length < 900000) {
          fileDataStr = b64;
        }

        // Upload to server for cross-device access
        const res = await fetch('/api/upload-pdf', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fileBase64: b64,
            fileName: bookPdfFile.name,
            id: bookId
          })
        });

        if (res.ok) {
          const data = await res.json();
          fileUrlFromServer = data.fileUrl;
        }
      } catch (err) {
        console.warn('Failed to save and upload PDF:', err);
      }
    }

    const newBk: DigitalBook = {
      id: bookId,
      title: bookTitle,
      author: bookAuthor || currentUser.name,
      subject: bookSubject,
      coverImage: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=400',
      description: bookDesc || 'E-Book PDF modul acuan pembelajaran siswa.',
      fileSize: bookPdfSize || '15.0 MB',
      rating: 5.0,
      readCount: 0,
      fileName: bookPdfName || (bookTitle + '.pdf'),
      fileUrl: fileUrlFromServer,
      fileData: fileDataStr,
      targetPage: targetPage ? Number(targetPage) : undefined
    };

    onAddBook(newBk);
    setShowBookModal(false);
    setBookTitle('');
    setBookDesc('');
    setBookPdfName('');
    setBookPdfFile(null);
    setTargetPage('');
    triggerToast('Buku digital berhasil diunggah dan disimpan!');
  };

  const handleAddVideoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vidTitle.trim()) return;

    let youtubeId = 'dQw4w9WgXcQ';
    let processedUrl = vidUrlInput.trim();

    // Detect YouTube ID
    const ytMatch = processedUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (ytMatch && ytMatch[1]) {
      youtubeId = ytMatch[1];
    }

    const isDrive = processedUrl.includes('drive.google.com') || vidSourceType === 'gdrive';

    const newVid: LearningVideo = {
      id: 'vid-' + Date.now(),
      title: vidTitle,
      subject: vidSubject,
      duration: vidDuration,
      youtubeId: youtubeId,
      thumbnail: isDrive 
        ? 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=500'
        : `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
      description: vidDesc || 'Video penjelasan materi pembelajaran.',
      teacherName: currentUser.name,
      uploadDate: 'Hari ini',
      viewsCount: 0,
      videoUrl: processedUrl || `https://www.youtube.com/watch?v=${youtubeId}`,
      videoSourceType: isDrive ? 'gdrive' : 'youtube'
    };
    onAddVideo(newVid);
    setShowVideoModal(false);
    setVidTitle('');
    setVidDesc('');
    setVidUrlInput('');
  };

  return (
    <div 
      className="min-h-screen bg-slate-950 dark:bg-slate-950 text-slate-100 flex font-sans relative overflow-x-hidden"
      style={{
        backgroundImage: `linear-gradient(rgba(8, 13, 26, 0.93), rgba(15, 23, 42, 0.97)), url('https://lh3.googleusercontent.com/aida-public/AB6AXuC6YAj07dYxvDUnWm8e1cbxE2UvVKF2Qt__aJ-GUiEFt85J1WnA1ElOlMWHBaNyUUyNwjUTMjr3WVGtptiFQnfkXddxLsXsjYrUH1xmm9VHjSN1qlXP-eKxub1izI-APmVJp4J3W-dgGcOLBvLnvMuulZr7cRLgCk25QyEw66jcGW_phety8dd6R13ew0pvh50UqzDWbODP86YY8IJUXVhUqFgZ8ih87duZSv5TAx43ZCBopAyumazygg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Sidebar Navigation - Left Bar (Desktop & Mobile Drawer) */}
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

          {/* Vertical Menu Navigation Bar */}
          <nav className="flex-grow flex flex-col gap-1.5 overflow-y-auto pr-1 pb-2">
            {/* 1. Dashboard Tab */}
            <button
              onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}
              title="Dashboard Guru"
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
                <BookOpen className="w-4 h-4" />
                {!isSidebarCollapsed && <span>Bahan Ajar</span>}
              </div>
              {!isSidebarCollapsed && (
                <span className={`px-2 py-0.5 text-[10px] rounded-full font-mono font-bold ${
                  activeTab === 'materials' ? 'bg-sky-500/20 text-white' : 'bg-slate-800 text-sky-400'
                }`}>{materials.length}</span>
              )}
            </button>

            {/* 3. Quiz & Ujian Tab */}
            <button
              onClick={() => { setActiveTab('quizzes'); setIsMobileMenuOpen(false); }}
              title="Quiz & Ujian"
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center py-3' : 'justify-between px-3.5 py-2.5'} rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activeTab === 'quizzes'
                  ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/25 font-extrabold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <HelpCircle className="w-4 h-4" />
                {!isSidebarCollapsed && <span>Quiz & Ujian</span>}
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
              title="Video Pembelajaran"
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center py-3' : 'justify-between px-3.5 py-2.5'} rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activeTab === 'videos'
                  ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/25 font-extrabold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Video className="w-4 h-4" />
                {!isSidebarCollapsed && <span>Video</span>}
              </div>
              {!isSidebarCollapsed && (
                <span className={`px-2 py-0.5 text-[10px] rounded-full font-mono font-bold ${
                  activeTab === 'videos' ? 'bg-sky-500/20 text-white' : 'bg-slate-800 text-sky-400'
                }`}>{videos.length}</span>
              )}
            </button>

            {/* 6. Presensi Tab */}
            <button
              onClick={() => { setActiveTab('attendance'); setIsMobileMenuOpen(false); }}
              title="Presensi Kelas"
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center py-3' : 'justify-between px-3.5 py-2.5'} rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activeTab === 'attendance'
                  ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/25 font-extrabold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4" />
                {!isSidebarCollapsed && <span>Presensi</span>}
              </div>
              {!isSidebarCollapsed && <span className={`w-2 h-2 rounded-full ${activeTab === 'attendance' ? 'bg-amber-600' : 'bg-emerald-400'}`} />}
            </button>

            {/* 7. Atur Jadwal Tab */}
            <button
              onClick={() => { setActiveTab('schedules'); setIsMobileMenuOpen(false); }}
              title="Atur Jadwal Mengajar"
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center py-3' : 'justify-between px-3.5 py-2.5'} rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activeTab === 'schedules'
                  ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/25 font-extrabold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4" />
                {!isSidebarCollapsed && <span>Atur Jadwal</span>}
              </div>
              {!isSidebarCollapsed && (
                <span className={`px-2 py-0.5 text-[10px] rounded-full font-mono font-bold ${
                  activeTab === 'schedules' ? 'bg-sky-500/20 text-white' : 'bg-slate-800 text-sky-400'
                }`}>{schedules.length}</span>
              )}
            </button>

            {/* 8. Akses Siswa Tab */}
            <button
              onClick={() => { setActiveTab('students'); setIsMobileMenuOpen(false); }}
              title="Manajemen Akses Siswa"
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center py-3' : 'justify-between px-3.5 py-2.5'} rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activeTab === 'students'
                  ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/25 font-extrabold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <UserCheck className="w-4 h-4" />
                {!isSidebarCollapsed && <span>Akses Siswa</span>}
              </div>
              {!isSidebarCollapsed && (
                <span className={`px-2 py-0.5 text-[10px] rounded-full font-mono font-bold ${
                  activeTab === 'students' ? 'bg-sky-500/20 text-white' : 'bg-slate-800 text-sky-400'
                }`}>{studentsList.length}</span>
              )}
            </button>
          </nav>

          {/* Quick Action Button & Bottom Menu */}
          <div className="pt-4 border-t border-slate-800 space-y-2">
            <button 
              onClick={() => setShowMaterialModal(true)}
              title="Buat Materi Baru"
              className={`w-full bg-blue-600 hover:bg-blue-500 text-white ${isSidebarCollapsed ? 'py-3 px-0 justify-center' : 'py-3.5 px-4 justify-center gap-2'} rounded-full font-bold text-xs shadow-3d active:shadow-3d-pressed flex items-center cursor-pointer transition-all duration-100`}
            >
              <PlusCircle className="w-4 h-4" />
              {!isSidebarCollapsed && <span>Buat Materi Baru</span>}
            </button>

            <button
              onClick={() => setShowProfileModal(true)}
              title="Settings & Profil"
              className={`w-full text-slate-300 hover:bg-slate-800 rounded-full ${isSidebarCollapsed ? 'py-2.5 px-0 justify-center' : 'py-2.5 px-4 gap-3'} font-bold text-xs flex items-center transition-all cursor-pointer`}
            >
              <GraduationCap className="w-4 h-4 text-sky-400" />
              {!isSidebarCollapsed && <span>Settings & Profil</span>}
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

      {/* Overlay Backdrop for Mobile */}
      {isMobileMenuOpen && (
        <div 
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      {/* Main Content Area */}
      <div 
        className="flex-1 flex flex-col min-w-0 min-h-screen"
      >
        {/* TopAppBar */}
        <header className="bg-slate-900/90 backdrop-blur-md sticky top-0 z-30 shadow-sm flex items-center justify-between px-4 sm:px-8 py-3.5 w-full border-b border-slate-800 glass-panel">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden text-slate-200 p-2 rounded-full hover:bg-slate-800 transition-colors"
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

          <div className="flex items-center gap-4 sm:gap-6">
            {/* Search Input */}
            <div className="relative hidden sm:block">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                className="bg-slate-800 text-slate-100 placeholder-slate-500 rounded-full py-2 pl-11 pr-4 border-2 border-slate-700 focus:border-blue-500 focus:ring-0 focus:outline-none w-56 lg:w-64 text-xs font-semibold transition-all" 
                placeholder="Cari materi, kuis..." 
                type="text"
              />
            </div>

            {/* Notification & Export & Help Icons */}
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowExportModal(true)}
                className="text-slate-200 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                title="Ekspor Rekapitulasi Nilai Siswa Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline text-emerald-300">Ekspor Nilai</span>
              </button>

              <button 
                onClick={() => setActiveTab('dashboard')}
                className="text-slate-300 p-2 rounded-full hover:bg-slate-800 transition-colors relative cursor-pointer"
                title="Notifikasi"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-slate-900" />
              </button>
              <button 
                onClick={() => setShowProfileModal(true)}
                className="text-slate-300 p-2 rounded-full hover:bg-slate-800 transition-colors hidden sm:block cursor-pointer"
                title="Bantuan & Profil"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
            </div>

            {/* User Profile Thumbnail */}
            <div className="flex items-center gap-3 border-l-2 border-slate-800 pl-4 sm:pl-6">
              <div className="text-right hidden sm:block">
                <p className="font-bold text-xs text-slate-100">{currentUser.name}</p>
                <p className="text-[11px] font-medium text-emerald-400">{currentUser.departmentOrClass || 'Guru Kelas'}</p>
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

        {/* Main Body Content */}
        <main className="flex-1 p-4 sm:p-8 pb-24 sm:pb-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* TAB 0: DASHBOARD OVERVIEW (Material You Bento Grid) */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Hero Banner with Isometric Illustration & Quick Action Buttons */}
              <section className="glass-card rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 border border-slate-700/60 shadow-lg relative overflow-hidden text-left">
                <div className="absolute -right-20 -top-20 w-64 h-64 bg-sky-500 rounded-full blur-[100px] opacity-20 pointer-events-none" />
                <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-purple-500 rounded-full blur-[100px] opacity-20 pointer-events-none" />
                
                <div className="relative z-10 max-w-2xl text-center md:text-left">
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white mb-3 tracking-tight font-display">
                    Selamat Datang, Bapak <span className="text-sky-400 font-black">{currentUser.name.split(' ')[0] || 'Guru'}</span>! 🌟
                  </h2>
                  <p className="text-sm sm:text-base text-slate-300 mb-6 font-medium leading-relaxed">
                    Siap menginspirasi siswa hari ini? Ada <span className="font-bold text-amber-400">{quizzes.length} kuis aktif</span>, <span className="font-bold text-emerald-400">{materials.length} bahan ajar</span>, dan {announcements.length} pengumuman sekolah yang siap dikelola.
                  </p>

                  <div className="flex flex-wrap gap-3.5 justify-center md:justify-start">
                    <button 
                      onClick={() => setShowMaterialModal(true)}
                      className="btn-gradient-primary text-white px-6 py-3.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md cursor-pointer transition-all active:scale-95"
                    >
                      <FileUp className="w-4 h-4 text-white" />
                      <span>Upload Bahan Ajar</span>
                    </button>

                    <button 
                      onClick={() => setShowWordQuizModal(true)}
                      className="btn-gradient-amber text-slate-950 px-6 py-3.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md cursor-pointer transition-all active:scale-95"
                    >
                      <Sparkles className="w-4 h-4 text-slate-900" />
                      <span>Buat Kuis Baru</span>
                    </button>

                    <button 
                      onClick={() => setShowExportModal(true)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-emerald-600/25 cursor-pointer transition-all active:scale-95 border border-emerald-400/30"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                      <span>Ekspor Nilai (.xlsx)</span>
                    </button>
                  </div>
                </div>

                <div className="relative z-10 hidden md:block shrink-0">
                  <img 
                    className="w-56 h-56 object-contain drop-shadow-md" 
                    alt="Guru SDN Sumberejo 04" 
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDgfWbhUmnoMFHc1pAyqGeocuW2P3wjOxRWIlXUx1SzsEXk-xra7bjwMnVqNxps9_TXENwKY0vOboi2kGeieRwICeb-0P13lfP6sUcOdsiGjGziao2Qy-7CZH73q8kQPzGr1PuDzBZJkugBRaAw2qeBQ56gNyLFUKfUg7nQlcJJ0moA1e8Q2A06KpTgwMwcxOeqr4JGFL5A6Pef-q8v-5aXc3lAnZNw7CILBPweUfAW0mbTbJcVlut1uA"
                  />
                </div>
              </section>

              {/* Dashboard Bento Grid: Real-Time Summary Cards & Announcements */}
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Real-Time Summary Cards Grid (2 cols on lg) */}
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
                  {/* Card 1: Jumlah Materi Aktif */}
                  <div 
                    onClick={() => setActiveTab('materials')}
                    className="glass-panel rounded-3xl p-5 flex flex-col justify-between border border-sky-500/30 shadow-md hover:-translate-y-1 transition-all cursor-pointer group relative overflow-hidden"
                  >
                    <div className="absolute -right-4 -top-4 w-20 h-20 bg-sky-500/15 rounded-full blur-xl group-hover:bg-sky-500/30 transition-all" />
                    <div className="flex justify-between items-start mb-3 relative z-10">
                      <div className="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <span className="flex items-center gap-1.5 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping"></span> Real-Time
                      </span>
                    </div>
                    <div className="relative z-10">
                      <h3 className="text-3xl font-extrabold text-white font-display">
                        {materials.length}
                      </h3>
                      <p className="text-xs text-slate-300 font-bold mt-1">
                        Jumlah Materi Aktif
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Modul & bahan ajar terbit
                      </p>
                    </div>
                    <div className="mt-4 w-full bg-slate-800 rounded-full h-2 overflow-hidden relative z-10">
                      <div className="bg-sky-500 h-full rounded-full w-4/5" />
                    </div>
                  </div>

                  {/* Card 2: Jumlah Kuis & Ujian Aktif */}
                  <div 
                    onClick={() => setActiveTab('quizzes')}
                    className="glass-panel rounded-3xl p-5 flex flex-col justify-between border border-amber-500/30 shadow-md hover:-translate-y-1 transition-all cursor-pointer group relative overflow-hidden"
                  >
                    <div className="absolute -right-4 -top-4 w-20 h-20 bg-amber-500/15 rounded-full blur-xl group-hover:bg-amber-500/30 transition-all" />
                    <div className="flex justify-between items-start mb-3 relative z-10">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                        <CheckSquare className="w-5 h-5" />
                      </div>
                      <span className="flex items-center gap-1.5 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span> Real-Time
                      </span>
                    </div>
                    <div className="relative z-10">
                      <h3 className="text-3xl font-extrabold text-white font-display">
                        {quizzes.length}
                      </h3>
                      <p className="text-xs text-slate-300 font-bold mt-1">
                        Jumlah Kuis & Ujian
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Paket kuis & ujian aktif
                      </p>
                    </div>
                    <div className="mt-4 w-full bg-slate-800 rounded-full h-2 overflow-hidden relative z-10">
                      <div className="bg-amber-400 h-full rounded-full w-3/4" />
                    </div>
                  </div>

                  {/* Card 3: Jumlah Siswa Terdaftar */}
                  <div 
                    onClick={() => setActiveTab('siswa')}
                    className="glass-panel rounded-3xl p-5 flex flex-col justify-between border border-emerald-500/30 shadow-md hover:-translate-y-1 transition-all cursor-pointer group relative overflow-hidden"
                  >
                    <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-500/15 rounded-full blur-xl group-hover:bg-emerald-500/30 transition-all" />
                    <div className="flex justify-between items-start mb-3 relative z-10">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                        <GraduationCap className="w-5 h-5" />
                      </div>
                      <span className="flex items-center gap-1.5 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> Real-Time
                      </span>
                    </div>
                    <div className="relative z-10">
                      <h3 className="text-3xl font-extrabold text-white font-display">
                        {studentsList.length}
                      </h3>
                      <p className="text-xs text-slate-300 font-bold mt-1">
                        Siswa Terdaftar
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Peserta didik aktif
                      </p>
                    </div>
                    <div className="mt-4 w-full bg-slate-800 rounded-full h-2 overflow-hidden relative z-10">
                      <div className="bg-emerald-400 h-full rounded-full w-full" />
                    </div>
                  </div>
                </div>

                {/* Announcements Card */}
                <div className="glass-panel rounded-3xl p-6 border border-blue-100 dark:border-slate-800 shadow-md flex flex-col text-left">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Bell className="w-5 h-5 text-amber-500" />
                      Pengumuman
                    </h3>
                    <span className="text-xs font-bold text-sky-500 dark:text-blue-400">
                      {announcements.length} Baru
                    </span>
                  </div>

                  <div className="flex flex-col gap-3 overflow-y-auto max-h-64 pr-1">
                    {announcements.length > 0 ? (
                      announcements.map((anc) => (
                        <div 
                          key={anc.id}
                          className="bg-blue-50/70 dark:bg-slate-800/70 rounded-2xl p-3.5 border border-blue-100 dark:border-slate-700/60 hover:bg-blue-100/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="w-2 h-2 rounded-full bg-rose-500" />
                            <span className="font-bold text-[10px] text-slate-500 dark:text-slate-400">{anc.date}</span>
                          </div>
                          <h4 className="font-bold text-xs text-white dark:text-slate-100 mb-0.5">{anc.title}</h4>
                          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">{anc.content}</p>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-xs text-slate-500">
                        Belum ada pengumuman baru.
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* Quick Navigation Menu Grid */}
              <div className="pt-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-sky-500" />
                  Menu Navigasi Cepat Guru
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div onClick={() => setActiveTab('materials')} className="glass-panel rounded-2xl p-4 flex flex-col items-center text-center cursor-pointer hover:scale-105 transition-all group border border-blue-100 dark:border-slate-800 shadow-sm">
                    <div className="w-12 h-12 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-xs text-slate-900 dark:text-white">Bahan Ajar</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">{materials.length} Materi</span>
                  </div>

                  <div onClick={() => setActiveTab('quizzes')} className="glass-panel rounded-2xl p-4 flex flex-col items-center text-center cursor-pointer hover:scale-105 transition-all group border border-amber-100 dark:border-slate-800 shadow-sm">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
                      <HelpCircle className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-xs text-slate-900 dark:text-white">Quiz & Ujian</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">{quizzes.length} Aktif</span>
                  </div>

                  <div onClick={() => setActiveTab('books')} className="glass-panel rounded-2xl p-4 flex flex-col items-center text-center cursor-pointer hover:scale-105 transition-all group border border-indigo-100 dark:border-slate-800 shadow-sm">
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
                      <Book className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-xs text-slate-900 dark:text-white">Buku Digital</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">{books.length} Buku</span>
                  </div>

                  <div onClick={() => setActiveTab('videos')} className="glass-panel rounded-2xl p-4 flex flex-col items-center text-center cursor-pointer hover:scale-105 transition-all group border border-emerald-100 dark:border-slate-800 shadow-sm">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
                      <Video className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-xs text-slate-900 dark:text-white">Ruang Video</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">{videos.length} Video</span>
                  </div>

                  <div onClick={() => setActiveTab('schedules')} className="glass-panel rounded-2xl p-4 flex flex-col items-center text-center cursor-pointer hover:scale-105 transition-all group border border-purple-100 dark:border-slate-800 shadow-sm">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-xs text-slate-900 dark:text-white">Jadwal Kelas</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">Atur Agenda</span>
                  </div>

                  <div onClick={() => setActiveTab('students')} className="glass-panel rounded-2xl p-4 flex flex-col items-center text-center cursor-pointer hover:scale-105 transition-all group border border-rose-100 dark:border-slate-800 shadow-sm">
                    <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
                      <GraduationCap className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-xs text-slate-900 dark:text-white">Mata Pelajaran</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">Siswa & Kelas</span>
                  </div>
                </div>
              </div>

            </div>
          )}


        {/* TAB CONTENT: BAHAN AJAR */}
        {activeTab === 'materials' && (
          <div className="space-y-6">
            <FeatureHeaderBanner
              tagIcon={<BookOpen className="w-3.5 h-3.5" />}
              tagText="Bahan Ajar & Modul Belajar Siswa"
              title="Kelola Bahan Ajar & Modul Digital"
              description="Upload modul pelajaran, slide presentasi, dan ringkasan materi format PDF. Bahan ajar yang diunggah langsung tersinkronisasi dan dapat dibaca oleh siswa di webapp."
              actionButton={
                <button
                  onClick={() => setShowMaterialModal(true)}
                  className="px-5 py-3.5 btn-gradient-primary text-white rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer shrink-0"
                >
                  <Plus className="w-5 h-5 stroke-[3]" />
                  <span>Upload Bahan Ajar</span>
                </button>
              }
              stats={[
                { label: 'Total Bahan Ajar', value: materials.length, sublabel: 'Modul' },
                { label: 'Mata Pelajaran', value: new Set(materials.map(m => m.subject)).size, sublabel: 'Mapel Aktif' },
                { label: 'Format Modul', value: 'PDF Webapp' },
                { label: 'Status Sinkronisasi', value: 'Tersambung Siswa', statusDot: true }
              ]}
            />

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Daftar Bahan Ajar Yang Terpublikasi</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Modul, PPT, dan ringkasan yang siap diakses dan dibaca oleh siswa</p>
              </div>
              <span className="text-xs font-bold text-sky-500 dark:text-blue-400">
                {materials.length} Berkas Aktif
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {materials.map((mat) => (
                <div key={mat.id} className="bg-slate-900/90 border-2 border-emerald-500/35 hover:border-emerald-400/90 rounded-2xl p-5 space-y-3 shadow-lg hover:shadow-emerald-500/10 transition-all flex flex-col justify-between group">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/30">
                        {mat.fileType} • {mat.fileSize}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400">{mat.uploadDate}</span>
                        <button
                          onClick={() => setDeleteTarget({ id: mat.id, title: mat.title, type: 'Bahan Ajar', category: 'material' })}
                          className="p-1 rounded-lg text-rose-400 hover:bg-rose-900/30 transition-colors"
                          title="Hapus Bahan Ajar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <h4 className="font-bold text-slate-100 text-sm line-clamp-2 group-hover:text-emerald-300 transition-colors">{mat.title}</h4>
                    <p className="text-xs text-slate-300 line-clamp-2">{mat.description}</p>
                    {mat.fileName && (
                      <p className="text-[11px] text-emerald-300 font-mono bg-emerald-950/40 px-2 py-1 rounded-lg border border-emerald-500/25 line-clamp-1">
                        📄 {mat.fileName}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 gap-2">
                    <span className="text-emerald-400 font-semibold truncate">{mat.subject}</span>
                    <button
                      onClick={() => setSelectedDocForReader(mat)}
                      className="px-3 py-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border border-emerald-500/40 hover:border-emerald-600"
                      title="Pratinjau membaca bahan ajar langsung di webapp"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Baca di Webapp</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB CONTENT: QUIZ & UJIAN */}
        {activeTab === 'quizzes' && (
          <div className="space-y-6">
            <FeatureHeaderBanner
              tagIcon={<Sparkles className="w-3.5 h-3.5" />}
              tagText="Evaluasi & Bank Soal Interaktif"
              title="Bank Soal, Quiz & Ujian Siswa"
              description="Kelola soal evaluasi pilihan ganda secara mandiri atau gunakan AI Generator untuk mengimpor dari naskah Word (.docx) dan foto lembar soal bergambar."
              secondaryActionButton={
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowExportModal(true)}
                    className="px-4 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all border border-emerald-400/30 shadow-md cursor-pointer shrink-0"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                    <span>Ekspor Nilai Excel</span>
                  </button>
                  <button
                    onClick={() => setShowWordQuizModal(true)}
                    className="px-4 py-3.5 bg-white/20 hover:bg-white/30 text-white rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 backdrop-blur-md transition-all border border-white/20 cursor-pointer shrink-0"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Impor Naskah / AI</span>
                  </button>
                </div>
              }
              actionButton={
                <button
                  onClick={() => setShowQuizModal(true)}
                  className="px-5 py-3.5 btn-gradient-primary text-white rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer shrink-0"
                >
                  <Plus className="w-5 h-5 stroke-[3]" />
                  <span>Buat Kuis Manual</span>
                </button>
              }
              stats={[
                { label: 'Total Kuis & Ujian', value: quizzes.length, sublabel: 'Paket Soal' },
                { label: 'Soal Bergambar AI', value: quizzes.filter(q => q.questions?.some(qu => !!qu.imageUrl)).length, sublabel: 'Kuis Visual' },
                { label: 'Sistem Penilaian', value: 'Koreksi Otomatis' },
                { label: 'Status Sinkronisasi', value: 'Tersambung Siswa', statusDot: true }
              ]}
            />

            {/* Unified Action Card: AI Word & Image Quiz Import with Post-Extraction Editor */}
            <div className="bg-slate-900/90 border-2 border-indigo-500/40 rounded-3xl p-5 md:p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/30">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-slate-100 text-base md:text-lg">
                      Impor & Upload Naskah Soal (Word, Foto Soal & Diagram AI)
                    </h4>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Otomatis + Menu Edit Soal
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1.5 max-w-2xl leading-relaxed">
                    Unggah naskah dokumen Word (<span className="text-indigo-300 font-semibold">.docx</span>) atau foto soal bergambar/diagram (<span className="text-purple-300 font-semibold">AI Vision</span>). Setelah diekstrak, Anda langsung diarahkan ke <strong>Menu Edit Soal</strong> untuk meninjau dan menyesuaikan pertanyaan, gambar, serta kunci jawaban.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowWordQuizModal(true)}
                className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold flex items-center gap-2.5 shadow-lg shadow-indigo-600/30 transition-all shrink-0 w-full md:w-auto justify-center cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Buka Menu Impor & Edit Soal</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div>
                <h3 className="font-bold text-slate-100 text-base">Daftar Quiz & Ujian Terjadwal</h3>
                <p className="text-xs text-slate-400">Kelola soal evaluasi pilihan ganda dengan durasi waktu otomatis</p>
              </div>
              <span className="text-xs font-bold text-amber-400">
                {quizzes.length} Kuis Terdaftar
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quizzes.map((qz) => {
                const hasImageQuestions = qz.questions?.some(q => !!q.imageUrl);
                return (
                  <div key={qz.id} className="bg-slate-900/90 border-2 border-amber-500/35 hover:border-amber-400/90 rounded-2xl p-5 space-y-3 shadow-lg hover:shadow-amber-500/10 transition-all group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-bold uppercase text-[10px] border border-amber-500/30">
                          {qz.type} • {qz.durationMinutes} Menit
                        </span>
                        {hasImageQuestions && (
                          <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold text-[10px] border border-purple-500/30 flex items-center gap-1">
                            <ImageIcon className="w-3 h-3" />
                            Soal Bergambar
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {qz.status === 'active' ? 'AKTIF' : 'SELESAI'}
                        </span>
                        <button
                          onClick={() => setDeleteTarget({ id: qz.id, title: qz.title, type: 'Quiz / Ujian', category: 'quiz' })}
                          className="p-1 rounded-lg text-rose-400 hover:bg-rose-900/30 transition-colors"
                          title="Hapus Quiz/Ujian"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-100 text-base group-hover:text-amber-300 transition-colors">{qz.title}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">Mata Pelajaran: {qz.subject}</p>
                      <p className="text-xs text-slate-400 mt-0.5">Batas Pengumpulan: {qz.deadline}</p>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-semibold">{qz.totalQuestions} Butir Soal Pilihan Ganda</span>
                      <span className="text-amber-400 font-medium">Sistem Penilaian Otomatis</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB CONTENT: BUKU DIGITAL */}
        {activeTab === 'books' && (
          <div className="space-y-6">
            <FeatureHeaderBanner
              tagIcon={<Book className="w-3.5 h-3.5" />}
              tagText="Perpustakaan Digital & E-Book"
              title="Perpustakaan Buku Digital Siswa"
              description="Kelola koleksi e-book kurikulum merdeka, modul acuan, dan buku bacaan edukatif yang dapat dibaca langsung oleh seluruh siswa di portal webapp."
              actionButton={
                <button
                  onClick={() => setShowBookModal(true)}
                  className="px-5 py-3.5 btn-gradient-primary text-white rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer shrink-0"
                >
                  <Plus className="w-5 h-5 stroke-[3]" />
                  <span>Upload Buku Digital</span>
                </button>
              }
              stats={[
                { label: 'Total E-Book', value: books.length, sublabel: 'Judul' },
                { label: 'Total Halaman', value: books.reduce((acc, b) => acc + (b.totalPages || 0), 0), sublabel: 'Halaman' },
                { label: 'Format Berkas', value: 'E-Book / PDF' },
                { label: 'Akses Siswa', value: 'Terbuka Penuh', statusDot: true }
              ]}
            />

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-100 text-base">Koleksi Buku Digital Yang Tersedia</h3>
                <p className="text-xs text-slate-400">Buku teks paket kurikulum merdeka dan modul acuan bacaan siswa</p>
              </div>
              <span className="text-xs font-bold text-sky-400">
                {books.length} Buku Terdaftar
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {books.map((bk) => (
                <div key={bk.id} className="bg-slate-900/90 border-2 border-sky-500/35 hover:border-sky-400/90 rounded-2xl p-4 flex gap-4 shadow-lg hover:shadow-sky-500/10 transition-all relative group">
                  <img src={bk.coverImage} alt={bk.title} className="w-20 h-28 object-cover rounded-xl shadow-xs shrink-0 border border-slate-700" />
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-sky-300 uppercase bg-sky-500/15 px-2 py-0.5 rounded-full border border-sky-500/30">{bk.subject}</span>
                      <button
                        onClick={() => setDeleteTarget({ id: bk.id, title: bk.title, type: 'Buku Digital', category: 'book' })}
                        className="p-1 rounded-lg text-rose-400 hover:bg-rose-900/30 transition-colors"
                        title="Hapus Buku"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <h4 className="font-bold text-slate-100 text-xs line-clamp-2 group-hover:text-sky-300 transition-colors">{bk.title}</h4>
                    <p className="text-[11px] text-slate-400">{bk.author}</p>
                    
                    {bk.fileName && (
                      <p className="text-[10px] text-sky-300 bg-sky-950/40 px-2 py-0.5 rounded-lg border border-sky-500/25 font-mono truncate flex items-center justify-between">
                        <span>📄 {bk.fileName}</span>
                        {bk.targetPage && <span className="font-bold text-emerald-400">Hal. {bk.targetPage}</span>}
                      </p>
                    )}

                    <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800">
                      <span>{bk.fileSize}</span>
                      <button
                        onClick={() => setSelectedDocForReader(bk)}
                        className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all shadow-xs cursor-pointer"
                      >
                        <BookOpen className="w-3 h-3" />
                        <span>Baca Buku</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB CONTENT: VIDEO PEMBELAJARAN */}
        {activeTab === 'videos' && (
          <div className="space-y-6">
            <FeatureHeaderBanner
              tagIcon={<Video className="w-3.5 h-3.5" />}
              tagText="Media Animasi & Video Edukasi"
              title="Ruang Video Pembelajaran Siswa"
              description="Unggah dan kelola video rekaman ceramah kelas, pembahasan rumus, dan video animasi simulasi belajar dari Google Drive maupun YouTube."
              actionButton={
                <button
                  onClick={() => setShowVideoModal(true)}
                  className="px-5 py-3.5 btn-gradient-primary text-white rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer shrink-0"
                >
                  <Plus className="w-5 h-5 stroke-[3]" />
                  <span>Upload Video Baru</span>
                </button>
              }
              stats={[
                { label: 'Total Video Aktif', value: videos.length, sublabel: 'Video' },
                { label: 'Sumber Media', value: 'YouTube & Drive' },
                { label: 'Total Ditonton', value: videos.reduce((acc, v) => acc + (v.viewsCount || 0), 0), sublabel: 'x Tayang' },
                { label: 'Akses Siswa', value: 'Siap Diputar', statusDot: true }
              ]}
            />

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-100 text-base">Galeri Video Pembelajaran Interaktif</h3>
                <p className="text-xs text-slate-400">Rekaman ceramah kelas, penjelasan rumus, dan video animasi simulasi</p>
              </div>
              <span className="text-xs font-bold text-rose-400">
                {videos.length} Video Aktif
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {videos.map((vid) => (
                <div key={vid.id} className="bg-slate-900/90 border-2 border-rose-500/35 hover:border-rose-400/90 rounded-2xl overflow-hidden shadow-lg hover:shadow-rose-500/10 transition-all group flex flex-col justify-between">
                  <div>
                    <div className="relative aspect-video bg-slate-950">
                      <img src={vid.thumbnail} alt={vid.title} className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-300" />
                      <span className="absolute bottom-2 right-2 bg-black/80 text-white font-mono text-[10px] px-2 py-0.5 rounded font-bold">
                        {vid.duration}
                      </span>
                      <span className="absolute top-2 left-2 bg-rose-950/80 text-rose-300 border border-rose-500/40 font-bold text-[9px] uppercase px-2 py-0.5 rounded-full shadow-xs">
                        {vid.videoSourceType === 'gdrive' ? 'Google Drive' : 'YouTube'}
                      </span>
                    </div>
                    <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-rose-300 uppercase bg-rose-500/15 px-2 py-0.5 rounded-full border border-rose-500/30">{vid.subject}</span>
                        <button
                          onClick={() => setDeleteTarget({ id: vid.id, title: vid.title, type: 'Video Pembelajaran', category: 'video' })}
                          className="p-1 rounded-lg text-rose-400 hover:bg-rose-900/30 transition-colors"
                          title="Hapus Video"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <h4 className="font-bold text-slate-100 text-xs line-clamp-2 group-hover:text-rose-300 transition-colors">{vid.title}</h4>
                      <p className="text-[11px] text-slate-400 line-clamp-2">{vid.description}</p>
                    </div>
                  </div>
                  <div className="p-4 pt-0 border-t border-slate-800/80 mt-2">
                    <div className="pt-2 flex items-center justify-between text-[10px] text-slate-400">
                      <span>Ditonton {vid.viewsCount}x</span>
                      <span>{vid.uploadDate}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB CONTENT: PRESENSI SISWA */}
        {activeTab === 'attendance' && (
          <div className="space-y-6">
            <FeatureHeaderBanner
              tagIcon={<CheckSquare className="w-3.5 h-3.5" />}
              tagText="Monitoring Presensi & Kehadiran Kelas"
              title="Presensi Harian Siswa"
              description={`Catat dan pantau kehadiran siswa untuk mata pelajaran ${currentUser.departmentOrClass || 'Guru Kelas'} secara real-time. Status presensi akan langsung tersinkronisasi.`}
              stats={[
                { label: 'Total Siswa', value: attendanceList.length, sublabel: 'Tercatat' },
                { label: 'Siswa Hadir', value: attendanceList.filter(a => a.status === 'hadir').length, sublabel: 'Anak' },
                { label: 'Izin / Sakit', value: attendanceList.filter(a => a.status === 'izin' || a.status === 'sakit').length, sublabel: 'Anak' },
                { label: 'Status Sesi', value: '07:30 - 09:30 WIB', statusDot: true }
              ]}
            />

            <div className="bg-slate-900/90 border-2 border-teal-500/35 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-100 text-base">Tabel Absensi Harian Siswa</h3>
                  <p className="text-xs text-slate-400">Mata Pelajaran: {currentUser.departmentOrClass}</p>
                </div>
                <span className="px-3 py-1 bg-teal-500/15 text-teal-300 rounded-lg text-xs font-mono font-bold border border-teal-500/30">
                  07:30 - 09:30 WIB
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-300 font-semibold uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">Siswa</th>
                      <th className="p-3">NISN</th>
                      <th className="p-3">Waktu Masuk</th>
                      <th className="p-3 text-right">Opsi Presensi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {attendanceList.map((st) => (
                      <tr key={st.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="p-3 font-semibold text-slate-100">{st.studentName}</td>
                        <td className="p-3 font-mono text-slate-400">{st.nisn}</td>
                        <td className="p-3 text-slate-400">{st.time}</td>
                        <td className="p-3 text-right">
                          <div className="inline-flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                            {(['hadir', 'izin', 'sakit', 'alpa'] as const).map((s) => (
                              <button
                                key={s}
                                onClick={() => updateAttendance(st.id, s)}
                                className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                                  st.status === s
                                    ? s === 'hadir' ? 'bg-emerald-600 text-white shadow-xs' : s === 'izin' ? 'bg-amber-600 text-white shadow-xs' : s === 'sakit' ? 'bg-blue-600 text-white shadow-xs' : 'bg-rose-600 text-white shadow-xs'
                                    : 'text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB CONTENT: KELOLA & GENERATE SISWA */}
        {activeTab === 'students' && (
          <div className="space-y-6">
            <FeatureHeaderBanner
              tagIcon={<KeyRound className="w-3.5 h-3.5" />}
              tagText="Keamanan & Kredensial Siswa"
              title="Generate & Kelola Akses Siswa"
              description="Buat username / NISN dan password agar siswa dapat login ke portal LMS SD Negeri Sumberejo 04 dan mengakses seluruh materi serta kuis."
              actionButton={
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setShowUploadSiswaExcelModal(true)}
                    className="px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer shrink-0"
                  >
                    <FileSpreadsheet className="w-5 h-5" />
                    <span>Upload Excel Data Siswa</span>
                  </button>
                  <button
                    onClick={() => {
                      handleAutoGenerateNisn();
                      setShowGenerateSiswaModal(true);
                    }}
                    className="px-5 py-3.5 btn-gradient-primary text-white rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer shrink-0"
                  >
                    <Plus className="w-5 h-5 stroke-[3]" />
                    <span>Generate Akses Siswa</span>
                  </button>
                </div>
              }
              stats={[
                { label: 'Total Siswa Terdaftar', value: studentsList.length, sublabel: 'Siswa' },
                { label: 'Akun Aktif', value: studentsList.filter(s => s.status === 'active').length, sublabel: 'Siap Login' },
                { label: 'Kelas Rombel', value: 'Kelas 1 - 6' },
                { label: 'Status Keamanan', value: 'NISN Terverifikasi', statusDot: true }
              ]}
            />

            <div className="bg-slate-900/90 border-2 border-violet-500/35 rounded-2xl p-4 sm:p-6 space-y-4 shadow-xl">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-slate-100 text-base">Daftar Akun & NISN Siswa</h3>
                  <p className="text-xs text-slate-400">Daftar username login dan kelas siswa terdaftar</p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1 sm:w-64">
                    <input
                      type="text"
                      value={studentSearchQuery}
                      onChange={(e) => setStudentSearchQuery(e.target.value)}
                      placeholder="Cari Nama / NISN Siswa..."
                      className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  </div>

                  <button
                    onClick={() => setShowUploadSiswaExcelModal(true)}
                    className="px-3.5 py-2 bg-emerald-700/80 hover:bg-emerald-600 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all shrink-0 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Upload Excel</span>
                  </button>

                  <button
                    onClick={() => {
                      handleAutoGenerateNisn();
                      setShowGenerateSiswaModal(true);
                    }}
                    className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all shrink-0 cursor-pointer"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Generate Akses</span>
                  </button>
                </div>
              </div>

              {/* Students Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-300 font-semibold uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">Siswa</th>
                      <th className="p-3">Username / NISN Login</th>
                      <th className="p-3">Kelas / Rombel</th>
                      <th className="p-3">Status Akun</th>
                      <th className="p-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {studentsList
                      .filter(s => 
                        s.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) || 
                        s.identifierNumber.includes(studentSearchQuery) ||
                        s.departmentOrClass.toLowerCase().includes(studentSearchQuery.toLowerCase())
                      )
                      .map((siswa) => (
                        <tr key={siswa.id} className="hover:bg-slate-800/50 transition-colors">
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <img src={siswa.avatar} alt={siswa.name} className="w-8 h-8 rounded-full object-cover shadow-xs border border-slate-700" />
                              <div>
                                <p className="font-semibold text-slate-100">{siswa.name}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 font-mono font-bold text-violet-400">
                            {siswa.identifierNumber}
                          </td>
                          <td className="p-3 text-slate-300">
                            {siswa.departmentOrClass}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              siswa.status === 'inactive'
                                ? 'bg-slate-700/50 text-slate-400 border border-slate-600'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}>
                              {siswa.status === 'inactive' ? 'Nonaktif' : 'Aktif & Siap Login'}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleOpenEditStudent(siswa)}
                                className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-900/30 rounded-lg transition-colors cursor-pointer"
                                title="Edit Data Siswa & Akses Login"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteTarget({ id: siswa.id, title: siswa.name, type: 'Akun Siswa', category: 'student' })}
                                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-900/30 rounded-lg transition-colors cursor-pointer"
                                title="Hapus Akun Siswa"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    {studentsList.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-400">
                          Belum ada data siswa terdaftar. Klik "Generate Akses Siswa" untuk membuat akun pertama.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 8: ATUR JADWAL PELAJARAN */}
        {activeTab === 'schedules' && (
          <GuruScheduleManager
            currentUser={currentUser}
            schedules={schedules}
            onAddSchedule={onAddSchedule || (() => {})}
            onUpdateSchedule={onUpdateSchedule || (() => {})}
            onDeleteSchedule={onDeleteSchedule || (() => {})}
          />
        )}
        </main>
      </div>

      {/* MODAL 1: UPLOAD BAHAN AJAR */}
      {showMaterialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 space-y-4 text-white shadow-2xl glass-card">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <FileUp className="w-5 h-5 text-emerald-600" />
              <span>Upload Bahan Ajar Baru (PDF)</span>
            </h3>
            <form onSubmit={handleAddMaterialSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Unggah Berkas PDF Bahan Ajar</label>
                <div className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 rounded-2xl p-4 text-center cursor-pointer bg-emerald-50/40 transition-all relative">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleMatPdfChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <Upload className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
                  {matPdfName ? (
                    <div className="text-xs text-emerald-700 font-mono font-bold">
                      <span>📄 {matPdfName}</span>
                      <span className="text-[10px] text-slate-500 block font-normal">Ukuran: {matFileSize}</span>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-semibold text-slate-300">Klik atau seret file PDF ke sini</p>
                      <p className="text-[10px] text-slate-500">Format khusus PDF (Maksimal 20 MB)</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Mata Pelajaran (Sesuai Jadwal Kelas)
                </label>
                <select
                  value={matSubject}
                  onChange={(e) => setMatSubject(e.target.value)}
                  className="w-full bg-slate-800/70 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-white focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {scheduleSubjects.length > 0 && (
                    <optgroup label="📋 Mata Pelajaran Sesuai Jadwal Kelas Aktif">
                      {scheduleSubjects.map(subj => (
                        <option key={`mat-sch-${subj}`} value={subj}>
                          {subj} (Jadwal Kelas)
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="📚 Mata Pelajaran Kurikulum">
                    {allSubjectOptions
                      .filter(subj => !scheduleSubjects.includes(subj))
                      .map(subj => (
                        <option key={`mat-std-${subj}`} value={subj}>
                          {subj}
                        </option>
                      ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Judul Bahan Ajar</label>
                <input
                  type="text"
                  required
                  value={matTitle}
                  onChange={(e) => setMatTitle(e.target.value)}
                  placeholder="Contoh: Modul Bab 4 - Turunan Trigonometri"
                  className="w-full bg-slate-800/70 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Format Berkas</label>
                  <select
                    value={matFileType}
                    onChange={(e) => setMatFileType(e.target.value as any)}
                    className="w-full bg-slate-800/70 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-white focus:bg-slate-800"
                  >
                    <option value="PDF">PDF Dokumentasi</option>
                    <option value="PPT">PPT Slide Presentasi</option>
                    <option value="DOCX">DOCX Word Handout</option>
                    <option value="ZIP">ZIP Arsip Soal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Ukuran Berkas</label>
                  <input
                    type="text"
                    value={matFileSize}
                    onChange={(e) => setMatFileSize(e.target.value)}
                    className="w-full bg-slate-800/70 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-white focus:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Deskripsi Singkat / Instruksi Siswa</label>
                <textarea
                  rows={2}
                  value={matDesc}
                  onChange={(e) => setMatDesc(e.target.value)}
                  placeholder="Instruksi pengerjaan atau garis besar isi modul..."
                  className="w-full bg-slate-800/70 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMaterialModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 bg-slate-800 hover:bg-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
                >
                  Upload & Publikasikan PDF
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: UPLOAD QUIZ / UJIAN */}
      {showQuizModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl p-6 space-y-4 text-white shadow-2xl my-8 glass-card">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-600" />
                <span>Buat & Upload Quiz / Ujian</span>
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setShowQuizModal(false);
                    setShowWordQuizModal(true);
                  }}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-[11px] font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Impor Naskah Word / Foto Soal (AI)</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleAddQuizSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Judul Quiz / Ujian</label>
                  <input
                    type="text"
                    required
                    value={quizTitle}
                    onChange={(e) => setQuizTitle(e.target.value)}
                    placeholder="Contoh: Quiz Harian - Persamaan Trigonometri"
                    className="w-full bg-slate-800/70 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-white focus:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Kategori</label>
                  <select
                    value={quizType}
                    onChange={(e) => setQuizType(e.target.value as any)}
                    className="w-full bg-slate-800/70 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-white focus:bg-slate-800"
                  >
                    <option value="quiz">Quiz Harian</option>
                    <option value="ujian">Ujian Utama</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Mata Pelajaran</label>
                <select
                  value={quizSubject}
                  onChange={(e) => setQuizSubject(e.target.value)}
                  className="w-full bg-slate-800/70 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-white focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {scheduleSubjects.length > 0 && (
                    <optgroup label="📋 Mata Pelajaran Sesuai Jadwal Kelas Aktif">
                      {scheduleSubjects.map(subj => (
                        <option key={`qz-sch-${subj}`} value={subj}>
                          {subj} (Jadwal Kelas)
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="📚 Mata Pelajaran Kurikulum">
                    {allSubjectOptions
                      .filter(subj => !scheduleSubjects.includes(subj))
                      .map(subj => (
                        <option key={`qz-std-${subj}`} value={subj}>
                          {subj}
                        </option>
                      ))}
                  </optgroup>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Durasi (Menit)</label>
                  <input
                    type="number"
                    value={quizDuration}
                    onChange={(e) => setQuizDuration(Number(e.target.value))}
                    className="w-full bg-slate-800/70 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-white focus:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Batas Waktu Pengumpulan</label>
                  <input
                    type="text"
                    value={quizDeadline}
                    onChange={(e) => setQuizDeadline(e.target.value)}
                    className="w-full bg-slate-800/70 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-white focus:bg-slate-800"
                  />
                </div>
              </div>

              {/* Dynamic Question Creator */}
              <div className="p-4 bg-slate-800/70 border border-slate-700/60 rounded-2xl space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase">Tambah Butir Soal ({quizQuestions.length} Soal Tersimpan)</h4>
                <div>
                  <input
                    type="text"
                    value={newQuestionText}
                    onChange={(e) => setNewQuestionText(e.target.value)}
                    placeholder="Tuliskan pertanyaan soal..."
                    className="w-full bg-slate-800/70 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input type="text" value={optA} onChange={(e) => setOptA(e.target.value)} placeholder="Pilihan A" className="bg-slate-800/70 border border-slate-700/60 rounded-lg px-2.5 py-1.5 text-xs text-white" />
                  <input type="text" value={optB} onChange={(e) => setOptB(e.target.value)} placeholder="Pilihan B" className="bg-slate-800/70 border border-slate-700/60 rounded-lg px-2.5 py-1.5 text-xs text-white" />
                  <input type="text" value={optC} onChange={(e) => setOptC(e.target.value)} placeholder="Pilihan C" className="bg-slate-800/70 border border-slate-700/60 rounded-lg px-2.5 py-1.5 text-xs text-white" />
                  <input type="text" value={optD} onChange={(e) => setOptD(e.target.value)} placeholder="Pilihan D" className="bg-slate-800/70 border border-slate-700/60 rounded-lg px-2.5 py-1.5 text-xs text-white" />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-600">Kunci Jawaban:</span>
                    <select
                      value={correctIdx}
                      onChange={(e) => setCorrectIdx(Number(e.target.value))}
                      className="bg-slate-800/70 border border-slate-700/60 rounded px-2 py-1 text-xs text-white"
                    >
                      <option value={0}>Pilihan A</option>
                      <option value={1}>Pilihan B</option>
                      <option value={2}>Pilihan C</option>
                      <option value={3}>Pilihan D</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddQuestionToQuiz}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm"
                  >
                    + Masukkan Soal
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuizModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 bg-slate-800 hover:bg-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-sm"
                >
                  Simpan & Rilis Quiz
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: UPLOAD BUKU DIGITAL */}
      {showBookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 space-y-4 text-white shadow-2xl glass-card max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-white text-lg font-display flex items-center gap-2">
              <Book className="w-5 h-5 text-indigo-400" />
              <span>Tambah Buku Digital</span>
            </h3>

            <form onSubmit={handleAddBookSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Unggah Berkas PDF Buku Digital</label>
                <div className="border-2 border-dashed border-indigo-400/50 hover:border-indigo-400 rounded-2xl p-4 text-center cursor-pointer bg-indigo-500/5 transition-all relative">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleBookPdfChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <Upload className="w-6 h-6 text-indigo-400 mx-auto mb-2" />
                  {bookPdfName ? (
                    <div className="text-xs text-indigo-300 font-mono font-bold">
                      <span>📄 {bookPdfName}</span>
                      <span className="text-[10px] text-slate-400 block font-normal">Ukuran: {bookPdfSize}</span>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-semibold text-slate-300">Klik atau seret file PDF E-Book ke sini</p>
                      <p className="text-[10px] text-slate-500">Format khusus PDF (Maksimal 50 MB)</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Judul Buku Teks</label>
                <input
                  type="text"
                  required
                  value={bookTitle}
                  onChange={(e) => setBookTitle(e.target.value)}
                  placeholder="Contoh: Buku Paket Tematik / Sains SD"
                  className="w-full bg-slate-800/70 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-white focus:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Mata Pelajaran (Sesuai Jadwal Kelas)</label>
                <select
                  value={bookSubject}
                  onChange={(e) => setBookSubject(e.target.value)}
                  className="w-full bg-slate-800/70 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-white focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {scheduleSubjects.length > 0 && (
                    <optgroup label="📋 Mata Pelajaran Sesuai Jadwal Kelas Aktif">
                      {scheduleSubjects.map(subj => (
                        <option key={`bk-sch-${subj}`} value={subj}>
                          {subj} (Jadwal Kelas)
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="📚 Mata Pelajaran Kurikulum">
                    {allSubjectOptions
                      .filter(subj => !scheduleSubjects.includes(subj))
                      .map(subj => (
                        <option key={`bk-std-${subj}`} value={subj}>
                          {subj}
                        </option>
                      ))}
                  </optgroup>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Penulis / Penerbit</label>
                  <input
                    type="text"
                    value={bookAuthor}
                    onChange={(e) => setBookAuthor(e.target.value)}
                    className="w-full bg-slate-800/70 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-white focus:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Target Halaman Buku (Sesuai Cetakan Buku)</label>
                  <input
                    type="number"
                    min="1"
                    value={targetPage}
                    onChange={(e) => setTargetPage(e.target.value)}
                    placeholder="Contoh: 28"
                    className="w-full bg-slate-800/70 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-white focus:bg-slate-800"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Nomor halaman yang tercetak di buku fisik (misal: 28).</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Deskripsi Ringkas</label>
                <textarea
                  rows={2}
                  value={bookDesc}
                  onChange={(e) => setBookDesc(e.target.value)}
                  placeholder="Rangkuman isi buku teks..."
                  className="w-full bg-slate-800/70 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-white focus:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBookModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 bg-slate-800 hover:bg-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm"
                >
                  Simpan Buku PDF Ke Perpustakaan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: UPLOAD VIDEO PEMBELAJARAN */}
      {showVideoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 space-y-4 text-white shadow-2xl glass-card">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Video className="w-5 h-5 text-purple-600" />
              <span>Upload Video Pembelajaran (YouTube / Google Drive)</span>
            </h3>
            <form onSubmit={handleAddVideoSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Pilih Sumber Video</label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setVidSourceType('youtube')}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
                      vidSourceType === 'youtube'
                        ? 'bg-red-50 text-red-700 border-red-200 font-bold'
                        : 'bg-slate-800/70 text-slate-600 border-slate-700/60'
                    }`}
                  >
                    <Video className="w-4 h-4" /> Link YouTube
                  </button>
                  <button
                    type="button"
                    onClick={() => setVidSourceType('gdrive')}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
                      vidSourceType === 'gdrive'
                        ? 'bg-blue-50 text-blue-700 border-blue-200 font-bold'
                        : 'bg-slate-800/70 text-slate-600 border-slate-700/60'
                    }`}
                  >
                    <FileText className="w-4 h-4" /> Link Google Drive
                  </button>
                </div>

                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  URL / Tautan Video ({vidSourceType === 'youtube' ? 'Link YouTube' : 'Link Google Drive'})
                </label>
                <input
                  type="url"
                  required
                  value={vidUrlInput}
                  onChange={(e) => setVidUrlInput(e.target.value)}
                  placeholder={
                    vidSourceType === 'youtube'
                      ? "https://www.youtube.com/watch?v=..."
                      : "https://drive.google.com/file/d/.../view"
                  }
                  className="w-full bg-slate-800/70 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Judul Video Pembelajaran</label>
                <input
                  type="text"
                  required
                  value={vidTitle}
                  onChange={(e) => setVidTitle(e.target.value)}
                  placeholder="Contoh: Panduan Trik Cepat Rumus Trigonometri"
                  className="w-full bg-slate-800/70 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-white focus:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Mata Pelajaran (Sesuai Jadwal Kelas)</label>
                  <select
                    value={vidSubject}
                    onChange={(e) => setVidSubject(e.target.value)}
                    className="w-full bg-slate-800/70 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-white focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {scheduleSubjects.length > 0 && (
                      <optgroup label="📋 Mata Pelajaran Sesuai Jadwal Kelas Aktif">
                        {scheduleSubjects.map(subj => (
                          <option key={`vid-sch-${subj}`} value={subj}>
                            {subj} (Jadwal Kelas)
                          </option>
                        ))}
                      </optgroup>
                    )}
                    <optgroup label="📚 Mata Pelajaran Kurikulum">
                      {allSubjectOptions
                        .filter(subj => !scheduleSubjects.includes(subj))
                        .map(subj => (
                          <option key={`vid-std-${subj}`} value={subj}>
                            {subj}
                          </option>
                        ))}
                    </optgroup>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Durasi Video</label>
                  <input
                    type="text"
                    value={vidDuration}
                    onChange={(e) => setVidDuration(e.target.value)}
                    placeholder="14:25"
                    className="w-full bg-slate-800/70 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-white focus:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Deskripsi Ringkas Video</label>
                <textarea
                  rows={2}
                  value={vidDesc}
                  onChange={(e) => setVidDesc(e.target.value)}
                  placeholder="Rangkuman konsep video..."
                  className="w-full bg-slate-800/70 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-white focus:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowVideoModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 bg-slate-800 hover:bg-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-sm"
                >
                  Publikasikan Video
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Generate Username / NISN Siswa */}
      {showGenerateSiswaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 space-y-4 text-white shadow-2xl glass-card">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Generate Username & Akses Siswa</h3>
                <p className="text-xs text-slate-500">Buat identitas NISN & akun siswa agar bisa login ke portal</p>
              </div>
            </div>

            <form onSubmit={handleSaveGenerateSiswa} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nama Lengkap Siswa</label>
                <input
                  type="text"
                  required
                  value={genSiswaName}
                  onChange={(e) => setGenSiswaName(e.target.value)}
                  placeholder="Contoh: Bintang Pratama"
                  className="w-full bg-slate-800/70 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-300">Username / NISN Siswa</label>
                  <button
                    type="button"
                    onClick={handleAutoGenerateNisn}
                    className="text-[11px] font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" /> Auto-Generate NISN
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={genSiswaNisn}
                  onChange={(e) => setGenSiswaNisn(e.target.value)}
                  placeholder="Contoh: 0078491820 atau username_siswa"
                  className="w-full bg-slate-800/70 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-slate-400 focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Kelas / Rombel</label>
                <input
                  type="text"
                  required
                  value={genSiswaClass}
                  onChange={(e) => setGenSiswaClass(e.target.value)}
                  placeholder="Contoh: Kelas XI IPA 2"
                  className="w-full bg-slate-800/70 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Kata Sandi Default Login</label>
                <input
                  type="text"
                  required
                  value={genSiswaPassword}
                  onChange={(e) => setGenSiswaPassword(e.target.value)}
                  placeholder="123456"
                  className="w-full bg-slate-800/70 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-slate-400 focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGenerateSiswaModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 bg-slate-800 hover:bg-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white shadow-sm flex items-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Generate Akun Siswa</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Result: Created Siswa Credential Card */}
      {createdSiswaCredential && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-3xl p-6 text-center space-y-4 shadow-2xl text-white glass-card">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">Akun Siswa Berhasil Digenerate!</h3>
              <p className="text-xs text-slate-500">Siswa dapat login ke portal LMS menggunakan NISN/Username ini.</p>
            </div>

            <div className="bg-slate-800/70 border border-slate-700/60 rounded-2xl p-4 text-left space-y-2 font-mono text-xs">
              <div>
                <span className="text-[10px] text-slate-500 font-sans block">Nama Siswa</span>
                <span className="text-slate-900 font-semibold font-sans">{createdSiswaCredential.name} ({createdSiswaCredential.className})</span>
              </div>
              <div className="pt-2 border-t border-slate-700/60">
                <span className="text-[10px] text-slate-500 font-sans block">Username / NISN Login</span>
                <span className="text-amber-700 font-bold text-sm">{createdSiswaCredential.username}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-sans block">Password Login</span>
                <span className="text-emerald-700 font-bold">{createdSiswaCredential.password}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`Siswa: ${createdSiswaCredential.name}\nKelas: ${createdSiswaCredential.className}\nNISN/Username: ${createdSiswaCredential.username}\nPassword: ${createdSiswaCredential.password}`);
                  setIsCopied(true);
                  setTimeout(() => setIsCopied(false), 2000);
                }}
                className="flex-1 py-2 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-slate-700/60"
              >
                {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{isCopied ? 'Tersalin!' : 'Salin Kredensial'}</span>
              </button>
              <button
                onClick={() => setCreatedSiswaCredential(null)}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition-colors"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Word Document & Image AI Quiz Import Modal */}
      <WordQuizImportModal
        isOpen={showWordQuizModal}
        onClose={() => setShowWordQuizModal(false)}
        teacherName={currentUser.name}
        schedules={schedules}
        onSaveQuiz={(newQuiz) => {
          onAddQuiz(newQuiz);
        }}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        itemTitle={deleteTarget?.title || ''}
        itemType={deleteTarget?.type || 'Data'}
        onConfirm={handleExecuteDelete}
        onClose={() => setDeleteTarget(null)}
      />

      {/* Delete Success Modal */}
      <DeleteSuccessModal
        isOpen={!!successDeletedTarget}
        itemTitle={successDeletedTarget?.title || ''}
        itemType={successDeletedTarget?.type || 'Data'}
        onClose={() => setSuccessDeletedTarget(null)}
      />

      {/* Book & Learning Material Reader Modal for Guru */}
      <BookReaderModal
        isOpen={!!selectedDocForReader}
        book={selectedDocForReader}
        onClose={() => setSelectedDocForReader(null)}
      />

      {/* Export Grades Excel Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-emerald-500/40 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 relative text-left">
            <button
              onClick={() => setShowExportModal(false)}
              className="absolute right-5 top-5 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/30">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-slate-100">Ekspor Rekapitulasi Nilai Siswa (.xlsx)</h3>
                <p className="text-xs text-slate-400">Unduh data nilai kuis, tugas, dan presensi dalam format Excel resmi</p>
              </div>
            </div>

            <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Pilih Kelas / Rombel Siswa</label>
                <select
                  value={exportClassFilter}
                  onChange={(e) => setExportClassFilter(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="">-- Pilih Kelas / Rombel Siswa --</option>
                  <option value="Semua Kelas">Semua Kelas / Rombel Siswa</option>
                  {teacherConfiguredClasses.map((cls) => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 pt-1 border-t border-slate-800">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Komponen Lembar Kerja Excel (.xlsx)</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center gap-2 bg-slate-900 p-2.5 rounded-xl border border-emerald-500/30 text-emerald-300 font-semibold">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>Nilai Kuis & Tugas</span>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-900 p-2.5 rounded-xl border border-emerald-500/30 text-emerald-300 font-semibold">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>Daftar Paket Soal</span>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-900 p-2.5 rounded-xl border border-emerald-500/30 text-emerald-300 font-semibold">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>Rekap Presensi</span>
                  </div>
                </div>
              </div>

              <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-xl p-3 text-xs text-emerald-200/90 leading-relaxed">
                <p className="font-bold flex items-center gap-1.5 text-emerald-400 mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Informasi Berkas Administrasi:
                </p>
                Dokumen Excel yang diunduh mencakup perhitungan rata-rata nilai otomatis, predikat capaian (A/B/C/D), status ketuntasan (Tuntas/Remidial), serta rekapitulasi presensi siswa.
              </div>
            </div>

            {/* Pratinjau Tabel Ringkas */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-slate-300">Pratinjau Sampel Nilai Siswa</p>
                <span className="text-[10px] text-emerald-400 font-mono font-bold">
                  {exportClassFilter ? `${(exportClassFilter === 'Semua Kelas' ? studentsList : studentsList.filter(s => (s.departmentOrClass || '').toLowerCase().trim() === exportClassFilter.toLowerCase().trim())).length} Siswa Terpilih` : 'Silakan Pilih Kelas'}
                </span>
              </div>
              <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/90">
                {!exportClassFilter ? (
                  <div className="p-4 text-center text-xs text-slate-400 font-medium">
                    Silakan pilih kelas / rombel terlebih dahulu di dropdown atas untuk melihat pratinjau rekap nilai.
                  </div>
                ) : (
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-900 text-slate-400 font-bold uppercase sticky top-0 border-b border-slate-800">
                      <tr>
                        <th className="p-2">No</th>
                        <th className="p-2">NISN</th>
                        <th className="p-2">Nama Siswa</th>
                        <th className="p-2 text-center">Rata-Rata</th>
                        <th className="p-2 text-center">Ketuntasan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {(exportClassFilter === 'Semua Kelas'
                        ? (studentsList.length > 0 ? studentsList : MOCK_USERS.filter(u => u.role === 'siswa'))
                        : (studentsList.length > 0 ? studentsList : MOCK_USERS.filter(u => u.role === 'siswa')).filter(s => (s.departmentOrClass || '').toLowerCase().trim() === exportClassFilter.toLowerCase().trim())
                      ).slice(0, 5).map((st, idx) => {
                        const studentSubs = submissionsList.filter(
                          sub => sub.studentId === st.id || sub.studentNisn === st.identifierNumber
                        );
                        const hasSubmitted = studentSubs.length > 0;
                        const avg = hasSubmitted ? Math.round(studentSubs.reduce((acc, curr) => acc + curr.score, 0) / studentSubs.length) : '-';
                        return (
                          <tr key={st.id || idx} className="hover:bg-slate-800/40">
                            <td className="p-2 font-mono">{idx + 1}</td>
                            <td className="p-2 font-mono text-slate-400">{st.identifierNumber || `008761230${idx+1}`}</td>
                            <td className="p-2 font-semibold text-slate-100">{st.name}</td>
                            <td className="p-2 text-center font-bold text-amber-400">{avg}</td>
                            <td className="p-2 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                hasSubmitted
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}>
                                {hasSubmitted ? 'TUNTAS' : 'BELUM KUMPULKAN'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleExportExcel}
                disabled={isExporting || !exportClassFilter}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{isExporting ? 'Memproses Excel...' : !exportClassFilter ? 'Pilih Kelas Dahulu' : 'Unduh File Excel (.xlsx)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Upload Data Siswa Excel */}
      {showUploadSiswaExcelModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-emerald-500/40 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-white text-left relative">
            <button
              onClick={() => setShowUploadSiswaExcelModal(false)}
              className="absolute right-5 top-5 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-100">Upload Data Siswa Via Excel</h3>
                <p className="text-xs text-slate-400">Impor massal akun & NISN siswa sekaligus</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-300">1. Unduh Format Template</span>
                  <button
                    type="button"
                    onClick={handleDownloadStudentExcelTemplate}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh Template (.xlsx)</span>
                  </button>
                </div>
                <p className="text-[11px] text-emerald-200/80 leading-relaxed">
                  Gunakan template resmi agar nama kolom (NISN, Nama Lengkap, Kelas) terbaca dengan benar.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300">2. Pilih / Drop File Excel (.xlsx, .csv)</label>
                <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-2xl p-6 text-center bg-slate-950/60 transition-colors relative cursor-pointer group">
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleImportStudentExcel}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <UploadCloud className="w-8 h-8 text-slate-400 group-hover:text-emerald-400 mx-auto mb-2 transition-colors" />
                  <p className="text-xs font-bold text-slate-200 group-hover:text-emerald-300">Klik atau seret file Excel ke sini</p>
                  <p className="text-[10px] text-slate-500 mt-1">Format didukung: .xlsx, .xls, .csv</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowUploadSiswaExcelModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edit Data Siswa */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-500/40 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-white text-left relative">
            <button
              onClick={() => setEditingStudent(null)}
              className="absolute right-5 top-5 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Edit className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-100">Edit Data Siswa & Akses</h3>
                <p className="text-xs text-slate-400">Perbarui informasi profil dan kelas siswa</p>
              </div>
            </div>

            <form onSubmit={handleSaveEditStudent} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nama Lengkap Siswa</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Username / NISN Siswa</label>
                <input
                  type="text"
                  required
                  value={editNisn}
                  onChange={(e) => setEditNisn(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Kelas / Rombel Siswa</label>
                <input
                  type="text"
                  required
                  value={editClass}
                  onChange={(e) => setEditClass(e.target.value)}
                  placeholder="Contoh: Kelas 5A"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Status Akun</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as 'active' | 'inactive')}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                >
                  <option value="active">Aktif & Siap Login</option>
                  <option value="inactive">Nonaktif</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 bg-slate-800 hover:bg-slate-700 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-24 md:bottom-6 right-4 md:right-6 z-50 bg-slate-900 text-white border-2 border-emerald-500/80 px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold text-emerald-100">{toastMessage}</span>
        </div>
      )}

      {/* User Profile Modal for Guru */}
      <UserProfileModal
        isOpen={showProfileModal}
        user={currentUser}
        onClose={() => setShowProfileModal(false)}
        onUpdateUser={onUpdateCurrentUser}
        onLogout={onLogout}
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
          onClick={() => setActiveTab('attendance')}
          className={`flex flex-col items-center justify-center gap-1 w-14 h-12 rounded-xl transition-all cursor-pointer ${
            activeTab === 'attendance' ? 'text-sky-400 bg-sky-500/10' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px] font-bold">Presensi</span>
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