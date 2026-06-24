import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, X, Coffee, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const MODES = {
  focus: { label: 'Focus', duration: 25 * 60, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-950', ring: 'ring-rose-500', icon: Brain },
  short: { label: 'Short Break', duration: 5 * 60, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950', ring: 'ring-emerald-500', icon: Coffee },
  long: { label: 'Long Break', duration: 15 * 60, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950', ring: 'ring-blue-500', icon: Coffee },
};

export default function PomodoroTimer({ onClose }) {
  const [mode, setMode] = useState('focus');
  const [timeLeft, setTimeLeft] = useState(MODES.focus.duration);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const intervalRef = useRef(null);

  const cfg = MODES[mode];
  const total = cfg.duration;
  const progress = (timeLeft / total) * 100;
  const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const secs = String(timeLeft % 60).padStart(2, '0');

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            clearInterval(intervalRef.current);
            setRunning(false);
            if (mode === 'focus') {
              setSessions(s => s + 1);
              toast.success('🎉 Focus session complete! Take a break.');
            } else {
              toast.success('⚡ Break over! Ready to focus?');
            }
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, mode]);

  const switchMode = (m) => {
    setMode(m);
    setTimeLeft(MODES[m].duration);
    setRunning(false);
  };

  const reset = () => {
    setTimeLeft(MODES[mode].duration);
    setRunning(false);
  };

  const circumference = 2 * Math.PI * 54;

  return (
    <div className="w-72 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">Pomodoro Timer</h3>
        {onClose && (
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Mode selector */}
      <div className="flex gap-1 mb-4 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
        {Object.entries(MODES).map(([key, m]) => (
          <button
            key={key}
            onClick={() => switchMode(key)}
            className={cn(
              "flex-1 text-xs py-1.5 rounded-md font-medium transition-all",
              mode === key ? `bg-white dark:bg-slate-700 shadow ${m.color}` : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            {key === 'focus' ? 'Focus' : key === 'short' ? 'Short' : 'Long'}
          </button>
        ))}
      </div>

      {/* Circular progress */}
      <div className="flex justify-center mb-4">
        <div className="relative w-32 h-32">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-200 dark:text-slate-700" />
            <circle
              cx="60" cy="60" r="54"
              fill="none" strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress / 100)}
              className={cn("transition-all duration-1000", cfg.color)}
              stroke="currentColor"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn("text-2xl font-bold tabular-nums", cfg.color)}>{mins}:{secs}</span>
            <span className="text-xs text-slate-500">{cfg.label}</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 mb-3">
        <Button variant="outline" size="icon" className="w-9 h-9" onClick={reset}>
          <RotateCcw className="w-4 h-4" />
        </Button>
        <Button
          onClick={() => setRunning(r => !r)}
          className={cn("w-20 h-10", running ? "bg-slate-700 hover:bg-slate-800" : "bg-rose-500 hover:bg-rose-600")}
        >
          {running ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
          {running ? 'Pause' : 'Start'}
        </Button>
      </div>

      {/* Session counter */}
      <div className="text-center text-xs text-slate-500">
        {sessions} session{sessions !== 1 ? 's' : ''} completed today
        {sessions > 0 && ' · ' + '🍅'.repeat(Math.min(sessions, 8))}
      </div>
    </div>
  );
}