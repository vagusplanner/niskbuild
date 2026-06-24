import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { Badge } from '@/components/ui/badge';
import { CheckSquare, Circle, Clock, Repeat } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import TaskProgressIndicator from './TaskProgressIndicator';
import TaskDependencyIndicator from './TaskDependencyIndicator';

export default function CalendarTasksOverlay({ date, onTaskClick, showProgress = true }) {
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => SDK.entities.Task.list()
  });

  const dayTasks = tasks.filter(task => 
    task.due_date && isSameDay(new Date(task.due_date), date)
  );

  if (dayTasks.length === 0) return null;

  const priorityColors = {
    urgent: 'border-l-red-500 bg-red-50 dark:bg-red-950',
    high: 'border-l-orange-500 bg-orange-50 dark:bg-orange-950',
    medium: 'border-l-blue-500 bg-blue-50 dark:bg-blue-950',
    low: 'border-l-slate-500 bg-slate-50 dark:bg-slate-950'
  };

  return (
    <div className="mt-2 space-y-1">
      {dayTasks.slice(0, 2).map((task) => (
        <div
          key={task.id}
          onClick={(e) => {
            e.stopPropagation();
            onTaskClick?.(task);
          }}
          className={cn(
            "text-xs px-2 py-1 rounded border-l-2 cursor-pointer hover:shadow-sm transition-shadow",
            priorityColors[task.priority] || priorityColors.medium
          )}
        >
          <div className="flex items-center gap-1">
            {task.status === 'completed' ? (
              <CheckSquare className="w-3 h-3 text-green-600" />
            ) : (
              <Circle className="w-3 h-3 text-slate-400" />
            )}
            {(task.is_recurring || task.parent_recurring_task_id) && (
              <Repeat className="w-3 h-3 text-violet-600" />
            )}
            <span className={cn(
              "flex-1 truncate",
              task.status === 'completed' && "line-through text-slate-400"
            )}>
              {task.title}
            </span>
          </div>
          <TaskDependencyIndicator task={task} allTasks={tasks} />
        </div>
      ))}
      {dayTasks.length > 2 && (
        <div className="text-[10px] text-slate-500 pl-2">
          +{dayTasks.length - 2} more tasks
        </div>
      )}

      {showProgress && dayTasks.length > 0 && (
        <TaskProgressIndicator tasks={dayTasks} />
      )}
    </div>
  );
}