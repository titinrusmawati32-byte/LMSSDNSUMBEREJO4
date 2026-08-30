import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, ShieldCheck, Server, Bell, LogOut, Search, Plus, 
  Settings, CheckCircle, AlertTriangle, FileText, Activity, UserPlus, Trash2, Globe, Menu, X,
  KeyRound, Copy, Check, Sparkles, GraduationCap, Edit3, UserCheck, CheckCheck, MessageSquare,
  BookOpen, HelpCircle, ArrowUpRight, Cpu, Database, HardDrive, Zap, TrendingUp, History,
  Megaphone, ExternalLink, RefreshCw, LayoutGrid, CheckCircle2, ChevronRight, BarChart3,
  Layers, School, ShieldAlert, Radio, Download, UploadCloud, FileSpreadsheet, Save, FolderSync
} from 'lucide-react';
import { UserProfile, SystemAnnouncement, LearningMaterial, QuizExam, SchoolSettings, DigitalBook, LearningVideo, ClassSchedule, AttendanceRecord, StudentQuizSubmission } from '../types';
import { MOCK_USERS, MOCK_ANNOUNCEMENTS } from '../data/mockData';
import { DeleteConfirmModal, DeleteSuccessModal } from './DeleteModal';
import { UserProfileModal } from './UserProfileModal';
import {
  subscribeUsers,
  addUserToDb,
  updateUserInDb,
  deleteUserFromDb,
  subscribeAnnouncements,
  addAnnouncementToDb,
  deleteAnnouncementFromDb,
  subscribeMaterials,
  subscribeQuizzes,
  subscribeBooks,
  subscribeVideos,
  subscribeSchedules,
  subscribeAttendance,
  subscribeSubmissions,
  updateSchoolSettingsInDb,
  getFullDatabaseBackup,
  restoreFullDatabaseBackup,
  forceSyncAllToCloud
} from '../lib/lmsDb';

interface AdminDashboardProps {
  currentUser: UserProfile;
  onLogout: () => void;
  onUpdateCurrentUser?: (updatedUser: UserProfile) => void;
  isMobile?: boolean;
  schoolSettings?: SchoolSettings;
}

interface ActivityLogItem {
  id: string;
  title: string;
  description: string;
  time: string;
  type: 'primary' | 'tertiary' | 'secondary' | 'outline' | 'emerald';
}

