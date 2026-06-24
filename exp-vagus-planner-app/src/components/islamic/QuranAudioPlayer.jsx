import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const RECITERS = [
  { id: 'ar.alafasy', label: 'Mishary Alafasy' },
  { id: 'ar.abdurrahmaansudais', label: 'Abdurrahman As-Sudais' },
  { id: 'ar.abdullahbasfar', label: 'Abdullah Basfar' },
  { id: 'ar.minshawi', label: 'Mohamed Al-Minshawi' },
];

// Uses the Al-Quran Cloud API (free, no key needed)
function getAudioUrl(reciterId, surah, ayah) {
  return `https://cdn.islamic.network/quran/audio/128/${reciterId}/${surah}${String(ayah).padStart(3, '0')}.mp3`;
}

export default function QuranAudioPlayer({ surah = 1, ayah = 1, totalAyahs = 7, onAyahChange }) {
  const [reciter, setReciter] = useState(() => localStorage.getItem('quran_reciter') || 'ar.alafasy');
  const [currentAyah, setCurrentAyah] = useState(ayah);
  const [isPlaying, setIsPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [showReciter, setShowReciter] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    setCurrentAyah(ayah);
  }, [ayah, surah]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.src = getAudioUrl(reciter, surah, currentAyah);
      if (isPlaying) audioRef.current.play().catch(() => {});
    }
  }, [surah, currentAyah, reciter]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleEnded = () => {
    if (currentAyah < totalAyahs) {
      const next = currentAyah + 1;
      setCurrentAyah(next);
      onAyahChange?.(next);
      // auto-play next
      setTimeout(() => audioRef.current?.play().catch(() => {}), 200);
    } else {
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setProgress(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const seek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const t = pct * duration;
    if (audioRef.current) audioRef.current.currentTime = t;
    setProgress(t);
  };

  const changeReciter = (id) => {
    setReciter(id);
    localStorage.setItem('quran_reciter', id);
    setShowReciter(false);
    if (audioRef.current) {
      audioRef.current.src = getAudioUrl(id, surah, currentAyah);
      if (isPlaying) audioRef.current.play().catch(() => {});
    }
  };

  const prev = () => {
    if (currentAyah > 1) {
      const p = currentAyah - 1;
      setCurrentAyah(p);
      onAyahChange?.(p);
    }
  };

  const next = () => {
    if (currentAyah < totalAyahs) {
      const n = currentAyah + 1;
      setCurrentAyah(n);
      onAyahChange?.(n);
    }
  };

  const fmt = (s) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  const reciterLabel = RECITERS.find(r => r.id === reciter)?.label || 'Select Reciter';

  return (
    <div className="rounded-2xl bg-gradient-to-br from-emerald-900 to-teal-900 text-white p-4 shadow-lg">
      <audio
        ref={audioRef}
        onEnded={handleEnded}
        onTimeUpdate={handleTimeUpdate}
        muted={muted}
      />

      {/* Reciter selector */}
      <div className="relative mb-3">
        <button
          onClick={() => setShowReciter(s => !s)}
          className="flex items-center gap-2 text-xs text-emerald-300 hover:text-white transition-colors"
        >
          <Volume2 className="w-3 h-3" />
          {reciterLabel}
          <ChevronDown className={`w-3 h-3 transition-transform ${showReciter ? 'rotate-180' : ''}`} />
        </button>
        <AnimatePresence>
          {showReciter && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="absolute top-full mt-1 left-0 z-20 bg-slate-800 rounded-xl shadow-xl border border-slate-700 py-1 min-w-[180px]"
            >
              {RECITERS.map(r => (
                <button
                  key={r.id}
                  onClick={() => changeReciter(r.id)}
                  className={`w-full text-left px-4 py-2 text-xs transition-colors ${reciter === r.id ? 'text-emerald-400 font-bold' : 'text-white/80 hover:bg-slate-700'}`}
                >
                  {r.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Ayah info */}
      <div className="text-center mb-3">
        <p className="text-xs text-emerald-300">Surah {surah} · Ayah {currentAyah} of {totalAyahs}</p>
      </div>

      {/* Progress bar */}
      <div
        className="h-1.5 bg-white/20 rounded-full cursor-pointer mb-3 relative"
        onClick={seek}
      >
        <div
          className="h-full bg-emerald-400 rounded-full transition-all"
          style={{ width: duration ? `${(progress / duration) * 100}%` : '0%' }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-white/50 mb-3">
        <span>{fmt(progress)}</span>
        <span>{fmt(duration)}</span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <button onClick={prev} disabled={currentAyah <= 1} className="p-2 rounded-full hover:bg-white/10 disabled:opacity-30 transition-all">
          <SkipBack className="w-4 h-4" />
        </button>
        <button
          onClick={togglePlay}
          className="w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center shadow-lg transition-all active:scale-95"
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </button>
        <button onClick={next} disabled={currentAyah >= totalAyahs} className="p-2 rounded-full hover:bg-white/10 disabled:opacity-30 transition-all">
          <SkipForward className="w-4 h-4" />
        </button>
        <button onClick={() => setMuted(m => !m)} className="p-2 rounded-full hover:bg-white/10 transition-all">
          {muted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}