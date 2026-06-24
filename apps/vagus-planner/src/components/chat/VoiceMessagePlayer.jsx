import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function VoiceMessagePlayer({ url, duration, isOwn }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onended = () => { setPlaying(false); setProgress(0); setCurrentTime(0); };
    audio.ontimeupdate = () => {
      setCurrentTime(Math.floor(audio.currentTime));
      setProgress(audio.duration ? audio.currentTime / audio.duration : 0);
    };
    return () => { audio.pause(); };
  }, [url]);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying(p => !p);
  };

  const fmt = s => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  const total = duration || 0;

  return (
    <div className={cn(
      'flex items-center gap-2.5 px-3 py-2 rounded-2xl min-w-[180px] max-w-[240px]',
      isOwn ? 'bg-teal-500/90' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
    )}>
      <button
        onClick={toggle}
        className={cn(
          'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors',
          isOwn ? 'bg-white/20 hover:bg-white/30' : 'bg-teal-500 hover:bg-teal-600'
        )}
      >
        {playing
          ? <Pause className={cn('w-4 h-4', isOwn ? 'text-white' : 'text-white')} />
          : <Play className={cn('w-4 h-4', isOwn ? 'text-white' : 'text-white')} />
        }
      </button>

      {/* Waveform / progress bar */}
      <div className="flex-1 flex flex-col gap-1">
        <div className={cn('h-1.5 rounded-full overflow-hidden', isOwn ? 'bg-white/30' : 'bg-slate-200 dark:bg-slate-600')}>
          <div
            className={cn('h-full rounded-full transition-all', isOwn ? 'bg-white' : 'bg-teal-500')}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <span className={cn('text-[10px]', isOwn ? 'text-white/70' : 'text-slate-400')}>
          {playing ? fmt(currentTime) : fmt(total)}
        </span>
      </div>

      <Mic className={cn('w-3.5 h-3.5 flex-shrink-0', isOwn ? 'text-white/60' : 'text-slate-400')} />
    </div>
  );
}