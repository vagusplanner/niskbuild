/**
 * QuranReadingTracker
 * Unified Quran reading tracker with:
 * - Daily page & verse goal setting
 * - Surah-by-Surah progress logging
 * - Khatmah (full Quran) completion progress bar
 * - Streak counter with visual heatmap
 */
import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  BookOpen, Flame, Target, Plus, CheckCircle2, Trophy, Star, ChevronRight,
  ChevronDown, ChevronUp, Settings, Calendar, BarChart3, Zap, Edit2
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { SURAHS, TOTAL_VERSES, TOTAL_PAGES } from './QURAN_DATA';

// ── Constants ─────────────────────────────────────────────────────────────────
const TOTAL_PAGES_QURAN = 604;
const VERSES_PER_PAGE = TOTAL_VERSES / TOTAL_PAGES_QURAN; // ~10.3

const PRESETS = [
  { label: 'Khatmah in 30 days', pages: 20, desc: '1 Juz/day' },
  { label: 'Khatmah in 1 year', pages: 2, desc: '~2 pages/day' },
  { label: 'Khatmah in 6 months', pages: 4, desc: '~4 pages/day' },
  { label: 'Light reader', pages: 1, desc: '1 page/day' },
];

// ── Streak computation ────────────────────────────────────────────────────────
function computeStreak(readings) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const readDates = new Set(readings.map(r => r.date).filter(Boolean));

  // If nothing read today, streak may still be alive from yesterday
  let streak = 0;
  for (let i = 0; i < 730; i++) {
    const ds = format(subDays(new Date(), i), 'yyyy-MM-dd');
    if (readDates.has(ds)) streak++;
    else if (i === 0) continue; // today might not have reading yet, check yesterday
    else break;
  }
  // Validate: if today not read and yesterday not read, streak = 0
  if (!readDates.has(today) && !readDates.has(format(subDays(new Date(), 1), 'yyyy-MM-dd'))) {
    streak = 0;
  }
  return streak;
}

// ── Surah completion map ──────────────────────────────────────────────────────
function computeSurahProgress(readings) {
  const map = {};
  readings.forEach(r => {
    if (r.surah_number > 0) {
      if (!map[r.surah_number]) map[r.surah_number] = { read: 0, total: SURAHS.find(s => s.number === r.surah_number)?.verses || 1 };
      map[r.surah_number].read += r.verses_count || 0;
    }
  });
  return map;
}

// ── Khatmah progress (page-based) ────────────────────────────────────────────
function computeKhatmahProgress(readings) {
  // pages logged directly
  const directPages = readings.filter(r => r.pages_from && r.pages_to)
    .reduce((sum, r) => sum + Math.max(0, r.pages_to - r.pages_from + 1), 0);
  // verses-based (fallback)
  const versePages = readings.filter(r => !r.pages_from)
    .reduce((sum, r) => sum + (r.verses_count || 0), 0) / VERSES_PER_PAGE;
  const totalPages = directPages + versePages;
  return Math.min(100, Math.round((totalPages / TOTAL_PAGES_QURAN) * 100));
}

