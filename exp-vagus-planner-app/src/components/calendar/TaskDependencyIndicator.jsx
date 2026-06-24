import React from 'react';
import { GitBranch, AlertCircle, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TaskDependencyIndicator({ task, allTasks }) {
  if (!task?.dependencies || task.dependencies.length === 0) return null;

  const isBlocked = task.dependencies.some(dep => {
    const depTask = allTasks.find(t => t.id === dep.task_id);
    return dep.type === 'blocks' && depTask?.status !== 'completed';
  });

  const hasDependents = allTasks.some(t => 
    t.dependencies?.some(d => d.task_id === task.id)
  );

  return (
    <div className="flex items-center gap-1 mt-1">
      {isBlocked && (
        <div className="flex items-center gap-0.5 px-1 py-0.5 bg-red-100 dark:bg-red-950 rounded text-red-600">
          <AlertCircle className="w-2.5 h-2.5" />
          <span className="text-[9px] font-semibold">BLOCKED</span>
        </div>
      )}
      
      {task.dependencies.length > 0 && (
        <div className={cn(
          "flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px]",
          isBlocked 
            ? "bg-red-100 dark:bg-red-950 text-red-600" 
            : "bg-blue-100 dark:bg-blue-950 text-blue-600"
        )}>
          <GitBranch className="w-2.5 h-2.5" />
          <span>{task.dependencies.length}</span>
        </div>
      )}

      {hasDependents && (
        <div className="flex items-center gap-0.5 px-1 py-0.5 bg-orange-100 dark:bg-orange-950 rounded text-orange-600">
          <Link2 className="w-2.5 h-2.5" />
        </div>
      )}
    </div>
  );
}