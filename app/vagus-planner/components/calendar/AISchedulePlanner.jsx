import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { format, addDays, startOfWeek, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import {
  Sparkles, Loader2, X, Calendar, CheckCircle2, RefreshCw,
  ChevronRight, Zap, Clock, Shuffle, Bell, ThumbsUp, ThumbsDown,
  LayoutGrid, CalendarDays, CalendarRange
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const PERIOD_OPTIONS = [
  { id: 'day',   label: 'Today',      icon: Calendar,     desc: 'Plan just today' },
  { id: 'week',  label: 'This Week',  icon: CalendarDays, desc: 'Full week plan' },
  { id: 'month', label: 'This Month', icon: CalendarRange, desc: 'Monthly overview' },
];

const CATEGORY_COLORS = {
  work: 'bg-blue-100 text-blue-700 border-blue-200',
  personal: 'bg-sky-100 text-sky-700 border-sky-200',
  health: 'bg-teal-100 text-teal-700 border-teal-200',
  prayer: 'bg-amber-100 text-amber-700 border-amber-200',
  family: 'bg-purple-100 text-purple-700 border-purple-200',
  social: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  holiday: 'bg-orange-100 text-orange-700 border-orange-200',
  other: 'bg-slate-100 text-slate-600 border-slate-200',
};

function EventCard({ event, variant = 'suggested' }) {
  const start = event.start_date ? new Date(event.start_date) : null;
  const end = event.end_date ? new Date(event.end_date) : null;
  const colorClass = CATEGORY_COLORS[event.category] || CATEGORY_COLORS.other;

  return (
    <div className={cn(
      'flex items-start gap-3 p-3 rounded-xl border text-sm',
      variant === 'suggested' ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
        : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
    )}>
      <div className="flex-shrink-0 mt-0.5">
        <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-md border', colorClass)}>
          {event.category || 'other'}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">{event.title}</p>
        {start && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {format(start, 'EEE d MMM')}
            {!event.is_all_day && ` · ${format(start, 'h:mm a')}`}
            {end && !event.is_all_day && ` – ${format(end, 'h:mm a')}`}
          </p>
        )}
        {event.description && (
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">{event.description}</p>
        )}
      </div>
    </div>
  );
}

function AlternativeSchedule({ alt, index, onSelect }) {
  return (
    <button
      onClick={() => onSelect(alt)}
      className="w-full text-left p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/20 transition-all group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <span className="text-xs font-black bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded-full">
            Option {index + 1}
          </span>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-1">{alt.label}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-violet-500 flex-shrink-0 mt-1 transition-colors" />
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{alt.description}</p>
      <div className="flex flex-wrap gap-1 mt-2">
        {(alt.focus_areas || []).map(area => (
          <span key={area} className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            {area}
          </span>
        ))}
      </div>
    </button>
  );
}

export default function AISchedulePlanner({ isOpen, onClose, onEventsCreated }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState('select'); // select | generating | review | alternatives | applying | done
  const [period, setPeriod] = useState('week');
  const [result, setResult] = useState(null);
  const [selectedAlt, setSelectedAlt] = useState(null);
  const [notifyEnabled, setNotifyEnabled] = useState(true);

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const { data: events = [] } = useQuery({
    queryKey: ['events', user?.email],
    queryFn: () => user?.email
      ? base44.entities.Event.filter({ created_by: user.email }, '-start_date', 300)
      : Promise.resolve([]),
    enabled: !!user?.email,
  });
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-updated_date', 50),
  });
  const { data: settings = [] } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => base44.entities.UserSettings.list(),
  });

  const generate = async (overrideStyle = null) => {
    setStep('generating');
    setResult(null);

    // Build history context from existing events
    const now = new Date();
    const pastEvents = events
      .filter(e => e.start_date && new Date(e.start_date) < now)
      .slice(0, 60)
      .map(e => ({
        title: e.title,
        category: e.category,
        start_date: e.start_date,
        duration_minutes: e.end_date
          ? Math.round((new Date(e.end_date) - new Date(e.start_date)) / 60000)
          : 60,
        recurrence: e.is_recurring,
      }));

    const upcomingEvents = events
      .filter(e => e.start_date && new Date(e.start_date) >= now)
      .slice(0, 30)
      .map(e => ({ title: e.title, category: e.category, start_date: e.start_date }));

    const pendingTasks = tasks
      .filter(t => t.status !== 'completed')
      .slice(0, 20)
      .map(t => ({ title: t.title, priority: t.priority, due_date: t.due_date, category: t.category }));

    const userPrefs = settings[0] || {};
    const islamicMode = userPrefs.islamic_mode;

    const periodLabel = period === 'day' ? 'today' : period === 'week' ? 'this week' : 'this month';
    const style = overrideStyle || 'balanced';

    try {
      const res = await base44.functions.invoke('aiSchedulePlanner', {
        period,
        style,
        past_events: pastEvents,
        upcoming_events: upcomingEvents,
        pending_tasks: pendingTasks,
        islamic_mode: islamicMode,
        prayer_method: userPrefs.prayer_method || 'MWL',
        working_hours_start: userPrefs.working_hours_start || '09:00',
        working_hours_end: userPrefs.working_hours_end || '17:00',
        working_days: userPrefs.working_days || [1,2,3,4,5],
        today: format(now, 'yyyy-MM-dd'),
      });

      setResult(res.data);
      setStep('review');
    } catch (err) {
      toast.error('Failed to generate schedule — please try again');
      setStep('select');
    }
  };

  const applySchedule = async (eventsToCreate) => {
    setStep('applying');
    let created = 0;
    for (const ev of eventsToCreate) {
      try {
        await base44.entities.Event.create(ev);
        created++;
      } catch { /* skip individual failures */ }
    }
    queryClient.invalidateQueries({ queryKey: ['events'] });
    onEventsCreated?.();
    toast.success(`✅ ${created} events added to your calendar!`);
    setStep('done');
  };

  const handleKeep = () => applySchedule(result?.suggested_events || []);

  const handleSelectAlternative = (alt) => {
    setSelectedAlt(alt);
    // Re-generate with the chosen style
    generate(alt.style_key || 'balanced');
  };

  const reset = () => {
    setStep('select');
    setResult(null);
    setSelectedAlt(null);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110]"
        onClick={step === 'generating' || step === 'applying' ? undefined : onClose} />

      <div className="fixed inset-0 z-[111] flex items-end sm:items-center justify-center sm:p-4 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="pointer-events-auto w-full sm:max-w-xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-800 dark:text-slate-100">AI Schedule Planner</h2>
                <p className="text-[10px] text-slate-400">One-click smart scheduling from your history</p>
              </div>
            </div>
            {step !== 'generating' && step !== 'applying' && (
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">

            {/* STEP: SELECT PERIOD */}
            {step === 'select' && (
              <div className="p-5 space-y-5">
                <div>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">What would you like to plan?</p>
                  <div className="grid grid-cols-3 gap-2">
                    {PERIOD_OPTIONS.map(opt => {
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => setPeriod(opt.id)}
                          className={cn(
                            'flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all',
                            period === opt.id
                              ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/30'
                              : 'border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-700'
                          )}>
                          <Icon className={cn('w-5 h-5', period === opt.id ? 'text-violet-600' : 'text-slate-400')} />
                          <span className={cn('text-xs font-bold', period === opt.id ? 'text-violet-700 dark:text-violet-300' : 'text-slate-600 dark:text-slate-400')}>
                            {opt.label}
                          </span>
                          <span className="text-[10px] text-slate-400 text-center leading-tight">{opt.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* History summary */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Your Activity Snapshot
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-lg font-black text-slate-800 dark:text-slate-100">{events.length}</p>
                      <p className="text-[10px] text-slate-400">past events</p>
                    </div>
                    <div>
                      <p className="text-lg font-black text-slate-800 dark:text-slate-100">{tasks.filter(t => t.status !== 'completed').length}</p>
                      <p className="text-[10px] text-slate-400">open tasks</p>
                    </div>
                    <div>
                      <p className="text-lg font-black text-slate-800 dark:text-slate-100">
                        {[...new Set(events.map(e => e.category).filter(Boolean))].length}
                      </p>
                      <p className="text-[10px] text-slate-400">categories</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 bg-violet-50 dark:bg-violet-950/20 rounded-xl border border-violet-100 dark:border-violet-900">
                  <Bell className="w-4 h-4 text-violet-500 flex-shrink-0" />
                  <p className="text-xs text-slate-600 dark:text-slate-400 flex-1">Daily reminder when schedule is ready</p>
                  <button onClick={() => setNotifyEnabled(v => !v)}
                    className={cn('w-10 h-5 rounded-full transition-all', notifyEnabled ? 'bg-violet-500' : 'bg-slate-300 dark:bg-slate-700')}>
                    <span className={cn('block w-4 h-4 rounded-full bg-white shadow transition-all mt-0.5', notifyEnabled ? 'ml-5.5' : 'ml-0.5')} />
                  </button>
                </div>

                <Button
                  onClick={() => generate()}
                  className="w-full h-12 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-black text-base gap-2 rounded-2xl shadow-lg shadow-violet-500/25"
                >
                  <Zap className="w-5 h-5" />
                  Generate My {period === 'day' ? 'Daily' : period === 'week' ? 'Weekly' : 'Monthly'} Plan
                </Button>
              </div>
            )}

            {/* STEP: GENERATING */}
            {step === 'generating' && (
              <div className="flex flex-col items-center justify-center py-16 px-6 space-y-5">
                <div className="relative">
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-xl shadow-violet-400/30">
                    <Sparkles className="w-10 h-10 text-white" />
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center shadow">
                    <Loader2 className="w-5 h-5 text-violet-600 animate-spin" />
                  </div>
                </div>
                <div className="text-center space-y-1">
                  <p className="text-lg font-black text-slate-800 dark:text-slate-100">Analysing your history…</p>
                  <p className="text-sm text-slate-500">Building the perfect {period} plan based on your patterns</p>
                </div>
                <div className="w-full max-w-xs space-y-1.5">
                  {['Reading past events', 'Analysing routines', 'Scheduling around tasks', 'Adding balance'].map((label, i) => (
                    <motion.div key={label}
                      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.4 }}
                      className="flex items-center gap-2 text-xs text-slate-500">
                      <CheckCircle2 className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
                      {label}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP: REVIEW */}
            {step === 'review' && result && (
              <div className="p-5 space-y-4">
                {/* Summary */}
                <div className="p-4 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/20 rounded-2xl border border-violet-100 dark:border-violet-900">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-black text-violet-800 dark:text-violet-200">{result.title || `Your ${period} plan is ready`}</p>
                    <Badge className="bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/40 dark:text-violet-300 text-[10px]">
                      {result.suggested_events?.length || 0} events
                    </Badge>
                  </div>
                  {result.summary && (
                    <p className="text-xs text-violet-600/80 dark:text-violet-400/80 leading-relaxed">{result.summary}</p>
                  )}
                  {result.insights?.length > 0 && (
                    <ul className="mt-2 space-y-0.5">
                      {result.insights.map((ins, i) => (
                        <li key={i} className="text-xs text-violet-700 dark:text-violet-400 flex gap-1.5">
                          <span>•</span>{ins}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Suggested events */}
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Suggested Schedule</p>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {(result.suggested_events || []).map((ev, i) => (
                      <EventCard key={i} event={ev} variant="suggested" />
                    ))}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button onClick={handleKeep}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 gap-2 rounded-2xl">
                    <ThumbsUp className="w-4 h-4" /> Keep It
                  </Button>
                  <Button onClick={() => setStep('alternatives')} variant="outline"
                    className="border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 font-bold h-11 gap-2 rounded-2xl hover:bg-violet-50 dark:hover:bg-violet-950/30">
                    <Shuffle className="w-4 h-4" /> Try Different
                  </Button>
                </div>
                <Button onClick={reset} variant="ghost" size="sm"
                  className="w-full text-slate-400 text-xs gap-1">
                  <RefreshCw className="w-3 h-3" /> Start Over
                </Button>
              </div>
            )}

            {/* STEP: ALTERNATIVES */}
            {step === 'alternatives' && result && (
              <div className="p-5 space-y-4">
                <div>
                  <p className="text-sm font-black text-slate-800 dark:text-slate-100 mb-1">Choose a different approach</p>
                  <p className="text-xs text-slate-500">Pick a style and we'll regenerate your plan</p>
                </div>
                <div className="space-y-2">
                  {(result.alternatives || []).map((alt, i) => (
                    <AlternativeSchedule key={i} alt={alt} index={i} onSelect={handleSelectAlternative} />
                  ))}
                </div>
                <Button onClick={() => setStep('review')} variant="ghost" size="sm"
                  className="w-full text-slate-400 text-xs gap-1">
                  ← Back to previous plan
                </Button>
              </div>
            )}

            {/* STEP: APPLYING */}
            {step === 'applying' && (
              <div className="flex flex-col items-center justify-center py-16 px-6 space-y-4">
                <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
                <p className="text-lg font-black text-slate-800 dark:text-slate-100">Adding to your calendar…</p>
                <p className="text-sm text-slate-400">Just a moment</p>
              </div>
            )}

            {/* STEP: DONE */}
            {step === 'done' && (
              <div className="flex flex-col items-center justify-center py-16 px-6 space-y-5 text-center">
                <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-xl shadow-emerald-400/30">
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </motion.div>
                <div>
                  <p className="text-xl font-black text-slate-800 dark:text-slate-100">All Done! 🎉</p>
                  <p className="text-sm text-slate-500 mt-1">Your {period} plan has been added to your calendar.</p>
                </div>
                {notifyEnabled && (
                  <div className="flex items-center gap-2 p-3 bg-violet-50 dark:bg-violet-950/20 rounded-xl border border-violet-100 dark:border-violet-800 text-xs text-violet-700 dark:text-violet-300">
                    <Bell className="w-3.5 h-3.5" />
                    Reminder scheduled for next {period} planning
                  </div>
                )}
                <div className="flex gap-2 w-full">
                  <Button onClick={reset} variant="outline" className="flex-1 rounded-2xl font-bold">
                    Plan Another
                  </Button>
                  <Button onClick={onClose} className="flex-1 rounded-2xl font-bold bg-violet-600 hover:bg-violet-700 text-white">
                    View Calendar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}