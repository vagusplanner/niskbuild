/**
 * StudyCirclePanel
 * Shown in the Quran Study channel — displays a study session card above the chat.
 */
import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, Star, Clock } from 'lucide-react';

const STUDY_SESSIONS = [
  { surah: 'Al-Baqarah', ayaat: '1–20', topic: 'The nature of the Quran', date: 'Mon 7:00pm' },
  { surah: 'Al-Baqarah', ayaat: '21–40', topic: 'Covenant with Bani Israel', date: 'Wed 7:00pm' },
  { surah: 'Al-Baqarah', ayaat: '41–60', topic: 'Signs and miracles', date: 'Fri after Isha' },
];

export default function StudyCirclePanel() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mx-4 mt-3 rounded-2xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/20 overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        onClick={() => setExpanded(v => !v)}
      >
        <span className="text-2xl">📖</span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-emerald-900 dark:text-emerald-100">Quran Study Circle</p>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400">Next: Al-Baqarah 1–20 · Mon 7:00pm</p>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-emerald-500" /> : <ChevronDown className="w-4 h-4 text-emerald-500" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-emerald-200 dark:border-emerald-800/40 mt-0">
          <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mt-3 mb-2">Upcoming Sessions</p>
          <div className="space-y-2">
            {STUDY_SESSIONS.map((s, i) => (
              <div key={i} className="flex items-start gap-3 p-2.5 rounded-xl bg-white/60 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30">
                <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-emerald-600">{i + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-100">
                    Surah {s.surah} · {s.ayaat}
                  </p>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400">{s.topic}</p>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-emerald-500">
                  <Clock className="w-3 h-3" /> {s.date}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}