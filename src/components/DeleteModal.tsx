import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, CheckCircle2, X, Sparkles } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  itemTitle: string;
  itemType: string;
  onConfirm: () => void;
  onClose: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  itemTitle,
  itemType,
  onConfirm,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 text-center overflow-hidden"
        >
          {/* Background Glow */}
          <div className="absolute -top-10 -left-10 w-32 h-32 bg-rose-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-800/50 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Danger Icon Badge */}
          <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 shadow-lg shadow-rose-500/10">
            <Trash2 className="w-8 h-8 animate-bounce" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white">Konfirmasi Penghapusan</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Apakah Anda yakin ingin menghapus {itemType.toLowerCase()}{' '}
              <span className="font-semibold text-rose-400 break-words">"{itemTitle}"</span>? Tindakan ini akan menghapus data secara permanen dari database LMS.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-all"
            >
              Batal
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 text-white font-semibold text-xs shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              <span>Ya, Hapus Data</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

interface DeleteSuccessModalProps {
  isOpen: boolean;
  itemTitle: string;
  itemType: string;
  onClose: () => void;
}

export const DeleteSuccessModal: React.FC<DeleteSuccessModalProps> = ({
  isOpen,
  itemTitle,
  itemType,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 15 }}
          transition={{ type: 'spring', damping: 22, stiffness: 350 }}
          className="relative w-full max-w-sm bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 shadow-2xl text-center space-y-4 overflow-hidden"
        >
          {/* Animated Emerald Glow */}
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 via-transparent to-transparent pointer-events-none" />

          {/* Success Checkmark Badge */}
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/20">
            <CheckCircle2 className="w-10 h-10 animate-pulse" />
          </div>

          <div className="space-y-1">
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/30">
              <Sparkles className="w-3 h-3" /> Berhasil Dihapus
            </div>
            <h3 className="text-base font-bold text-white pt-1">Data Terhapus dari Database!</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {itemType} <span className="font-semibold text-slate-200">"{itemTitle}"</span> telah berhasil dihapus secara permanen dari Firestore LMS.
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/30 transition-all"
          >
            Tutup Pop-Up
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
