import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, Clock, Plus, Search, Trash2, Edit3, MapPin, 
  User, BookOpen, Sparkles, CheckCircle2, AlertCircle, 
  Copy, Layers, Filter, Check, School
} from 'lucide-react';
import { ClassSchedule, ScheduleDay, UserProfile } from '../types';

interface GuruScheduleManagerProps {
  currentUser: UserProfile;
  schedules: ClassSchedule[];
  onAddSchedule: (schedule: ClassSchedule) => void;
  onUpdateSchedule: (schedule: ClassSchedule) => void;
  onDeleteSchedule: (id: string) => void;
}

const DAYS_OF_WEEK: ScheduleDay[] = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];

const QUICK_SUBJECT_SUGGESTIONS = [
  'Matematika Dasar & Logika',
  'IPA & Eksperimen Sains Alam',
  'Pendidikan Pancasila & PPKn',
  'Bahasa Indonesia & Literasi',
  'Informatika & Komputer',
  'PJOK & Kebugaran Jasmani',
  'Bahasa Inggris',
  'Seni Budaya & Prakarya',
  'Pendidikan Agama Islam (PAI)',
  'Pojok Baca & Literasi'
];

const COLOR_OPTIONS: { label: string; value: ClassSchedule['themeColor']; bgClass: string; badgeClass: string; borderClass: string }[] = [
  { label: 'Biru Cerah', value: 'blue', bgClass: 'bg-blue-500/10 dark:bg-blue-950/40', badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 border-blue-200 dark:border-blue-700', borderClass: 'border-blue-200 dark:border-blue-800' },
  { label: 'Hijau Segar', value: 'emerald', bgClass: 'bg-emerald-500/10 dark:bg-emerald-950/40', badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 border-emerald-200 dark:border-emerald-700', borderClass: 'border-emerald-200 dark:border-emerald-800' },
  { label: 'Ungu Kreatif', value: 'purple', bgClass: 'bg-purple-500/10 dark:bg-purple-950/40', badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200 border-purple-200 dark:border-purple-700', borderClass: 'border-purple-200 dark:border-purple-800' },
  { label: 'Kuning Hangat', value: 'amber', bgClass: 'bg-amber-500/10 dark:bg-amber-950/40', badgeClass: 'bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200 border-amber-200 dark:border-amber-700', borderClass: 'border-amber-200 dark:border-amber-800' },
  { label: 'Merah Ceria', value: 'rose', bgClass: 'bg-rose-500/10 dark:bg-rose-950/40', badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200 border-rose-200 dark:border-rose-700', borderClass: 'border-rose-200 dark:border-rose-800' },
  { label: 'Indigo Modern', value: 'indigo', bgClass: 'bg-indigo-500/10 dark:bg-indigo-950/40', badgeClass: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200 border-indigo-200 dark:border-indigo-700', borderClass: 'border-indigo-200 dark:border-indigo-800' }
];

export const GuruScheduleManager: React.FC<GuruScheduleManagerProps> = ({
  currentUser,
  schedules,
  onAddSchedule,
  onUpdateSchedule,
  onDeleteSchedule
}) => {
  const [selectedDayFilter, setSelectedDayFilter] = useState<'ALL' | ScheduleDay>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ClassSchedule | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form State
  const [formDay, setFormDay] = useState<ScheduleDay>('SENIN');
  const [formSubject, setFormSubject] = useState('');
  const [formClass, setFormClass] = useState('Kelas 5A');
  const [formTimeStart, setFormTimeStart] = useState('07:30');
  const [formTimeEnd, setFormTimeEnd] = useState('09:30');
  const [formTeacher, setFormTeacher] = useState(currentUser.name || 'Siti Rahmawati, S.Pd.');
  const [formRoom, setFormRoom] = useState('Ruang Kelas 5A');
  const [formColor, setFormColor] = useState<ClassSchedule['themeColor']>('blue');

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleOpenAdd = () => {
    setEditingSchedule(null);
    setFormDay(selectedDayFilter === 'ALL' ? 'SENIN' : selectedDayFilter);
    setFormSubject('');
    setFormClass('Kelas 5A');
    setFormTimeStart('07:30');
    setFormTimeEnd('09:30');
    setFormTeacher(currentUser.name || 'Siti Rahmawati, S.Pd.');
    setFormRoom('Ruang Kelas 5A');
    setFormColor('blue');
    setShowModal(true);
  };

  const handleOpenEdit = (sch: ClassSchedule) => {
    setEditingSchedule(sch);
    setFormDay(sch.day);
    setFormSubject(sch.subject);
    setFormClass(sch.className);
    setFormTimeStart(sch.timeStart);
    setFormTimeEnd(sch.timeEnd);
    setFormTeacher(sch.teacherName);
    setFormRoom(sch.roomOrNotes || 'Ruang Kelas 5A');
    setFormColor(sch.themeColor || 'blue');
    setShowModal(true);
  };

  const handleDuplicate = (sch: ClassSchedule) => {
    const nextDayIndex = (DAYS_OF_WEEK.indexOf(sch.day) + 1) % DAYS_OF_WEEK.length;
    const duplicated: ClassSchedule = {
      ...sch,
      id: `sch-${Date.now()}`,
      day: DAYS_OF_WEEK[nextDayIndex]
    };
    onAddSchedule(duplicated);
    triggerToast(`Jadwal "${sch.subject}" berhasil disalin ke hari ${DAYS_OF_WEEK[nextDayIndex]}! 🎉`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSubject.trim()) {
      alert('Mata pelajaran tidak boleh kosong.');
      return;
    }

    if (editingSchedule) {
      const updated: ClassSchedule = {
        ...editingSchedule,
        day: formDay,
        subject: formSubject.trim(),
        className: formClass.trim() || 'Kelas 5A',
        timeStart: formTimeStart,
        timeEnd: formTimeEnd,
        teacherName: formTeacher.trim() || currentUser.name,
        roomOrNotes: formRoom.trim() || 'Ruang Kelas',
        themeColor: formColor
      };
      onUpdateSchedule(updated);
      triggerToast(`Jadwal "${formSubject}" berhasil diperbarui! ✅`);
    } else {
      const newItem: ClassSchedule = {
        id: `sch-${Date.now()}`,
        day: formDay,
        subject: formSubject.trim(),
        className: formClass.trim() || 'Kelas 5A',
        timeStart: formTimeStart,
        timeEnd: formTimeEnd,
        teacherName: formTeacher.trim() || currentUser.name,
        roomOrNotes: formRoom.trim() || 'Ruang Kelas',
        themeColor: formColor
      };
      onAddSchedule(newItem);
      triggerToast(`Jadwal baru "${formSubject}" pada hari ${formDay} berhasil ditambahkan! 🚀`);
    }

    setShowModal(false);
  };

  const handleDelete = (id: string, subject: string) => {
    onDeleteSchedule(id);
    setDeleteConfirmId(null);
    triggerToast(`Jadwal "${subject}" telah dihapus.`);
  };

  // Filtered schedules
  const filtered = schedules.filter(sch => {
    const matchDay = selectedDayFilter === 'ALL' || sch.day === selectedDayFilter;
    const matchSearch = 
      sch.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sch.teacherName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sch.className.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sch.roomOrNotes && sch.roomOrNotes.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchDay && matchSearch;
  });

  // Calculate distinct counts
  const totalDaysActive = new Set(schedules.map(s => s.day)).size;
  const uniqueSubjectsCount = new Set(schedules.map(s => s.subject)).size;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-6 right-6 z-50 bg-[#005da7] text-white px-5 py-3 rounded-2xl shadow-xl font-bold text-xs flex items-center gap-2 border border-blue-300/40"
        >
          <CheckCircle2 className="w-4 h-4 text-[#a1fa49]" />
          <span>{toastMessage}</span>
        </motion.div>
      )}

      {/* Top Banner & Stats */}
      <div className="bg-gradient-to-r from-[#005da7] via-[#004883] to-[#1e3a8a] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-bold backdrop-blur-xs">
              <Calendar className="w-3.5 h-3.5 text-amber-300" />
              <span>Manajemen Kurikulum & Jadwal Belajar</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Atur Jadwal Pelajaran Siswa
            </h2>
            <p className="text-xs sm:text-sm text-blue-100/90 max-w-xl leading-relaxed">
              Kelola waktu belajar, ruangan, dan mata pelajaran harian. Perubahan jadwal yang dibuat guru akan langsung tersinkronisasi secara real-time ke portal siswa.
            </p>
          </div>

          <button
            onClick={handleOpenAdd}
            className="px-5 py-3.5 bg-[#f7e61a] hover:bg-[#e5d414] text-[#1f1c00] rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 cursor-pointer shrink-0"
          >
            <Plus className="w-5 h-5 stroke-[3]" />
            <span>Tambah Jadwal Pelajaran</span>
          </button>
        </div>

        {/* Quick Stats Counter Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 mt-6 border-t border-white/20">
          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3.5">
            <p className="text-[11px] text-blue-200 font-semibold">Total Sesi Pelajaran</p>
            <p className="text-2xl font-black mt-0.5">{schedules.length}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3.5">
            <p className="text-[11px] text-blue-200 font-semibold">Hari Belajar Aktif</p>
            <p className="text-2xl font-black mt-0.5">{totalDaysActive} <span className="text-xs font-normal text-blue-200">Hari / Pekan</span></p>
          </div>
          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3.5">
            <p className="text-[11px] text-blue-200 font-semibold">Mata Pelajaran Unik</p>
            <p className="text-2xl font-black mt-0.5">{uniqueSubjectsCount}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3.5">
            <p className="text-[11px] text-blue-200 font-semibold">Status Sinkronisasi</p>
            <p className="text-xs font-bold text-[#a1fa49] mt-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#a1fa49] animate-pulse" />
              Tersambung Siswa
            </p>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-3xl p-4 sm:p-5 border border-blue-100 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Day Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            <button
              onClick={() => setSelectedDayFilter('ALL')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedDayFilter === 'ALL'
                  ? 'bg-[#005da7] text-white shadow-md'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Semua Hari ({schedules.length})
            </button>
            {DAYS_OF_WEEK.map((day) => {
              const count = schedules.filter(s => s.day === day).length;
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDayFilter(day)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedDayFilter === day
                      ? 'bg-[#005da7] text-white shadow-md'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>{day}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    selectedDayFilter === day ? 'bg-white/25 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari mata pelajaran, guru, ruang..."
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-10 pr-4 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#005da7]"
            />
          </div>
        </div>
      </div>

      {/* Schedules List Grid */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="bg-white/60 dark:bg-slate-900/60 rounded-3xl p-12 text-center border border-dashed border-slate-300 dark:border-slate-700 space-y-3">
            <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-slate-800 text-[#005da7] dark:text-blue-400 flex items-center justify-center mx-auto">
              <Calendar className="w-7 h-7" />
            </div>
            <h4 className="font-bold text-base text-slate-800 dark:text-slate-200">
              Belum Ada Jadwal Pelajaran {selectedDayFilter !== 'ALL' ? `untuk hari ${selectedDayFilter}` : ''}
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Silakan klik tombol "Tambah Jadwal Pelajaran" di atas untuk mengatur jam pelajaran dan ruangan baru.
            </p>
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-[#005da7] text-white rounded-xl text-xs font-bold shadow-md hover:bg-[#004883] inline-flex items-center gap-1.5 mt-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Jadwal Sekarang</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((sch) => {
              const colorConfig = COLOR_OPTIONS.find(c => c.value === sch.themeColor) || COLOR_OPTIONS[0];

              return (
                <div
                  key={sch.id}
                  className={`bg-white dark:bg-slate-900 rounded-3xl p-5 border ${colorConfig.borderClass} shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative overflow-hidden group`}
                >
                  {/* Top Bar with Day and Time */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase border ${colorConfig.badgeClass}`}>
                        {sch.day}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                        <Clock className="w-3.5 h-3.5 text-[#005da7] dark:text-blue-400" />
                        <span>{sch.timeStart} - {sch.timeEnd} WIB</span>
                      </div>
                    </div>

                    {/* Subject & Class */}
                    <div>
                      <h4 className="font-extrabold text-slate-900 dark:text-white text-base leading-snug group-hover:text-[#005da7] dark:group-hover:text-blue-400 transition-colors">
                        {sch.subject}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-[#005da7] dark:text-blue-300 text-[11px] font-bold">
                          {sch.className}
                        </span>
                        {sch.roomOrNotes && (
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {sch.roomOrNotes}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Teacher Information */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-300">
                      <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-slate-800 text-[#005da7] dark:text-blue-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <span className="truncate font-semibold">{sch.teacherName}</span>
                    </div>
                  </div>

                  {/* Actions (Edit, Duplicate, Delete) */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleDuplicate(sch)}
                      className="px-2.5 py-1 text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-1 font-medium transition-colors"
                      title="Salin jadwal ini ke hari lain"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(sch)}
                        className="px-3 py-1.5 bg-blue-50 dark:bg-slate-800 hover:bg-[#005da7] text-[#005da7] dark:text-blue-400 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(sch.id)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
                        title="Hapus jadwal ini"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: ADD / EDIT JADWAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-white dark:bg-slate-900 border border-blue-200 dark:border-slate-700 rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl text-left my-8"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 text-[#005da7] dark:text-blue-400 text-xs font-bold">
                  <Calendar className="w-4 h-4" />
                  <span>{editingSchedule ? 'Perbarui Jadwal' : 'Tambah Jadwal Baru'}</span>
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {editingSchedule ? 'Edit Jadwal Pelajaran' : 'Form Jadwal Pelajaran'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Form Fields */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Day Selection */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Hari Pelajaran
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {DAYS_OF_WEEK.map((day) => (
                    <button
                      type="button"
                      key={day}
                      onClick={() => setFormDay(day)}
                      className={`py-2 px-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        formDay === day
                          ? 'bg-[#005da7] text-white shadow-md'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject Input & Suggestions */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Mata Pelajaran
                </label>
                <input
                  type="text"
                  required
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  placeholder="Contoh: Matematika Dasar & Logika"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#005da7]"
                />

                {/* Quick Subject Chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-400 font-semibold self-center">Pilihan Cepat:</span>
                  {QUICK_SUBJECT_SUGGESTIONS.slice(0, 5).map((subj) => (
                    <button
                      key={subj}
                      type="button"
                      onClick={() => setFormSubject(subj)}
                      className="px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-slate-800 hover:bg-blue-100 text-[#005da7] dark:text-blue-300 text-[10px] font-semibold transition-colors"
                    >
                      {subj}
                    </button>
                  ))}
                </div>
              </div>

              {/* Class & Teacher */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Kelas / Rombongan Belajar
                  </label>
                  <input
                    type="text"
                    required
                    value={formClass}
                    onChange={(e) => setFormClass(e.target.value)}
                    placeholder="Contoh: Kelas 5A"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Guru Pengampu
                  </label>
                  <input
                    type="text"
                    required
                    value={formTeacher}
                    onChange={(e) => setFormTeacher(e.target.value)}
                    placeholder="Nama Lengkap & Gelar Guru"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Time Start & Time End */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Jam Mulai
                  </label>
                  <input
                    type="text"
                    required
                    value={formTimeStart}
                    onChange={(e) => setFormTimeStart(e.target.value)}
                    placeholder="07:30"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Jam Selesai
                  </label>
                  <input
                    type="text"
                    required
                    value={formTimeEnd}
                    onChange={(e) => setFormTimeEnd(e.target.value)}
                    placeholder="09:30"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Room / Notes */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Ruangan / Tempat Pembelajaran
                </label>
                <input
                  type="text"
                  value={formRoom}
                  onChange={(e) => setFormRoom(e.target.value)}
                  placeholder="Contoh: Ruang Kelas 5A / Lab Komputer / Lapangan"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white"
                />
              </div>

              {/* Theme Color Selection */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Warna Tema Kartu
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setFormColor(c.value)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                        formColor === c.value
                          ? `${c.badgeClass} ring-2 ring-offset-1 ring-[#005da7]`
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-transparent'
                      }`}
                    >
                      {formColor === c.value && <Check className="w-3.5 h-3.5" />}
                      <span>{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#005da7] hover:bg-[#004883] text-white shadow-lg shadow-blue-700/25 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingSchedule ? 'Simpan Perubahan' : 'Simpan & Publikasikan Jadwal'}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-base text-slate-900 dark:text-white">Hapus Jadwal Ini?</h4>
              <p className="text-xs text-slate-500 mt-1">
                Jadwal ini akan dihapus dari sistem guru dan tidak lagi terlihat di portal siswa.
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 dark:bg-slate-800"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = schedules.find(s => s.id === deleteConfirmId);
                  if (target) handleDelete(target.id, target.subject);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/30"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
