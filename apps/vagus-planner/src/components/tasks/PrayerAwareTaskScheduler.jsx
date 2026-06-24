/**
 * PrayerAwareTaskScheduler
 * 
 * Appears inside TaskForm once a title + duration exist.
 * Calls suggestTaskTimeSlots, displays the 3 best prayer-gap-aware slots,
 * and lets the user pick one to auto-fill due_date + due_time on the form.
 */
import React, { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Clock, Moon, Sun, Sunset, ChevronDown, ChevronUp,
  CheckCircle2, Loader2, Calendar, Zap, Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';

const PERIOD_ICONS = {
  morning_peak: '🌅',
  mid_morning:  '☀️',
  post_lunch:   '😴',
  afternoon:    '🌤️',
  evening:      '🌙',
  night:        '🌃',
};

const PERIOD_COLORS = {
  morning_peak: 'text-amber-600 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40',
  mid_morning:  'text-orange-600 bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800/40',
  post_lunch:   'text-slate-500 bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700',
  afternoon:    'text-blue-600 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/40',
  evening:      'text-violet-600 bg-violet-50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-800/40',
  night:        'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800/40',
};

const SCORE_COLOR = (s) => s >= 80 ? 'text-emerald-600' : s >= 60 ? 'text-amber-500' : 'text-slate-400';

function SlotCard({ slot, selected, onSelect, index }) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06 }}
      onClick={() => onSelect(slot)}
      className={cn(
        'w-full text-left p-3.5 rounded-xl border-2 transition-all group',
        selected
          ? 'border-[#1D6FB8] bg-blue-50 dark:bg-blue-950/20 shadow-sm'
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 hover:border-blue-300 dark:hover:border-blue-600'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Rank badge */}
        <div className={cn(
          'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5',
          index === 0 ? 'bg-[#1D6FB8] text-white' :
          index === 1 ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300' :
          'bg-slate-100 dark:bg-slate-800 text-slate-500'
        )}>
          {index === 0 ? '⭐' : index + 1}
        </div>

        <div className="flex-1 min-w-0">
          {/* Time + label */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-black text-slate-800 dark:text-slate-100 text-sm">
              {slot.start_time} – {slot.end_time}
            </span>
            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', PERIOD_COLORS[slot.productivity_period])}>
              {PERIOD_ICONS[slot.productivity_period]} {slot.label}
            </span>
            {slot.score && (
              <span className={cn('text-[10px] font-bold', SCORE_COLOR(slot.score))}>
                {slot.score}% fit
              </span>
            )}
          </div>

          {/* Prayer gap */}
          {slot.prayer_gap && (
            <p className="text-[11px] text-violet-600 dark:text-violet-400 font-semibold mb-0.5">
              🕌 {slot.prayer_gap}
            </p>
          )}

          {/* Reason */}
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{slot.reason}</p>
        </div>

        {/* Selected check */}
        {selected && (
          <CheckCircle2 className="w-5 h-5 text-[#1D6FB8] flex-shrink-0 mt-0.5" />
        )}
      </div>
    </motion.button>
  );
}

export default function PrayerAwareTaskScheduler({
  title,
  description,
  category,
  priority,
  estimatedMinutes,
  dueDate,
  onApplySlot, // (date: string, time: string) => void
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [targetDate, setTargetDate] = useState(
    dueDate || new Date().toISOString().split('T')[0]
  );

  const suggest = useCallback(async () => {
    if (!title?.trim()) return;
    setLoading(true);
    setResult(null);
    setSelectedSlot(null);
    try {
      const res = await base44.functions.invoke('suggestTaskTimeSlots', {
        title,
        description: description || '',
        category: category || 'personal',
        priority: priority || 'medium',
        estimated_minutes: estimatedMinutes ? parseInt(estimatedMinutes) : 60,
        due_date: dueDate || '',
        target_date: targetDate,
      });
      setResult(res.data);
    } catch (e) {
      toast.error('Could not generate time suggestions');
    } finally {
      setLoading(false);
    }
  }, [title, description, category, priority, estimatedMinutes, dueDate, targetDate]);

  const handleToggle = () => {
    if (!open) {
      setOpen(true);
      suggest();
    } else {
      setOpen(false);
    }
  };

  const handleSelectSlot = (slot) => {
    setSelectedSlot(slot);
  };

  const handleApply = () => {
    if (!selectedSlot) return;
    onApplySlot(targetDate, selectedSlot.start_time);
    toast.success(`Scheduled at ${selectedSlot.start_time} on ${format(new Date(targetDate), 'EEE, MMM d')}`);
    setOpen(false);
  };

  return (
    <div className="rounded-xl border border-[#1D6FB8]/30 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 dark:from-blue-950/10 dark:to-indigo-950/10 overflow-hidden">
      {/* Header toggle */}
      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-blue-50/50 dark:hover:bg-blue-950/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#1D6FB8] flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-[#1D6FB8]">AI Smart Scheduler</p>
            <p className="text-[11px] text-slate-400">Suggest time slots around prayer times</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {result && !open && selectedSlot && (
            <span className="text-[11px] font-semibold text-[#1D6FB8] bg-blue-100 dark:bg-blue-950/30 px-2 py-0.5 rounded-full">
              {selectedSlot.start_time}
            </span>
          )}
          {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-[#1D6FB8]/10">

              {/* Date picker */}
              <div className="flex items-center gap-3 pt-3">
                <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Schedule for date</label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={e => setTargetDate(e.target.value)}
                    className="w-full h-9 px-3 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                  />
                </div>
                <Button type="button" size="sm" onClick={suggest} disabled={loading}
                  className="h-9 bg-[#1D6FB8] hover:bg-[#2980B9] text-white flex-shrink-0 gap-1.5">
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                  {loading ? 'Analysing…' : 'Suggest'}
                </Button>
              </div>

              {/* Loading skeleton */}
              {loading && (
                <div className="space-y-2.5">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-20 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                  ))}
                </div>
              )}

              {/* Results */}
              {result && !loading && (
                <div className="space-y-3">
                  {/* Prayer times mini strip */}
                  {result.prayer_available && Object.keys(result.prayer_times || {}).length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap p-2.5 rounded-lg bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800/40">
                      <Moon className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
                      <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 mr-1">Prayer times:</span>
                      {Object.entries(result.prayer_times).map(([name, time]) => (
                        <span key={name} className="text-[10px] font-semibold text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-900/30 px-1.5 py-0.5 rounded-full">
                          {name} {time}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Slot cards */}
                  <div className="space-y-2">
                    {(result.slots || []).map((slot, i) => (
                      <SlotCard
                        key={i}
                        slot={slot}
                        index={i}
                        selected={selectedSlot === slot}
                        onSelect={handleSelectSlot}
                      />
                    ))}
                  </div>

                  {/* Balance tip */}
                  {result.balance_tip && (
                    <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-800/30">
                      <Info className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">{result.balance_tip}</p>
                    </div>
                  )}

                  {/* Apply button */}
                  {selectedSlot && (
                    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                      <Button type="button" onClick={handleApply}
                        className="w-full h-10 bg-[#1D6FB8] hover:bg-[#2980B9] text-white font-bold gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Use {selectedSlot.start_time} – {selectedSlot.end_time}
                      </Button>
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}