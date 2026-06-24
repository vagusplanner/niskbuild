import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { BookOpen, ChevronRight, Sparkles, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import JournalEditor from './JournalEditor';

const MOOD_EMOJI = {
  joyful: '😄', grateful: '🙏', peaceful: '😌', hopeful: '🌟', anxious: '😰',
  sad: '😢', frustrated: '😤', reflective: '🤔', motivated: '💪', tired: '😴'
};

export default function DashboardJournalNudge() {
  const qc = useQueryClient();
  const [showEditor, setShowEditor] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      const key = `journal_nudge_dismissed_${new Date().toISOString().split('T')[0]}`;
      return !!localStorage.getItem(key);
    } catch { return false; }
  });

  const today = new Date().toISOString().split('T')[0];

  const { data: entries = [] } = useQuery({
    queryKey: ['reflections'],
    queryFn: () => base44.entities.Reflection.list('-date', 10),
    staleTime: 60_000,
  });

  const todayEntry = entries.find(e => e.date === today);

  const dismiss = () => {
    try {
      const key = `journal_nudge_dismissed_${today}`;
      localStorage.setItem(key, '1');
    } catch {}
    setDismissed(true);
  };

  const onSaved = () => {
    qc.invalidateQueries(['reflections']);
    setShowEditor(false);
  };

  if (todayEntry) {
    return (
      <Link to={createPageUrl('Wellness') + '?section=journal'}>
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 shadow-sm hover:shadow-md hover:border-emerald-400 transition-all group">
          <span className="text-xl">{MOOD_EMOJI[todayEntry.mood] || '📓'}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Reflected today ✓</p>
            <p className="text-xs text-slate-400 truncate">{todayEntry.title || todayEntry.content?.slice(0, 50) || 'Entry saved'}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-emerald-300 group-hover:text-emerald-500 transition-colors" />
        </div>
      </Link>
    );
  }

  if (dismissed) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-sky-50 border border-[#E8B84B]/40 shadow-sm hover:shadow-md hover:border-[#E8B84B]/70 transition-all cursor-pointer group"
        onClick={() => setShowEditor(true)}
      >
        <button
          onClick={(e) => { e.stopPropagation(); dismiss(); }}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/60 transition-colors opacity-50 hover:opacity-100"
        >
          <X className="w-3 h-3 text-slate-400" />
        </button>

        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E8B84B] to-amber-400 flex items-center justify-center flex-shrink-0 shadow-sm">
          <BookOpen className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0 pr-4">
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#E8B84B]" />
            How was your day so far?
          </p>
          <p className="text-xs text-slate-500 mt-0.5">Tap to write today's reflection — 2 mins ✨</p>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#E8B84B] transition-colors flex-shrink-0" />
      </motion.div>

      <Dialog open={showEditor} onOpenChange={open => !open && setShowEditor(false)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#1a5a9a]">
              <BookOpen className="w-5 h-5" /> Today's Reflection
            </DialogTitle>
          </DialogHeader>
          <JournalEditor entry={null} onSaved={onSaved} onCancel={() => setShowEditor(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}