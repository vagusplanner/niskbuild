import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
  X, Send, Loader2, Calendar, CheckCircle2, AlertCircle,
  Zap, Brain, Target, ListChecks, Sparkles, Activity,
  ChevronRight, Clock, TrendingUp, Plus, Lightbulb
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';
import { format, addDays } from 'date-fns';

// ── Mode tabs ────────────────────────────────────────────────────────────────
const MODES = [
  { id: 'plan',     icon: Calendar,   label: 'Plan Week',     desc: 'AI builds your week' },
  { id: 'goal',     icon: Target,     label: 'Goal Breakdown',desc: 'Turn goals → tasks' },
  { id: 'smart',    icon: Brain,      label: 'Smart Schedule', desc: 'Natural language scheduling' },
  { id: 'activity', icon: Activity,   label: 'Activity Feed',  desc: 'Auto-create from activity' },
];

// ── Proactive suggestion pill ────────────────────────────────────────────────
function ProactiveSuggestions({ events, tasks, onUseSuggestion }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Based on these upcoming events: "${events.slice(0,5).map(e=>e.title).join(', ')}" and pending tasks: "${tasks.slice(0,5).map(t=>t.title).join(', ')}", suggest 3 proactive scheduling actions. Each should be specific and actionable.`,
        response_json_schema: {
          type: 'object',
          properties: {
            suggestions: {
              type: 'array',
              items: { type: 'object', properties: { text: { type: 'string' }, emoji: { type: 'string' }, prompt: { type: 'string' } } }
            }
          }
        }
      });
      setSuggestions(res?.suggestions || []);
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm text-slate-400">
      <Loader2 className="w-4 h-4 animate-spin" /> Analysing your calendar…
    </div>
  );

  if (!suggestions.length) return null;

  return (
    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
      <p className="text-xs font-bold text-[#1a7ab8] dark:text-teal-400 uppercase tracking-wide mb-2 flex items-center gap-1">
        <Lightbulb className="w-3 h-3" /> Proactive Suggestions
      </p>
      <div className="flex flex-col gap-1.5">
        {suggestions.map((s, i) => (
          <button key={i} onClick={() => onUseSuggestion(s.prompt)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800/50 text-left hover:bg-teal-100 dark:hover:bg-teal-900/40 transition-all group">
            <span className="text-base flex-shrink-0">{s.emoji || '💡'}</span>
            <span className="text-xs text-teal-700 dark:text-teal-300 font-medium leading-tight flex-1">{s.text}</span>
            <ChevronRight className="w-3 h-3 text-teal-400 group-hover:text-teal-600 flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Goal breakdown mode ──────────────────────────────────────────────────────
function GoalBreakdownMode({ goals, onTasksCreated }) {
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [breakdown, setBreakdown] = useState(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const queryClient = useQueryClient();

  const generate = async (goal) => {
    setSelectedGoal(goal);
    setBreakdown(null);
    setLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Break down this goal into actionable tasks: "${goal.title}". Description: "${goal.description || ''}". Target date: "${goal.target_date || 'none'}". Create 5-8 concrete tasks with durations, due dates relative to today (${format(new Date(), 'yyyy-MM-dd')}), and priority levels.`,
        response_json_schema: {
          type: 'object',
          properties: {
            steps: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  due_days_from_now: { type: 'number' },
                  estimated_minutes: { type: 'number' },
                  priority: { type: 'string' }
                }
              }
            },
            strategy: { type: 'string' }
          }
        }
      });
      setBreakdown(res);
    } catch (_) { toast.error('Failed to generate breakdown'); }
    setLoading(false);
  };

  const createAll = async () => {
    if (!breakdown?.steps) return;
    setCreating(true);
    try {
      const tasks = breakdown.steps.map(s => ({
        title: s.title,
        description: s.description,
        due_date: format(addDays(new Date(), s.due_days_from_now || 1), 'yyyy-MM-dd'),
        status: 'todo',
        priority: s.priority || 'medium',
        estimated_minutes: s.estimated_minutes || 60,
        category: selectedGoal.category || 'personal',
      }));
      await base44.entities.Task.bulkCreate(tasks);
      queryClient.invalidateQueries({ queryKey: ['upcomingTasks'] });
      toast.success(`✅ ${tasks.length} tasks created from goal!`);
      onTasksCreated?.(tasks.length);
      setBreakdown(null);
      setSelectedGoal(null);
    } catch (_) { toast.error('Failed to create tasks'); }
    setCreating(false);
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      {!selectedGoal ? (
        <>
          <p className="text-sm text-slate-500 dark:text-slate-400">Select a goal to break down into actionable tasks:</p>
          {goals.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Target className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No goals found. Create some goals first.</p>
            </div>
          ) : (
            goals.map(goal => (
              <button key={goal.id} onClick={() => generate(goal)}
                className="w-full text-left p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-all group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center flex-shrink-0">
                    <Target className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">{goal.title}</p>
                    {goal.target_date && <p className="text-xs text-slate-400">Due {format(new Date(goal.target_date), 'MMM d')}</p>}
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-500" />
                </div>
              </button>
            ))
          )}
        </>
      ) : loading ? (
        <div className="flex flex-col items-center gap-3 py-12">
          <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
          <p className="text-sm text-slate-500">Breaking down goal into tasks…</p>
        </div>
      ) : breakdown ? (
        <div className="space-y-4">
          <div className="p-3 bg-teal-50 dark:bg-teal-900/20 rounded-xl border border-teal-100 dark:border-teal-800/40">
            <p className="text-xs font-bold text-teal-700 dark:text-teal-300 mb-1">🎯 Strategy</p>
            <p className="text-sm text-teal-600 dark:text-teal-400">{breakdown.strategy}</p>
          </div>
          <div className="space-y-2">
            {breakdown.steps?.map((step, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                <span className="w-6 h-6 rounded-full bg-teal-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i+1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 dark:text-slate-100 text-sm">{step.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{step.description}</p>
                  <div className="flex gap-2 mt-1.5 flex-wrap">
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 px-2 py-0.5 rounded-full">
                      <Clock className="w-2.5 h-2.5 inline mr-0.5" />{step.estimated_minutes}m
                    </span>
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 px-2 py-0.5 rounded-full">
                      in {step.due_days_from_now} days
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${step.priority === 'high' ? 'bg-red-100 text-red-600' : step.priority === 'low' ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-600'}`}>
                      {step.priority}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={createAll} disabled={creating} className="flex-1 bg-teal-600 hover:bg-teal-700">
              {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Create {breakdown.steps?.length} Tasks
            </Button>
            <Button variant="outline" onClick={() => { setSelectedGoal(null); setBreakdown(null); }}>Back</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ── Smart natural-language scheduling mode ───────────────────────────────────
function SmartScheduleMode({ events, tasks }) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const EXAMPLES = [
    'Find a 1-hour slot next week for a meeting with John about project launch',
    'Schedule deep work every morning at 9am for the next 5 days',
    'Block 30 mins tomorrow to review the quarterly report',
    'Add a team standup every weekday at 10am for 2 weeks',
  ];

  const run = async (q = query) => {
    if (!q.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const busySlots = events.slice(0, 10).map(e => `${e.title} on ${e.start_date}`).join('; ');
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Today is ${format(new Date(), 'EEEE, MMMM d yyyy')}. Busy slots: "${busySlots}". User request: "${q}". Parse this natural language scheduling request and return structured event data. Find the best available time slot(s) avoiding conflicts.`,
        response_json_schema: {
          type: 'object',
          properties: {
            events: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  start_date: { type: 'string', description: 'ISO datetime' },
                  end_date: { type: 'string', description: 'ISO datetime' },
                  description: { type: 'string' },
                  category: { type: 'string' },
                }
              }
            },
            explanation: { type: 'string' }
          }
        }
      });
      setResult(res);
    } catch (_) { toast.error('Could not parse request'); }
    setLoading(false);
  };

  const createEvents = async () => {
    if (!result?.events?.length) return;
    setLoading(true);
    try {
      for (const ev of result.events) {
        await base44.entities.Event.create({ ...ev, source: 'app' });
      }
      queryClient.invalidateQueries({ queryKey: ['upcomingEvents'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success(`✅ ${result.events.length} event(s) scheduled!`);
      setResult(null);
      setQuery('');
    } catch (_) { toast.error('Failed to create events'); }
    setLoading(false);
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      <div className="space-y-2">
        <textarea
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) run(); }}
          placeholder="Describe what you want to schedule in plain English…"
          rows={3}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
        />
        <Button onClick={() => run()} disabled={loading || !query.trim()} className="w-full bg-gradient-to-r from-teal-500 to-[#1a7ab8] hover:opacity-90">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Brain className="w-4 h-4 mr-2" />}
          {loading ? 'Analysing…' : 'Find Best Slot'}
        </Button>
      </div>

      {!result && !loading && (
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Try these</p>
          <div className="space-y-1.5">
            {EXAMPLES.map((ex, i) => (
              <button key={i} onClick={() => { setQuery(ex); run(ex); }}
                className="w-full text-left text-xs px-3 py-2.5 rounded-lg border border-slate-100 dark:border-slate-700 hover:border-teal-300 hover:bg-teal-50 dark:hover:bg-teal-900/20 text-slate-600 dark:text-slate-400 transition-all">
                "{ex}"
              </button>
            ))}
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-3">
          {result.explanation && (
            <div className="p-3 bg-teal-50 dark:bg-teal-900/20 rounded-xl border border-teal-100 dark:border-teal-800/40">
              <p className="text-xs text-teal-700 dark:text-teal-300 font-medium">{result.explanation}</p>
            </div>
          )}
          {result.events?.map((ev, i) => (
            <div key={i} className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
              <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{ev.title}</p>
              <p className="text-xs text-slate-500 mt-0.5">{ev.start_date ? format(new Date(ev.start_date), 'EEE MMM d, h:mm a') : ''} → {ev.end_date ? format(new Date(ev.end_date), 'h:mm a') : ''}</p>
              {ev.description && <p className="text-xs text-slate-400 mt-1">{ev.description}</p>}
            </div>
          ))}
          <div className="flex gap-2">
            <Button onClick={createEvents} disabled={loading} className="flex-1 bg-teal-600 hover:bg-teal-700">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Add to Calendar
            </Button>
            <Button variant="outline" onClick={() => setResult(null)}>Edit</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Activity feed auto-create mode ───────────────────────────────────────────
function ActivityFeedMode() {
  const [activities, setActivities] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const load = async () => {
      try {
        const [events, tasks, goals] = await Promise.all([
          base44.entities.Event.list('-created_date', 5),
          base44.entities.Task.list('-created_date', 5),
          base44.entities.Goal.list('-updated_date', 5),
        ]);
        const items = [
          ...events.map(e => ({ type: 'event', title: e.title, id: e.id, status: e.category })),
          ...tasks.map(t => ({ type: 'task', title: t.title, id: t.id, status: t.status })),
          ...goals.map(g => ({ type: 'goal', title: g.title, id: g.id, status: g.status })),
        ];
        setActivities(items);
        if (items.length > 0) generateSuggestions(items);
      } catch (_) {}
    };
    load();
  }, []);

  const generateSuggestions = async (items) => {
    setLoading(true);
    try {
      const summary = items.map(i => `${i.type}: "${i.title}" (${i.status})`).join('; ');
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Based on recent user activity: "${summary}". Suggest 3 smart actions to automatically create tasks or events. Each should directly relate to the activity.`,
        response_json_schema: {
          type: 'object',
          properties: {
            suggestions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  action: { type: 'string' },
                  type: { type: 'string', description: 'task or event' },
                  title: { type: 'string' },
                  description: { type: 'string' },
                  emoji: { type: 'string' },
                  due_days: { type: 'number' },
                }
              }
            }
          }
        }
      });
      setSuggestions(res?.suggestions || []);
    } catch (_) {}
    setLoading(false);
  };

  const accept = async (s, i) => {
    setCreating(i);
    try {
      const dueDate = format(addDays(new Date(), s.due_days || 1), 'yyyy-MM-dd');
      if (s.type === 'task') {
        await base44.entities.Task.create({ title: s.title, description: s.description, due_date: dueDate, status: 'todo', priority: 'medium' });
        queryClient.invalidateQueries({ queryKey: ['upcomingTasks'] });
      } else {
        const start = addDays(new Date(), s.due_days || 1);
        start.setHours(10, 0, 0, 0);
        const end = new Date(start.getTime() + 60 * 60000);
        await base44.entities.Event.create({ title: s.title, description: s.description, start_date: start.toISOString(), end_date: end.toISOString(), category: 'personal', source: 'app' });
        queryClient.invalidateQueries({ queryKey: ['events'] });
      }
      toast.success(`✅ ${s.type === 'task' ? 'Task' : 'Event'} created!`);
      setSuggestions(prev => prev.filter((_, idx) => idx !== i));
    } catch (_) { toast.error('Failed to create'); }
    setCreating(null);
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      <p className="text-sm text-slate-500 dark:text-slate-400">AI analyses your recent activity and suggests smart follow-up tasks and events.</p>
      {loading ? (
        <div className="flex flex-col items-center gap-3 py-8">
          <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
          <p className="text-sm text-slate-400">Analysing activity feed…</p>
        </div>
      ) : suggestions.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <Activity className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No suggestions yet — add some events or tasks first.</p>
        </div>
      ) : (
        suggestions.map((s, i) => (
          <div key={i} className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-2">
            <div className="flex items-start gap-3">
              <span className="text-xl flex-shrink-0">{s.emoji || '⚡'}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{s.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{s.action}</p>
                <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-semibold ${s.type === 'task' ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}`}>
                  {s.type === 'task' ? '✓ Task' : '📅 Event'} · in {s.due_days || 1} day{s.due_days !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => accept(s, i)} disabled={creating === i} className="flex-1 bg-teal-600 hover:bg-teal-700 h-8 text-xs">
                {creating === i ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
                Accept
              </Button>
              <Button size="sm" variant="outline" onClick={() => setSuggestions(p => p.filter((_,idx)=>idx!==i))} className="h-8 text-xs px-3">
                Dismiss
              </Button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ── Week plan mode (original, enhanced) ─────────────────────────────────────
function WeekPlanMode({ events, tasks, user, period, onProactiveSuggestion }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState('proactive'); // proactive | questions | planning | review
  const [questionIdx, setQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const scrollRef = useRef(null);
  const queryClient = useQueryClient();

  const QUESTIONS = [
    `What are your main goals for this ${period}?`,
    'How many focused hours per day do you have available?',
    'What are your top 3 priorities right now?',
    "What's your energy like — morning person or afternoon peak?",
    'Any constraints or deadlines I should know about?',
  ];

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleAnswer = async (text) => {
    const newMsg = { role: 'user', content: text };
    setMessages(p => [...p, newMsg]);
    const newAnswers = { ...answers, [`q${questionIdx+1}`]: text };
    setAnswers(newAnswers);
    setInput('');

    if (questionIdx < QUESTIONS.length - 1) {
      const next = questionIdx + 1;
      setQuestionIdx(next);
      setTimeout(() => {
        setMessages(p => [...p, { role: 'assistant', content: `**Question ${next+1}/${QUESTIONS.length}:**\n\n${QUESTIONS[next]}` }]);
      }, 500);
    } else {
      setPhase('planning');
      setLoading(true);
      setTimeout(() => setMessages(p => [...p, { role: 'assistant', content: '🧠 Building your personalised plan…' }]), 500);
      try {
        const plan = await base44.integrations.Core.InvokeLLM({
          prompt: `Create a detailed ${period} plan. Goals: "${newAnswers.q1}", Hours/day: "${newAnswers.q2}", Priorities: "${newAnswers.q3}", Energy: "${newAnswers.q4}", Constraints: "${newAnswers.q5}". Existing tasks: "${tasks.map(t=>t.title).join(', ')||'none'}". Upcoming events: "${events.map(e=>e.title).join(', ')||'none'}". Build a realistic schedule that respects existing commitments.`,
          response_json_schema: {
            type: 'object',
            properties: {
              daily_breakdown: { type: 'array' },
              insights: { type: 'string' },
              warnings: { type: 'array', items: { type: 'string' } },
              estimated_completion_rates: { type: 'string' },
              habits_to_build: { type: 'array', items: { type: 'string' } }
            }
          }
        });
        setGeneratedPlan(plan);
        setMessages(p => [...p.slice(0, -1), {
          role: 'assistant',
          content: `✅ **Your ${period} plan is ready!**\n\n**Insights:** ${plan.insights || ''}\n\n**Completion estimate:** ${plan.estimated_completion_rates || ''}\n\n${plan.habits_to_build?.length ? `**Habits to build:** ${plan.habits_to_build.join(', ')}` : ''}`
        }]);
        setPhase('review');
      } catch (_) {
        toast.error('Failed to generate plan');
        setMessages(p => [...p, { role: 'assistant', content: '❌ Sorry, failed to generate plan. Please try again.' }]);
        setPhase('questions');
      }
      setLoading(false);
    }
  };

  const createTasks = async () => {
    if (!generatedPlan?.daily_breakdown) return;
    setLoading(true);
    try {
      const tasksToCreate = [];
      generatedPlan.daily_breakdown.forEach((day, idx) => {
        if (Array.isArray(day.schedule)) {
          day.schedule.forEach(item => {
            if (item.task && !['Break', 'Lunch', 'Meeting'].includes(item.task)) {
              const due = new Date();
              due.setDate(due.getDate() + idx);
              tasksToCreate.push({ title: item.task, description: `${item.time || ''} — ${item.duration || ''}`, due_date: due.toISOString().split('T')[0], status: 'todo', priority: item.priority || 'medium', estimated_minutes: parseInt(item.duration) || 60 });
            }
          });
        }
      });
      if (tasksToCreate.length > 0) {
        await base44.entities.Task.bulkCreate(tasksToCreate);
        queryClient.invalidateQueries({ queryKey: ['upcomingTasks'] });
        toast.success(`✅ ${tasksToCreate.length} tasks created!`);
        setMessages(p => [...p, { role: 'assistant', content: `✨ **${tasksToCreate.length} tasks added to your task list!** Have a productive ${period}!` }]);
        setShowConfirm(false);
      }
    } catch (_) { toast.error('Failed to create tasks'); }
    setLoading(false);
  };

  // Start with questions immediately
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{ role: 'assistant', content: `👋 Let's build your **${period} plan** together!\n\n**Question 1/${QUESTIONS.length}:**\n\n${QUESTIONS[0]}` }]);
      setPhase('questions');
    }
  }, []);

  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg, idx) => (
          <motion.div key={idx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-teal-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100'}`}>
              <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 break-words">
                {msg.content}
              </ReactMarkdown>
            </div>
          </motion.div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 dark:bg-slate-800 px-4 py-3 rounded-2xl">
              <Loader2 className="w-5 h-5 animate-spin text-teal-600" />
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      <div className="border-t border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-800/50 flex-shrink-0 space-y-3">
        {phase === 'questions' && (
          <div className="flex gap-2">
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAnswer(input)}
              placeholder="Type your answer…"
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500" />
            <Button onClick={() => handleAnswer(input)} disabled={loading || !input.trim()} className="bg-teal-600 hover:bg-teal-700">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        )}

        {phase === 'review' && generatedPlan && (
          <div className="space-y-2">
            {generatedPlan.warnings?.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-3">
                <p className="text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1 mb-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> Heads up
                </p>
                {generatedPlan.warnings.map((w, i) => <p key={i} className="text-xs text-amber-600 dark:text-amber-400">• {w}</p>)}
              </div>
            )}
            {!showConfirm ? (
              <Button onClick={() => setShowConfirm(true)} className="w-full bg-emerald-600 hover:bg-emerald-700">
                <ListChecks className="w-4 h-4 mr-2" /> Create Tasks from Plan
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button onClick={createTasks} disabled={loading} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />} Confirm
                </Button>
                <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancel</Button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ── Root component ───────────────────────────────────────────────────────────
export default function AIPlanningAssistant({ isOpen, onClose, period = 'week' }) {
  const [mode, setMode] = useState('plan');
  const [proactiveSuggestion, setProactiveSuggestion] = useState('');

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const { data: tasks = [] } = useQuery({
    queryKey: ['upcomingTasks'],
    queryFn: () => base44.entities.Task.filter({ status: { $in: ['todo', 'in_progress'] } }, '-due_date', 20),
    enabled: !!user
  });
  const { data: events = [] } = useQuery({
    queryKey: ['upcomingEvents'],
    queryFn: async () => {
      const today = new Date();
      const ahead = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
      return base44.entities.Event.filter({ start_date: { $gte: today.toISOString(), $lte: ahead.toISOString() } });
    },
    enabled: !!user
  });
  const { data: goals = [] } = useQuery({
    queryKey: ['userGoals'],
    queryFn: () => base44.entities.Goal.filter({ status: { $in: ['not_started', 'in_progress'] } }, '-created_date', 20),
    enabled: !!user
  });

  if (!isOpen) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-end lg:items-center justify-end lg:justify-center"
      onClick={onClose}>
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        className="w-full lg:w-[640px] h-[92vh] lg:h-[85vh] bg-white dark:bg-slate-900 rounded-t-3xl lg:rounded-2xl shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-[#1a4a6e] via-[#1a7ab8] to-[#3ecfa0] flex-shrink-0">
          <div>
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#E8B84B]" /> AI Planning Assistant
            </h2>
            <p className="text-xs text-white/60">Smart scheduling · Goal breakdown · Natural language</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/15 rounded-lg transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1 p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex-shrink-0 overflow-x-auto hide-scrollbar">
          {MODES.map(m => {
            const Icon = m.icon;
            return (
              <button key={m.id} onClick={() => setMode(m.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                  mode === m.id
                    ? 'bg-gradient-to-r from-[#1a7ab8] to-[#3ecfa0] text-white shadow-sm'
                    : 'text-slate-500 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-300'
                }`}>
                <Icon className="w-3.5 h-3.5" />
                {m.label}
              </button>
            );
          })}
        </div>

        {/* Proactive suggestions — only in plan mode */}
        {mode === 'plan' && (events.length > 0 || tasks.length > 0) && (
          <ProactiveSuggestions events={events} tasks={tasks}
            onUseSuggestion={(prompt) => { setMode('smart'); setProactiveSuggestion(prompt); }} />
        )}

        {/* Mode content */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {mode === 'plan' && (
            <WeekPlanMode events={events} tasks={tasks} user={user} period={period} />
          )}
          {mode === 'goal' && (
            <GoalBreakdownMode goals={goals} onTasksCreated={(n) => toast.success(`${n} tasks created!`)} />
          )}
          {mode === 'smart' && (
            <SmartScheduleMode events={events} tasks={tasks} initialQuery={proactiveSuggestion} />
          )}
          {mode === 'activity' && (
            <ActivityFeedMode />
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}