// ── Heatmap ───────────────────────────────────────────────────────────────────
function ReadingHeatmap({ readings, dailyGoalPages }) {
  const days = 35; // 5 weeks
  const readMap = useMemo(() => {
    const m = {};
    readings.forEach(r => {
      if (!r.date) return;
      if (!m[r.date]) m[r.date] = 0;
      // pages or verse-equivalent
      if (r.pages_from && r.pages_to) m[r.date] += r.pages_to - r.pages_from + 1;
      else m[r.date] += (r.verses_count || 0) / VERSES_PER_PAGE;
    });
    return m;
  }, [readings]);

  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Last 5 Weeks</p>
      <div className="grid grid-cols-7 gap-1">
        {['M','T','W','T','F','S','S'].map((d, i) => (
          <div key={i} className="text-center text-[9px] text-slate-400 font-medium">{d}</div>
        ))}
        {Array.from({ length: days }).map((_, i) => {
          const date = format(subDays(new Date(), days - 1 - i), 'yyyy-MM-dd');
          const pagesRead = readMap[date] || 0;
          const pct = dailyGoalPages > 0 ? pagesRead / dailyGoalPages : 0;
          const isToday = date === format(new Date(), 'yyyy-MM-dd');

          return (
            <div
              key={date}
              title={`${date}: ${pagesRead.toFixed(1)} pages`}
              className={cn(
                'h-6 rounded-md transition-all border',
                isToday ? 'ring-2 ring-offset-1 ring-emerald-400' : '',
                pct === 0 ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700' :
                pct < 0.5 ? 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-800/40' :
                pct < 1 ? 'bg-emerald-300 dark:bg-emerald-700/60 border-emerald-300' :
                'bg-emerald-500 dark:bg-emerald-500 border-emerald-500'
              )}
            />
          );
        })}
      </div>
      <div className="flex items-center gap-1 mt-1.5 justify-end">
        {['Less', '', '', 'More'].map((l, i) => (
          <React.Fragment key={i}>
            {l && <span className="text-[9px] text-slate-400">{l}</span>}
            <div className={cn('w-3 h-3 rounded-sm', ['bg-slate-100', 'bg-emerald-100', 'bg-emerald-300', 'bg-emerald-500'][i])} />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ── Khatmah Progress Bar ───────────────────────────────────────────────────────
function KhatmahProgressBar({ pct, completedSurahs }) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20 border border-emerald-200 dark:border-emerald-800/40 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/50">
            <Trophy className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="font-black text-sm text-emerald-900 dark:text-emerald-100">Khatmah Progress</p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400">{completedSurahs}/114 Surahs completed</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{pct}%</p>
          <p className="text-[11px] text-emerald-500">{TOTAL_PAGES_QURAN - Math.round(pct * TOTAL_PAGES_QURAN / 100)} pages left</p>
        </div>
      </div>

      {/* Segmented progress bar (30 Juz) */}
      <div className="relative h-5 bg-emerald-100 dark:bg-emerald-900/40 rounded-full overflow-hidden border border-emerald-200 dark:border-emerald-800/40">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="h-full bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600 rounded-full relative"
        >
          {pct > 5 && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-white">{pct}%</span>
          )}
        </motion.div>
        {/* Juz markers */}
        {Array.from({ length: 29 }).map((_, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 w-px bg-white/30"
            style={{ left: `${((i + 1) / 30) * 100}%` }}
          />
        ))}
      </div>

      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-emerald-500">Al-Fatihah</span>
        <span className="text-[10px] text-emerald-500">An-Nas</span>
      </div>

      {pct === 100 && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="mt-3 text-center py-2 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800/40">
          <p className="text-sm font-black text-amber-700 dark:text-amber-300">🎉 Masha'Allah! Khatmah Complete!</p>
          <p className="text-xs text-amber-600 dark:text-amber-400">May Allah accept your recitation. آمین</p>
        </motion.div>
      )}
    </div>
  );
}

// ── Surah Grid ────────────────────────────────────────────────────────────────
function SurahProgressGrid({ surahMap }) {
  const [expanded, setExpanded] = useState(false);
  const displaySurahs = expanded ? SURAHS : SURAHS.slice(0, 30);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Surah Progress</p>
        <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
          {SURAHS.filter(s => (surahMap[s.number]?.read || 0) >= s.verses).length} / 114 done
        </span>
      </div>
      <div className="grid grid-cols-10 sm:grid-cols-15 gap-1">
        {displaySurahs.map(s => {
          const read = surahMap[s.number]?.read || 0;
          const pct = Math.min(1, read / s.verses);
          return (
            <div
              key={s.number}
              title={`${s.number}. ${s.name} — ${Math.round(pct * 100)}% (${read}/${s.verses}v)`}
              className={cn(
                'h-5 rounded-sm transition-all border text-[8px] flex items-center justify-center font-bold cursor-default',
                pct === 0 ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400' :
                pct < 1 ? 'bg-emerald-200 dark:bg-emerald-800/50 border-emerald-300 dark:border-emerald-700 text-emerald-700' :
                'bg-emerald-500 border-emerald-500 text-white'
              )}
            >
              {s.number}
            </div>
          );
        })}
      </div>
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-center gap-1 mt-2 text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
      >
        {expanded ? <><ChevronUp className="w-3.5 h-3.5" />Show fewer</> : <><ChevronDown className="w-3.5 h-3.5" />Show all 114</>}
      </button>
    </div>
  );
}

