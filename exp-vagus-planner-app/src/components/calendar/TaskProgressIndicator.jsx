import React from 'react';
import { CheckCircle, Clock, AlertCircle, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TaskProgressIndicator({ tasks }) {
  if (!tasks || tasks.length === 0) return null;

  const completed = tasks.filter(t => t.status === 'completed').length;
  const inProgress = tasks.filter(t => t.status === 'in_progress').length;
  const urgent = tasks.filter(t => t.priority === 'urgent' && t.status !== 'completed').length;
  const overdue = tasks.filter(t => 
    t.due_date && 
    new Date(t.due_date) < new Date() && 
    t.status !== 'completed'
  ).length;

  const total = tasks.length;
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="mt-1 space-y-1">
      {/* Progress bar */}
      <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Status indicators */}
      <div className="flex items-center justify-between text-[10px]">
        <div className="flex items-center gap-2">
          {completed > 0 && (
            <div className="flex items-center gap-0.5 text-emerald-600">
              <CheckCircle className="w-3 h-3" />
              <span>{completed}</span>
            </div>
          )}
          {inProgress > 0 && (
            <div className="flex items-center gap-0.5 text-blue-600">
              <Clock className="w-3 h-3" />
              <span>{inProgress}</span>
            </div>
          )}
          {urgent > 0 && (
            <div className="flex items-center gap-0.5 text-orange-600">
              <Flag className="w-3 h-3" />
              <span>{urgent}</span>
            </div>
          )}
          {overdue > 0 && (
            <div className="flex items-center gap-0.5 text-red-600">
              <AlertCircle className="w-3 h-3" />
              <span>{overdue}</span>
            </div>
          )}
        </div>
        <span className="text-slate-500">{progressPercent}%</span>
      </div>
    </div>
  );
}