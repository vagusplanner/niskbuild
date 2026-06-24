import React from 'react';
import { AlertTriangle, Clock, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export default function DueDateAlertBanner({ tasks = [] }) {
  const [dismissed, setDismissed] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeTasks = tasks.filter(t => t.status !== 'completed');

  const overdueTasks = activeTasks.filter(t => {
    if (!t.due_date) return false;
    const d = new Date(t.due_date);
    d.setHours(0, 0, 0, 0);
    return d < today;
  });

  const dueTodayTasks = activeTasks.filter(t => {
    if (!t.due_date) return false;
    const d = new Date(t.due_date);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  });

  if (dismissed || (overdueTasks.length === 0 && dueTodayTasks.length === 0)) return null;

  return (
    <div className={cn(
      "rounded-xl border p-3 mb-4 flex items-start gap-3 relative",
      overdueTasks.length > 0
        ? "bg-red-50 border-red-300"
        : "bg-amber-50 border-amber-300"
    )}>
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
        overdueTasks.length > 0 ? "bg-red-100" : "bg-amber-100"
      )}>
        {overdueTasks.length > 0
          ? <AlertTriangle className="w-4 h-4 text-red-600" />
          : <Clock className="w-4 h-4 text-amber-600" />
        }
      </div>

      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm font-semibold",
          overdueTasks.length > 0 ? "text-red-800" : "text-amber-800"
        )}>
          {overdueTasks.length > 0 && dueTodayTasks.length > 0
            ? `${overdueTasks.length} overdue · ${dueTodayTasks.length} due today`
            : overdueTasks.length > 0
            ? `${overdueTasks.length} task${overdueTasks.length > 1 ? 's' : ''} overdue`
            : `${dueTodayTasks.length} task${dueTodayTasks.length > 1 ? 's' : ''} due today`
          }
        </p>
        <p className={cn(
          "text-xs mt-0.5",
          overdueTasks.length > 0 ? "text-red-600" : "text-amber-600"
        )}>
          {overdueTasks.length > 0
            ? overdueTasks.slice(0, 2).map(t => t.title).join(', ') + (overdueTasks.length > 2 ? ` +${overdueTasks.length - 2} more` : '')
            : dueTodayTasks.slice(0, 2).map(t => t.title).join(', ') + (dueTodayTasks.length > 2 ? ` +${dueTodayTasks.length - 2} more` : '')
          }
        </p>
      </div>

      <button
        onClick={() => setDismissed(true)}
        className="flex-shrink-0 p-1 rounded-lg hover:bg-black/10 transition-colors"
      >
        <X className="w-4 h-4 text-slate-500" />
      </button>
    </div>
  );
}