const INITIAL_ACTIVITY_LOGS: ActivityLogItem[] = [
  {
    id: 'log-1',
    title: 'Guru Baru Diverifikasi & Diberi Akses',
    description: 'Admin Pusat membuat kredensial NIP & mata pelajaran untuk Bpk. David Kim, S.Pd',
    time: '10 Menit lalu',
    type: 'primary'
  },
  {
    id: 'log-2',
    title: 'Pembaruan Sistem LMS v2.4 Sukses',
    description: 'Patch performa modul kuis berdurasi & pembaca PDF tersinkronisasi tanpa downtime.',
    time: '2 Jam lalu',
    type: 'tertiary'
  },
  {
    id: 'log-3',
    title: 'Peningkatan Akses Pembelajaran Terdeteksi',
    description: '+120 siswa kelas 4 & 5 menyelesaikan latihan Matematika secara bersamaan.',
    time: '5 Jam lalu',
    type: 'secondary'
  },
  {
    id: 'log-4',
    title: 'Pencadangan Basis Data Otomatis',
    description: 'Firestore auto-backup & sinkronisasi aset cloud harian selesai dengan aman.',
    time: 'Kemarin, 23:00 WIB',
    type: 'outline'
  }
];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  currentUser, 
  onLogout, 
  onUpdateCurrentUser, 
  isMobile, 
  schoolSettings 
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'announcements' | 'system'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showFullLogsModal, setShowFullLogsModal] = useState(false);
  const [usersList, setUsersList] = useState<UserProfile[]>(MOCK_USERS);
  const [announcementsList, setAnnouncementsList] = useState<SystemAnnouncement[]>(MOCK_ANNOUNCEMENTS);
  const [materialsList, setMaterialsList] = useState<LearningMaterial[]>([]);
  const [quizzesList, setQuizzesList] = useState<QuizExam[]>([]);
  const [booksList, setBooksList] = useState<DigitalBook[]>([]);
  const [videosList, setVideosList] = useState<LearningVideo[]>([]);
  const [schedulesList, setSchedulesList] = useState<ClassSchedule[]>([]);
  const [attendanceList, setAttendanceList] = useState<AttendanceRecord[]>([]);
  const [submissionsList, setSubmissionsList] = useState<StudentQuizSubmission[]>([]);

  const [isExportingDb, setIsExportingDb] = useState(false);
  const [isImportingDb, setIsImportingDb] = useState(false);
  const [isSyncingDb, setIsSyncingDb] = useState(false);
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>(INITIAL_ACTIVITY_LOGS);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // School identity and branding states
  const [editSchoolName, setEditSchoolName] = useState(schoolSettings?.schoolName || '');
  const [editSchoolTagline, setEditSchoolTagline] = useState(schoolSettings?.schoolTagline || '');
  const [editLogoUrl, setEditLogoUrl] = useState(schoolSettings?.logoUrl || '');
  const [editLoginBgUrl, setEditLoginBgUrl] = useState(schoolSettings?.loginBgUrl || '');
  const [editGdriveUrl, setEditGdriveUrl] = useState(schoolSettings?.gdriveUrl || '');
  const [isSavingBranding, setIsSavingBranding] = useState(false);

  useEffect(() => {
    if (schoolSettings) {
      setEditSchoolName(schoolSettings.schoolName || '');
      setEditSchoolTagline(schoolSettings.schoolTagline || '');
      setEditLogoUrl(schoolSettings.logoUrl || '');
      setEditLoginBgUrl(schoolSettings.loginBgUrl || '');
      setEditGdriveUrl(schoolSettings.gdriveUrl || '');
    }
  }, [schoolSettings]);

  // In-app Delete Confirmation & Success Modal state
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
    type: string;
    category: 'user' | 'announcement';
  } | null>(null);
  const [deletedSuccessItem, setDeletedSuccessItem] = useState<{
    title: string;
    type: string;
  } | null>(null);

  // Add Announcement Modal state
  const [showAddAnnouncementModal, setShowAddAnnouncementModal] = useState(false);
  const [newAnnouncementTitle, setNewAnnouncementTitle] = useState('');
  const [newAnnouncementContent, setNewAnnouncementContent] = useState('');
  const [newAnnouncementTargetRole, setNewAnnouncementTargetRole] = useState<'all' | 'guru' | 'siswa' | 'admin'>('all');

  // Edit user state
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'guru' | 'siswa'>('siswa');
  const [editIdentifier, setEditIdentifier] = useState('');
  const [editDepartmentOrClass, setEditDepartmentOrClass] = useState('');
  const [editStatus, setEditStatus] = useState<'active' | 'inactive'>('active');

  // Generate Guru Modal state
  const [showGenerateGuruModal, setShowGenerateGuruModal] = useState(false);
  const [genGuruName, setGenGuruName] = useState('');
  const [genGuruNip, setGenGuruNip] = useState('');
  const [genGuruSubject, setGenGuruSubject] = useState('Matematika Kelas 4 & 5');
  const [genGuruPassword, setGenGuruPassword] = useState('123456');
  const [createdGuruCredential, setCreatedGuruCredential] = useState<{
    name: string;
    username: string;
    password: string;
    subject: string;
  } | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Generate Siswa Modal state
  const [showGenerateSiswaModal, setShowGenerateSiswaModal] = useState(false);
  const [genSiswaName, setGenSiswaName] = useState('');
  const [genSiswaNisn, setGenSiswaNisn] = useState('');
  const [genSiswaClass, setGenSiswaClass] = useState('Kelas 4A');
  const [genSiswaPassword, setGenSiswaPassword] = useState('123456');
  const [createdSiswaCredential, setCreatedSiswaCredential] = useState<{
    name: string;
    username: string;
    password: string;
    className: string;
  } | null>(null);
  const [isSiswaCopied, setIsSiswaCopied] = useState(false);

  // New user form state
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'guru' | 'siswa'>('siswa');
  const [newUserIdentifier, setNewUserIdentifier] = useState('');
  const [newUserDepartment, setNewUserDepartment] = useState('');

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Auto-generate NIP
  const handleAutoGenerateNip = () => {
    const randomNip = `199${Math.floor(100000 + Math.random() * 900000)}202201${Math.floor(100 + Math.random() * 900)}`;
    setGenGuruNip(randomNip);
  };

  // Auto-generate NISN
  const handleAutoGenerateNisn = () => {
    const randomNisn = `312${Math.floor(100000 + Math.random() * 900000)}`;
    setGenSiswaNisn(randomNisn);
  };

  // Submit Generated Guru
  const handleSaveGenerateGuru = (e: React.FormEvent) => {
    e.preventDefault();
    if (!genGuruName || !genGuruNip) return;

    const newGuru: UserProfile = {
      id: `usr-guru-${Date.now()}`,
      name: genGuruName,
      role: 'guru',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=250',
      identifierNumber: genGuruNip,
      departmentOrClass: genGuruSubject,
      lastLogin: 'Baru saja dibuat',
      status: 'active',
      password: genGuruPassword || '123456'
    };

    setUsersList(prev => [newGuru, ...prev]);
    addUserToDb(newGuru);

    setCreatedGuruCredential({
      name: genGuruName,
      username: genGuruNip,
      password: genGuruPassword || '123456',
      subject: genGuruSubject
    });

    const newLog: ActivityLogItem = {
      id: `log-${Date.now()}`,
      title: 'Akun Guru Baru Digenerate',
      description: `Akses portal guru dibuat untuk ${genGuruName} (${genGuruSubject}).`,
      time: 'Baru saja',
      type: 'primary'
    };
    setActivityLogs(prev => [newLog, ...prev]);

    setShowGenerateGuruModal(false);
    setGenGuruName('');
    setGenGuruNip('');
    setGenGuruPassword('123456');
    triggerToast(`Akun guru "${newGuru.name}" berhasil digenerate di server!`);
  };

  // Submit Generated Siswa
  const handleSaveGenerateSiswa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!genSiswaName || !genSiswaNisn) return;

    const newStudent: UserProfile = {
      id: `usr-siswa-${Date.now()}`,
      name: genSiswaName,
      role: 'siswa',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=250',
      identifierNumber: genSiswaNisn,
      departmentOrClass: genSiswaClass,
      lastLogin: 'Baru saja dibuat',
      status: 'active',
      password: genSiswaPassword || '123456'
    };

    setUsersList(prev => [newStudent, ...prev]);
    addUserToDb(newStudent);

    setCreatedSiswaCredential({
      name: genSiswaName,
      username: genSiswaNisn,
      password: genSiswaPassword || '123456',
      className: genSiswaClass
    });

    const newLog: ActivityLogItem = {
      id: `log-${Date.now()}`,
      title: 'Akun Siswa Baru Digenerate',
      description: `Akses portal siswa dibuat untuk ${genSiswaName} (${genSiswaClass}).`,
      time: 'Baru saja',
      type: 'primary'
    };
    setActivityLogs(prev => [newLog, ...prev]);

    setShowGenerateSiswaModal(false);
    setGenSiswaName('');
    setGenSiswaNisn('');
    setGenSiswaPassword('123456');
    triggerToast(`Akun siswa "${newStudent.name}" berhasil digenerate di server!`);
  };

  // Subscribe to real-time users, announcements, materials, quizzes, books, videos, schedules, attendance, submissions
  useEffect(() => {
    const unsubUsers = subscribeUsers((items) => setUsersList(items));
    const unsubAnnouncements = subscribeAnnouncements((items) => setAnnouncementsList(items));
    const unsubMaterials = subscribeMaterials((items) => setMaterialsList(items));
    const unsubQuizzes = subscribeQuizzes((items) => setQuizzesList(items));
    const unsubBooks = subscribeBooks((items) => setBooksList(items));
    const unsubVideos = subscribeVideos((items) => setVideosList(items));
    const unsubSchedules = subscribeSchedules((items) => setSchedulesList(items));
    const unsubAttendance = subscribeAttendance((items) => setAttendanceList(items));
    const unsubSubmissions = subscribeSubmissions((items) => setSubmissionsList(items));

    return () => {
      unsubUsers();
      unsubAnnouncements();
      unsubMaterials();
      unsubQuizzes();
      unsubBooks();
      unsubVideos();
      unsubSchedules();
      unsubAttendance();
      unsubSubmissions();
    };
  }, []);

  // Full Database Backup Export Handler
  const handleExportDatabase = async () => {
    setIsExportingDb(true);
    try {
      const backup = await getFullDatabaseBackup();
      const jsonStr = JSON.stringify(backup, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `sdn_sumberejo04_database_backup_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      triggerToast('Basis data lengkap berhasil diekspor dan diunduh (.JSON)!');
    } catch (err: any) {
      console.error('Export error:', err);
      triggerToast('Gagal mengekspor basis data.');
    } finally {
      setIsExportingDb(false);
    }
  };

  // Full Database Restore Import Handler
  const handleImportDatabaseFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImportingDb(true);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const content = event.target?.result as string;
          const parsed = JSON.parse(content);
          const res = await restoreFullDatabaseBackup(parsed);
          if (res.success) {
            triggerToast(`Pemulihan sukses! ${res.totalRestored} data tersimpan ke Cloud Firestore.`);
          } else {
            triggerToast(res.message);
          }
        } catch (parseErr) {
          triggerToast('File backup rusak atau bukan format JSON yang valid.');
        } finally {
          setIsImportingDb(false);
          e.target.value = '';
        }
      };
      reader.readAsText(file);
    } catch (err: any) {
      console.error('Import error:', err);
      triggerToast('Gagal memproses file backup.');
      setIsImportingDb(false);
      e.target.value = '';
    }
  };

  // Force Sync All Collections to Firestore
  const handleForceSyncCloud = async () => {
    setIsSyncingDb(true);
    try {
      const count = await forceSyncAllToCloud();
      triggerToast(`Berhasil menyinkronkan ${count} item data ke Google Cloud Firestore!`);
    } catch (err: any) {
      console.error('Sync error:', err);
      triggerToast('Gagal menyinkronkan ke Cloud Firestore.');
    } finally {
      setIsSyncingDb(false);
    }
  };

  const filteredUsers = (usersList || []).filter(user => {
    if (!user) return false;
    const name = user.name || '';
    const idNum = user.identifierNumber || '';
    const role = user.role || 'siswa';
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          idNum.includes(searchQuery);
    const matchesRole = roleFilter === 'all' || role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingBranding(true);
    try {
      await updateSchoolSettingsInDb({
        schoolName: editSchoolName,
        schoolTagline: editSchoolTagline,
        logoUrl: editLogoUrl,
        loginBgUrl: editLoginBgUrl,
        gdriveUrl: editGdriveUrl
      });
      triggerToast('Identitas & Branding Sekolah berhasil diperbarui secara real-time!');
    } catch (err) {
      console.error(err);
      triggerToast('Gagal menyimpan perubahan.');
    } finally {
      setIsSavingBranding(false);
    }
  };

  const compressImage = (file: File, maxWidth: number, maxHeight: number, quality: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = (err) => reject(err);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(img.src);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, 240, 240, 0.8);
      setEditLogoUrl(compressed);
      triggerToast('Logo berhasil diunggah & dikompresi otomatis! Simpan untuk menerapkan.');
    } catch (err) {
      console.error('Logo compression failed:', err);
      triggerToast('Gagal memproses gambar logo.');
    }
  };

  const handleBgFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, 1200, 800, 0.65);
      setEditLoginBgUrl(compressed);
      triggerToast('Latar belakang berhasil diunggah & dikompresi otomatis! Simpan untuk menerapkan.');
    } catch (err) {
      console.error('BG compression failed:', err);
      triggerToast('Gagal memproses gambar latar belakang.');
    }
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserIdentifier) return;

    const newUser: UserProfile = {
      id: `usr-${Date.now()}`,
      name: newUserName,
      role: newUserRole,
      avatar: newUserRole === 'guru'
        ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=250'
        : newUserRole === 'admin'
        ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250'
        : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=250',
      identifierNumber: newUserIdentifier,
      departmentOrClass: newUserDepartment || (newUserRole === 'siswa' ? 'Kelas 4A' : newUserRole === 'guru' ? 'Tenaga Pengajar' : 'Administrator'),
      lastLogin: 'Baru ditambahkan',
      status: 'active'
    };

    setUsersList(prev => [newUser, ...prev]);
    addUserToDb(newUser);

    const newLog: ActivityLogItem = {
      id: `log-${Date.now()}`,
      title: 'Pengguna Baru Terdaftar',
      description: `Pengguna ${newUser.name} (${newUser.role.toUpperCase()}) ditambahkan ke database portal.`,
      time: 'Baru saja',
      type: 'secondary'
    };
    setActivityLogs(prev => [newLog, ...prev]);

    setNewUserName('');
    setNewUserIdentifier('');
    setNewUserDepartment('');
    setShowAddUserModal(false);
    triggerToast(`Pengguna "${newUser.name}" berhasil ditambahkan!`);
  };

  const handleOpenEditUser = (user: UserProfile) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditRole(user.role);
    setEditIdentifier(user.identifierNumber);
    setEditDepartmentOrClass(user.departmentOrClass || '');
    setEditStatus(user.status || 'active');
    setShowEditUserModal(true);
  };

  const handleSaveEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editName || !editIdentifier) return;

    const updatedUser: UserProfile = {
      ...editingUser,
      name: editName,
      role: editRole,
      identifierNumber: editIdentifier,
      departmentOrClass: editDepartmentOrClass,
      status: editStatus
    };

    setUsersList(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    updateUserInDb(updatedUser);
    setShowEditUserModal(false);
    setEditingUser(null);
    triggerToast(`Data pengguna "${updatedUser.name}" berhasil diperbarui!`);
  };

  const handleDeleteUser = (id: string, name?: string) => {
    setDeleteTarget({
      id,
      title: name || 'Pengguna',
      type: 'Pengguna',
      category: 'user'
    });
  };

  const handleDeleteAnnouncement = (id: string, title: string) => {
    setDeleteTarget({
      id,
      title,
      type: 'Pengumuman',
      category: 'announcement'
    });
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;

    const targetId = deleteTarget.id;
    const targetCategory = deleteTarget.category;
    const targetTitle = deleteTarget.title;
    const targetType = deleteTarget.type;

    if (targetCategory === 'user') {
      setUsersList(prev => prev.filter(u => u.id !== targetId));
      deleteUserFromDb(targetId);
    } else if (targetCategory === 'announcement') {
      setAnnouncementsList(prev => prev.filter(a => a.id !== targetId));
      deleteAnnouncementFromDb(targetId);
    }

    setDeleteTarget(null);
    setDeletedSuccessItem({ title: targetTitle, type: targetType });
    triggerToast(`${targetType} "${targetTitle}" berhasil dihapus.`);
  };

  const handleSaveAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnouncementTitle.trim() || !newAnnouncementContent.trim()) return;

    const newAnc: SystemAnnouncement = {
      id: `anc-${Date.now()}`,
      title: newAnnouncementTitle.trim(),
      content: newAnnouncementContent.trim(),
      targetRole: newAnnouncementTargetRole,
      date: 'Hari ini',
      author: currentUser.name,
      important: true
    };

    setAnnouncementsList(prev => [newAnc, ...prev]);
    addAnnouncementToDb(newAnc);

    const newLog: ActivityLogItem = {
      id: `log-${Date.now()}`,
      title: 'Pengumuman Baru Diterbitkan',
      description: `"${newAnc.title}" disiarkan kepada target: ${newAnc.targetRole.toUpperCase()}`,
      time: 'Baru saja',
      type: 'primary'
    };
    setActivityLogs(prev => [newLog, ...prev]);

    setShowAddAnnouncementModal(false);
    setNewAnnouncementTitle('');
    setNewAnnouncementContent('');
    setNewAnnouncementTargetRole('all');
    triggerToast(`Pengumuman "${newAnc.title}" berhasil diterbitkan!`);
  };

  const guruCount = (usersList || []).filter(u => u && u.role === 'guru').length;
  const siswaCount = (usersList || []).filter(u => u && u.role === 'siswa').length;

  return (
    <div className="bg-[#060b14] bg-ambient-mesh text-slate-100 font-sans min-h-screen selection:bg-sky-500 selection:text-white flex overflow-x-hidden">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 right-6 z-50 bg-slate-900/90 border border-sky-500/50 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-xl"
          >
            <div className="w-8 h-8 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <p className="text-xs font-semibold">{toastMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SideNavBar (Desktop Fixed / Mobile Drawer) */}
      <aside className={`
        fixed left-0 top-0 h-screen ${isSidebarCollapsed ? 'w-20' : 'w-[280px]'} bg-slate-900/90 backdrop-blur-2xl shadow-2xl z-50 
        flex flex-col p-5 border-r border-slate-800/80 transition-all duration-300 shrink-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Brand Logo & Title */}
        <div className="flex items-center justify-between px-1 mb-6 mt-1">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/30 shrink-0 overflow-hidden">
              {schoolSettings?.logoUrl ? (
                <img src={schoolSettings.logoUrl} alt="Logo" className="w-full h-full object-contain p-1 bg-slate-900" />
              ) : (
                <Zap className="w-5 h-5 text-white stroke-[2.5]" />
              )}
            </div>
            {!isSidebarCollapsed && (
              <div className="min-w-0">
                <h1 className="text-sm font-black text-white tracking-tight leading-tight font-display truncate">
                  Admin LMS
                </h1>
              </div>
            )}
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden p-1 text-slate-400 hover:text-white rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 flex flex-col gap-1.5 overflow-y-auto pr-1">
          {!isSidebarCollapsed && (
            <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Menu Utama
            </p>
          )}

          {/* 1. Dashboard Tab */}
          <button
            onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}
            title="Dashboard"
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center py-3' : 'justify-between px-3.5 py-2.5'} rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/25 font-extrabold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <LayoutGrid className="w-4 h-4" />
              {!isSidebarCollapsed && <span>Dashboard</span>}
            </div>
            {!isSidebarCollapsed && activeTab === 'dashboard' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
          </button>

          {/* 2. Manajemen Pengguna Tab */}
          <button
            onClick={() => { setActiveTab('users'); setIsMobileMenuOpen(false); }}
            title="Manajemen Pengguna"
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center py-3' : 'justify-between px-3.5 py-2.5'} rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/25 font-extrabold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <Users className="w-4 h-4" />
              {!isSidebarCollapsed && <span>Manajemen Pengguna</span>}
            </div>
            {!isSidebarCollapsed && (
              <span className={`px-2 py-0.5 text-[10px] rounded-full font-mono font-bold ${
                activeTab === 'users' ? 'bg-white/20 text-white' : 'bg-slate-800 text-sky-400'
              }`}>
                {usersList.length}
              </span>
            )}
          </button>

          {/* 3. Pengumuman Sekolah Tab */}
          <button
            onClick={() => { setActiveTab('announcements'); setIsMobileMenuOpen(false); }}
            title="Pengumuman Sekolah"
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center py-3' : 'justify-between px-3.5 py-2.5'} rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'announcements'
                ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/25 font-extrabold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <Megaphone className="w-4 h-4" />
              {!isSidebarCollapsed && <span>Pengumuman Sekolah</span>}
            </div>
            {!isSidebarCollapsed && (
              <span className={`px-2 py-0.5 text-[10px] rounded-full font-mono font-bold ${
                activeTab === 'announcements' ? 'bg-white/20 text-white' : 'bg-slate-800 text-amber-400'
              }`}>
                {announcementsList.length}
              </span>
            )}
          </button>

          {/* 4. Status & Server Tab */}
          <button
            onClick={() => { setActiveTab('system'); setIsMobileMenuOpen(false); }}
            title="Status & Server"
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center py-3' : 'justify-between px-3.5 py-2.5'} rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'system'
                ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/25 font-extrabold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <Server className="w-4 h-4" />
              {!isSidebarCollapsed && <span>Status & Server</span>}
            </div>
            {!isSidebarCollapsed && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
          </button>

          {!isSidebarCollapsed ? (
            <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 mt-4">
              Pengaturan & Profil
            </p>
          ) : (
            <div className="my-2 border-t border-slate-800" />
          )}

          <button
            onClick={() => { setShowProfileModal(true); setIsMobileMenuOpen(false); }}
            title="Pengaturan Sistem"
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center py-3' : 'gap-3 px-3.5 py-2.5'} text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-xl font-bold text-xs transition-all cursor-pointer`}
          >
            <Settings className="w-4 h-4" />
            {!isSidebarCollapsed && <span>Pengaturan Sistem</span>}
          </button>
        </nav>

        {/* Sidebar Footer Action */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-col gap-3">
          <button 
            onClick={() => setShowAddUserModal(true)}
            title="Tambah Pengguna Baru"
            className={`w-full btn-gradient-primary text-white font-bold text-xs ${isSidebarCollapsed ? 'py-3 px-0 justify-center' : 'py-3 px-4 justify-center gap-2'} rounded-xl flex items-center shadow-lg shadow-sky-500/25 transition-all cursor-pointer`}
          >
            <UserPlus className="w-4 h-4" />
            {!isSidebarCollapsed && <span>Tambah Pengguna Baru</span>}
          </button>

          <div className={`flex ${isSidebarCollapsed ? 'flex-col gap-2' : 'gap-2 justify-between'}`}>
            <button 
              onClick={() => setShowFullLogsModal(true)}
              title="Audit Log"
              className="flex-1 flex justify-center items-center gap-1.5 text-slate-400 hover:text-white py-2 hover:bg-slate-800/60 rounded-lg transition-colors text-xs font-semibold cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              {!isSidebarCollapsed && <span>Audit Log</span>}
            </button>
            <button 
              onClick={onLogout}
              title="Logout"
              className="flex-1 flex justify-center items-center gap-1.5 text-rose-400 hover:text-white py-2 hover:bg-rose-950/40 rounded-lg transition-colors text-xs font-semibold cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              {!isSidebarCollapsed && <span>Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Backdrop for Mobile Drawer */}
      {isMobileMenuOpen && (
        <div 
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      {/* Main Content Area Container */}
      <div className={`flex-1 flex flex-col min-w-0 ${isSidebarCollapsed ? 'md:ml-20' : 'md:ml-[280px]'} transition-all duration-300 min-h-screen`}>
        
        {/* TopNavBar */}
        <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-xl h-20 border-b border-slate-800/80 flex justify-between items-center px-4 sm:px-8">
          {/* Mobile Menu Toggle & Search Bar */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden flex items-center justify-center w-10 h-10 rounded-full hover:bg-slate-800 transition-colors text-slate-200 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="hidden md:flex items-center justify-center w-10 h-10 rounded-xl hover:bg-slate-800 transition-colors text-slate-300 hover:text-white cursor-pointer"
              title={isSidebarCollapsed ? "Buka Sidebar Navigasi" : "Tutup Sidebar Navigasi"}
            >
              <Menu className="w-5 h-5" />
            </button>
            
            <div className="hidden sm:flex relative items-center">
              <Search className="w-4 h-4 absolute left-3.5 text-slate-400" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari data guru, siswa, NISN, materi..."
                className="bg-slate-800/70 border border-slate-700/60 rounded-full py-2 pl-10 pr-4 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 w-64 md:w-80 transition-all font-medium"
              />
            </div>
          </div>

          {/* Right Area: Alerts & Profile */}
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setActiveTab('announcements')}
                className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Pengumuman Sekolah"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-sky-400 rounded-full animate-pulse" />
              </button>
              <button 
                onClick={() => setActiveTab('system')}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-800 text-slate-300 hover:text-white transition-colors hidden sm:flex cursor-pointer"
                title="Status Server & Sistem"
              >
                <Server className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Dropdown Trigger */}
            <div 
              onClick={() => setShowProfileModal(true)}
              className="flex items-center gap-3 pl-4 sm:pl-6 border-l border-slate-800 cursor-pointer hover:opacity-90 transition-opacity"
            >
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-white leading-snug">{currentUser.name}</p>
                <p className="text-[10px] text-sky-400 font-medium">System Administrator Pusat</p>
              </div>
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-sky-500/40 p-0.5 shadow-md">
                <img 
                  alt={currentUser.name} 
                  src={currentUser.avatar}
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
            </div>
          </div>
        </header>

        {/* Main Body View */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-8">
          
          {/* Created Guru Credentials Banner Alert */}
          <AnimatePresence>
            {createdGuruCredential && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-slate-900/90 border-2 border-emerald-500/60 rounded-3xl p-5 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-500/40">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-white text-sm sm:text-base font-display">
                      Kredensial Guru Berhasil Dibuat: {createdGuruCredential.name}
                    </h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Username / NIP: <span className="font-mono text-emerald-300 font-bold">{createdGuruCredential.username}</span> • Password: <span className="font-mono text-amber-300 font-bold">{createdGuruCredential.password}</span> • Pengampu: <span className="text-slate-200">{createdGuruCredential.subject}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`AKUN GURU SD NEGERI SUMBEREJO 04\nNama: ${createdGuruCredential.name}\nUsername / NIP: ${createdGuruCredential.username}\nPassword: ${createdGuruCredential.password}\nMata Pelajaran: ${createdGuruCredential.subject}`);
                      setIsCopied(true);
                      setTimeout(() => setIsCopied(false), 3000);
                    }}
                    className="flex-1 md:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
                  >
                    {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{isCopied ? 'Tersalin!' : 'Salin Kredensial'}</span>
                  </button>
                  <button
                    onClick={() => setCreatedGuruCredential(null)}
                    className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* TAB 0: DASHBOARD (THE LUMINA BENTO GRID) */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              
              {/* Header Hero Section */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-2">
                <div>
                  <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight font-display">
                    Halo, Administrator Pusat!
                  </h2>
                  <p className="text-slate-300 mt-1.5 text-sm sm:text-base font-medium">
                    Siap untuk mengelola portal pembelajaran {schoolSettings?.schoolName || "SD Negeri Sumberejo 04"} hari ini?
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <button 
                    onClick={() => {
                      handleAutoGenerateNip();
                      setShowGenerateGuruModal(true);
                    }}
                    className="px-4 py-2.5 rounded-xl btn-gradient-amber text-slate-950 font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Generate Akses Guru</span>
                  </button>
                  <button 
                    onClick={() => setShowAddUserModal(true)}
                    className="px-4 py-2.5 rounded-xl btn-gradient-primary text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Pengguna</span>
                  </button>
                </div>
              </div>

              {/* Mobile Quick Navigation & Actions Hub (Metode Pertama: block md:hidden) */}
              <div className="block md:hidden bg-slate-900/60 border border-slate-800 rounded-2xl p-4 mb-4">
                <h3 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <LayoutGrid className="w-3.5 h-3.5 text-sky-400" />
                  Pusat Pintasan Mobile
                </h3>
                
                {/* Mobile Search Input */}
                <div className="relative flex items-center mb-4">
                  <Search className="w-4 h-4 absolute left-3 text-slate-400" />
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari guru, siswa, materi..."
                    className="w-full bg-slate-800/80 border border-slate-700/50 rounded-xl py-2.5 pl-9 pr-4 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                  />
                </div>

                {/* Quick Grid of Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => {
                      handleAutoGenerateNip();
                      setShowGenerateGuruModal(true);
                    }}
                    className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/40 text-center gap-1.5 transition-all cursor-pointer"
                  >
                    <KeyRound className="w-5 h-5 text-amber-400" />
                    <span className="text-[10px] font-bold text-slate-200">Akses Guru</span>
                  </button>

                  <button 
                    onClick={() => setShowAddUserModal(true)}
                    className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/40 text-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Plus className="w-5 h-5 text-sky-400" />
                    <span className="text-[10px] font-bold text-slate-200">Tambah User</span>
                  </button>

                  <button 
                    onClick={() => setActiveTab('announcements')}
                    className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/40 text-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Bell className="w-5 h-5 text-pink-400" />
                    <span className="text-[10px] font-bold text-slate-200">Pengumuman</span>
                  </button>

                  <button 
                    onClick={() => setActiveTab('system')}
                    className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/40 text-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Server className="w-5 h-5 text-emerald-400" />
                    <span className="text-[10px] font-bold text-slate-200">Status Server</span>
                  </button>
                </div>
              </div>

              {/* Real-Time Visual Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Card 1: Jumlah Materi Aktif */}
                <div className="glass-card rounded-2xl p-5 border border-sky-500/30 relative overflow-hidden group hover:border-sky-400/60 transition-all shadow-md">
                  <div className="absolute -right-4 -top-4 w-20 h-20 bg-sky-500/15 rounded-full blur-xl group-hover:bg-sky-500/30 transition-all" />
                  <div className="flex justify-between items-start mb-2 relative z-10">
                    <span className="text-xs font-bold text-slate-300">Jumlah Materi Aktif</span>
                    <span className="flex items-center gap-1.5 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping"></span> Real-Time
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 relative z-10 mt-1">
                    <span className="text-3xl font-extrabold text-white font-display">{materialsList.length}</span>
                    <span className="text-xs text-sky-400 font-semibold">Modul Pembelajaran</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 relative z-10">
                    <span>Terpublikasi di LMS</span>
                    <BookOpen className="w-4 h-4 text-sky-400" />
                  </div>
                </div>

                {/* Card 2: Jumlah Kuis & Ujian Aktif */}
                <div className="glass-card rounded-2xl p-5 border border-amber-500/30 relative overflow-hidden group hover:border-amber-400/60 transition-all shadow-md">
                  <div className="absolute -right-4 -top-4 w-20 h-20 bg-amber-500/15 rounded-full blur-xl group-hover:bg-amber-500/30 transition-all" />
                  <div className="flex justify-between items-start mb-2 relative z-10">
                    <span className="text-xs font-bold text-slate-300">Jumlah Kuis & Ujian</span>
                    <span className="flex items-center gap-1.5 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span> Real-Time
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 relative z-10 mt-1">
                    <span className="text-3xl font-extrabold text-white font-display">{quizzesList.length}</span>
                    <span className="text-xs text-amber-400 font-semibold">Paket Evaluasi</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 relative z-10">
                    <span>Ujian Terbuka Aktif</span>
                    <HelpCircle className="w-4 h-4 text-amber-400" />
                  </div>
                </div>

                {/* Card 3: Jumlah Siswa Terdaftar */}
                <div className="glass-card rounded-2xl p-5 border border-emerald-500/30 relative overflow-hidden group hover:border-emerald-400/60 transition-all shadow-md">
                  <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-500/15 rounded-full blur-xl group-hover:bg-emerald-500/30 transition-all" />
                  <div className="flex justify-between items-start mb-2 relative z-10">
                    <span className="text-xs font-bold text-slate-300">Siswa Terdaftar</span>
                    <span className="flex items-center gap-1.5 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> Real-Time
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 relative z-10 mt-1">
                    <span className="text-3xl font-extrabold text-white font-display">{siswaCount}</span>
                    <span className="text-xs text-emerald-400 font-semibold">Peserta Didik</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 relative z-10">
                    <span>Siswa Aktif Terdata</span>
                    <GraduationCap className="w-4 h-4 text-emerald-400" />
                  </div>
                </div>

                {/* Card 4: Guru Pengajar */}
                <div className="glass-card rounded-2xl p-5 border border-purple-500/30 relative overflow-hidden group hover:border-purple-400/60 transition-all shadow-md">
                  <div className="absolute -right-4 -top-4 w-20 h-20 bg-purple-500/15 rounded-full blur-xl group-hover:bg-purple-500/30 transition-all" />
                  <div className="flex justify-between items-start mb-2 relative z-10">
                    <span className="text-xs font-bold text-slate-300">Guru Pengajar</span>
                    <span className="flex items-center gap-1.5 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping"></span> Real-Time
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 relative z-10 mt-1">
                    <span className="text-3xl font-extrabold text-white font-display">{guruCount}</span>
                    <span className="text-xs text-purple-400 font-semibold">Tenaga Pendidik</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 relative z-10">
                    <span>Akun Guru Terverifikasi</span>
                    <UserCheck className="w-4 h-4 text-purple-400" />
                  </div>
                </div>
              </div>

              {/* Bento Grid Layout (8 cols left, 4 cols right) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left 8 Columns: Metric Cards + Course Performance */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                  
                  {/* Metrics Row (3 Cards) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    
                    {/* Metric 1: Manajemen Pengguna */}
                    <div 
                      onClick={() => setActiveTab('users')}
                      className="glass-card glass-card-hover rounded-2xl p-5 relative overflow-hidden group cursor-pointer"
                    >
                      <div className="absolute -right-4 -top-4 w-24 h-24 bg-sky-500/10 rounded-full blur-xl group-hover:bg-sky-500/25 transition-all" />
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="text-base font-bold text-white mb-1.5 font-display">
                            Manajemen Pengguna
                          </h3>
                          <p className="text-xs text-slate-300">
                            Kelola {guruCount} Guru & {siswaCount} Siswa
                          </p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-sky-500/20 flex items-center justify-center text-sky-400 shrink-0 border border-sky-500/30">
                          <Users className="w-5 h-5" />
                        </div>
                      </div>
                      <div className="pt-2 flex items-center gap-1.5 text-[11px] font-bold text-sky-400">
                        <span>Buka Master Pengguna</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>

                    {/* Metric 2: Pengumuman Sekolah */}
                    <div 
                      onClick={() => setActiveTab('announcements')}
                      className="glass-card glass-card-hover rounded-2xl p-5 relative overflow-hidden group cursor-pointer"
                    >
                      <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-500/10 rounded-full blur-xl group-hover:bg-amber-500/25 transition-all" />
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="text-base font-bold text-white mb-1.5 font-display">
                            Pengumuman Sekolah
                          </h3>
                          <p className="text-xs text-slate-300">
                            {announcementsList.length} Pengumuman Aktif Terbit
                          </p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 border border-amber-500/30">
                          <Megaphone className="w-5 h-5" />
                        </div>
                      </div>
                      <div className="pt-2 flex items-center gap-1.5 text-[11px] font-bold text-amber-400">
                        <span>Kelola Pengumuman</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>

                    {/* Metric 3: Status Server LMS */}
                    <div 
                      onClick={() => setActiveTab('system')}
                      className="glass-card glass-card-hover rounded-2xl p-5 relative overflow-hidden group cursor-pointer"
                    >
                      <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-500/10 rounded-full blur-xl group-hover:bg-purple-500/25 transition-all" />
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="text-base font-bold text-white mb-1.5 font-display">
                            Status Server LMS
                          </h3>
                          <p className="text-xs text-slate-300">
                            Cloud Firestore • Latency 18ms
                          </p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 shrink-0 border border-purple-500/30">
                          <Server className="w-5 h-5" />
                        </div>
                      </div>
                      <div className="pt-2 flex items-center gap-1.5 text-[11px] font-bold text-purple-400">
                        <span>Cek Telemetri Server</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>

                  </div>

                </div>

                {/* Quick Navigation Menu Grid for Admin */}
                <div className="lg:col-span-12 pt-2">
                  <h3 className="text-base sm:text-lg font-bold text-white mb-4 flex items-center gap-2 font-display">
                    <Sparkles className="w-5 h-5 text-sky-400" />
                    <span>Menu Navigasi Cepat Administrator</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div onClick={() => setActiveTab('users')} className="glass-card glass-card-hover rounded-2xl p-4 flex items-center gap-4 cursor-pointer group">
                      <div className="w-12 h-12 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/30">
                        <Users className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white">Manajemen Pengguna</h4>
                        <p className="text-xs text-slate-300">{usersList.length} Akun Terdaftar</p>
                      </div>
                    </div>

                    <div onClick={() => setActiveTab('announcements')} className="glass-card glass-card-hover rounded-2xl p-4 flex items-center gap-4 cursor-pointer group">
                      <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                        <Megaphone className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white">Pengumuman Sekolah</h4>
                        <p className="text-xs text-slate-300">{announcementsList.length} Pengumuman</p>
                      </div>
                    </div>

                    <div onClick={() => setActiveTab('system')} className="glass-card glass-card-hover rounded-2xl p-4 flex items-center gap-4 cursor-pointer group">
                      <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/30">
                        <Server className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white">Status & Server</h4>
                        <p className="text-xs text-slate-300">Firestore & Telemetri</p>
                      </div>
                    </div>

                    <div onClick={() => setShowProfileModal(true)} className="glass-card glass-card-hover rounded-2xl p-4 flex items-center gap-4 cursor-pointer group">
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                        <Settings className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white">Pengaturan Sistem</h4>
                        <p className="text-xs text-slate-300">Konfigurasi Portal</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions Grid */}
                <div className="lg:col-span-12">
                  <div className="glass-card rounded-2xl p-5 sm:p-6">
                    <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2 font-display">
                      <Zap className="w-4 h-4 text-sky-400" />
                      <span>Quick Actions</span>
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {/* Action 1: Add User */}
                      <button 
                        onClick={() => setShowAddUserModal(true)}
                        className="glass-card-hover bg-slate-800/70 border border-slate-700/60 rounded-xl p-3.5 flex items-center justify-center gap-3 transition-all group cursor-pointer"
                      >
                        <div className="w-9 h-9 rounded-full bg-sky-500/15 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                          <UserPlus className="w-5 h-5 text-sky-400" />
                        </div>
                        <span className="text-xs font-bold text-white">Tambah User</span>
                      </button>

                      {/* Action 2: Create Announcement */}
                      <button 
                        onClick={() => setShowAddAnnouncementModal(true)}
                        className="glass-card-hover bg-slate-800/70 border border-slate-700/60 rounded-xl p-3.5 flex items-center justify-center gap-3 transition-all group cursor-pointer"
                      >
                        <div className="w-9 h-9 rounded-full bg-amber-500/15 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                          <Megaphone className="w-5 h-5 text-amber-400" />
                        </div>
                        <span className="text-xs font-bold text-white">Pengumuman</span>
                      </button>

                      {/* Action 3: Generate Guru Access */}
                      <button 
                        onClick={() => {
                          handleAutoGenerateNip();
                          setShowGenerateGuruModal(true);
                        }}
                        className="glass-card-hover bg-slate-800/70 border border-slate-700/60 rounded-xl p-3.5 flex items-center justify-center gap-3 transition-all group cursor-pointer"
                      >
                        <div className="w-9 h-9 rounded-full bg-emerald-500/15 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                          <KeyRound className="w-4 h-4 text-emerald-400" />
                        </div>
                        <span className="text-xs font-bold text-white">
                          Generate Guru
                        </span>
                      </button>

                      {/* Action 4: Generate Siswa Access */}
                      <button 
                        onClick={() => {
                          handleAutoGenerateNisn();
                          setShowGenerateSiswaModal(true);
                        }}
                        className="glass-card-hover bg-slate-800/70 border border-slate-700/60 rounded-xl p-3.5 flex items-center justify-center gap-3 transition-all group cursor-pointer"
                      >
                        <div className="w-9 h-9 rounded-full bg-blue-500/15 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                          <KeyRound className="w-4 h-4 text-blue-400" />
                        </div>
                        <span className="text-xs font-bold text-white">
                          Generate Siswa
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 1: MANAJEMEN PENGGUNA */}
          {activeTab === 'users' && (
            <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-6">
              
              {/* Header Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-extrabold text-white text-lg sm:text-xl font-display">
                    Master Data Pengguna Portal
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Kelola akun admin, dewan guru, dan seluruh peserta didik terdaftar
                  </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  <button
                    onClick={() => {
                      handleAutoGenerateNip();
                      setShowGenerateGuruModal(true);
                    }}
                    className="px-4 py-2.5 btn-gradient-amber text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all active:scale-95"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Generate Akses Guru</span>
                  </button>

                  <button
                    onClick={() => setShowAddUserModal(true)}
                    className="px-4 py-2.5 btn-gradient-primary text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all active:scale-95"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Tambah Pengguna</span>
                  </button>
                </div>
              </div>

              {/* Filters & Search */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari Nama, NIP, atau NISN..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800/70 border border-slate-700/60 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                </div>

                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="bg-slate-800/70 border border-slate-700/60 rounded-xl px-4 py-2.5 text-xs text-slate-200 font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="all">Semua Peran ({usersList.length})</option>
                  <option value="guru">Dewan Guru ({guruCount})</option>
                  <option value="siswa">Peserta Didik ({siswaCount})</option>
                  <option value="admin">Administrator Pusat</option>
                </select>
              </div>

              {/* Users Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-700/60 shadow-lg bg-slate-900/40">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/80 text-slate-300 font-bold uppercase tracking-wider border-b border-slate-700/60">
                    <tr>
                      <th className="p-3.5">Nama & Profil</th>
                      <th className="p-3.5">Peran</th>
                      <th className="p-3.5">Identitas (NIP / NISN)</th>
                      <th className="p-3.5">Pengampu / Rombel</th>
                      <th className="p-3.5">Status Akun</th>
                      <th className="p-3.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/60 text-slate-200">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="p-3.5">
                          <div className="flex items-center gap-3">
                            <img src={user.avatar} alt={user.name} className="w-9 h-9 rounded-full object-cover border border-slate-600 shadow-sm" />
                            <div>
                              <p className="font-bold text-white text-xs">{user.name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                            user.role === 'admin'
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                              : user.role === 'guru'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono font-bold text-sky-400">
                          {user.identifierNumber}
                        </td>
                        <td className="p-3.5 text-slate-300">
                          {user.departmentOrClass || '-'}
                        </td>
                        <td className="p-3.5">
                          <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold ${
                            user.status === 'inactive' ? 'text-rose-400' : 'text-emerald-400'
                          }`}>
                            <span className={`w-2 h-2 rounded-full ${user.status === 'inactive' ? 'bg-rose-500' : 'bg-emerald-400'}`} />
                            {user.status === 'inactive' ? 'Nonaktif' : 'Aktif'}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenEditUser(user)}
                              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 flex items-center gap-1 text-xs font-bold transition-all cursor-pointer shadow-sm"
                              title="Edit Data Pengguna"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id, user.name)}
                              className="p-1.5 rounded-xl text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                              title="Hapus Pengguna"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400">
                          Tidak ditemukan pengguna yang cocok dengan kriteria pencarian.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: PENGUMUMAN SEKOLAH */}
          {activeTab === 'announcements' && (
            <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="font-extrabold text-white text-lg sm:text-xl font-display">
                    Pengumuman Resmi Sekolah
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Disiarkan langsung kepada portal siswa, guru, dan admin
                  </p>
                </div>
                <button
                  onClick={() => setShowAddAnnouncementModal(true)}
                  className="px-4 py-2.5 btn-gradient-primary text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-md cursor-pointer transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Buat Pengumuman Baru</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {announcementsList.map((anc) => (
                  <div key={anc.id} className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-3 relative group shadow-lg backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        anc.targetRole === 'all' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 
                        anc.targetRole === 'guru' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                        'bg-sky-500/20 text-sky-400 border-sky-500/30'
                      }`}>
                        Target: {anc.targetRole === 'all' ? 'SEMUA WARGA SEKOLAH' : anc.targetRole.toUpperCase()}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400 font-semibold font-mono">{anc.date}</span>
                        <button
                          onClick={() => handleDeleteAnnouncement(anc.id, anc.title)}
                          className="text-rose-400 hover:bg-rose-950/40 p-1.5 rounded-lg transition-colors cursor-pointer"
                          title="Hapus Pengumuman"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <h4 className="font-bold text-white text-sm font-display">{anc.title}</h4>
                    <p className="text-xs text-slate-300 leading-relaxed font-medium">{anc.content}</p>
                    <p className="text-[11px] text-sky-400 font-bold pt-2 mt-2 border-t border-slate-700/60">
                      Diterbitkan oleh: {anc.author}
                    </p>
                  </div>
                ))}
                {announcementsList.length === 0 && (
                  <div className="col-span-2 p-8 text-center text-slate-400 glass-card rounded-2xl">
                    Belum ada pengumuman yang diterbitkan. Klik "Buat Pengumuman Baru" di atas.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: STATUS & SERVER LMS */}
          {activeTab === 'system' && (
            <div className="space-y-6">
              
              {/* Telemetry Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="glass-card rounded-2xl p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                    <Cpu className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400">Kesehatan Server</p>
                    <h4 className="text-lg font-extrabold text-emerald-400 font-display">99.9% Uptime</h4>
                    <p className="text-[10px] text-slate-400 font-mono">Response Latency: 18ms</p>
                  </div>
                </div>

                <div className="glass-card rounded-2xl p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/30">
                    <Database className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400">Database Firestore</p>
                    <h4 className="text-lg font-extrabold text-sky-400 font-display">Terhubung Aktif</h4>
                    <p className="text-[10px] text-slate-400">Auto-sync Realtime Active</p>
                  </div>
                </div>

                <div className="glass-card rounded-2xl p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/30">
                    <HardDrive className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400">Penyimpanan Media</p>
                    <h4 className="text-lg font-extrabold text-purple-400 font-display">4.2 GB / 50 GB</h4>
                    <p className="text-[10px] text-slate-400">PDF, Dokumen Word, Video</p>
                  </div>
                </div>
              </div>

              {/* BRANDING & SCHOOL IDENTITY CARD (NEW) */}
              <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-6 border border-slate-700/50">
                <div className="flex justify-between items-center border-b border-slate-700/60 pb-4">
                  <div>
                    <h4 className="text-base font-extrabold text-white font-display flex items-center gap-2">
                      <Settings className="w-5 h-5 text-sky-400" />
                      Pengaturan Identitas & Branding Sekolah
                    </h4>
                    <p className="text-xs text-slate-400">Sesuaikan logo, latar belakang login, nama sekolah, dan slogan secara realtime.</p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-sky-500/10 text-sky-400 text-xs font-bold border border-sky-500/20">
                    Real-time Firestore Sync
                  </span>
                </div>

                <form onSubmit={handleSaveBranding} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Left Column: Text Fields */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Nama Sekolah</label>
                        <input
                          type="text"
                          required
                          value={editSchoolName}
                          onChange={(e) => setEditSchoolName(e.target.value)}
                          placeholder="Contoh: SD NEGERI SUMBEREJO 04"
                          className="w-full bg-slate-850 border border-slate-700/60 rounded-xl px-4 py-3 text-xs text-white font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all placeholder-slate-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Slogan / Tagline Sekolah</label>
                        <input
                          type="text"
                          required
                          value={editSchoolTagline}
                          onChange={(e) => setEditSchoolTagline(e.target.value)}
                          placeholder="Contoh: SD HEBAT BERPRESTASI"
                          className="w-full bg-slate-850 border border-slate-700/60 rounded-xl px-4 py-3 text-xs text-white font-medium focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all placeholder-slate-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Custom Logo URL</label>
                        <input
                          type="text"
                          value={editLogoUrl}
                          onChange={(e) => setEditLogoUrl(e.target.value)}
                          placeholder="Masukkan URL Logo (e.g., https://...)"
                          className="w-full bg-slate-850 border border-slate-700/60 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all placeholder-slate-500 font-mono"
                        />
                        
                        <div className="mt-3 flex items-center gap-3">
                          <label className="flex items-center gap-2 cursor-pointer bg-slate-800 hover:bg-slate-750 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-semibold text-white transition-all select-none">
                            <Plus className="w-3.5 h-3.5 text-sky-400" />
                            <span>Unggah Logo Lokal</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleLogoFileChange}
                              className="hidden"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setEditLogoUrl('https://lh3.googleusercontent.com/aida/AEtjO1V_O1LkqpNTKLUgY46lUQNZ-98AfOCi-LyzExN_kh011sCNAEG7gS1zMhoI0e9f5thxqvJIXWDLwNX18QdX6PlK24ANim_2_jj_Q6Z9Oa_KUxEcDW41TTC8NsyQysJsnq_E5CU0zsQRxSTqbhz7N5xF8G4OM26zdNzz5kRadSxlsfYxU26L07DfDphdMt7y-Yv-tJOIvogq6ozlFOeFUossp0VF8tSoOq4VClwC1f5b_JNLVjfk70mJ7Hc');
                              triggerToast('Logo direset ke logo SD Negeri default.');
                            }}
                            className="text-slate-400 hover:text-white text-[11px] font-medium"
                          >
                            Reset default
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Link Google Drive Sekolah (Utama)</label>
                        <input
                          type="url"
                          value={editGdriveUrl}
                          onChange={(e) => setEditGdriveUrl(e.target.value)}
                          placeholder="Contoh: https://drive.google.com/drive/folders/..."
                          className="w-full bg-slate-850 border border-slate-700/60 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all placeholder-slate-500 font-mono"
                        />
                        <p className="text-[10px] text-slate-400 mt-1.5">Tautan folder, dokumen, atau spreadsheet dari Admin yang diakses oleh semua Guru dan Siswa secara realtime.</p>
                      </div>
                    </div>

                    {/* Right Column: Previews & Login Background */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Custom Background Login URL</label>
                        <input
                          type="text"
                          value={editLoginBgUrl}
                          onChange={(e) => setEditLoginBgUrl(e.target.value)}
                          placeholder="Masukkan URL Gambar Latar Belakang"
                          className="w-full bg-slate-850 border border-slate-700/60 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all placeholder-slate-500 font-mono"
                        />

                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          <label className="flex items-center gap-2 cursor-pointer bg-slate-800 hover:bg-slate-750 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-semibold text-white transition-all select-none">
                            <Plus className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Unggah BG Lokal</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleBgFileChange}
                              className="hidden"
                            />
                          </label>

                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditLoginBgUrl('https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&q=80&w=1200');
                                triggerToast('BG diubah ke preset: Ruang Kelas Klasik.');
                              }}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 rounded-lg"
                            >
                              Preset 1
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditLoginBgUrl('https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&q=80&w=1200');
                                triggerToast('BG diubah ke preset: Perpustakaan Modern.');
                              }}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 rounded-lg"
                            >
                              Preset 2
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditLoginBgUrl('');
                                triggerToast('BG diubah ke Mode Mesh Gradasi Gelap Default.');
                              }}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 rounded-lg"
                            >
                              Reset default
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Interactive Realtime Preview Area */}
                      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800/80 space-y-3">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Live Preview Logo & Branding</span>
                        
                        <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-950/80 border border-slate-800/40">
                          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center border border-slate-700/60 p-1 overflow-hidden shrink-0">
                            {editLogoUrl ? (
                              <img src={editLogoUrl} alt="Logo Preview" className="w-full h-full object-contain" />
                            ) : (
                              <School className="w-5 h-5 text-sky-400" />
                            )}
                          </div>
                          <div className="min-w-0 text-left">
                            <p className="text-xs font-extrabold text-white truncate">{editSchoolName || 'NAMA SEKOLAH'}</p>
                            <p className="text-[10px] font-bold text-sky-400 truncate uppercase">{editSchoolTagline || 'SLOGAN SEKOLAH'}</p>
                          </div>
                        </div>

                        {editLoginBgUrl && (
                          <div className="relative h-20 rounded-xl overflow-hidden border border-slate-800">
                            <img src={editLoginBgUrl} alt="BG Preview" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center">
                              <span className="text-[10px] bg-slate-950/80 text-emerald-400 font-extrabold px-2.5 py-1 rounded-full border border-emerald-500/20">Custom Login Background Active</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="flex justify-end items-center gap-3 pt-4 border-t border-slate-700/60">
                    <button
                      type="button"
                      disabled={isSavingBranding}
                      onClick={() => {
                        setEditSchoolName(schoolSettings?.schoolName || 'SD NEGERI SUMBEREJO 04');
                        setEditSchoolTagline(schoolSettings?.schoolTagline || 'Portal E-Learning & Manajemen Akademik');
                        setEditLogoUrl(schoolSettings?.logoUrl || '');
                        setEditLoginBgUrl(schoolSettings?.loginBgUrl || '');
                        setEditGdriveUrl(schoolSettings?.gdriveUrl || '');
                        triggerToast('Perubahan dibatalkan & dikembalikan ke pengaturan saat ini.');
                      }}
                      className="cursor-pointer font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl px-5 py-3 transition-all disabled:opacity-50"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingBranding}
                      className="cursor-pointer font-bold text-xs bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white rounded-xl px-6 py-3 transition-all flex items-center gap-2 shadow-lg shadow-sky-500/10 disabled:opacity-50"
                    >
                      {isSavingBranding ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Menyimpan...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Simpan & Terapkan Branding</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* CLOUD FIRESTORE DATABASE & PERSISTENCE MANAGEMENT (NEW) */}
              <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-6 border border-sky-500/30 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />
                
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-700/60 pb-5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
                        <Database className="w-4 h-4" />
                      </div>
                      <h4 className="text-base sm:text-lg font-extrabold text-white font-display">
                        Manajemen Basis Data & Cloud Firestore Persistence
                      </h4>
                    </div>
                    <p className="text-xs text-slate-300">
                      Seluruh data buku digital, quiz/ujian, akun siswa, guru, admin, materi, video, jadwal, dan nilai tersimpan secara permanen & real-time di Cloud Database (Aman saat deploy Vercel).
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/40 shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Cloud Firestore Aktif
                    </span>
                  </div>
                </div>

                {/* Real-time Collections Document Grid */}
                <div className="space-y-3">
                  <h5 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-sky-400" />
                    <span>Statistik Koleksi Data Terhubung (Real-time Cloud Sync)</span>
                  </h5>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
                    <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/60 space-y-1">
                      <span className="text-[11px] text-slate-400 font-semibold block">📚 Buku Digital</span>
                      <p className="text-lg font-black text-amber-400 font-display">{booksList.length} E-Book</p>
                      <p className="text-[10px] text-slate-500 font-mono">Collection: books</p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/60 space-y-1">
                      <span className="text-[11px] text-slate-400 font-semibold block">📝 Quiz & Ujian</span>
                      <p className="text-lg font-black text-rose-400 font-display">{quizzesList.length} Paket Soal</p>
                      <p className="text-[10px] text-slate-500 font-mono">Collection: quizzes</p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/60 space-y-1">
                      <span className="text-[11px] text-slate-400 font-semibold block">👥 Pengguna Terdaftar</span>
                      <p className="text-lg font-black text-sky-400 font-display">{usersList.length} Akun</p>
                      <p className="text-[10px] text-slate-500 font-mono">Collection: users</p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/60 space-y-1">
                      <span className="text-[11px] text-slate-400 font-semibold block">📄 Modul Bahan Ajar</span>
                      <p className="text-lg font-black text-emerald-400 font-display">{materialsList.length} Modul</p>
                      <p className="text-[10px] text-slate-500 font-mono">Collection: materials</p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/60 space-y-1">
                      <span className="text-[11px] text-slate-400 font-semibold block">🎬 Video Ruang Vidio</span>
                      <p className="text-lg font-black text-purple-400 font-display">{videosList.length} Video</p>
                      <p className="text-[10px] text-slate-500 font-mono">Collection: videos</p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/60 space-y-1">
                      <span className="text-[11px] text-slate-400 font-semibold block">📢 Pengumuman</span>
                      <p className="text-lg font-black text-amber-300 font-display">{announcementsList.length} Berita</p>
                      <p className="text-[10px] text-slate-500 font-mono">Collection: announcements</p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/60 space-y-1">
                      <span className="text-[11px] text-slate-400 font-semibold block">📅 Jadwal Pelajaran</span>
                      <p className="text-lg font-black text-indigo-400 font-display">{schedulesList.length} Sesi</p>
                      <p className="text-[10px] text-slate-500 font-mono">Collection: schedules</p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/60 space-y-1">
                      <span className="text-[11px] text-slate-400 font-semibold block">📊 Presensi Kehadiran</span>
                      <p className="text-lg font-black text-teal-400 font-display">{attendanceList.length} Log</p>
                      <p className="text-[10px] text-slate-500 font-mono">Collection: attendance</p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/60 space-y-1">
                      <span className="text-[11px] text-slate-400 font-semibold block">🏆 Submisi Nilai Siswa</span>
                      <p className="text-lg font-black text-fuchsia-400 font-display">{submissionsList.length} Nilai</p>
                      <p className="text-[10px] text-slate-500 font-mono">Collection: quiz_submissions</p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/60 space-y-1">
                      <span className="text-[11px] text-slate-400 font-semibold block">🏫 Profil Sekolah</span>
                      <p className="text-lg font-black text-emerald-300 font-display">Terkonfigurasi</p>
                      <p className="text-[10px] text-slate-500 font-mono">Collection: settings</p>
                    </div>
                  </div>
                </div>

                {/* Cloud Sync & Backup Actions Bar */}
                <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
                  <div>
                    <h5 className="text-xs font-bold text-white flex items-center gap-2">
                      <FolderSync className="w-4 h-4 text-sky-400" />
                      <span>Alat Pencadangan (Backup) & Pemulihan (Restore) Basis Data Mandiri</span>
                    </h5>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Unduh seluruh isi database sekolah dalam format JSON tunggal untuk cadangan offline, atau pulihkan data kapan saja setelah deploy ke Vercel.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      disabled={isExportingDb}
                      onClick={handleExportDatabase}
                      className="cursor-pointer px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sky-400 text-xs font-bold flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-sm"
                    >
                      {isExportingDb ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
                      ) : (
                        <Download className="w-4 h-4 text-sky-400" />
                      )}
                      <span>{isExportingDb ? 'Mengekspor...' : 'Unduh Backup Basis Data (.JSON)'}</span>
                    </button>

                    <label className="cursor-pointer px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-400 text-xs font-bold flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-sm select-none">
                      {isImportingDb ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                      ) : (
                        <UploadCloud className="w-4 h-4 text-emerald-400" />
                      )}
                      <span>{isImportingDb ? 'Memulihkan...' : 'Pulihkan / Import Data (.JSON)'}</span>
                      <input
                        type="file"
                        accept=".json,application/json"
                        disabled={isImportingDb}
                        onChange={handleImportDatabaseFile}
                        className="hidden"
                      />
                    </label>

                    <button
                      type="button"
                      disabled={isSyncingDb}
                      onClick={handleForceSyncCloud}
                      className="cursor-pointer px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500/20 to-blue-600/20 hover:from-sky-500/30 hover:to-blue-600/30 border border-sky-500/40 text-sky-300 text-xs font-bold flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-sm"
                    >
                      {isSyncingDb ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-sky-300" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-sky-300" />
                      )}
                      <span>{isSyncingDb ? 'Menyinkronkan...' : 'Sinkronkan Seluruh Data ke Cloud Firestore'}</span>
                    </button>
                  </div>
                </div>

                {/* Vercel Deployment Persistence Guide Box */}
                <div className="p-4 rounded-2xl bg-sky-950/30 border border-sky-500/20 flex items-start gap-3 text-xs text-sky-200/90 leading-relaxed">
                  <ShieldCheck className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white font-bold block mb-1">
                      Jaminan Keamanan & Ketahanan Data Saat Deploy ke Vercel:
                    </strong>
                    Semua penambahan, perubahan, dan penghapusan (Buku Digital, Kuis & Soal Ujian, Akun Siswa/Guru/Admin, Modul Materi, Video, Presensi, dan Pengaturan) terikat langsung ke instans Firestore Cloud terpusat. Ketika aplikasi di-build atau di-deploy di Vercel, seluruh data tetap tersimpan aman di cloud server dan tidak akan pernah terhapus atau hilang.
                  </div>
                </div>
              </div>

              {/* System Specifications Card */}
              <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-5">
                <div className="flex justify-between items-center border-b border-slate-700/60 pb-4">
                  <div>
                    <h4 className="text-base font-extrabold text-white font-display">Informasi Lingkungan Operasi LMS</h4>
                    <p className="text-xs text-slate-300">Arsitektur portal sekolah SD Negeri Sumberejo 04</p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                    Production Ready
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1.5 backdrop-blur-sm shadow-sm">
                    <span className="text-slate-400 font-medium">Framework & Frontend Engine</span>
                    <p className="font-bold text-white">React 18 + TypeScript + Vite + Tailwind Dark Theme</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1.5 backdrop-blur-sm shadow-sm">
                    <span className="text-slate-400 font-medium">Database Persistence & Sync</span>
                    <p className="font-bold text-white">Google Cloud Firestore (Real-time snapshots & offline cache)</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1.5 backdrop-blur-sm shadow-sm">
                    <span className="text-slate-400 font-medium">AI Question Parsing Engine</span>
                    <p className="font-bold text-white">Gemini Multimodal Vision + Mammoth .docx Extractor</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1.5 backdrop-blur-sm shadow-sm">
                    <span className="text-slate-400 font-medium">Enkripsi & Keamanan Login</span>
                    <p className="font-bold text-white">NIP / NISN Identifier Authentication + Role Based Access</p>
                  </div>
                </div>
              </div>

            </div>
          )}

        </main>
      </div>

      {/* MODAL: Tambah Pengguna Baru */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base font-display">Tambah Akun Pengguna Baru</h3>
              <button onClick={() => setShowAddUserModal(false)} className="text-slate-400 hover:text-white transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Peran (Role)</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as any)}
                  className="w-full bg-slate-800/70 border border-slate-700/60 rounded-xl px-3.5 py-2.5 text-xs text-white font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="siswa">Siswa / Peserta Didik</option>
                  <option value="guru">Guru / Tenaga Pengajar</option>
                  <option value="admin">Administrator Pusat</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Contoh: Ahmad Subagyo, S.Pd"
                  className="w-full bg-slate-800/70 border border-slate-700/60 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  {newUserRole === 'siswa' ? 'NISN (10 Digit)' : 'NIP / Username Login'}
                </label>
                <input
                  type="text"
                  required
                  value={newUserIdentifier}
                  onChange={(e) => setNewUserIdentifier(e.target.value)}
                  placeholder={newUserRole === 'siswa' ? '0068499999' : '199001012020...'}
                  className="w-full bg-slate-800/70 border border-slate-700/60 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  {newUserRole === 'siswa' ? 'Rombel / Kelas' : newUserRole === 'guru' ? 'Mata Pelajaran' : 'Divisi'}
                </label>
                <input
                  type="text"
                  value={newUserDepartment}
                  onChange={(e) => setNewUserDepartment(e.target.value)}
                  placeholder={newUserRole === 'siswa' ? 'Kelas 4A' : 'Matematika'}
                  className="w-full bg-slate-800/70 border border-slate-700/60 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800 mt-4">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold btn-gradient-primary text-white shadow-md cursor-pointer transition-all active:scale-95"
                >
                  Simpan Pengguna
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Data Pengguna */}
      {showEditUserModal && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base font-display">Edit Data Pengguna</h3>
              <button
                onClick={() => {
                  setShowEditUserModal(false);
                  setEditingUser(null);
                }}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Peran Akses (Role)</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as any)}
                  className="w-full bg-slate-800/70 border border-slate-700/60 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="siswa">Siswa / Peserta Didik</option>
                  <option value="guru">Guru / Tenaga Pengajar</option>
                  <option value="admin">Administrator Pusat</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-800/70 border border-slate-700/60 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {editRole === 'siswa' ? 'NISN Siswa' : 'NIP / Username'}
                  </label>
                  <input
                    type="text"
                    required
                    value={editIdentifier}
                    onChange={(e) => setEditIdentifier(e.target.value)}
                    className="w-full bg-slate-800/70 border border-slate-700/60 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Status Akun</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full bg-slate-800/70 border border-slate-700/60 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="active">Aktif</option>
                    <option value="inactive">Nonaktif</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  {editRole === 'siswa' ? 'Rombel / Kelas' : editRole === 'guru' ? 'Mata Pelajaran' : 'Divisi'}
                </label>
                <input
                  type="text"
                  value={editDepartmentOrClass}
                  onChange={(e) => setEditDepartmentOrClass(e.target.value)}
                  className="w-full bg-slate-800/70 border border-slate-700/60 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditUserModal(false);
                    setEditingUser(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#ff5c00] hover:bg-[#e05200] text-white shadow-md cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

          {/* MODAL: Generate Username / NIP Guru */}
          {showGenerateGuruModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-amber-500/50 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base font-display">Generate Akses Akun Guru</h3>
                <p className="text-xs text-slate-400">Buat NIP & kredensial login portal guru</p>
              </div>
            </div>

            <form onSubmit={handleSaveGenerateGuru} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Nama Lengkap & Gelar</label>
                <input
                  type="text"
                  required
                  value={genGuruName}
                  onChange={(e) => setGenGuruName(e.target.value)}
                  placeholder="Contoh: Siti Rahmawati, S.Pd.SD"
                  className="w-full bg-slate-800/70 border border-slate-700/60 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-slate-300">NIP Login (18 Digit)</label>
                  <button
                    type="button"
                    onClick={handleAutoGenerateNip}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Acak NIP</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={genGuruNip}
                  onChange={(e) => setGenGuruNip(e.target.value)}
                  className="w-full bg-slate-800/70 border border-slate-700/60 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Mata Pelajaran / Rombel</label>
                <input
                  type="text"
                  value={genGuruSubject}
                  onChange={(e) => setGenGuruSubject(e.target.value)}
                  placeholder="Contoh: Matematika Kelas 4 & 5"
                  className="w-full bg-slate-800/70 border border-slate-700/60 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Password Default</label>
                <input
                  type="text"
                  value={genGuruPassword}
                  onChange={(e) => setGenGuruPassword(e.target.value)}
                  className="w-full bg-slate-800/70 border border-slate-700/60 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800 mt-4">
                <button
                  type="button"
                  onClick={() => setShowGenerateGuruModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold btn-gradient-amber text-slate-950 shadow-md cursor-pointer transition-all active:scale-95"
                >
                  Terbitkan Akun Guru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Generate Username / NISN Siswa */}
      {showGenerateSiswaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-blue-500/50 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              <div className="p-2.5 rounded-2xl bg-blue-500/20 text-blue-300 border border-blue-500/30">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base font-display">Generate Akses Akun Siswa</h3>
                <p className="text-xs text-slate-400">Buat NISN & kredensial login portal siswa</p>
              </div>
            </div>

            <form onSubmit={handleSaveGenerateSiswa} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Nama Lengkap Siswa</label>
                <input
                  type="text"
                  required
                  value={genSiswaName}
                  onChange={(e) => setGenSiswaName(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full bg-slate-800/70 border border-slate-700/60 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-slate-300">NISN / Username Login</label>
                  <button
                    type="button"
                    onClick={handleAutoGenerateNisn}
                    className="text-[11px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Acak NISN</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={genSiswaNisn}
                  onChange={(e) => setGenSiswaNisn(e.target.value)}
                  className="w-full bg-slate-800/70 border border-slate-700/60 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Kelas / Rombel</label>
                <select
                  value={genSiswaClass}
                  onChange={(e) => setGenSiswaClass(e.target.value)}
                  className="w-full bg-slate-800/70 border border-slate-700/60 rounded-xl px-3.5 py-2.5 text-xs text-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Kelas 4A">Kelas 4A</option>
                  <option value="Kelas 4B">Kelas 4B</option>
                  <option value="Kelas 5A">Kelas 5A</option>
                  <option value="Kelas 5B">Kelas 5B</option>
                  <option value="Kelas 6">Kelas 6</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Password Default</label>
                <input
                  type="text"
                  value={genSiswaPassword}
                  onChange={(e) => setGenSiswaPassword(e.target.value)}
                  className="w-full bg-slate-800/70 border border-slate-700/60 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800 mt-4">
                <button
                  type="button"
                  onClick={() => setShowGenerateSiswaModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md cursor-pointer transition-all active:scale-95"
                >
                  Terbitkan Akun Siswa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Tambah Pengumuman */}
      {showAddAnnouncementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base font-display">Buat Pengumuman Sekolah</h3>
              <button onClick={() => setShowAddAnnouncementModal(false)} className="text-slate-400 hover:text-white transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAnnouncement} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Target Pengumuman</label>
                <select
                  value={newAnnouncementTargetRole}
                  onChange={(e) => setNewAnnouncementTargetRole(e.target.value as any)}
                  className="w-full bg-slate-800/70 border border-slate-700/60 rounded-xl px-3.5 py-2.5 text-xs text-white font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="all">Semua Warga Sekolah (Siswa & Guru)</option>
                  <option value="guru">Hanya Dewan Guru</option>
                  <option value="siswa">Hanya Peserta Didik</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Judul Pengumuman</label>
                <input
                  type="text"
                  required
                  value={newAnnouncementTitle}
                  onChange={(e) => setNewAnnouncementTitle(e.target.value)}
                  placeholder="Contoh: Jadwal Penilaian Akhir Semester Ganjil"
                  className="w-full bg-slate-800/70 border border-slate-700/60 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Isi Pesan Pengumuman</label>
                <textarea
                  rows={4}
                  required
                  value={newAnnouncementContent}
                  onChange={(e) => setNewAnnouncementContent(e.target.value)}
                  placeholder="Tuliskan detail instruksi, batas waktu, atau pemberitahuan..."
                  className="w-full bg-slate-800/70 border border-slate-700/60 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800 mt-4">
                <button
                  type="button"
                  onClick={() => setShowAddAnnouncementModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold btn-gradient-primary text-white shadow-md cursor-pointer transition-all active:scale-95"
                >
                  Terbitkan Pengumuman
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Full Activity Logs */}
      {showFullLogsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2 font-display">
                <History className="w-5 h-5 text-sky-400" />
                <span>Audit & System Activity Log</span>
              </h3>
              <button onClick={() => setShowFullLogsModal(false)} className="text-slate-400 hover:text-white transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[360px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
              {activityLogs.map((item) => (
                <div key={item.id} className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-start gap-3 backdrop-blur-sm">
                  <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 shadow-sm ${
                    item.type === 'primary' ? 'bg-sky-400 shadow-sky-500/50' :
                    item.type === 'tertiary' ? 'bg-purple-400 shadow-purple-500/50' :
                    item.type === 'secondary' ? 'bg-amber-400 shadow-amber-500/50' : 'bg-slate-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="text-xs font-bold text-white">{item.title}</h4>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">{item.time}</span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-1">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end border-t border-slate-800 mt-2">
              <button
                onClick={() => setShowFullLogsModal(false)}
                className="px-4 py-2.5 mt-2 rounded-xl text-xs font-bold bg-slate-800 text-white hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfileModal && (
        <UserProfileModal
          isOpen={showProfileModal}
          currentUser={currentUser}
          onClose={() => setShowProfileModal(false)}
          onUpdateUser={(updated) => {
            if (onUpdateCurrentUser) onUpdateCurrentUser(updated);
            setShowProfileModal(false);
            triggerToast('Profil administrator berhasil diperbarui.');
          }}
          schoolSettings={schoolSettings}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          isOpen={true}
          itemName={deleteTarget.title}
          itemType={deleteTarget.type}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Delete Success Modal */}
      {deletedSuccessItem && (
        <DeleteSuccessModal
          isOpen={true}
          itemName={deletedSuccessItem.title}
          itemType={deletedSuccessItem.type}
          onClose={() => setDeletedSuccessItem(null)}
        />
      )}

    </div>
  );
};
