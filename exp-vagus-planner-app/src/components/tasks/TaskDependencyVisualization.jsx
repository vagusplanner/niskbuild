import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, GitBranch, Link2, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const DEPENDENCY_ICONS = {
  blocks: ArrowRight,
  required_by: GitBranch,
  related: Link2
};

const DEPENDENCY_COLORS = {
  blocks: 'text-red-600 border-red-300 bg-red-50',
  required_by: 'text-orange-600 border-orange-300 bg-orange-50',
  related: 'text-blue-600 border-blue-300 bg-blue-50'
};

export default function TaskDependencyVisualization({ task, allTasks, compact = false }) {
  if (!task?.dependencies || task.dependencies.length === 0) return null;

  const getDependencyStatus = (depTaskId) => {
    const depTask = allTasks.find(t => t.id === depTaskId);
    if (!depTask) return 'unknown';
    return depTask.status;
  };

  const isBlocked = task.dependencies.some(dep => {
    const status = getDependencyStatus(dep.task_id);
    return dep.type === 'blocks' && status !== 'completed';
  });

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {isBlocked && (
          <Badge variant="outline" className="text-xs bg-red-50 text-red-600 border-red-300">
            <AlertCircle className="w-3 h-3 mr-1" />
            Blocked
          </Badge>
        )}
        <Badge variant="outline" className="text-xs">
          <GitBranch className="w-3 h-3 mr-1" />
          {task.dependencies.length} dep
        </Badge>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className="mt-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700"
    >
      <div className="flex items-center gap-2 mb-2">
        <GitBranch className="w-4 h-4 text-slate-600" />
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Dependencies ({task.dependencies.length})
        </span>
        {isBlocked && (
          <Badge variant="outline" className="ml-auto text-xs bg-red-50 text-red-600 border-red-300">
            <AlertCircle className="w-3 h-3 mr-1" />
            Blocked
          </Badge>
        )}
      </div>

      <div className="space-y-2">
        {task.dependencies.map((dep, idx) => {
          const Icon = DEPENDENCY_ICONS[dep.type] || Link2;
          const status = getDependencyStatus(dep.task_id);
          const depTask = allTasks.find(t => t.id === dep.task_id);
          
          return (
            <div
              key={idx}
              className={cn(
                "flex items-center gap-2 p-2 rounded border text-xs",
                DEPENDENCY_COLORS[dep.type] || 'border-slate-200 bg-slate-50'
              )}
            >
              <Icon className="w-3 h-3 flex-shrink-0" />
              <span className="flex-1 font-medium">{dep.task_title || 'Unknown Task'}</span>
              
              {status === 'completed' ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : status === 'in_progress' ? (
                <Clock className="w-4 h-4 text-blue-600" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-slate-400" />
              )}
            </div>
          );
        })}
      </div>

      {isBlocked && (
        <div className="mt-2 flex items-start gap-2 p-2 bg-red-50 dark:bg-red-950 rounded text-xs text-red-700 dark:text-red-300">
          <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <span>This task is blocked. Complete the blocking tasks first.</span>
        </div>
      )}
    </motion.div>
  );
}