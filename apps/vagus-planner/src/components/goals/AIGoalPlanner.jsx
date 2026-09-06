import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, addDays, addWeeks } from 'date-fns';
import {
  Target, Sparkles, Loader2, CheckCircle2, Flame, Calendar,
  ChevronDown, ChevronUp, X, RefreshCw, ArrowRight,
  TrendingUp, Brain, Star, ListChecks, BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { requireVpAiFunctions } from '@/lib/vp-registered-functions';

const GOAL_PRESETS = [
  { label: 'Memorise Quran (Hifz)', emoji: '📖', category: 'spiritual', timeframe: '12 months' },
  { label: 'Pray all 5 daily prayers consistently', emoji: '🕌', category: 'spiritual', timeframe: '1 month' },
  { label: 'Read 30 books this year', emoji: '📚', category: 'learning', timeframe: '12 months' },
  { label: 'Get financially debt-free', emoji: '💰', category: 'financial', timeframe: '24 months' },
  { label: 'Improve my health & fitness', emoji: '💪', category: 'health', timeframe: '6 months' },
  { label: 'Build a consistent morning routine', emoji: '🌅', category: 'personal', timeframe: '1 month' },
  { label: 'Complete Hajj or Umrah', emoji: '🕋', category: 'spiritual', timeframe: '12 months' },
  { label: 'Learn Arabic', emoji: '🌙', category: 'spiritual', timeframe: '12 months' },
];

const CATEGORY_STYLES = {
  spiritual: 'from-amber-400 to-orange-500',
  health:    'from-emerald-400 to-teal-500',
  financial: 'from-blue-400 to-indigo-500',
  learning:  'from-violet-400 to-purple-500',
  personal:  'from-rose-400 to-pink-500',
  relationships: 'from-red-400 to-rose-500',
  professional:  'from-sky-400 to-blue-500',
  other:     'from-slate-400 to-slate-500',
};

// ── Habit pill ──────────────────────────────────────────────────────────────
function HabitPill({ habit }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800/40">
      <Flame className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-tight">{habit.title}</p>
        <p className="text-[9px] text-slate-400">{habit.frequency} · target {habit.target_count} {habit.unit}</p>
      </div>
    </div>
  );
}

// ── Task pill ───────────────────────────────────────────────────────────────
function TaskPill({ task }) {
  const priorityColor = task.priority === 'high' ? 'bg-red-500' : task.priority === 'medium' ? 'bg-amber-500' : 'bg-slate-300';
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800/40">
      <div className={cn('w-2 h-2 rounded-full flex-shrink-0', priorityColor)} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-tight">{task.title}</p>
        {task.due_label && <p className="text-[9px] text-slate-400">{task.due_label}</p>}
      </div>
    </div>
  );
}

// ── Milestone pill ──────────────────────────────────────────────────────────
function MilestonePill({ milestone }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800/40">
      <Calendar className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-tight">{milestone.title}</p>
        {milestone.week_offset != null && <p className="text-[9px] text-slate-400">Week {milestone.week_offset}</p>}
      </div>
    </div>
  );
}

