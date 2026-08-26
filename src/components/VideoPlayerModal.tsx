import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Video, X, Play, Pause, Volume2, Eye, Calendar, Sparkles, MessageSquare, ThumbsUp } from 'lucide-react';
import { LearningVideo } from '../types';

interface VideoPlayerModalProps {
  isOpen: boolean;
  video: LearningVideo | null;
  onClose: () => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({ isOpen, video, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [likesCount, setLikesCount] = useState(48);
  const [hasLiked, setHasLiked] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState([
    { id: '1', user: 'Anisa Nur Rahma', text: 'Penjelasan videonya sangat jelas Bu Siti! Terima kasih.', time: '1 jam lalu' },
    { id: '2', user: 'Bagus Setiawan', text: 'Sangat membantu untuk persiapan Quiz nanti.', time: '3 jam lalu' }
  ]);

  if (!isOpen || !video) return null;

  // Derive embed URL for YouTube or Google Drive
  const getEmbedUrl = () => {
    const url = video.videoUrl || '';
    if (video.videoSourceType === 'gdrive' || url.includes('drive.google.com')) {
      return url.replace(/\/view(\?.*)?$/, '/preview');
    }
    if (video.videoSourceType === 'youtube' || url.includes('youtube.com') || url.includes('youtu.be') || video.youtubeId) {
      let ytId = video.youtubeId;
      const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
      if (match && match[1]) {
        ytId = match[1];
      }
      return `https://www.youtube-nocookie.com/embed/${ytId || 'dQw4w9WgXcQ'}?autoplay=1`;
    }
    return null;
  };

  const embedUrl = getEmbedUrl();

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setComments([
      { id: Date.now().toString(), user: 'Siswa (Anda)', text: newComment.trim(), time: 'Baru saja' },
      ...comments
    ]);
    setNewComment('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-3xl bg-[#ebf3fc] text-slate-800 rounded-3xl shadow-2xl border border-blue-200 overflow-hidden flex flex-col max-h-[90vh] glass-card"
      >
        {/* Header */}
        <div className="px-6 py-3.5 bg-[#e2ecf8]/80 border-b border-blue-200 flex items-center justify-between text-slate-900">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-red-100/80 text-red-600 rounded-xl border border-red-200">
              <Video className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 line-clamp-1">{video.title}</h3>
              <p className="text-[11px] text-slate-600">{video.subject} • Pengajar: {video.teacherName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-blue-100/60">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Player Canvas or Embedded Iframe */}
        <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
          {embedUrl ? (
            <iframe
              src={embedUrl}
              title={video.title}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <>
              <img
                src={video.thumbnail}
                alt={video.title}
                className={`w-full h-full object-cover transition-opacity duration-300 ${isPlaying ? 'opacity-90' : 'opacity-40'}`}
              />
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="absolute z-10 w-16 h-16 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-2xl hover:scale-105 transition-transform"
              >
                {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
              </button>
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent flex items-center justify-between text-white text-xs">
                <div className="flex items-center gap-3 font-mono">
                  <span className="px-2 py-0.5 rounded bg-red-600 text-[10px] font-bold">LMS VIDEO</span>
                  <span>{isPlaying ? '03:12' : '00:00'} / {video.duration}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-300">
                  <Volume2 className="w-4 h-4" />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Video Details & Discussion */}
        <div className="p-6 overflow-y-auto space-y-4 text-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {video.viewsCount} Ditonton</span>
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {video.uploadDate}</span>
            </div>

            <button
              onClick={() => {
                setHasLiked(!hasLiked);
                setLikesCount(prev => hasLiked ? prev - 1 : prev + 1);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                hasLiked
                  ? 'bg-red-50 text-red-700 border-red-200 font-bold'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <ThumbsUp className="w-3.5 h-3.5" />
              <span>{likesCount} Suka</span>
            </button>
          </div>

          <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            {video.description}
          </p>

          {/* Discussion / Comments Section */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
              <span>Diskusi & Pertanyaan Kelas ({comments.length})</span>
            </h4>

            <form onSubmit={handleAddComment} className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Tuliskan pertanyaan mengenai materi video ini..."
                className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold shadow"
              >
                Kirim
              </button>
            </form>

            <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
              {comments.map((c) => (
                <div key={c.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-0.5">
                  <div className="flex justify-between font-semibold text-slate-800">
                    <span>{c.user}</span>
                    <span className="text-[10px] text-slate-500 font-normal">{c.time}</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">{c.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
