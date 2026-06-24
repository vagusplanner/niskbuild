import React, { useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Plus, BookOpen, ChevronRight, Flame, CalendarDays } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import JournalEditor from './JournalEditor';

const MOOD_EMOJI = {
  joyful: '😄', grateful: '🙏', peaceful: '😌', hopeful: '🌟', anxious: '😰',
  sad: '😢', frustrated: '😤', reflective: '🤔', motivated: '💪', tired: '😴'
};

function JournalStreak({ entries }) {
  const today = new Date().toISOString().split('T')[0];
  let streak = 0;
  const d = new Date();
  while (true) {
    const ds = d.toISOString().split('T')[0];
    if (!entries.some(e => e.date === ds)) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200">
      <Flame className="w-3.5 h-3.5 text-amber-500" />
      <span className="text-xs font-bold text-amber-700">{streak} day streak</span>
    </div>
  );
}

export default function JournalWellnessPanel() {
  const qc = useQueryClient();
  const [showEditor, setShowEditor] = useState(false);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['reflections'],
    queryFn: () => SDK.entities.Reflection.list('-date', 30),
    staleTime: 60_000,
  });

  const today = new Date().toISOString().split('T')[0];
  const todayEntry = entries.find(e => e.date === today);
  const recent = entries.slice(0, 4);

  const onSaved = () => {
    qc.invalidateQueries(['reflections']);
    setShowEditor(false);
  };

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <JournalStreak entries={entries} />
          <span className="text-xs text-slate-400">{entries.length} total entries</span>
        </div>
        <Link to={createPageUrl('Journal')}>
          <button className="text-xs text-teal-600 font-semibold flex items-center gap-0.5 hover:underline">
            See all <ChevronRight className="w-3 h-3" />
          </button>
        </Link>
      </div>

      {/* Today's status */}
      {todayEntry ? (
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
          <span className="text-2xl">{MOOD_EMOJI[todayEntry.mood] || '📓'}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-emerald-800">Journaled today ✓</p>
            <p className="text-xs text-emerald-600 truncate">{todayEntry.title || todayEntry.content?.slice(0, 60) || 'Entry saved'}</p>
          </div>
          <Link to={createPageUrl('Journal')}>
            <ChevronRight className="w-4 h-4 text-emerald-400" />
          </Link>
        </div>
      ) : (
        <button
          onClick={() => setShowEditor(true)}
          className="w-full flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-amber-50 to-sky-50 border border-[#E8B84B]/30 hover:border-[#E8B84B]/60 transition-all group"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#E8B84B] to-amber-400 flex items-center justify-center flex-shrink-0">
            <Plus className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-slate-700">No reflection yet today</p>
            <p className="text-xs text-slate-400">Tap to write — takes just 2 mins</p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#E8B84B] transition-colors" />
        </button>
      )}

      {/* Recent entries */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map(i => <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {recent.filter(e => e.date !== today).slice(0, 3).map(e => (
            <motion.div key={e.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Link to={createPageUrl('Journal')}>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all">
                  <span className="text-lg flex-shrink-0">{MOOD_EMOJI[e.mood] || '📓'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{e.title || e.category}</p>
                    <p className="text-xs text-slate-400">{format(new Date(e.date + 'T12:00:00'), 'EEE, MMM d')}</p>
                  </div>
                  {e.mood_rating && (
                    <span className="text-xs font-bold text-slate-300">{e.mood_rating}/10</span>
                  )}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {/* Quick link to monthly recap */}
      <Link to={createPageUrl('MonthlyRecap')}>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-[#1a4a6e]/5 to-teal-50 border border-teal-100 hover:border-teal-300 transition-all">
          <CalendarDays className="w-3.5 h-3.5 text-teal-500" />
          <span className="text-xs font-semibold text-teal-700">View Monthly AI Recap</span>
          <ChevronRight className="w-3 h-3 text-teal-400 ml-auto" />
        </div>
      </Link>

      {/* Quick Editor Dialog */}
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
    </div>
  );
}