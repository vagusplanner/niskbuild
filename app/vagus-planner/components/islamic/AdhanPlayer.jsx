import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, Play, Square, Settings2 } from 'lucide-react';
import { toast } from 'sonner';

const ADHAN_SOURCES = {
  makkah: { label: 'Makkah', url: 'https://www.islamcan.com/audio/adhan/azan1.mp3' },
  madinah: { label: 'Madinah', url: 'https://www.islamcan.com/audio/adhan/azan4.mp3' },
  egypt: { label: 'Egyptian', url: 'https://www.islamcan.com/audio/adhan/azan2.mp3' },
};

const PRAYER_NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

export default function AdhanPlayer({ prayerTimes = {}, compact = false }) {
  const [enabled, setEnabled] = useState(() => localStorage.getItem('adhan_enabled') !== 'false');
  const [style, setStyle] = useState(() => localStorage.getItem('adhan_style') || 'makkah');
  const [playing, setPlaying] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const audioRef = useRef(null);
  const alertedRef = useRef(new Set());

  // Check prayer times every minute
  useEffect(() => {
    if (!enabled || Object.keys(prayerTimes).length === 0) return;

    const check = () => {
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      PRAYER_NAMES.forEach(prayer => {
        const pTime = prayerTimes[prayer.toLowerCase()];
        if (!pTime) return;
        const key = `${prayer}_${hhmm}`;
        if (pTime === hhmm && !alertedRef.current.has(key)) {
          alertedRef.current.add(key);
          playAdhan(prayer);
        }
      });
    };

    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, [enabled, prayerTimes, style]);

  const playAdhan = (prayerName) => {
    const src = ADHAN_SOURCES[style]?.url;
    if (!src || !audioRef.current) return;
    audioRef.current.src = src;
    audioRef.current.play().then(() => {
      setPlaying(prayerName);
      toast.info(`🕌 ${prayerName} — Adhan`, { duration: 5000 });
    }).catch(() => {});
  };

  const stopAdhan = () => {
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.currentTime = 0;
    setPlaying(null);
  };

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    localStorage.setItem('adhan_enabled', next ? 'true' : 'false');
    if (!next) stopAdhan();
    toast.success(next ? '🔔 Adhan enabled' : '🔕 Adhan disabled');
  };

  const changeStyle = (s) => {
    setStyle(s);
    localStorage.setItem('adhan_style', s);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <audio ref={audioRef} onEnded={() => setPlaying(null)} />
        <button
          onClick={toggle}
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border transition-all ${
            enabled
              ? 'bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-950/30 dark:border-amber-700 dark:text-amber-400'
              : 'bg-slate-100 border-slate-200 text-slate-500'
          }`}
        >
          {enabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
          Adhan {enabled ? 'On' : 'Off'}
        </button>
        {playing && (
          <button onClick={stopAdhan} className="text-xs px-2 py-1 bg-red-50 text-red-600 border border-red-200 rounded-full flex items-center gap-1">
            <Square className="w-3 h-3" /> Stop
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 border border-amber-200 dark:border-amber-800 p-4">
      <audio ref={audioRef} onEnded={() => setPlaying(null)} />
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
            <span className="text-lg">🕌</span>
          </div>
          <div>
            <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Adhan Player</p>
            <p className="text-xs text-amber-600 dark:text-amber-500">{ADHAN_SOURCES[style]?.label} style</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowSettings(s => !s)} className="p-1.5 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-600">
            <Settings2 className="w-4 h-4" />
          </button>
          <button
            onClick={toggle}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              enabled
                ? 'bg-amber-500 text-white hover:bg-amber-600'
                : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
            }`}
          >
            {enabled ? '🔔 On' : '🔕 Off'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showSettings && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-3 overflow-hidden">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-2">Recitation Style</p>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(ADHAN_SOURCES).map(([key, { label }]) => (
                <button
                  key={key}
                  onClick={() => changeStyle(key)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                    style === key
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'border-amber-300 text-amber-700 hover:bg-amber-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {playing ? (
        <div className="flex items-center gap-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl p-3">
          <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
          <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">Playing — {playing} Adhan</span>
          <button onClick={stopAdhan} className="ml-auto flex items-center gap-1 text-xs text-red-600 hover:text-red-700">
            <Square className="w-3 h-3" /> Stop
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-1">
          {PRAYER_NAMES.map(p => (
            <button
              key={p}
              onClick={() => playAdhan(p)}
              className="flex flex-col items-center gap-0.5 py-2 rounded-lg bg-white/60 dark:bg-white/5 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-all text-center"
            >
              <Play className="w-3 h-3 text-amber-600" />
              <span className="text-[10px] font-medium text-amber-800 dark:text-amber-400">{p}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}