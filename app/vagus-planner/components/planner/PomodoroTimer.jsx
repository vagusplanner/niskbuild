import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, X, Coffee } from 'lucide-react';
import { cn } from '@/lib/utils';

const MODES = {
  work:       { label: 'Focus',       minutes: 25, color: 'text-red-400',   bg: 'bg-red-400/10 border-red-400/25',   ring: '#f87171' },
  short_break:{ label: 'Short Break', minutes: 5,  color: 'text-teal-400',  bg: 'bg-teal-400/10 border-teal-400/25', ring: '#2dd4bf' },
  long_break: { label: 'Long Break',  minutes: 15, color: 'text-blue-400',  bg: 'bg-blue-400/10 border-blue-400/25', ring: '#60a5fa' },
};

export default function PomodoroTimer({ taskTitle, onClose }) {
  const [mode, setMode] = useState('work');
  const [secondsLeft, setSecondsLeft] = useState(MODES.work.minutes * 60);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const intervalRef = useRef(null);

  const cfg = MODES[mode];
  const totalSeconds = cfg.minutes * 60;
  const progress = secondsLeft / totalSeconds;
  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const secs = String(secondsLeft % 60).padStart(2, '0');

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft(s => {
          if (s <= 1) {
            clearInterval(intervalRef.current);
            setRunning(false);
            if (mode === 'work') setSessions(n => n + 1);
            // Simple beep via AudioContext
            try {
              const ctx = new AudioContext();
              const osc = ctx.createOscillator();
              osc.connect(ctx.destination);
              osc.frequency.value = 880;
              osc.start();
              osc.stop(ctx.currentTime + 0.3);
            } catch { /* ignore */ }
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, mode]);

  const switchMode = (m) => {
    setMode(m);
    setRunning(false);
    setSecondsLeft(MODES[m].minutes * 60);
  };

  const reset = () => {
    setRunning(false);
    setSecondsLeft(cfg.minutes * 60);
  };

  // SVG circle progress
  const R = 40;
  const circumference = 2 * Math.PI * R;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <motion.div initial={{ opacity: 0, scale: 0.9, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 8 }}
      className={`rounded-3xl border p-5 space-y-4 shadow-2xl ${cfg.bg}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-xs font-black uppercase tracking-widest ${cfg.color}`}>{cfg.label}</p>
          {taskTitle && <p className="text-white/60 text-xs mt-0.5 truncate max-w-[180px]">📌 {taskTitle}</p>}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-white/30 font-bold">{sessions} 🍅</span>
          <button onClick={onClose} className="p-1 text-white/30 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl p-0.5 gap-0.5">
        {Object.entries(MODES).map(([key, m]) => (
          <button key={key} onClick={() => switchMode(key)}
            className={cn('flex-1 py-1.5 rounded-xl text-[10px] font-black transition-all',
              mode === key ? `${MODES[key].color} bg-white/10` : 'text-white/30 hover:text-white')}>
            {m.label}
          </button>
        ))}
      </div>

      {/* Timer ring */}
      <div className="flex items-center justify-center">
        <div className="relative w-28 h-28">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
            <circle cx="50" cy="50" r={R} fill="none" stroke={cfg.ring} strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: 'stroke-dashoffset 0.9s linear' }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-white tabular-nums">{mins}:{secs}</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        <button onClick={reset} className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all">
          <RotateCcw className="w-4 h-4" />
        </button>
        <button onClick={() => setRunning(r => !r)}
          className={cn('px-8 py-2.5 rounded-2xl font-black text-sm transition-all flex items-center gap-2',
            running ? 'bg-white/10 hover:bg-white/15 text-white' : `text-[#071224] bg-gradient-to-r`,
            !running && mode === 'work' && 'from-red-400 to-red-500',
            !running && mode === 'short_break' && 'from-teal-400 to-teal-500',
            !running && mode === 'long_break' && 'from-blue-400 to-blue-500'
          )}>
          {running ? <><Pause className="w-4 h-4" /> Pause</> : <><Play className="w-4 h-4" /> Start</>}
        </button>
      </div>
    </motion.div>
  );
}