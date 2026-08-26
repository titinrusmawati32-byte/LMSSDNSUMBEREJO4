import React, { useState } from 'react';
import { motion } from 'motion/react';
import { KeyRound, User, ArrowRight, CheckCircle2, AlertCircle, X, ShieldAlert } from 'lucide-react';
import { UserRole } from '../types';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRole: UserRole;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  selectedRole
}) => {
  const [identifier, setIdentifier] = useState('');
  const [step, setStep] = useState<'input' | 'otp' | 'success'>('input');
  const [otpCode, setOtpCode] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const roleLabel = selectedRole === 'admin' ? 'Admin' : selectedRole === 'guru' ? 'Guru' : 'Siswa';
  const identifierLabel = selectedRole === 'siswa' ? 'NISN Siswa' : 'NIP ' + roleLabel;

  const handleSendReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError(`Harap masukkan ${identifierLabel} terdaftar.`);
      return;
    }
    setError('');
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setStep('otp');
    }, 1200);
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value[0];
    const newOtp = [...otpCode];
    newOtp[index] = value;
    setOtpCode(newOtp);

    // Auto focus next input
    if (value && index < 3) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.some(digit => !digit)) {
      setError('Kode OTP harus 4 digit.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setStep('success');
    }, 1200);
  };

  const resetState = () => {
    setIdentifier('');
    setStep('input');
    setOtpCode(['', '', '', '']);
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-md bg-[#ebf3fc] dark:bg-slate-900 rounded-3xl shadow-2xl border border-blue-200 dark:border-slate-800 overflow-hidden glass-card"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-blue-200/80 bg-[#e2ecf8]/80 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/50 text-[#005da7] dark:text-blue-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">Pemulihan Password</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">Akses akun {roleLabel}</p>
            </div>
          </div>
          <button
            onClick={resetState}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-blue-100/60 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {step === 'input' && (
            <form onSubmit={handleSendReset} className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Masukkan <span className="font-semibold">{identifierLabel}</span> Anda. Kami akan mengirimkan kode verifikasi pemulihan sandi.
              </p>

              {error && (
                <div className="flex items-center gap-2 p-3 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {identifierLabel}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={selectedRole === 'siswa' ? 'Contoh: 0068492011' : 'Contoh: 199207142019...'}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <User className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                </div>
              </div>

              {selectedRole === 'admin' && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <span>
                    Pemulihan akun Administrator memerlukan verifikasi berlapis oleh Tim Super Admin Sekolah.
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-60 transition-all"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Kirim Kode Verifikasi</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4 text-center">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Masukkan kode verifikasi 4-digit yang dikirim untuk:</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1">{identifier}</p>
              </div>

              {error && (
                <div className="flex items-center justify-center gap-2 p-2.5 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 rounded-xl">
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex justify-center gap-3 my-4">
                {otpCode.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-input-${idx}`}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    className="w-12 h-12 text-center text-lg font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-60 transition-all"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>Verifikasi OTP & Reset Sandi</span>
                )}
              </button>
            </form>
          )}

          {step === 'success' && (
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="font-semibold text-slate-900 dark:text-white">Kata Sandi Berhasil Direset!</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                Kata sandi baru sementara telah disetel. Silakan hubungi admin sekolah jika Anda belum bisa masuk.
              </p>
              <button
                onClick={resetState}
                className="w-full py-2.5 px-4 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-semibold rounded-xl hover:opacity-90 transition-all mt-2"
              >
                Kembali ke Menu Login
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