// ── Saved goal card ─────────────────────────────────────────────────────────
function GoalCard({ goal }) {
  const [expanded, setExpanded] = useState(false);
  const pct = goal.progress || 0;
  const grad = CATEGORY_STYLES[goal.category] || CATEGORY_STYLES.other;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className={cn('w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0', grad)}>
          <Target className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{goal.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-teal-400 to-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[10px] text-slate-400 font-bold flex-shrink-0">{pct}%</span>
          </div>
        </div>
        <button onClick={() => setExpanded(v => !v)} className="text-slate-400 hover:text-slate-600 flex-shrink-0">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-slate-50 dark:border-slate-700/60">
            <div className="px-4 pb-3 pt-2 space-y-1.5">
              {(goal.action_steps || []).slice(0, 5).map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <CheckCircle2 className={cn('w-3 h-3 flex-shrink-0', s.completed ? 'text-emerald-400' : 'text-slate-200 dark:text-slate-600')} />
                  {s.title}
                </div>
              ))}
              {goal.description && <p className="text-[10px] text-slate-400 italic pt-1">{goal.description}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
/**
 * Canonical goal AI: generate+sync plan, SMART analyze, Apply→Tasks via generateTasksFromGoal.
 * Profile/Goals modals and SmartGoalSuggestions all open this same surface.
 */
export default function AIGoalPlanner({
  isOpen,
  onClose,
  goal = null,
  onUpdateGoal,
  variant = 'inline', // 'inline' | 'modal'
  defaultTab = 'plan', // 'plan' | 'analyze' | 'tasks'
} = {}) {
  const queryClient = useQueryClient();
  const canGenerateTasks = requireVpAiFunctions('generateTasksFromGoal');
  const isModal = variant === 'modal' || typeof isOpen === 'boolean';
  const [tab, setTab] = useState(goal ? (defaultTab === 'plan' ? 'analyze' : defaultTab) : defaultTab);
  const [goalText, setGoalText] = useState(goal?.title || '');
  const [timeframe, setTimeframe] = useState('3 months');
  const [phase, setPhase] = useState('idle'); // idle | generating | result | syncing | done
  const [plan, setPlan] = useState(null);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [taskPack, setTaskPack] = useState(null);
  const [taskPhase, setTaskPhase] = useState('idle'); // idle | generating | result | applying

  useEffect(() => {
    if (goal?.title) {
      setGoalText(goal.title);
      setTab(defaultTab === 'plan' ? 'analyze' : defaultTab);
      setAnalysis(null);
      setTaskPack(null);
    }
  }, [goal?.id, goal?.title, defaultTab]);

  const { data: goals = [] } = useQuery({
    queryKey: ['goals'],
    queryFn: () => base44.entities.Goal.list('-created_date', 20),
  });

  if (isModal && isOpen === false) return null;

  const selectPreset = (p) => {
    setSelectedPreset(p);
    setGoalText(p.label);
    setTimeframe(p.timeframe);
  };

  const analyzeGoal = async () => {
    const title = goal?.title || goalText;
    if (!title?.trim()) {
      toast.error('Enter or select a goal first');
      return;
    }
    setAnalyzing(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Provide a SMART analysis and action plan for this goal.

Title: ${title}
Description: ${goal?.description || 'Not provided'}
Category: ${goal?.category || 'personal'}
Target Date: ${goal?.target_date ? format(new Date(goal.target_date), 'MMMM d, yyyy') : 'Not set'}
Priority: ${goal?.priority || 'medium'}
Status: ${goal?.status || 'in_progress'}

Return concrete, actionable guidance.`,
        response_json_schema: {
          type: 'object',
          properties: {
            smart_analysis: {
              type: 'object',
              properties: {
                specific: { type: 'string' },
                measurable: { type: 'string' },
                achievable: { type: 'string' },
                relevant: { type: 'string' },
                time_bound: { type: 'string' },
                overall_score: { type: 'number' },
              },
            },
            motivation: { type: 'string' },
            action_steps: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  timeline: { type: 'string' },
                  priority: { type: 'string' },
                },
              },
            },
            obstacles: {
              type: 'array',
              items: {
                type: 'object',
                properties: { obstacle: { type: 'string' }, solution: { type: 'string' } },
              },
            },
            learning_resources: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string' },
                  name: { type: 'string' },
                  description: { type: 'string' },
                },
              },
            },
          },
        },
      });
      if (!result?.smart_analysis && !result?.action_steps) {
        throw new Error('Incomplete analysis response');
      }
      setAnalysis(result);
      toast.success('Goal analysis complete');
    } catch (error) {
      toast.error(error?.message || 'Failed to analyze goal');
    } finally {
      setAnalyzing(false);
    }
  };

  const saveActionSteps = () => {
    if (!analysis?.action_steps?.length) return;
    const steps = analysis.action_steps.map((step) => ({
      title: step.title,
      completed: false,
      due_date: step.timeline || '',
    }));
    if (onUpdateGoal) {
      onUpdateGoal({ action_steps: steps });
      toast.success('Action steps saved to goal');
    } else {
      toast.message('Open this from a goal card to save steps onto the goal');
    }
  };

  const generateTasksOnly = async () => {
    const title = (goal?.title || goalText || '').trim();
    if (title.length < 3) {
      toast.error('Enter a goal (min 3 characters)');
      return;
    }
    if (!canGenerateTasks) {
      toast.error('generateTasksFromGoal is unavailable');
      return;
    }
    setTaskPhase('generating');
    try {
      const { data } = await base44.functions.invoke('generateTasksFromGoal', {
        goal: title,
        context: [
          goal?.description || '',
          goal?.category ? `Category: ${goal.category}` : '',
          goal?.target_date ? `Target: ${goal.target_date}` : `Timeframe: ${timeframe}`,
        ].filter(Boolean).join('\n'),
      });
      if (!data?.success || !Array.isArray(data.tasks) || data.tasks.length === 0) {
        throw new Error(data?.error || 'No tasks returned');
      }
      setTaskPack(data);
      setTaskPhase('result');
      toast.success(`Generated ${data.tasks.length} tasks`);
    } catch (error) {
      toast.error(error?.message || 'Failed to generate tasks');
      setTaskPhase('idle');
    }
  };

  const applyGeneratedTasks = async () => {
    if (!taskPack?.tasks?.length) return;
    setTaskPhase('applying');
    try {
      for (const t of taskPack.tasks) {
        await base44.entities.Task.create({
          title: t.title,
          description: t.description || '',
          priority: t.priority || 'medium',
          category: t.category || goal?.category || 'personal',
          status: 'pending',
          estimated_minutes: t.estimated_minutes,
          notes: t.notes || `From goal: ${goal?.title || goalText}`,
          subtasks: t.subtasks || [],
        });
      }
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success(`Created ${taskPack.tasks.length} tasks`);
      setTaskPhase('idle');
      setTaskPack(null);
    } catch (error) {
      toast.error(error?.message || 'Failed to create tasks');
      setTaskPhase('result');
    }
  };

  const generate = async () => {
    if (!goalText.trim()) return;
    setPhase('generating');
    setPlan(null);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert life coach and Islamic productivity advisor. Break down this long-term goal into a complete actionable plan.

Goal: "${goalText}"
Timeframe: ${timeframe}
Today: ${format(new Date(), 'yyyy-MM-dd')}

Generate:
1. A category (one of: spiritual, health, financial, learning, personal, relationships, professional, other)
2. A motivational description (2 sentences)
3. 3-5 daily habits to build (each with a title, frequency: daily/weekly, target_count as a number, unit: e.g. pages/minutes/times/rakah)
4. 4-6 milestone tasks to complete over the timeframe (with priority: high/medium/low and due_days offset from today)
5. 3-4 calendar milestones to mark progress (with title and week_offset from today)
6. 3-5 action steps (short milestone titles) for the goal record
7. A suggested target_date (ISO date string) based on the timeframe`,
        response_json_schema: {
          type: 'object',
          properties: {
            category: { type: 'string' },
            description: { type: 'string' },
            habits: {
              type: 'array',
              items: { type: 'object', properties: {
                title: { type: 'string' }, frequency: { type: 'string' },
                target_count: { type: 'number' }, unit: { type: 'string' }
              }}
            },
            tasks: {
              type: 'array',
              items: { type: 'object', properties: {
                title: { type: 'string' }, priority: { type: 'string' },
                due_days: { type: 'number' }, due_label: { type: 'string' }
              }}
            },
            milestones: {
              type: 'array',
              items: { type: 'object', properties: {
                title: { type: 'string' }, week_offset: { type: 'number' }
              }}
            },
            action_steps: { type: 'array', items: { type: 'string' } },
            target_date: { type: 'string' }
          }
        }
      });
      setPlan(result);
      setPhase('result');
    } catch (_) {
      toast.error('Generation failed. Please try again.');
      setPhase('idle');
    }
  };

  const syncPlan = async () => {
    if (!plan) return;
    setPhase('syncing');
    const today = format(new Date(), 'yyyy-MM-dd');
    let habitCount = 0, taskCount = 0, eventCount = 0;

    try {
      // 1. Create the Goal record
      await base44.entities.Goal.create({
        title: goalText,
        description: plan.description,
        category: plan.category || 'personal',
        target_date: plan.target_date,
        status: 'in_progress',
        priority: 'high',
        progress: 0,
        action_steps: (plan.action_steps || []).map(s => ({ title: s, completed: false })),
      });

      // 2. Create daily Habit records (check for duplicates by title)
      const existingHabits = await base44.entities.Habit.filter({ category: plan.category === 'spiritual' ? 'spiritual' : 'personal' }, 'created_date', 50);
      const existingTitles = new Set(existingHabits.map(h => h.title?.toLowerCase()));

      for (const habit of (plan.habits || [])) {
        if (existingTitles.has(habit.title?.toLowerCase())) continue;
        await base44.entities.Habit.create({
          name: habit.title,
          title: habit.title,
          category: plan.category === 'spiritual' ? 'spiritual' : 'personal',
          frequency: habit.frequency || 'daily',
          target_count: habit.target_count || 1,
          notes: JSON.stringify({ unit: habit.unit || 'times', color: '#10b981', emoji: '🎯' }),
          completion_dates: [],
        });
        habitCount++;
      }

      // 3. Create Task records
      for (const task of (plan.tasks || [])) {
        await base44.entities.Task.create({
          title: task.title,
          priority: task.priority || 'medium',
          due_date: task.due_days != null ? format(addDays(new Date(), task.due_days), 'yyyy-MM-dd') : undefined,
          status: 'pending',
          category: plan.category === 'spiritual' ? 'personal' : plan.category || 'personal',
          notes: `Part of goal: ${goalText}`,
        });
        taskCount++;
      }

      // 4. Create Calendar milestone Events
      for (const ms of (plan.milestones || [])) {
        const d = addWeeks(new Date(), ms.week_offset || 1);
        d.setHours(10, 0, 0, 0);
        await base44.entities.Event.create({
          title: `🎯 ${ms.title}`,
          description: `Milestone for goal: ${goalText}`,
          start_date: d.toISOString(),
          end_date: new Date(d.getTime() + 3600000).toISOString(),
          category: plan.category === 'spiritual' ? 'prayer' : 'personal',
          is_all_day: false,
        });
        eventCount++;
      }

      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['spiritualHabits'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success(`✅ Goal plan synced! ${habitCount} habits, ${taskCount} tasks, ${eventCount} calendar milestones created.`);
      setPhase('done');
    } catch (err) {
      console.error('Goal plan sync failed:', err);
      const detail = err?.message || err?.error_description || String(err);
      toast.error(detail ? `Sync failed: ${detail}` : 'Sync failed. Please try again.');
      setPhase('result');
    }
  };

  const reset = () => {
    setGoalText('');
    setPlan(null);
    setPhase('idle');
    setSelectedPreset(null);
    setTimeframe('3 months');
  };

  const grad = plan ? (CATEGORY_STYLES[plan.category] || CATEGORY_STYLES.other) : 'from-teal-500 to-emerald-600';

  const body = (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Target className="w-5 h-5 text-teal-600" /> AI Goal Planner
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Generate plans, SMART analysis, and Apply → Tasks (generateTasksFromGoal)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(phase === 'result' || phase === 'done') && tab === 'plan' && (
            <Button variant="outline" size="sm" onClick={reset} className="h-8 text-xs">
              <RefreshCw className="w-3 h-3 mr-1" /> New Plan
            </Button>
          )}
          {isModal && onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="plan" className="text-xs">Plan</TabsTrigger>
          <TabsTrigger value="analyze" className="text-xs">Analyze</TabsTrigger>
          <TabsTrigger value="tasks" className="text-xs">Apply → Tasks</TabsTrigger>
        </TabsList>

        <TabsContent value="plan" className="mt-4 space-y-4">
          {phase === 'idle' && (
            <div className="space-y-4">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Quick Start</p>
                <div className="grid grid-cols-2 gap-2">
                  {GOAL_PRESETS.map((p, i) => (
                    <button key={i} onClick={() => selectPreset(p)}
                      className={cn('flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-left transition-all text-xs font-semibold',
                        selectedPreset?.label === p.label
                          ? 'border-teal-400 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300'
                          : 'border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-teal-200 dark:hover:border-teal-700')}>
                      <span className="text-base flex-shrink-0">{p.emoji}</span>
                      <span className="leading-tight">{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 shadow-sm space-y-3">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Your Goal</label>
                <textarea
                  value={goalText}
                  onChange={e => setGoalText(e.target.value)}
                  rows={2}
                  placeholder="Describe your long-term life or spiritual goal…"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                />
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-500 flex-shrink-0">Timeframe:</label>
                  <select value={timeframe} onChange={e => setTimeframe(e.target.value)}
                    className="flex-1 text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500">
                    {['1 month','3 months','6 months','12 months','24 months'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <Button onClick={generate} disabled={!goalText.trim()}
                  className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:opacity-90 font-bold">
                  <Sparkles className="w-4 h-4 mr-2" /> Generate My Plan
                </Button>
              </div>
            </div>
          )}

          {(phase === 'generating' || phase === 'syncing') && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-md">
                <Loader2 className="w-7 h-7 text-white animate-spin" />
              </div>
              <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                {phase === 'generating' ? 'Building your personalised plan…' : 'Creating habits, tasks & events…'}
              </p>
            </div>
          )}

          {(phase === 'result' || phase === 'done') && plan && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className={cn('rounded-2xl p-4 bg-gradient-to-br text-white shadow-md', grad)}>
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4 opacity-80" />
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-80">{plan.category}</span>
                  {phase === 'done' && <CheckCircle2 className="w-4 h-4 ml-auto" />}
                </div>
                <h3 className="text-base font-black leading-snug">{goalText}</h3>
                <p className="text-xs text-white/80 mt-1 leading-relaxed">{plan.description}</p>
                <div className="mt-2 flex items-center gap-1.5 text-[10px] text-white/70 font-semibold">
                  <Calendar className="w-3 h-3" /> Target: {plan.target_date}
                  <span className="mx-1">·</span>
                  <Flame className="w-3 h-3" /> {plan.habits?.length} habits
                  <span className="mx-1">·</span>
                  <CheckCircle2 className="w-3 h-3" /> {plan.tasks?.length} tasks
                  <span className="mx-1">·</span>
                  <Star className="w-3 h-3" /> {plan.milestones?.length} milestones
                </div>
              </div>

              {plan.habits?.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 shadow-sm">
                  <p className="text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5" /> Daily Habits ({plan.habits.length})
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {plan.habits.map((h, i) => <HabitPill key={i} habit={h} />)}
                  </div>
                </div>
              )}

              {plan.tasks?.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 shadow-sm">
                  <p className="text-[10px] font-black text-violet-600 dark:text-violet-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Milestone Tasks ({plan.tasks.length})
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {plan.tasks.map((t, i) => <TaskPill key={i} task={t} />)}
                  </div>
                </div>
              )}

              {plan.milestones?.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 shadow-sm">
                  <p className="text-[10px] font-black text-teal-600 dark:text-teal-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> Calendar Milestones ({plan.milestones.length})
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {plan.milestones.map((m, i) => <MilestonePill key={i} milestone={m} />)}
                  </div>
                </div>
              )}

              {phase === 'result' && (
                <Button onClick={syncPlan}
                  className="w-full h-12 bg-gradient-to-r from-[#1a4a6e] to-[#3ecfa0] hover:opacity-90 font-bold text-sm shadow-md">
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Create Habits, Tasks & Calendar Events
                </Button>
              )}

              {phase === 'done' && (
                <div className="flex items-center gap-2 p-3.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    <span className="font-bold">Plan activated!</span> Habits, Tasks & Calendar are ready.
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {goals.length > 0 && phase === 'idle' && (
            <div className="space-y-3">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" /> Active Goals
              </p>
              {goals.slice(0, 5).map(g => <GoalCard key={g.id} goal={g} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analyze" className="mt-4 space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              SMART analysis for: <span className="font-bold">{goal?.title || goalText || '—'}</span>
            </p>
            {!goal?.title && (
              <textarea
                value={goalText}
                onChange={(e) => setGoalText(e.target.value)}
                rows={2}
                placeholder="Goal title to analyze…"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
              />
            )}
            <Button onClick={analyzeGoal} disabled={analyzing || !(goal?.title || goalText).trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-700">
              {analyzing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing…</> : <><Brain className="w-4 h-4 mr-2" /> Run SMART Analysis</>}
            </Button>
          </div>

          {analysis && (
            <div className="space-y-3">
              {analysis.motivation && (
                <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 text-sm text-slate-700 dark:text-slate-200 italic">
                  {analysis.motivation}
                </div>
              )}
              {analysis.smart_analysis && (
                <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                  <p className="text-xs font-black uppercase text-slate-400">SMART</p>
                  {['specific','measurable','achievable','relevant','time_bound'].map((k) => (
                    analysis.smart_analysis[k] ? (
                      <p key={k} className="text-sm text-slate-600 dark:text-slate-300">
                        <span className="font-semibold capitalize">{k.replace('_', '-')}: </span>
                        {analysis.smart_analysis[k]}
                      </p>
                    ) : null
                  ))}
                  {typeof analysis.smart_analysis.overall_score === 'number' && (
                    <p className="text-sm font-bold text-indigo-600">Score: {analysis.smart_analysis.overall_score}/100</p>
                  )}
                </div>
              )}
              {analysis.action_steps?.length > 0 && (
                <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 space-y-2">
                  <p className="text-xs font-black uppercase text-slate-400 flex items-center gap-1"><ListChecks className="w-3.5 h-3.5" /> Action steps</p>
                  {analysis.action_steps.map((s, i) => (
                    <div key={i} className="text-sm text-slate-700 dark:text-slate-300">
                      <span className="font-semibold">{i + 1}. {s.title}</span>
                      {s.timeline && <span className="text-xs text-slate-400 ml-2">{s.timeline}</span>}
                      {s.description && <p className="text-xs text-slate-500 mt-0.5">{s.description}</p>}
                    </div>
                  ))}
                  <Button size="sm" variant="outline" onClick={saveActionSteps}>Save steps to goal</Button>
                </div>
              )}
              {analysis.obstacles?.length > 0 && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                  <p className="text-xs font-black uppercase text-amber-700">Obstacles</p>
                  {analysis.obstacles.map((o, i) => (
                    <p key={i} className="text-sm text-amber-900">• {o.obstacle} — <span className="text-amber-700">{o.solution}</span></p>
                  ))}
                </div>
              )}
              {analysis.learning_resources?.length > 0 && (
                <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2">
                  <p className="text-xs font-black uppercase text-slate-400 flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> Resources</p>
                  {analysis.learning_resources.map((r, i) => (
                    <p key={i} className="text-sm text-slate-700">• {r.name}{r.description ? ` — ${r.description}` : ''}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tasks" className="mt-4 space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 space-y-3">
            <p className="text-sm text-slate-600">
              Break a goal into concrete tasks via registered <code className="text-xs">generateTasksFromGoal</code>.
            </p>
            {!goal?.title && (
              <textarea
                value={goalText}
                onChange={(e) => setGoalText(e.target.value)}
                rows={2}
                placeholder="Goal to turn into tasks…"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
              />
            )}
            <Button
              onClick={generateTasksOnly}
              disabled={!canGenerateTasks || taskPhase === 'generating' || !(goal?.title || goalText).trim()}
              className="w-full bg-violet-600 hover:bg-violet-700"
            >
              {taskPhase === 'generating'
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating tasks…</>
                : <><ListChecks className="w-4 h-4 mr-2" /> Generate Tasks</>}
            </Button>
            {!canGenerateTasks && (
              <p className="text-xs text-amber-600">generateTasksFromGoal is not registered in this build.</p>
            )}
          </div>

          {taskPack?.tasks?.length > 0 && (
            <div className="space-y-2">
              {taskPack.tasks.map((t, i) => (
                <div key={i} className="p-3 rounded-xl border border-violet-100 bg-violet-50/60 dark:bg-violet-950/20">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t.title}</p>
                  {t.description && <p className="text-xs text-slate-500 mt-0.5">{t.description}</p>}
                  <p className="text-[10px] text-slate-400 mt-1 capitalize">
                    {t.priority || 'medium'} · {t.category || 'personal'}
                    {t.estimated_minutes ? ` · ${t.estimated_minutes} min` : ''}
                  </p>
                </div>
              ))}
              {taskPack.tips?.length > 0 && (
                <div className="text-xs text-slate-500 space-y-1">
                  {taskPack.tips.map((tip, i) => <p key={i}>💡 {tip}</p>)}
                </div>
              )}
              <Button
                onClick={applyGeneratedTasks}
                disabled={taskPhase === 'applying'}
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600"
              >
                {taskPhase === 'applying'
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating…</>
                  : <><ArrowRight className="w-4 h-4 mr-2" /> Apply → Create {taskPack.tasks.length} Tasks</>}
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );

  if (!isModal) return body;

  return (
    <AnimatePresence>
      {isOpen !== false && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <div className="fixed inset-x-4 top-[5%] bottom-[5%] md:inset-0 md:flex md:items-center md:justify-center md:p-4 z-[200] pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="pointer-events-auto w-full md:max-w-2xl h-full md:h-auto md:max-h-[85vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-y-auto p-5"
            >
              {body}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}