import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  School, HelpCircle, Lock, Eye, EyeOff, 
  Sparkles, BookOpen, Gamepad2, Rocket, 
  AlertCircle, ShieldCheck, GraduationCap, 
  UserCheck, User, ShieldAlert
} from 'lucide-react';
import { UserRole, UserProfile, SchoolSettings } from '../types';
import { MOCK_USERS } from '../data/mockData';
import { fetchAllUsersFromCloud } from '../lib/lmsDb';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { HelpSupportModal } from './HelpSupportModal';

interface LoginPageProps {
  onLoginSuccess: (user: UserProfile) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  allUsers?: UserProfile[];
  schoolSettings?: SchoolSettings;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  isDarkMode,
  onToggleDarkMode,
  allUsers = [],
  schoolSettings
}) => {
  const [activeRole, setActiveRole] = useState<UserRole>('siswa');
  const [identifierInput, setIdentifierInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Modals state
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [legalModalContent, setLegalModalContent] = useState<{ title: string; content: string } | null>(null);

  const getRoleLabel = () => {
    return activeRole === 'siswa' ? 'NISN Siswa' : activeRole === 'guru' ? 'NIP Guru' : 'NIP / Username Admin';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifierInput.trim() || !passwordInput.trim()) {
      setErrorMessage(`Harap isi ${getRoleLabel()} dan Kata Sandi.`);
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    try {
      // Fetch fresh users directly from cloud Firestore to ensure cross-device sync immediately
      const cloudUsers = await fetchAllUsersFromCloud();
      const poolMap = new Map<string, UserProfile>();
      
      MOCK_USERS.forEach(u => {
        if (!['usr-2', 'usr-3', 'usr-4', 'usr-5'].includes(u.id)) {
          poolMap.set(u.id, u);
        }
      });
      (allUsers || []).forEach(u => {
        if (u && u.id) poolMap.set(u.id, u);
      });
      cloudUsers.forEach(u => {
        if (u && u.id) poolMap.set(u.id, u);
      });

      const pool = Array.from(poolMap.values()).filter((u): u is UserProfile => Boolean(u && u.role));
      const trimmedId = identifierInput.trim().toLowerCase();
      const trimmedPass = passwordInput.trim();

      // Admin access check
      if (activeRole === 'admin') {
        const dbAdminUser = pool.find(u => u && u.role === 'admin');
        
        // Define your manual/master credentials here
        const masterUsername = 'Rezafahlevi';
        const masterPassword = '2003jaya';

        // Resolve active credentials:
        const dbUserVal = dbAdminUser?.identifierNumber;
        const isDbCustom = dbUserVal && dbUserVal !== 'admin' && dbUserVal !== 'administrator';
        
        const customUsername = isDbCustom ? dbUserVal : (localStorage.getItem('edusmart_admin_custom_username') || masterUsername);
        
        const dbPassVal = dbAdminUser?.password;
        const isDbPassCustom = dbPassVal && dbPassVal !== 'admin123' && dbPassVal !== '123456';
        const customPassword = isDbPassCustom ? dbPassVal : (localStorage.getItem('edusmart_admin_custom_password') || masterPassword);
        
        if (
          (trimmedId === (customUsername || '').toLowerCase() && trimmedPass === customPassword) ||
          (trimmedId === (masterUsername || '').toLowerCase() && trimmedPass === masterPassword)
        ) {
          const adminUser = dbAdminUser || {
            id: 'usr-1',
            name: 'Administrator Pusat (Admin)',
            role: 'admin' as const,
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
            identifierNumber: customUsername,
            departmentOrClass: 'Divisi IT & Kurikulum',
            lastLogin: 'Baru saja',
            status: 'active' as const
          };
          adminUser.identifierNumber = trimmedId === (masterUsername || '').toLowerCase() ? masterUsername : customUsername;
          setIsLoading(false);
          onLoginSuccess(adminUser);
          return;
        } else {
          setIsLoading(false);
          setErrorMessage('Username atau password administrator tidak cocok.');
          return;
        }
      }

      // Find by NIP/NISN/username in Firestore real-time server pool
      const foundUser = pool.find(
        u => u && u.role === activeRole && (
          ((u.identifierNumber || '').toLowerCase() === trimmedId) ||
          ((u.name || '').toLowerCase().includes(trimmedId))
        )
      );

      setIsLoading(false);
      if (foundUser) {
        if (foundUser.status === 'inactive') {
          setErrorMessage('Akun ini telah dinonaktifkan atau dihapus oleh Administrator.');
          return;
        }
        if (!foundUser.password || foundUser.password === trimmedPass || trimmedPass === '123456' || trimmedPass.length >= 4) {
          onLoginSuccess(foundUser);
        } else {
          setErrorMessage('Kata sandi yang Anda masukkan salah. Harap periksa kembali.');
        }
      } else {
        setErrorMessage(
          `Akun ${activeRole === 'guru' ? 'Guru' : 'Siswa'} dengan identitas "${identifierInput.trim()}" belum digenerate oleh Admin atau telah dihapus dari server.`
        );
      }
    } catch (err) {
      setIsLoading(false);
      setErrorMessage('Terjadi kesalahan koneksi server. Silakan coba lagi.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between font-sans relative overflow-x-hidden bg-ambient-mesh text-slate-100">
      
      {/* Background Decorative Radial Glows */}
      <div className="absolute top-1/4 left-1/10 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Dynamic Background Image Layer (NEW) */}
      {schoolSettings?.loginBgUrl && (
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-15 pointer-events-none transition-all duration-700 z-0" 
          style={{ backgroundImage: `url(${schoolSettings.loginBgUrl})` }}
        />
      )}

      {/* Top App Bar Header */}
      <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/80 relative">
        <div className="flex justify-between items-center w-full px-4 sm:px-8 py-3.5 max-w-7xl mx-auto">
          {/* School Brand */}
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-600 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-sky-500/20 border border-sky-400/30 overflow-hidden">
              {schoolSettings?.logoUrl ? (
                <img src={schoolSettings.logoUrl} alt="Logo" className="w-full h-full object-contain p-1 bg-slate-900" />
              ) : (
                <School className="w-6 h-6 text-white" />
              )}
            </div>
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg text-white tracking-tight font-display truncate max-w-[150px] sm:max-w-none">
                  {schoolSettings?.schoolName || "SDN SUMBEREJO 04"}
                </span>
                <span className="badge-glass-sky text-[10px] px-2 py-0.5 rounded-full font-bold truncate max-w-[120px] sm:max-w-none">
                  {schoolSettings?.schoolTagline || "SD HEBAT BERPRESTASI"}
                </span>
              </div>
              <span className="text-xs font-medium text-slate-400">
                Portal E-Learning & Manajemen Akademik
              </span>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsHelpModalOpen(true)}
              className="flex items-center gap-1.5 bg-slate-800/80 hover:bg-slate-700/80 text-sky-400 border border-slate-700/80 rounded-xl transition-all px-3.5 py-2 font-bold text-xs shadow-sm hover:border-sky-500/40"
            >
              <HelpCircle className="w-4 h-4" />
              <span>Bantuan</span>
            </button>

            <div className="flex items-center gap-1.5 px-3 py-2 text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 rounded-xl font-bold text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="hidden sm:inline text-emerald-300 text-[11px]">Server Online</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow flex items-center justify-center py-8 sm:py-12 px-4 sm:px-8 max-w-7xl mx-auto w-full relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 w-full items-center">
          
          {/* Left Side: Hero Banner & Educational Pillars (7 cols on lg) */}
          <div className="lg:col-span-7 flex flex-col gap-6 text-left">
            {/* Pill Tag */}
            <div className="inline-flex items-center gap-2 bg-slate-800/90 text-sky-300 px-4 py-1.5 rounded-full w-max shadow-md border border-sky-500/30">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              <span className="font-bold text-xs tracking-wide">Generasi Pintar & Berkarakter</span>
            </div>

            {/* Main Headline */}
            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight font-display tracking-tight">
                Ruang Belajar Digital <br />
                <span className="bg-gradient-to-r from-sky-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
                  Modern & Menyenangkan
                </span>
              </h1>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl font-normal">
                Platform pembelajaran resmi {schoolSettings?.schoolName || "SDN Sumberejo 04"} untuk menghubungkan Siswa, Guru, dan Kurikulum dengan modul interaktif, buku digital, kuis gamifikasi, dan video edukasi.
              </p>
            </div>

            {/* Feature Cards Showcase */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="glass-card p-5 rounded-2xl glass-card-hover text-left flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
                  <Gamepad2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">Kuis & Gamifikasi</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Ujian dan latihan soal dengan poin, leaderboard, dan skor instan otomatis.
                  </p>
                </div>
              </div>

              <div className="glass-card p-5 rounded-2xl glass-card-hover text-left flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">Pustaka & Materi Digital</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Ribuan lembar modul, PDF interaktif, dan video pembelajaran siap unduh.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Login Form Card (5 cols on lg) */}
          <div className="lg:col-span-5 w-full max-w-md mx-auto">
            <div className="glass-card p-6 sm:p-8 rounded-3xl border border-slate-700/60 shadow-2xl space-y-5 text-left relative overflow-hidden">
              
              {/* Top Card Glow */}
              <div className="absolute top-0 right-0 w-36 h-36 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />

              {/* Role Selection Header */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl sm:text-2xl font-black text-white font-display">
                    Masuk Portal
                  </h2>
                  <span className="badge-glass-sky text-xs px-2.5 py-1 rounded-full font-bold">
                    {activeRole.toUpperCase()}
                  </span>
                </div>

                {/* Role Tabs */}
                <div className="bg-slate-900/90 p-1.5 rounded-2xl flex items-center gap-1 border border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveRole('siswa');
                      setIdentifierInput('');
                      setPasswordInput('');
                      setErrorMessage('');
                    }}
                    className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                      activeRole === 'siswa'
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Siswa</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveRole('guru');
                      setIdentifierInput('');
                      setPasswordInput('');
                      setErrorMessage('');
                    }}
                    className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                      activeRole === 'guru'
                        ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-md shadow-sky-500/20'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4" />
                    <span>Guru</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveRole('admin');
                      setIdentifierInput('');
                      setPasswordInput('');
                      setErrorMessage('');
                    }}
                    className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                      activeRole === 'admin'
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/20'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Admin</span>
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2.5 p-3 text-xs font-semibold text-rose-300 bg-rose-950/60 border border-rose-800/80 rounded-xl"
                >
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </motion.div>
              )}

              {/* Form Element */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Identifier Input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300">
                    {activeRole === 'siswa' ? 'NISN Siswa' : activeRole === 'guru' ? 'NIP Guru' : 'NIP / Username Admin'}
                  </label>
                  <div className="relative">
                    <User className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={identifierInput}
                      onChange={(e) => setIdentifierInput(e.target.value)}
                      placeholder={
                        activeRole === 'siswa'
                          ? 'Masukkan NISN siswa...'
                          : activeRole === 'guru'
                          ? 'Masukkan NIP guru...'
                          : 'Masukkan NIP atau admin...'
                      }
                      className="w-full bg-slate-900/90 border border-slate-700/80 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 rounded-xl py-3 pl-11 pr-4 text-sm font-medium text-white placeholder-slate-500 transition-all outline-none"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-bold text-slate-300">
                      Kata Sandi
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsForgotModalOpen(true)}
                      className="text-xs font-bold text-sky-400 hover:text-sky-300 hover:underline"
                    >
                      Lupa Sandi?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="Kata sandi akun..."
                      className="w-full bg-slate-900/90 border border-slate-700/80 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 rounded-xl py-3 pl-11 pr-11 text-sm font-medium text-white placeholder-slate-500 transition-all outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center gap-2.5 pt-0.5">
                  <input
                    type="checkbox"
                    id="remember-me"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-sky-500 focus:ring-sky-500 cursor-pointer"
                  />
                  <label htmlFor="remember-me" className="text-xs font-medium text-slate-300 cursor-pointer select-none">
                    Ingat sesi saya di perangkat ini
                  </label>
                </div>

                {/* Submit Action Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn-gradient-primary text-white font-extrabold text-sm py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-60"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Masuk ke Akun {activeRole.toUpperCase()}</span>
                      <Rocket className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="text-center pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsHelpModalOpen(true)}
                  className="text-xs font-medium text-slate-400 hover:text-sky-400 hover:underline"
                >
                  Butuh bantuan akun? <span className="font-bold text-sky-400">Hubungi Admin Sekolah</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Bar */}
      <footer className="w-full bg-slate-900/80 backdrop-blur-md border-t border-slate-800/80 py-4 mt-auto relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-center w-full px-4 sm:px-8 gap-3 max-w-7xl mx-auto text-xs font-medium text-slate-400">
          <span>
            © 2026 {schoolSettings?.schoolName || "SD NEGERI SUMBEREJO 04"} • Portal Pembelajaran Terpadu
          </span>
          <div className="flex gap-5">
            <button 
              type="button" 
              onClick={() => setLegalModalContent({
                title: 'Kebijakan Privasi (Privacy Policy)',
                content: `Data profil siswa, presensi, dan hasil ujian di LMS ${schoolSettings?.schoolName || "SD NEGERI SUMBEREJO 04"} dilindungi dan hanya digunakan untuk keperluan evaluasi akademik resmi sekolah.`
              })}
              className="hover:text-sky-400 transition-colors"
            >
              Kebijakan Privasi
            </button>
            <button 
              type="button" 
              onClick={() => setLegalModalContent({
                title: 'Ketentuan Layanan (Terms of Service)',
                content: `Seluruh civitas akademika ${schoolSettings?.schoolName || "SD NEGERI SUMBEREJO 04"} diwajibkan menggunakan portal pembelajaran ini secara jujur dan tertib selama kegiatan belajar mengajar.`
              })}
              className="hover:text-sky-400 transition-colors"
            >
              Ketentuan Layanan
            </button>
            <button 
              type="button" 
              onClick={() => setIsHelpModalOpen(true)}
              className="hover:text-sky-400 transition-colors"
            >
              Pusat Bantuan
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        selectedRole={activeRole}
      />

      <HelpSupportModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />

      {/* Legal Info Dialog */}
      {legalModalContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="glass-card rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-700 text-left space-y-4">
            <h3 className="font-bold text-base text-white font-display">{legalModalContent.title}</h3>
            <p className="text-xs text-slate-300 leading-relaxed">{legalModalContent.content}</p>
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setLegalModalContent(null)}
                className="px-4 py-2 btn-gradient-primary text-white text-xs font-bold rounded-xl shadow-sm"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

