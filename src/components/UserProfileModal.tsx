import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Mail, Shield, Phone, School, KeyRound, Save, X, 
  CheckCircle2, Camera, Sparkles, BookOpen, Award, Clock,
  Calendar, Check, AlertCircle, RefreshCw, QrCode, Lock,
  Upload, Image as ImageIcon, Trash2, CheckCircle, Info
} from 'lucide-react';
import { UserProfile } from '../types';
import { updateUserInDb } from '../lib/lmsDb';

interface UserProfileModalProps {
  isOpen: boolean;
  user: UserProfile;
  onClose: () => void;
  onUpdateUser?: (updatedUser: UserProfile) => void;
  onLogout?: () => void;
}

const PRESET_AVATARS = [

];

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  user,
  onClose,
  onUpdateUser,
  onLogout
}) => {
  const isPrivileged = user?.role === 'admin' || user?.role === 'guru';

  const [activeTab, setActiveTab] = useState<'info' | 'edit' | 'security' | 'card'>('info');
  const [name, setName] = useState(user?.name || '');
  const [identifierNumber, setIdentifierNumber] = useState(user?.identifierNumber || '');
  const [departmentOrClass, setDepartmentOrClass] = useState(user?.departmentOrClass || '');
  const [phone, setPhone] = useState(user?.phone || '0812-3456-7890');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);

  // Admin Custom security state
  const [adminUsername, setAdminUsername] = useState(localStorage.getItem('edusmart_admin_custom_username') || 'admin');
  const [adminPassword, setAdminPassword] = useState(localStorage.getItem('edusmart_admin_custom_password') || 'admin123');

  // Sync state when user prop changes or modal opens
  React.useEffect(() => {
    if (user) {
      setName(user.name || '');
      setIdentifierNumber(user.identifierNumber || '');
      setDepartmentOrClass(user.departmentOrClass || '');
      setPhone(user.phone || '0812-3456-7890');
      setAvatar(user.avatar || '');
      if (user.role === 'admin') {
        setAdminUsername(localStorage.getItem('edusmart_admin_custom_username') || 'admin');
        setAdminPassword(localStorage.getItem('edusmart_admin_custom_password') || 'admin123');
      }
    }
  }, [user, isOpen]);

  // Hidden File Input Ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Security state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securitySuccess, setSecuritySuccess] = useState(false);
  const [securityError, setSecurityError] = useState<string | null>(null);

  // Toast / Save notification
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen || !user) return null;

  const getRoleBadge = () => {
    switch (user?.role) {
      case 'admin':
        return {
          title: 'Super Administrator',
          badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
          gradient: 'from-purple-600 via-indigo-600 to-slate-900',
          accentColor: 'text-purple-400',
          iconColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20'
        };
      case 'guru':
        return {
          title: 'Tenaga Pendidik / Guru',
          badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          gradient: 'from-emerald-600 via-teal-600 to-slate-900',
          accentColor: 'text-emerald-400',
          iconColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
        };
      case 'siswa':
      default:
        return {
          title: 'Siswa / Peserta Didik',
          badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
          gradient: 'from-blue-600 via-sky-600 to-slate-900',
          accentColor: 'text-blue-400',
          iconColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20'
        };
    }
  };

  const roleStyle = getRoleBadge();

  // Compress & Resize image to square high-quality avatar base64
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Mohon pilih file gambar yang valid (JPG, PNG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 400; // max width/height
        let width = img.width;
        let height = img.height;

        // Crop center square
        const minDim = Math.min(width, height);
        const startX = (width - minDim) / 2;
        const startY = (height - minDim) / 2;

        canvas.width = Math.min(minDim, maxSize);
        canvas.height = Math.min(minDim, maxSize);

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(
            img,
            startX,
            startY,
            minDim,
            minDim,
            0,
            0,
            canvas.width,
            canvas.height
          );
          const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
          setAvatar(dataUrl);
          setUploadSuccessMsg('Foto profil berhasil dimuat!');
          setTimeout(() => setUploadSuccessMsg(null), 3000);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const triggerUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const updated: UserProfile = {
      ...user,
      name,
      identifierNumber,
      departmentOrClass,
      phone,
      avatar
    };

    try {
      await updateUserInDb(updated);
      if (onUpdateUser) {
        onUpdateUser(updated);
      }
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setActiveTab('info');
      }, 1200);
    } catch (err) {
      console.warn('Update user profile error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityError(null);

    if (user.role === 'admin') {
      if (!adminUsername.trim()) {
        setSecurityError('Username admin tidak boleh kosong');
        return;
      }
      if (adminPassword.length < 4) {
        setSecurityError('Password admin minimal 4 karakter');
        return;
      }

      localStorage.setItem('edusmart_admin_custom_username', adminUsername.trim());
      localStorage.setItem('edusmart_admin_custom_password', adminPassword);

      const updated: UserProfile = {
        ...user,
        identifierNumber: adminUsername.trim(),
        password: adminPassword
      };

      try {
        await updateUserInDb(updated);
        if (onUpdateUser) {
          onUpdateUser(updated);
        }
        setSecuritySuccess(true);
        setTimeout(() => {
          setSecuritySuccess(false);
          setActiveTab('info');
        }, 1500);
      } catch (err) {
        console.error('Failed to update admin profile:', err);
        setSecurityError('Gagal memperbarui profil keamanan');
      }
    } else {
      if (!newPassword || newPassword.length < 6) {
        setSecurityError('Kata sandi baru minimal 6 karakter');
        return;
      }

      if (newPassword !== confirmPassword) {
        setSecurityError('Konfirmasi kata sandi tidak cocok');
        return;
      }

      setSecuritySuccess(true);
      setTimeout(() => {
        setSecuritySuccess(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setActiveTab('info');
      }, 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
      {/* Hidden File Input for Admin & Guru */}
      {isPrivileged && (
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          accept="image/png, image/jpeg, image/jpg, image/webp"
          className="hidden"
        />
      )}

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-2xl bg-[#ebf3fc] text-slate-800 rounded-3xl shadow-2xl border border-blue-200 overflow-hidden flex flex-col max-h-[90vh] glass-card"
      >
        {/* Banner Cover Top */}
        <div className={`h-28 bg-gradient-to-r ${roleStyle.gradient} relative px-6 flex items-start justify-between pt-4 shrink-0`}>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-black/40 text-white backdrop-blur-sm border border-white/10 flex items-center gap-1.5">
              <Shield className="w-3 h-3" />
              {roleStyle.title}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Profile Card Header Info */}
        <div className="px-6 pb-4 pt-0 relative bg-[#e2ecf8]/80 border-b border-blue-200 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 mb-3">
            <div className="flex items-end gap-3.5">
              <div className="relative group">
                <img
                  src={avatar}
                  alt={name}
                  className="w-20 h-20 rounded-2xl object-cover border-4 border-[#ebf3fc] shadow-xl bg-slate-100"
                />
                
                {/* Camera / Upload trigger icon */}
                {isPrivileged ? (
                  <button
                    type="button"
                    onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                    className="absolute bottom-0 right-0 p-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white border-2 border-white shadow-md transition-transform hover:scale-105"
                    title="Ganti atau Unggah Foto Profil"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                    className="absolute bottom-0 right-0 p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border-2 border-white shadow-md transition-transform hover:scale-105"
                    title="Pilih Avatar Profil"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="space-y-0.5 pb-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900 leading-tight">{name}</h2>
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-semibold bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    Aktif
                  </span>
                </div>
              </div>
            </div>

            {/* Tab Navigation Switches */}
            <div className="flex items-center gap-1 bg-blue-100/70 p-1 rounded-xl border border-blue-200 text-xs">
              <button
                onClick={() => { setActiveTab('info'); setShowAvatarPicker(false); }}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  activeTab === 'info' ? 'bg-indigo-600 text-white shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Biodata
              </button>
              <button
                onClick={() => { setActiveTab('edit'); setShowAvatarPicker(false); }}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  activeTab === 'edit' ? 'bg-indigo-600 text-white shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Edit Profil
              </button>
              <button
                onClick={() => { setActiveTab('security'); setShowAvatarPicker(false); }}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  activeTab === 'security' ? 'bg-indigo-600 text-white shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Keamanan
              </button>
              <button
                onClick={() => { setActiveTab('card'); setShowAvatarPicker(false); }}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  activeTab === 'card' ? 'bg-indigo-600 text-white shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                KTA Digital
              </button>
            </div>
          </div>

          {/* Quick Avatar Picker & Upload Drawer */}
          {showAvatarPicker && (
            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 mb-2 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  {isPrivileged ? 'Pengaturan Foto Profil:' : 'Pilih Avatar Profil Siswa:'}
                </span>
                <button
                  onClick={() => setShowAvatarPicker(false)}
                  className="text-slate-500 hover:text-white text-[11px]"
                >
                  Tutup
                </button>
              </div>

              {/* Upload Notification if any */}
              {uploadSuccessMsg && (
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" />
                  {uploadSuccessMsg}
                </div>
              )}

              {/* SPECIAL UPLOAD BUTTON FOR GURU & ADMIN */}
              {isPrivileged ? (
                <div className="p-3 rounded-xl bg-slate-900/90 border border-indigo-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-300 uppercase">
                        Khusus {user.role === 'admin' ? 'Admin' : 'Guru'}
                      </span>
                      <p className="text-xs font-bold text-white">Upload Foto Dari Perangkat</p>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Format JPG, PNG, WEBP. Otomatis dipotong dan dioptimalkan.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={triggerUploadClick}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Pilih & Upload Foto</span>
                  </button>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>Siswa dapat memilih dari avatar resmi di bawah ini. Fitur upload foto mandiri disediakan untuk akun Guru dan Admin.</span>
                </div>
              )}

              {/* Preset Avatars */}
              <div>
                <p className="text-[11px] text-slate-400 mb-1.5">Atau pilih avatar default:</p>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {PRESET_AVATARS.map((av, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => { setAvatar(av); setUploadSuccessMsg('Avatar dipilih!'); setTimeout(() => setUploadSuccessMsg(null), 2000); }}
                      className={`shrink-0 rounded-xl overflow-hidden border-2 transition-transform hover:scale-105 ${
                        avatar === av ? 'border-indigo-500 ring-2 ring-indigo-500/40' : 'border-slate-800'
                      }`}
                    >
                      <img src={av} alt="Preset avatar" className="w-11 h-11 object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Content Body - Scrollable */}
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
          {/* TAB 1: INFO / BIODATA RINGKAS */}
          {activeTab === 'info' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
                    <User className="w-3.5 h-3.5 text-indigo-400" />
                    Nama Lengkap
                  </span>
                  <p className="text-sm font-semibold text-white">{name}</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
                    <Shield className="w-3.5 h-3.5 text-emerald-400" />
                    {user.role === 'siswa' ? 'Nomor Induk Siswa (NISN)' : 'Nomor Induk Pegawai (NIP)'}
                  </span>
                  <p className="text-sm font-mono font-semibold text-white">{identifierNumber || '-'}</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
                    <School className="w-3.5 h-3.5 text-amber-400" />
                    {user.role === 'siswa' ? 'Kelas & Jurusan' : user.role === 'guru' ? 'Mata Pelajaran' : 'Departemen'}
                  </span>
                  <p className="text-sm font-semibold text-white">{departmentOrClass || '-'}</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
                    <Phone className="w-3.5 h-3.5 text-teal-400" />
                    Kontak WhatsApp
                  </span>
                  <p className="text-sm font-mono font-semibold text-white">{phone}</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
                    <Clock className="w-3.5 h-3.5 text-purple-400" />
                    Status Sesi & Akses
                  </span>
                  <p className="text-sm font-semibold text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    Terverifikasi (Online)
                  </p>
                </div>
              </div>

              {/* Role Specific Highlight Card */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <Award className="w-4 h-4 text-indigo-400" />
                    Ringkasan Akses LMS
                  </h4>
                  <span className="text-[11px] text-slate-500">EduSmart Portal</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {user.role === 'admin' && 'Akun ini memiliki hak akses penuh Super Administrator untuk mengelola seluruh data guru, siswa, pengumuman sekolah, serta manajemen server.'}
                  {user.role === 'guru' && `Akun Tenaga Pengajar resmi untuk modul ${departmentOrClass || 'Mata Pelajaran'}. Berhak mengunggah bahan ajar PDF, membuat quiz interaktif, input presensi, dan mengunggah video.`}
                  {user.role === 'siswa' && `Terdaftar resmi sebagai siswa aktif ${departmentOrClass || 'Kelas XI'}. Berhak mengakses materi, mengerjakan quiz harian, membaca perpustakaan digital, dan melihat nilai.`}
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: EDIT PROFIL */}
          {activeTab === 'edit' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              {saveSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Profil berhasil disimpan dan diperbarui!
                </div>
              )}

              {/* Foto Profil Field in Edit Tab */}
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <img
                    src={avatar}
                    alt={name}
                    className="w-14 h-14 rounded-2xl object-cover border border-slate-700 bg-slate-900 shrink-0"
                  />
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-white">Foto Profil Saat Ini</p>
                    <p className="text-[11px] text-slate-400">
                      {isPrivileged
                        ? 'Klik tombol untuk mengunggah foto baru dari komputer/ponsel'
                        : 'Pilih avatar yang tersedia pada tab biodata'}
                    </p>
                  </div>
                </div>

                {isPrivileged && (
                  <button
                    type="button"
                    onClick={triggerUploadClick}
                    className="w-full sm:w-auto px-3.5 py-2 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Foto Baru</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Nama Lengkap</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    {user.role === 'siswa' ? 'NISN (Nomor Induk Siswa)' : 'NIP (Nomor Induk Pegawai)'}
                  </label>
                  <input
                    type="text"
                    value={identifierNumber}
                    onChange={(e) => setIdentifierNumber(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    {user.role === 'siswa' ? 'Kelas & Jurusan' : user.role === 'guru' ? 'Mata Pelajaran' : 'Departemen'}
                  </label>
                  <input
                    type="text"
                    value={departmentOrClass}
                    onChange={(e) => setDepartmentOrClass(e.target.value)}
                    placeholder="Contoh: XI MIPA 1 / Matematika"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-medium text-slate-300">Nomor WhatsApp / Telepon</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0812-xxxx-xxxx"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('info')}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Simpan Perubahan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: KEAMANAN & PASSWORD */}
          {activeTab === 'security' && (
            <form onSubmit={handleSaveSecurity} className="space-y-4">
              {securitySuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  {user.role === 'admin' ? 'Profil keamanan Administrator berhasil disimpan!' : 'Kata sandi berhasil diperbarui dengan aman!'}
                </div>
              )}

              {securityError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {securityError}
                </div>
              )}

              {user.role === 'admin' ? (
                <>
                  <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-200 flex items-start gap-2.5">
                    <Lock className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <p>
                      Atur username administrator kustom Anda beserta password rahasia baru untuk mengamankan akses panel admin global.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-300">Username Administrator</label>
                      <input
                        type="text"
                        value={adminUsername}
                        onChange={(e) => setAdminUsername(e.target.value)}
                        placeholder="Contoh: admin / administrator"
                        required
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-300">Password Administrator Baru</label>
                      <input
                        type="password"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="Minimal 4 karakter"
                        required
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-200 flex items-start gap-2.5">
                    <Lock className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <p>
                      Gunakan kombinasi minimal 6 karakter yang kuat untuk menjaga keamanan akun LMS Anda.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-300">Kata Sandi Saat Ini</label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-300">Kata Sandi Baru</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Minimal 6 karakter"
                        required
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-300">Konfirmasi Kata Sandi Baru</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Ulangi kata sandi baru"
                        required
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setSecurityError(null);
                    if (user.role === 'admin') {
                      setAdminUsername(localStorage.getItem('edusmart_admin_custom_username') || 'admin');
                      setAdminPassword(localStorage.getItem('edusmart_admin_custom_password') || 'admin123');
                    }
                    setActiveTab('info');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{user.role === 'admin' ? 'Simpan Profil Keamanan' : 'Perbarui Kata Sandi'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: KTA DIGITAL / KARTU TANDA */}
          {activeTab === 'card' && (
            <div className="flex flex-col items-center justify-center py-2 space-y-4">
              <div className={`w-full max-w-md bg-gradient-to-br ${roleStyle.gradient} rounded-3xl p-5 border border-white/10 shadow-2xl relative overflow-hidden text-white space-y-4`}>
                <div className="flex items-center justify-between border-b border-white/15 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center font-bold">
                      🎓
                    </div>
                    <div>
                      <h4 className="font-bold text-xs leading-tight">SMA / SMK EDUSMART</h4>
                      <p className="text-[10px] text-white/80">Kartu Identitas Digital Resmi</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-white/20 uppercase tracking-wider">
                    {user.role}
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <img
                    src={avatar}
                    alt={name}
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-white/30 shadow-lg shrink-0"
                  />
                  <div className="space-y-1 min-w-0">
                    <h3 className="font-bold text-sm truncate text-white">{name}</h3>
                    <p className="text-[11px] font-mono text-white/90">
                      {user.role === 'siswa' ? 'NISN' : 'NIP'}: {identifierNumber}
                    </p>
                    <p className="text-[11px] text-white/80 truncate">
                      {departmentOrClass || (user.role === 'admin' ? 'Pusat Administrator' : 'Akademik')}
                    </p>
                    <p className="text-[10px] text-emerald-300 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Status: Terverifikasi
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/15 flex items-center justify-between text-[10px] text-white/70 font-mono">
                  <span>EXP: 2027/2028</span>
                  <span className="flex items-center gap-1 text-white">
                    <QrCode className="w-3.5 h-3.5" /> ID #{user.id.slice(0, 8)}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-500 text-center">
                Kartu identitas ini dapat digunakan untuk presensi mandiri dan verifikasi ujian sekolah.
              </p>
            </div>
          )}
        </div>

        {/* Footer Bar */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs shrink-0">
          <span className="text-slate-500 text-[11px]">
            LMS EduSmart Portal • v2.4
          </span>

          <div className="flex items-center gap-2">
            {onLogout && (
              <button
                type="button"
                onClick={() => { onClose(); onLogout(); }}
                className="px-3 py-1.5 rounded-xl text-rose-400 hover:bg-rose-500/10 font-semibold transition-colors"
              >
                Keluar Akun
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
