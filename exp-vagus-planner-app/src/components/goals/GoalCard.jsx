import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronDown, ChevronUp, Pencil, Trash2, CheckCircle2, Circle, Flag } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { SDK } from '@/lib/custom-sdk.js';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AIProgressSummary } from './AIGoalAssistant';

const CATEGORY_COLORS = {
  personal: 'bg-purple-100 text-purple-700',
  professional: 'bg-blue-100 text-blue-700',
  health: 'bg-green-100 text-green-700',
  financial: 'bg-yellow-100 text-yellow-700',
  learning: 'bg-indigo-100 text-indigo-700',
  spiritual: 'bg-teal-100 text-teal-700',
  relationships: 'bg-pink-100 text-pink-700',
  other: 'bg-slate-100 text-slate-700'
};

const STATUS_COLORS = {
  not_started: 'bg-slate-100 text-slate-600',
  in_progress: 'bg-blue-100 text-blue-700',
  on_hold: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700'
};

const PRIORITY_ICONS = {
  low: { color: 'text-slate-400', label: 'Low' },
  medium: { color: 'text-amber-500', label: 'Medium' },
  high: { color: 'text-red-500', label: 'High' }
};

export default function GoalCard({ goal, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const queryClient = useQueryClient();

  const toggleStepMutation = useMutation({
    mutationFn: ({ stepIdx, completed }) => {
      const updatedSteps = goal.action_steps.map((s, i) =>
        i === stepIdx ? { ...s, completed } : s
      );
      const progress = Math.round((updatedSteps.filter(s => s.completed).length / updatedSteps.length) * 100);
      const status = progress === 100 ? 'completed' : progress > 0 ? 'in_progress' : goal.status;
      return SDK.entities.Goal.update(goal.id, { action_steps: updatedSteps, progress, status });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals'] })
  });

  const daysLeft = goal.target_date ? differenceInDays(new Date(goal.target_date), new Date()) : null;
  const steps = goal.action_steps || [];
  const completedSteps = steps.filter(s => s.completed).length;
  const progress = steps.length ? Math.round((completedSteps / steps.length) * 100) : goal.progress || 0;

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className={cn("font-semibold text-sm", goal.status === 'completed' && 'line-through text-slate-400')}>
                    {goal.title}
                  </h3>
                  <Flag className={cn("w-3.5 h-3.5 flex-shrink-0", PRIORITY_ICONS[goal.priority]?.color)} />
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge className={cn("text-xs px-2 py-0.5", CATEGORY_COLORS[goal.category])}>{goal.category}</Badge>
                  <Badge className={cn("text-xs px-2 py-0.5", STATUS_COLORS[goal.status])}>
                    {goal.status?.replace('_', ' ')}
                  </Badge>
                  {daysLeft !== null && (
                    <span className={cn("text-xs", daysLeft < 0 ? 'text-red-500' : daysLeft < 7 ? 'text-amber-600' : 'text-slate-500')}>
                      {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(goal)}>
                  <Pencil className="w-3.5 h-3.5 text-slate-400" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(goal.id)}>
                  <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                </Button>
              </div>
            </div>

            {/* Progress */}
            <div className="flex items-center gap-2 mb-2">
              <Progress value={progress} className="h-2 flex-1" />
              <span className="text-xs font-medium text-teal-700 w-8 text-right">{progress}%</span>
            </div>

            {goal.description && (
              <p className="text-xs text-slate-500 mb-2 line-clamp-2">{goal.description}</p>
            )}

            {/* Steps toggle + AI Summary */}
            <div className="flex items-center gap-2 flex-wrap">
              {steps.length > 0 && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-800"
                >
                  {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  {completedSteps}/{steps.length} steps
                </button>
              )}
              <AIProgressSummary goal={goal} />
            </div>
          </div>
        </div>

        {/* Action Steps */}
        <AnimatePresence>
          {expanded && steps.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 space-y-1.5 overflow-hidden"
            >
              {steps.map((step, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg cursor-pointer hover:bg-teal-50"
                  onClick={() => toggleStepMutation.mutate({ stepIdx: idx, completed: !step.completed })}
                >
                  {step.completed
                    ? <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0" />
                    : <Circle className="w-4 h-4 text-slate-300 flex-shrink-0" />
                  }
                  <span className={cn("text-sm flex-1", step.completed && "line-through text-slate-400")}>
                    {step.title}
                  </span>
                  {step.due_date && (
                    <span className="text-xs text-slate-400">{format(new Date(step.due_date), 'MMM d')}</span>
                  )}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}