// ── Goal Setting Panel ────────────────────────────────────────────────────────
function GoalPanel({ goal, onSave, onClose }) {
  const [pages, setPages] = useState(goal?.target_pages_per_day || 2);
  const [verses, setVerses] = useState(goal?.target_verses_per_day || 20);
  const [mode, setMode] = useState(goal?.goal_mode || 'pages');
  const [reminderTime, setReminderTime] = useState(goal?.reminder_time || '06:30');

  const daysToKhatmah = mode === 'pages'
    ? Math.ceil(TOTAL_PAGES_QURAN / (pages || 1))
    : Math.ceil(TOTAL_VERSES / (verses || 1));

  return (
    <div className="space-y-4">
      {/* Presets */}
      {mode === 'pages' && (
        <div>
          <p className="text-xs text-slate-500 mb-2">Quick Presets</p>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map(p => (
              <button key={p.label} onClick={() => setPages(p.pages)}
                className={cn('px-2.5 py-1 text-xs rounded-full border transition-all',
                  pages === p.pages
                    ? 'bg-emerald-500 text-white border-emerald-500'
                    : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-900/30'
                )}
              >
                {p.label} <span className="opacity-70">({p.desc})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mode toggle */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
        {[['pages', 'Daily Pages'], ['verses', 'Daily Verses']].map(([m, l]) => (
          <button key={m} type="button" onClick={() => setMode(m)}
            className={cn('flex-1 py-2 text-xs font-semibold rounded-lg transition-all',
              mode === m ? 'bg-white dark:bg-slate-700 shadow text-emerald-700 dark:text-emerald-300' : 'text-slate-500'
            )}>
            {l}
          </button>
        ))}
      </div>

      {mode === 'pages' ? (
        <div>
          <Label>Pages per day (Quran has 604 pages)</Label>
          <div className="flex items-center gap-3 mt-1">
            <Input type="number" min={1} max={604} value={pages}
              onChange={e => setPages(Number(e.target.value))} className="w-28" />
            <div className="flex flex-wrap gap-1.5">
              {[1, 2, 4, 8, 10, 20].map(n => (
                <button key={n} onClick={() => setPages(n)}
                  className={cn('px-2.5 py-1 text-xs rounded-lg border transition-all',
                    pages === n ? 'bg-emerald-500 text-white border-emerald-500' : 'border-slate-200 text-slate-600 hover:border-emerald-300 dark:border-slate-700'
                  )}>
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div>
          <Label>Verses per day (Quran has {TOTAL_VERSES} verses)</Label>
          <div className="flex items-center gap-3 mt-1">
            <Input type="number" min={1} max={TOTAL_VERSES} value={verses}
              onChange={e => setVerses(Number(e.target.value))} className="w-28" />
            <div className="flex flex-wrap gap-1.5">
              {[5, 10, 20, 50, 100].map(n => (
                <button key={n} onClick={() => setVerses(n)}
                  className={cn('px-2.5 py-1 text-xs rounded-lg border transition-all',
                    verses === n ? 'bg-emerald-500 text-white border-emerald-500' : 'border-slate-200 text-slate-600 hover:border-emerald-300 dark:border-slate-700'
                  )}>
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Khatmah projection */}
      <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 p-3">
        <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1">
          <Trophy className="w-3.5 h-3.5" /> Khatmah Projection
        </p>
        <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
          At this pace: <strong>{daysToKhatmah} days</strong> to complete the Quran
          {daysToKhatmah <= 365 ? ` (~${Math.round(daysToKhatmah / 30)} months)` : ` (~${Math.round(daysToKhatmah / 365)} years)`}
        </p>
      </div>

      <div>
        <Label>Daily Reminder Time</Label>
        <Input type="time" value={reminderTime} onChange={e => setReminderTime(e.target.value)} className="w-36 mt-1" />
      </div>

      <div className="flex gap-2 justify-end pt-1">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={() => onSave({ target_pages_per_day: pages, target_verses_per_day: verses, goal_mode: mode, reminder_time: reminderTime })}
          className="bg-emerald-600 hover:bg-emerald-700">
          Save Goal
        </Button>
      </div>
    </div>
  );
}

// ── Log Reading Dialog ────────────────────────────────────────────────────────
function LogDialog({ open, onClose, onSubmit, isPending }) {
  const [logMode, setLogMode] = useState('pages');
  const [form, setForm] = useState({
    surah_number: 1, from_verse: 1, to_verse: 7,
    pages_from: 1, pages_to: 2,
    juz: 1,
    duration_minutes: 15, notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    let data = { duration_minutes: form.duration_minutes, notes: form.notes, date: format(new Date(), 'yyyy-MM-dd'), completed: true };

    if (logMode === 'pages') {
      const versesEst = Math.round((form.pages_to - form.pages_from + 1) * VERSES_PER_PAGE);
      data = { ...data, pages_from: form.pages_from, pages_to: form.pages_to, surah_number: 0, surah_name: `Pages ${form.pages_from}–${form.pages_to}`, verses_count: versesEst };
    } else if (logMode === 'surah') {
      const surah = SURAHS.find(s => s.number === form.surah_number);
      data = { ...data, surah_number: form.surah_number, surah_name: surah?.name || '', from_verse: form.from_verse, to_verse: form.to_verse, verses_count: Math.max(1, form.to_verse - form.from_verse + 1) };
    } else {
      data = { ...data, surah_number: 0, surah_name: `Juz ${form.juz}`, verses_count: Math.round(TOTAL_VERSES / 30) };
    }
    onSubmit(data);
  };

  const selectedSurah = SURAHS.find(s => s.number === form.surah_number);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-600" /> Log Reading Session
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Mode switch */}
          <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            {[['pages', '📄 Pages'], ['surah', '📖 Surah'], ['juz', '📚 Juz']].map(([m, l]) => (
              <button key={m} type="button" onClick={() => setLogMode(m)}
                className={cn('flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all',
                  logMode === m ? 'bg-white dark:bg-slate-700 shadow text-emerald-700 dark:text-emerald-300' : 'text-slate-500'
                )}>
                {l}
              </button>
            ))}
          </div>

          {logMode === 'pages' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>From Page</Label>
                <Input type="number" min={1} max={604} value={form.pages_from}
                  onChange={e => setForm(f => ({ ...f, pages_from: Number(e.target.value) }))} />
              </div>
              <div>
                <Label>To Page</Label>
                <Input type="number" min={1} max={604} value={form.pages_to}
                  onChange={e => setForm(f => ({ ...f, pages_to: Number(e.target.value) }))} />
              </div>
              <div className="col-span-2 text-xs text-slate-500 bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2">
                📄 {form.pages_to - form.pages_from + 1} pages · ~{Math.round((form.pages_to - form.pages_from + 1) * VERSES_PER_PAGE)} verses
              </div>
            </div>
          )}

          {logMode === 'surah' && (
            <>
              <div>
                <Label>Surah</Label>
                <Select value={String(form.surah_number)} onValueChange={v => {
                  const s = SURAHS.find(s => s.number === Number(v));
                  setForm(f => ({ ...f, surah_number: Number(v), from_verse: 1, to_verse: s?.verses || 1 }));
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-64">
                    {SURAHS.map(s => (
                      <SelectItem key={s.number} value={String(s.number)}>
                        {s.number}. {s.name} ({s.verses}v)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>From Verse</Label>
                  <Input type="number" min={1} max={selectedSurah?.verses || 1} value={form.from_verse}
                    onChange={e => setForm(f => ({ ...f, from_verse: Number(e.target.value) }))} />
                </div>
                <div>
                  <Label>To Verse</Label>
                  <Input type="number" min={1} max={selectedSurah?.verses || 1} value={form.to_verse}
                    onChange={e => setForm(f => ({ ...f, to_verse: Number(e.target.value) }))} />
                </div>
              </div>
              {selectedSurah && (
                <p className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2">
                  📖 {selectedSurah.name} · {form.to_verse - form.from_verse + 1} verses · Total: {selectedSurah.verses} verses
                </p>
              )}
            </>
          )}

          {logMode === 'juz' && (
            <div>
              <Label>Juz Number</Label>
              <Select value={String(form.juz)} onValueChange={v => setForm(f => ({ ...f, juz: Number(v) }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {Array.from({ length: 30 }, (_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>Juz {i + 1}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Duration (mins)</Label>
              <Input type="number" min={1} value={form.duration_minutes}
                onChange={e => setForm(f => ({ ...f, duration_minutes: Number(e.target.value) }))} />
            </div>
            <div className="flex items-end gap-1">
              {[5, 10, 15, 20, 30].map(n => (
                <button key={n} type="button" onClick={() => setForm(f => ({ ...f, duration_minutes: n }))}
                  className={cn('px-2 py-1.5 text-xs rounded-lg border transition-all flex-1',
                    form.duration_minutes === n ? 'bg-emerald-500 text-white border-emerald-500' : 'border-slate-200 text-slate-500 dark:border-slate-700'
                  )}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Reflection (optional)</Label>
            <Textarea rows={2} placeholder="Any reflections or notes..." value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isPending} className="bg-emerald-600 hover:bg-emerald-700">
              {isPending ? 'Saving...' : 'Log Reading ✓'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function QuranReadingTracker() {
  const [showLog, setShowLog] = useState(false);
  const [showGoal, setShowGoal] = useState(false);
  const [tab, setTab] = useState('overview'); // overview | surahs | history
  const queryClient = useQueryClient();

  const { data: readings = [] } = useQuery({
    queryKey: ['quranReadings'],
    queryFn: () => base44.entities.QuranReading.list('-date', 500)
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['quranGoals'],
    queryFn: () => base44.entities.QuranGoal.list('-created_date')
  });

  const activeGoal = goals.find(g => g.status === 'active');

  const logMutation = useMutation({
    mutationFn: (data) => base44.entities.QuranReading.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quranReadings'] });
      toast.success('Reading logged! جزاك الله خيرًا 📖');
      setShowLog(false);
    }
  });

  const goalMutation = useMutation({
    mutationFn: async (data) => {
      if (activeGoal) {
        return base44.entities.QuranGoal.update(activeGoal.id, data);
      }
      return base44.entities.QuranGoal.create({ ...data, status: 'active', streak: 0, best_streak: 0, total_verses_read: 0, title: 'My Quran Reading Goal' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quranGoals'] });
      toast.success('Goal saved!');
      setShowGoal(false);
    }
  });

  // ── Computed values ──────────────────────────────────────────────────────────
  const streak = useMemo(() => computeStreak(readings), [readings]);
  const surahMap = useMemo(() => computeSurahProgress(readings), [readings]);
  const khatmahPct = useMemo(() => computeKhatmahProgress(readings), [readings]);
  const completedSurahs = useMemo(() => SURAHS.filter(s => (surahMap[s.number]?.read || 0) >= s.verses).length, [surahMap]);

  const today = format(new Date(), 'yyyy-MM-dd');
  const todayReadings = readings.filter(r => r.date === today);
  const todayPages = todayReadings.reduce((sum, r) => {
    if (r.pages_from && r.pages_to) return sum + (r.pages_to - r.pages_from + 1);
    return sum + (r.verses_count || 0) / VERSES_PER_PAGE;
  }, 0);
  const todayVerses = todayReadings.reduce((sum, r) => sum + (r.verses_count || 0), 0);

  const goalPages = activeGoal?.target_pages_per_day || 2;
  const goalVerses = activeGoal?.target_verses_per_day || 20;
  const goalMode = activeGoal?.goal_mode || 'pages';

  const todayGoalProgress = goalMode === 'pages'
    ? Math.min(100, Math.round((todayPages / goalPages) * 100))
    : Math.min(100, Math.round((todayVerses / goalVerses) * 100));

  const todayGoalLabel = goalMode === 'pages'
    ? `${todayPages.toFixed(1)} / ${goalPages} pages`
    : `${todayVerses} / ${goalVerses} verses`;

  const TABS = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'surahs', label: 'Surahs', icon: BookOpen },
    { id: 'history', label: 'History', icon: Calendar },
  ];

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-black text-lg text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-600" />
            Quran Reading Tracker
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Track your daily reading · Khatmah progress · Streaks</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowGoal(true)} className="gap-1.5 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300">
            <Settings className="w-3.5 h-3.5" /> Goal
          </Button>
          <Button size="sm" onClick={() => setShowLog(true)} className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-3.5 h-3.5" /> Log Reading
          </Button>
        </div>
      </div>

      {/* ── Streak + Today stat row ── */}
      <div className="grid grid-cols-3 gap-3">
        {/* Streak */}
        <div className="rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border border-orange-200 dark:border-orange-800/40 p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Flame className="w-5 h-5 text-orange-500" />
          </div>
          <p className="text-2xl font-black text-orange-600 dark:text-orange-400">{streak}</p>
          <p className="text-[11px] text-orange-500 font-semibold">Day Streak</p>
          {streak > 0 && <p className="text-[10px] text-orange-400 mt-0.5">Keep it up! 🔥</p>}
        </div>

        {/* Today */}
        <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border border-emerald-200 dark:border-emerald-800/40 p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Target className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{todayGoalProgress}%</p>
          <p className="text-[11px] text-emerald-600 font-semibold">Today's Goal</p>
          <p className="text-[10px] text-emerald-500 mt-0.5">{todayGoalLabel}</p>
        </div>

        {/* Khatmah */}
        <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 border border-indigo-200 dark:border-indigo-800/40 p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Trophy className="w-5 h-5 text-indigo-500" />
          </div>
          <p className="text-2xl font-black text-indigo-700 dark:text-indigo-300">{khatmahPct}%</p>
          <p className="text-[11px] text-indigo-600 font-semibold">Khatmah</p>
          <p className="text-[10px] text-indigo-500 mt-0.5">{completedSurahs}/114 Surahs</p>
        </div>
      </div>

      {/* ── Today's progress bar ── */}
      {activeGoal ? (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Today's Goal Progress</span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">{todayGoalLabel}</span>
          </div>
          <div className="h-3 bg-emerald-100 dark:bg-emerald-900/40 rounded-full overflow-hidden border border-emerald-200 dark:border-emerald-800/40">
            <motion.div
              initial={{ width: 0 }} animate={{ width: `${todayGoalProgress}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={cn('h-full rounded-full', todayGoalProgress >= 100 ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : 'bg-gradient-to-r from-emerald-300 to-emerald-500')}
            />
          </div>
          {todayGoalProgress >= 100 && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Daily goal complete! ✨
            </p>
          )}
        </div>
      ) : (
        <button onClick={() => setShowGoal(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 text-sm font-semibold hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors">
          <Target className="w-4 h-4" /> Set your daily reading goal
        </button>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all',
              tab === id ? 'bg-white dark:bg-slate-700 shadow text-emerald-700 dark:text-emerald-300' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            )}>
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <AnimatePresence mode="wait">
        {tab === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
            <KhatmahProgressBar pct={khatmahPct} completedSurahs={completedSurahs} />
            <ReadingHeatmap readings={readings} dailyGoalPages={goalPages} />
          </motion.div>
        )}

        {tab === 'surahs' && (
          <motion.div key="surahs" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <SurahProgressGrid surahMap={surahMap} />
          </motion.div>
        )}

        {tab === 'history' && (
          <motion.div key="history" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2">
            {readings.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No sessions logged yet. Start reading!</p>
              </div>
            ) : (
              readings.slice(0, 20).map(r => (
                <div key={r.id} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700/60 shadow-sm">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl flex-shrink-0">
                    <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">{r.surah_name}</p>
                    <p className="text-xs text-slate-400">
                      {r.date} · {r.verses_count} verses
                      {r.duration_minutes ? ` · ${r.duration_minutes} min` : ''}
                    </p>
                    {r.notes && <p className="text-xs text-slate-500 dark:text-slate-400 italic mt-0.5 truncate">"{r.notes}"</p>}
                  </div>
                  {r.completed && <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
                </div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Log Dialog ── */}
      <LogDialog open={showLog} onClose={() => setShowLog(false)} onSubmit={logMutation.mutate} isPending={logMutation.isPending} />

      {/* ── Goal Dialog ── */}
      <Dialog open={showGoal} onOpenChange={setShowGoal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-600" /> Reading Goal Settings
            </DialogTitle>
          </DialogHeader>
          <GoalPanel goal={activeGoal} onSave={goalMutation.mutate} onClose={() => setShowGoal(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}