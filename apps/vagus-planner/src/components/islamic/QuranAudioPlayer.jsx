import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, ChevronDown, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { RECITERS, getAyahAudioUrl, resolveAyahAudioUrl, getReciter } from '@/lib/quran-api';

/**
 * Audio player for the current ayah.
 * Uses per-reciter bitrate on islamic.network (128kbps is not available for every reciter).
 */
export default function QuranAudioPlayer({
  surah = 1,
  ayah = 1,
  totalAyahs = 7,
  globalAyah = 1,
  onAyahChange,
}) {
  const [reciter, setReciter] = useState(() => {
    const saved = localStorage.getItem('quran_reciter');
    return RECITERS.some((r) => r.id === saved) ? saved : 'ar.alafasy';
  });
  const [currentAyah, setCurrentAyah] = useState(ayah);
  const [currentGlobal, setCurrentGlobal] = useState(globalAyah);
  const [isPlaying, setIsPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [showReciter, setShowReciter] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loadingSrc, setLoadingSrc] = useState(false);
  const audioRef = useRef(null);
  const playIntentRef = useRef(false);

  useEffect(() => {
    setCurrentAyah(ayah);
    setCurrentGlobal(globalAyah);
  }, [ayah, surah, globalAyah]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!audioRef.current || !currentGlobal) return;
      setLoadingSrc(true);
      const url = await resolveAyahAudioUrl(reciter, currentGlobal);
      if (cancelled || !audioRef.current) return;
      audioRef.current.src = url;
      audioRef.current.load();
      setProgress(0);
      setDuration(0);
      setLoadingSrc(false);
      if (playIntentRef.current || isPlaying) {
        try {
          await audioRef.current.play();
          setIsPlaying(true);
        } catch {
          setIsPlaying(false);
        }
      }
    };
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- isPlaying gated via playIntentRef
  }, [surah, currentGlobal, reciter]);

  const togglePlay = async () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      playIntentRef.current = false;
      setIsPlaying(false);
      return;
    }
    playIntentRef.current = true;
    try {
      if (!audioRef.current.src) {
        audioRef.current.src = getAyahAudioUrl(reciter, currentGlobal);
      }
      await audioRef.current.play();
      setIsPlaying(true);
    } catch {
      toast.error('Could not play this recitation. Try another reciter.');
      setIsPlaying(false);
      playIntentRef.current = false;
    }
  };

  const handleEnded = () => {
    if (currentAyah < totalAyahs) {
      const next = currentAyah + 1;
      setCurrentAyah(next);
      onAyahChange?.(next);
      playIntentRef.current = true;
    } else {
      setIsPlaying(false);
      playIntentRef.current = false;
    }
  };

  const handleError = () => {
    toast.error(`Audio unavailable for ${getReciter(reciter).label} at this source. Try another reciter.`);
    setIsPlaying(false);
    playIntentRef.current = false;
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
    // Keep playing if user was listening
    if (isPlaying) playIntentRef.current = true;
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

  const reciterLabel = getReciter(reciter).label;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-emerald-900 to-teal-900 text-white p-4 shadow-lg">
      <audio
        ref={audioRef}
        onEnded={handleEnded}
        onTimeUpdate={handleTimeUpdate}
        onError={handleError}
        onLoadedMetadata={handleTimeUpdate}
        muted={muted}
        preload="metadata"
      />

      <div className="relative mb-3">
        <button
          type="button"
          onClick={() => setShowReciter((s) => !s)}
          className="flex items-center gap-2 text-xs text-emerald-300 hover:text-white transition-colors"
        >
          <Volume2 className="w-3 h-3" />
          {reciterLabel}
          {loadingSrc && <Loader2 className="w-3 h-3 animate-spin" />}
          <ChevronDown className={`w-3 h-3 transition-transform ${showReciter ? 'rotate-180' : ''}`} />
        </button>
        <AnimatePresence>
          {showReciter && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="absolute top-full mt-1 left-0 z-20 bg-slate-800 rounded-xl shadow-xl border border-slate-700 py-1 min-w-[200px] max-h-56 overflow-y-auto"
            >
              {RECITERS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => changeReciter(r.id)}
                  className={`w-full text-left px-4 py-2 text-xs transition-colors ${reciter === r.id ? 'text-emerald-400 font-bold' : 'text-white/80 hover:bg-slate-700'}`}
                >
                  {r.label}
                  <span className="text-white/40 ml-1">({r.bitrate}k)</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="text-center mb-3">
        <p className="text-xs text-emerald-300">Surah {surah} · Ayah {currentAyah} of {totalAyahs}</p>
      </div>

      <div
        className="h-1.5 bg-white/20 rounded-full cursor-pointer mb-3 relative"
        onClick={seek}
        role="slider"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={duration || 0}
        tabIndex={0}
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

      <div className="flex items-center justify-center gap-4">
        <button type="button" onClick={prev} disabled={currentAyah <= 1} className="p-2 rounded-full hover:bg-white/10 disabled:opacity-30 transition-all">
          <SkipBack className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={togglePlay}
          className="w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center shadow-lg transition-all active:scale-95"
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </button>
        <button type="button" onClick={next} disabled={currentAyah >= totalAyahs} className="p-2 rounded-full hover:bg-white/10 disabled:opacity-30 transition-all">
          <SkipForward className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => setMuted((m) => !m)} className="p-2 rounded-full hover:bg-white/10 transition-all">
          {muted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
