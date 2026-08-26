import React, { useState } from 'react';
import { motion } from 'motion/react';
import { HelpCircle, Phone, Mail, FileText, ChevronRight, X, Headphones, BookOpen } from 'lucide-react';

interface HelpSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpSupportModal: React.FC<HelpSupportModalProps> = ({ isOpen, onClose }) => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  if (!isOpen) return null;

  const faqs = [
    {
      q: 'Di mana saya bisa mendapatkan NIP atau NISN?',
      a: 'NIP untuk Guru/Staff dan NISN untuk Siswa tertera pada Kartu Identitas Sekolah/Siswa atau dapat ditanyakan langsung ke bagian Tata Usaha (TU) Sekolah.'
    },
    {
      q: 'Bagaimana jika akun terblokir karena salah password?',
      a: 'Jika Anda 3 kali berturut-turut salah memasukkan password, gunakan fitur "Lupa Password?" atau hubungi Tim IT Support melalui Kontak Bantuan.'
    },
    {
      q: 'Apakah bisa login LMS dari Smartphone?',
      a: 'Ya, portal LMS ini didesain responsif dan dapat diakses dengan nyaman dari HP, Tablet, Laptop, maupun Komputer Desktop.'
    },
    {
      q: 'Bagaimana cara mengganti kata sandi bawaan?',
      a: 'Setelah berhasil masuk ke dashboard (Admin, Guru, atau Siswa), klik pada foto profil di sudut kanan atas lalu pilih menu "Pengaturan Profil & Keamanan".'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg bg-[#ebf3fc] dark:bg-slate-900 rounded-3xl shadow-2xl border border-blue-200 dark:border-slate-800 overflow-hidden glass-card"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-blue-200/80 bg-[#e2ecf8]/80 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">Pusat Bantuan LMS</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">Bantuan Login & Layanan Kontak TU IT</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-blue-100/60 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Quick Contact Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-slate-800/50 border border-blue-200/80 dark:border-slate-700/80 flex items-start gap-3">
              <Phone className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-slate-900 dark:text-white">Layanan WhatsApp TU</p>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 font-mono mt-0.5">+62 812-3456-7890</p>
                <p className="text-[10px] text-slate-500 mt-1">Senin - Jumat (07:00 - 15:30 WIB)</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-slate-800/50 border border-blue-200/80 dark:border-slate-700/80 flex items-start gap-3">
              <Mail className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-slate-900 dark:text-white">Email IT Support</p>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 font-mono mt-0.5">lms-help@sekolah.sch.id</p>
                <p className="text-[10px] text-slate-500 mt-1">Respon dalam 1x24 jam kerja</p>
              </div>
            </div>
          </div>

          {/* FAQ Accordion */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Pertanyaan Sering Diajukan (FAQ)</span>
            </h4>
            <div className="space-y-2">
              {faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                    className="w-full p-3 text-left font-medium text-xs text-slate-800 dark:text-slate-200 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <span>{faq.q}</span>
                    <ChevronRight
                      className={`w-4 h-4 text-slate-400 transition-transform ${
                        activeFaq === idx ? 'rotate-90 text-blue-600' : ''
                      }`}
                    />
                  </button>
                  {activeFaq === idx && (
                    <div className="p-3 pt-0 text-xs text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-800/20">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Panduan Pengguna */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/40 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-slate-900 dark:text-white">Buku Panduan LMS 2026</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Unduh petunjuk penggunaan untuk Guru & Siswa (PDF)</p>
              </div>
            </div>
            <button
              onClick={() => alert('Mengunduh Buku Panduan Pengguna LMS Portal PDF...')}
              className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow transition-all"
            >
              Unduh
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
