import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Clock, Flag, Calendar, ChevronRight, CheckCircle2, RotateCcw, Wand2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SDK } from '@/lib/custom-sdk.js';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const PRIORITY_ORDER = { urgent: 4, high: 3, medium: 2, low: 1 };

const PRIORITY_STYLES = {
  urgent: 'bg-red-100 text-red-700 border-red-300',
  high:   'bg-orange-100 text-orange-700 border-orange-300',
  medium: 'bg-amber-100 text-amber-700 border-amber-300',
  low:    'bg-slate-100 text-slate-600 border-slate-300',
};

const CAT_EMOJI = {
  work: '💼', personal: '⭐', health: '💪', prayer: '🕌',
  family: '👨‍👩‍👧', shopping: '🛒', learning: '📚', other: '📌',
};

export default function PlanMyDayPanel({ tasks = [], date, onApplySchedule, onClose }) {
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState(null); // { summary, schedule: [{task, suggested_time, suggested_duration, reason}] }
  const [error, setError] = useState(null);
  const [applied, setApplied] = useState(false);

  const pendingTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled');

  const generatePlan = async () => {
    setLoading(true);
    setError(null);
    setPlan(null);
    try {
      const taskList = pendingTasks.map(t => ({
        id: t.id,
        title: t.title,
        priority: t.priority || 'medium',
        estimated_minutes: t.estimated_minutes || null,
        due_date: t.due_date || null,
        category: t.category || 'personal',
        due_time: t.due_time || null,
      }));

      const today = date || format(new Date(), 'yyyy-MM-dd');
      const dayName = format(new Date(today + 'T12:00:00'), 'EEEE');

      const result = await SDK.integrations.Core.InvokeLLM({
        prompt: `You are an expert productivity coach. Given these pending tasks for ${dayName} (${today}), create an optimal day schedule.

Tasks to schedule:
${taskList.map((t, i) => `${i + 1}. "${t.title}" | priority: ${t.priority} | est: ${t.estimated_minutes ? t.estimated_minutes + 'min' : 'unknown'} | category: ${t.category}${t.due_date ? ` | due: ${t.due_date}` : ''}`).join('\n')}

Rules:
- Order tasks by: 1) urgency/priority (urgent > high > medium > low), 2) due date proximity, 3) cognitive load (put complex work earlier in the day)
- Start scheduling from 09:00 unless a task has a due_time
- Add 10-15 min buffers between tasks
- Estimate duration if not provided (simple task=30min, complex=60min, quick=15min)
- If a task already has a due_time, honour it
- Keep the plan realistic for a single workday

Return the schedule with specific start times and reasons.`,
        response_json_schema: {
          type: 'object',
          properties: {
            summary: { type: 'string', description: '1-2 sentence overview of the approach taken' },
            total_hours: { type: 'number', description: 'Total scheduled hours' },
            schedule: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  task_id: { type: 'string' },
                  title: { type: 'string' },
                  suggested_time: { type: 'string', description: 'HH:MM format, e.g. 09:00' },
                  suggested_duration: { type: 'number', description: 'Minutes' },
                  reason: { type: 'string', description: 'One short sentence why this task is placed here' },
                  priority: { type: 'string' },
                  category: { type: 'string' },
                }
              }
            }
          }
        }
      });

      setPlan(result);
    } catch (e) {
      setError('AI planning failed. Please try again.');
    }
    setLoading(false);
  };

  const handleApply = () => {
    if (!plan?.schedule || !onApplySchedule) return;
    onApplySchedule(plan.schedule);
    setApplied(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-[#0a1f44] border border-white/15 rounded-3xl overflow-hidden shadow-2xl"
    >
      {/* Header */}
      <div className="relative p-5 pb-4" style={{ background: 'linear-gradient(135deg, #1a3a6e 0%, #1D6FB8 60%, #29ABE2 100%)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Wand2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-black text-base">Plan My Day</h3>
              <p className="text-white/60 text-xs">{pendingTasks.length} pending task{pendingTasks.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-white/15 transition-colors">
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Task preview */}
        {!plan && !loading && (
          <>
            {pendingTasks.length === 0 ? (
              <div className="text-center py-6 text-white/40">
                <p className="text-sm">No pending tasks to schedule.</p>
                <p className="text-xs mt-1">Add some tasks first!</p>
              </div>
            ) : (
              <>
                <div className="space-y-1.5 max-h-52 overflow-y-auto hide-scrollbar">
                  {pendingTasks.slice(0, 8).map((task, i) => (
                    <div key={task.id} className="flex items-center gap-2.5 p-2.5 bg-white/[0.04] rounded-xl border border-white/8">
                      <span className="text-sm w-5 text-center text-white/25 font-bold flex-shrink-0">{i + 1}</span>
                      <span className="text-sm">{CAT_EMOJI[task.category] || '📌'}</span>
                      <span className="flex-1 text-white text-sm font-medium truncate">{task.title}</span>
                      <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full border', PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium)}>
                        {task.priority || 'medium'}
                      </span>
                      {task.estimated_minutes && (
                        <span className="text-[10px] text-white/30 flex items-center gap-0.5 flex-shrink-0">
                          <Clock className="w-2.5 h-2.5" />{task.estimated_minutes}m
                        </span>
                      )}
                    </div>
                  ))}
                  {pendingTasks.length > 8 && (
                    <p className="text-center text-xs text-white/30 py-1">+{pendingTasks.length - 8} more tasks</p>
                  )}
                </div>

                <Button
                  onClick={generatePlan}
                  className="w-full h-12 font-bold gap-2 text-white"
                  style={{ background: 'linear-gradient(135deg, #1D6FB8, #29ABE2)' }}
                >
                  <Sparkles className="w-4 h-4" />
                  Generate Optimal Schedule
                </Button>
              </>
            )}
          </>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            >
              <Sparkles className="w-8 h-8 text-[#29ABE2]" />
            </motion.div>
            <p className="text-white/60 text-sm">AI is ordering your tasks…</p>
            <p className="text-white/30 text-xs">Analysing priority, duration & due dates</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-red-300 text-sm">{error}</p>
            <button onClick={generatePlan} className="ml-auto text-xs text-red-400 underline">Retry</button>
          </div>
        )}

        {/* Plan result */}
        {plan && !loading && (
          <>
            {/* Summary */}
            <div className="p-3 bg-[#1D6FB8]/20 border border-[#29ABE2]/25 rounded-xl">
              <p className="text-xs text-[#A8C8E8] leading-relaxed">{plan.summary}</p>
              {plan.total_hours && (
                <p className="text-xs text-[#29ABE2] font-bold mt-1">
                  ⏱ Total: {plan.total_hours} hrs scheduled
                </p>
              )}
            </div>

            {/* Schedule list */}
            <div className="space-y-2 max-h-72 overflow-y-auto hide-scrollbar">
              {(plan.schedule || []).map((item, i) => (
                <motion.div
                  key={item.task_id || i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-3 p-3 bg-white/[0.04] border border-white/10 rounded-xl"
                >
                  {/* Index */}
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black text-white flex-shrink-0 mt-0.5"
                    style={{ background: 'rgba(29,111,184,0.5)' }}>
                    {i + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white text-sm font-bold truncate">{item.title}</span>
                      <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full border', PRIORITY_STYLES[item.priority] || PRIORITY_STYLES.medium)}>
                        {item.priority}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      {item.suggested_time && (
                        <span className="text-[11px] text-[#29ABE2] font-bold flex items-center gap-1">
                          <Clock className="w-3 h-3" />{item.suggested_time}
                        </span>
                      )}
                      {item.suggested_duration && (
                        <span className="text-[10px] text-white/40">{item.suggested_duration}min</span>
                      )}
                    </div>
                    {item.reason && (
                      <p className="text-[10px] text-white/35 mt-1 leading-relaxed">{item.reason}</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Actions */}
            {applied ? (
              <div className="flex items-center justify-center gap-2 py-3 text-teal-400">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-bold text-sm">Schedule applied!</span>
              </div>
            ) : (
              <div className="flex gap-2 pt-1">
                <Button variant="outline" onClick={generatePlan}
                  className="flex-1 border-white/15 text-white/60 bg-transparent gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5" /> Regenerate
                </Button>
                <Button onClick={handleApply}
                  className="flex-1 font-bold gap-1.5 text-white h-11"
                  style={{ background: 'linear-gradient(135deg, #1D6FB8, #29ABE2)' }}>
                  <ChevronRight className="w-4 h-4" /> Apply to Day
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}