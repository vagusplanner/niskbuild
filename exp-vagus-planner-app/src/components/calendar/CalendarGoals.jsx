import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Plus, Target, CheckCircle2, Circle, Trash2, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const CATEGORY_COLORS = {
  personal: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  professional: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  health: 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300',
  financial: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  learning: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300',
  spiritual: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  relationships: 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300',
  other: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

export default function CalendarGoals({ onClose }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('personal');

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['goals-calendar'],
    queryFn: () => SDK.entities.Goal.list('-created_date', 20),
  });

  const createMutation = useMutation({
    mutationFn: (data) => SDK.entities.Goal.create(data),
    onSuccess: () => { qc.invalidateQueries(['goals-calendar']); setTitle(''); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => SDK.entities.Goal.update(id, data),
    onSuccess: () => qc.invalidateQueries(['goals-calendar']),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => SDK.entities.Goal.delete(id),
    onSuccess: () => qc.invalidateQueries(['goals-calendar']),
  });

  const activeGoals = goals.filter(g => g.status !== 'completed').slice(0, 6);

  return (
    <div className="w-80 max-h-[480px] flex flex-col">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-emerald-500" />
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">Goals</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowForm(f => !f)}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            title="Add goal"
          >
            <Plus className="w-4 h-4 text-slate-500" />
          </button>
          {onClose && (
            <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Quick add form */}
      {showForm && (
        <div className="px-4 pb-3 space-y-2">
          <input
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && title.trim()) createMutation.mutate({ title: title.trim(), category, status: 'not_started', priority: 'medium', progress: 0 }); }}
            placeholder="Goal title..."
            className="w-full text-sm border rounded-lg px-3 py-2 outline-none focus:ring-2 ring-emerald-400 bg-white dark:bg-slate-800 dark:border-slate-700"
          />
          <div className="flex gap-2">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="flex-1 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(CATEGORY_COLORS).map(c => (
                  <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              className="h-8 text-xs bg-emerald-500 hover:bg-emerald-600"
              disabled={!title.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate({ title: title.trim(), category, status: 'not_started', priority: 'medium', progress: 0 })}
            >
              Add
            </Button>
          </div>
        </div>
      )}

      {/* Goals list */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {isLoading ? (
          <div className="text-sm text-slate-400 text-center py-4">Loading...</div>
        ) : activeGoals.length === 0 ? (
          <div className="text-sm text-slate-400 text-center py-6">
            <Target className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No active goals. Add one!
          </div>
        ) : (
          activeGoals.map(goal => (
            <GoalRow
              key={goal.id}
              goal={goal}
              onComplete={() => updateMutation.mutate({ id: goal.id, data: { status: 'completed', progress: 100 } })}
              onDelete={() => deleteMutation.mutate(goal.id)}
            />
          ))
        )}
      </div>

      {/* Footer link */}
      <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-2">
        <Link
          to={createPageUrl('Wellness') + '?tab=goals'}
          className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
        >
          View all goals <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}

function GoalRow({ goal, onComplete, onDelete }) {
  const colorClass = CATEGORY_COLORS[goal.category] || CATEGORY_COLORS.other;
  const progress = goal.progress || 0;

  return (
    <div className="group flex items-start gap-2 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
      <button onClick={onComplete} className="mt-0.5 flex-shrink-0">
        {goal.status === 'completed'
          ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          : <Circle className="w-4 h-4 text-slate-300 hover:text-emerald-500 transition-colors" />
        }
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-1">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-tight truncate">{goal.title}</p>
          <button
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900 flex-shrink-0"
          >
            <Trash2 className="w-3 h-3 text-red-400" />
          </button>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", colorClass)}>{goal.category}</span>
          {progress > 0 && (
            <div className="flex-1 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${progress}%` }} />
            </div>
          )}
          {progress > 0 && <span className="text-[10px] text-slate-400">{progress}%</span>}
        </div>
      </div>
    </div>
  );
}