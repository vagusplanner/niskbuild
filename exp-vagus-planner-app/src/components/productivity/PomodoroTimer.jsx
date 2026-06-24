import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, SkipForward, Settings, Coffee, Brain, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const MODES = {
  focus:       { label: 'Focus',        minutes: 25, color: 'from-rose-500 to-orange-500',    icon: Brain,       ring: 'stroke-rose-500' },
  short_break: { label: 'Short Break',  minutes: 5,  color: 'from-emerald-500 to-teal-500',   icon: Coffee,      ring: 'stroke-emerald-500' },
  long_break:  { label: 'Long Break',   minutes: 15, color: 'from-blue-500 to-cyan-500',      icon: CheckCircle, ring: 'stroke-blue-500' },
};

const PRESETS = [
  { label: '25 / 5',  focus: 25, short: 5,  long: 15 },
  { label: '50 / 10', focus: 50, short: 10, long: 20 },
  { label: '90 / 20', focus: 90, short: 20, long: 30 },
];

export default function PomodoroTimer() {
  const [mode, setMode] = useState('focus');
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(MODES.focus.minutes * 60);
  const [sessions, setSessions] = useState(0);
  const [customMins, setCustomMins] = useState({ focus: 25, short: 5, long: 15 });
  const [showSettings, setShowSettings] = useState(false);
  const intervalRef = useRef(null);
  const audioCtxRef = useRef(null);

  const totalSeconds = (mode === 'focus' ? customMins.focus : mode === 'short_break' ? customMins.short : customMins.long) * 60;

  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = mode === 'focus' ? 880 : 440;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.6);
    } catch (_) {}
  };

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds(s => {
          if (s <= 1) {
            clearInterval(intervalRef.current);
            setRunning(false);
            playBeep();
            if (mode === 'focus') {
              setSessions(prev => prev + 1);
              toast.success('Focus session complete! Take a break 🎉');
              setMode('short_break');
              return customMins.short * 60;
            } else {
              toast.success('Break over! Time to focus 💪');
              setMode('focus');
              return customMins.focus * 60;
            }
          }
          return s - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, mode, customMins]);

  const switchMode = (newMode) => {
    setRunning(false);
    setMode(newMode);
    const m = newMode === 'focus' ? customMins.focus : newMode === 'short_break' ? customMins.short : customMins.long;
    setSeconds(m * 60);
  };

  const reset = () => {
    setRunning(false);
    setSeconds(totalSeconds);
  };

  const skip = () => {
    const next = mode === 'focus' ? 'short_break' : 'focus';
    switchMode(next);
  };

  const applyPreset = (p) => {
    const next = { focus: p.focus, short: p.short, long: p.long };
    setCustomMins(next);
    setRunning(false);
    setSeconds(p.focus * 60);
    setMode('focus');
  };

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const pct = 1 - seconds / totalSeconds;
  const circumference = 2 * Math.PI * 54;
  const m = MODES[mode];
  const Icon = m.icon;

  return (
    <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      {/* Header */}
      <div className={`bg-gradient-to-r ${m.color} p-4 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-white" />
          <span className="font-bold text-white">Pomodoro Timer</span>
        </div>
        <button onClick={() => setShowSettings(!showSettings)} className="p-1.5 bg-white/20 rounded-lg hover:bg-white/30 transition-colors">
          <Settings className="w-4 h-4 text-white" />
        </button>
      </div>

      <div className="p-5">
        {/* Mode tabs */}
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 mb-6">
          {Object.entries(MODES).map(([key, val]) => (
            <button key={key} onClick={() => switchMode(key)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                mode === key ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}>
              {val.label}
            </button>
          ))}
        </div>

        {/* Ring timer */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative w-36 h-36">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-100 dark:text-slate-800" />
              <circle cx="60" cy="60" r="54" fill="none" strokeWidth="8" strokeLinecap="round"
                className={m.ring}
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - pct)}
                style={{ transition: 'stroke-dashoffset 1s linear' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-slate-800 dark:text-slate-100 tabular-nums">
                {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
              </span>
              <span className="text-xs text-slate-400 font-medium">{m.label}</span>
            </div>
          </div>
          {/* Sessions */}
          <div className="flex items-center gap-1 mt-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={`w-2.5 h-2.5 rounded-full ${i < (sessions % 4) ? 'bg-rose-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
            ))}
            <span className="text-xs text-slate-400 ml-1">Session {sessions + 1}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <button onClick={reset} className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            <RotateCcw className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          </button>
          <button onClick={() => setRunning(!running)}
            className={`px-8 py-3 rounded-xl font-bold text-white bg-gradient-to-r ${m.color} shadow-lg hover:opacity-90 transition-all hover:scale-105 active:scale-95`}>
            {running ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
          <button onClick={skip} className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            <SkipForward className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        {/* Settings */}
        <AnimatePresence>
          {showSettings && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden border-t border-slate-100 dark:border-slate-800 pt-4 mt-4 space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Presets</p>
              <div className="flex gap-2">
                {PRESETS.map(p => (
                  <button key={p.label} onClick={() => applyPreset(p)}
                    className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[['Focus', 'focus'], ['Short', 'short'], ['Long', 'long']].map(([label, key]) => (
                  <div key={key}>
                    <p className="text-[10px] text-slate-400 mb-1">{label} (min)</p>
                    <input type="number" min="1" max="180"
                      value={customMins[key]}
                      onChange={e => {
                        const v = Math.max(1, parseInt(e.target.value) || 1);
                        setCustomMins(prev => ({ ...prev, [key]: v }));
                        if (mode === (key === 'focus' ? 'focus' : key === 'short' ? 'short_break' : 'long_break')) {
                          setSeconds(v * 60);
                        }
                      }}
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-sm text-center font-bold bg-transparent dark:text-white"
                    />
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}