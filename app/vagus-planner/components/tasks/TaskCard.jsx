import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MoreVertical, Edit2, Trash2, Clock, Calendar, User, 
  Share2, MessageCircle, CheckCircle, Circle, AlertCircle, Flag, Users, CalendarPlus, GitBranch, Repeat, History
} from 'lucide-react';
import TranslateButton from '@/components/translation/TranslateButton';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from '@/lib/utils';
import ShareTaskModal from './ShareTaskModal';
import CommentThread from '@/components/collaboration/CommentThread';
import ShareWithTeam from '@/components/collaboration/ShareWithTeam';
import TaskDependencyVisualization from './TaskDependencyVisualization';
import TaskDependencyManager from './TaskDependencyManager';
import VersionHistoryButton from '@/components/versioning/VersionHistoryButton';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import VersionHistoryPanel from '@/components/versioning/VersionHistoryPanel';

const categoryStyles = {
  work: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
  personal: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
  health: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700' },
  shopping: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
  learning: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
  home: { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700' },
  other: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700' }
};

const priorityColors = {
  low: 'text-slate-500',
  medium: 'text-blue-500',
  high: 'text-orange-500',
  urgent: 'text-red-600'
};

const statusIcons = {
  todo: Circle,
  in_progress: AlertCircle,
  completed: CheckCircle,
  blocked: Flag
};

export default function TaskCard({ task, onEdit, onDelete, onToggleStatus, onUpdateDependencies, allTasks = [], index = 0 }) {
  const [showShareModal, setShowShareModal] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showTeamShare, setShowTeamShare] = useState(false);
  const [showDependencies, setShowDependencies] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  React.useEffect(() => {
    const handler = (e) => {
      if (e.detail?.entityType === 'Task' && e.detail?.entityId === task.id) {
        setShowVersionHistory(true);
      }
    };
    window.addEventListener('open-version-history', handler);
    return () => window.removeEventListener('open-version-history', handler);
  }, [task.id]);
  const style = categoryStyles[task.category] || categoryStyles.other;
  const StatusIcon = statusIcons[task.status] || Circle;

  const handleStatusToggle = () => {
    setIsUpdating(true);
    const newStatus = task.status === 'completed' ? 'todo' : 'completed';
    onToggleStatus(task.id, newStatus);
    setTimeout(() => setIsUpdating(false), 500);
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = task.due_date ? new Date(task.due_date) : null;
  if (dueDate) dueDate.setHours(0, 0, 0, 0);
  const isOverdue = dueDate && dueDate < today && task.status !== 'completed';
  const isDueToday = dueDate && dueDate.getTime() === today.getTime() && task.status !== 'completed';

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ delay: index * 0.05 }}
        className={cn(
          "p-4 rounded-xl border transition-all hover:shadow-md relative overflow-hidden",
          isOverdue ? "border-red-400 bg-red-50" : isDueToday ? "border-amber-400 bg-amber-50" : `${style.bg} ${style.border}`,
          task.status === 'completed' && "opacity-60"
        )}
      >
        {/* Overdue / Due Today accent bar */}
        {(isOverdue || isDueToday) && task.status !== 'completed' && (
          <div className={cn(
            "absolute left-0 top-0 bottom-0 w-1 rounded-l-xl",
            isOverdue ? "bg-red-500" : "bg-amber-500"
          )} />
        )}
        <div className="flex items-start gap-3">
          <Checkbox
            checked={task.status === 'completed'}
            onCheckedChange={handleStatusToggle}
            disabled={isUpdating}
            className="mt-1"
          />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <h4 className={cn(
                  "font-semibold",
                  style.text,
                  task.status === 'completed' && "line-through"
                )}>
                  {task.title}
                </h4>
                
                {task.description && (
                  <div className="mt-1">
                    <p className="text-sm text-slate-500 line-clamp-2">
                      {task.description}
                    </p>
                    <TranslateButton text={task.description} variant="ghost" size="sm" />
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    {task.category}
                  </Badge>
                  
                  <Badge 
                    variant="outline" 
                    className={cn("text-xs", priorityColors[task.priority])}
                  >
                    <Flag className="w-3 h-3 mr-1" />
                    {task.priority}
                  </Badge>

                  {task.due_date && (
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs font-semibold",
                        isOverdue ? "bg-red-100 text-red-700 border-red-400" :
                        isDueToday ? "bg-amber-100 text-amber-700 border-amber-400" :
                        "text-slate-600"
                      )}
                    >
                      <Calendar className="w-3 h-3 mr-1" />
                      {isOverdue ? `Overdue · ${format(new Date(task.due_date), 'MMM d')}` :
                       isDueToday ? 'Due Today' :
                       format(new Date(task.due_date), 'MMM d')}
                      {!isOverdue && !isDueToday && task.due_time && ` · ${task.due_time}`}
                    </Badge>
                  )}

                  {task.estimated_minutes && (
                    <Badge variant="outline" className="text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      {task.estimated_minutes}m
                    </Badge>
                  )}

                  {task.is_recurring && (
                    <Badge variant="outline" className="text-xs bg-violet-50 text-violet-700 border-violet-200">
                      <Repeat className="w-3 h-3 mr-1" />
                      {task.recurrence_type === 'daily' && 'Daily'}
                      {task.recurrence_type === 'weekly' && 'Weekly'}
                      {task.recurrence_type === 'monthly' && 'Monthly'}
                      {task.recurrence_type === 'yearly' && 'Yearly'}
                    </Badge>
                  )}
                  
                  {task.parent_recurring_task_id && (
                    <Badge variant="outline" className="text-xs bg-violet-50 text-violet-700 border-violet-200">
                      <Repeat className="w-3 h-3 mr-1" />
                      Instance
                    </Badge>
                  )}

                  {task.assigned_to && (
                    <Badge variant="outline" className="text-xs">
                      <User className="w-3 h-3 mr-1" />
                      {task.assigned_to}
                    </Badge>
                  )}

                  <StatusIcon className={cn("w-4 h-4", 
                    task.status === 'completed' ? 'text-green-600' :
                    task.status === 'in_progress' ? 'text-blue-600' :
                    task.status === 'blocked' ? 'text-red-600' :
                    'text-slate-400'
                  )} />
                </div>

                {task.subtasks && task.subtasks.length > 0 && (
                  <div className="mt-2 text-xs text-slate-500">
                    {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length} subtasks completed
                  </div>
                )}

                {/* Task Dependencies Visualization */}
                <TaskDependencyVisualization task={task} allTasks={allTasks} />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger className="p-1 rounded-lg hover:bg-white/50 transition-colors">
                  <MoreVertical className="w-4 h-4 text-slate-400" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(task)}>
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    window.dispatchEvent(new CustomEvent('convert-task-to-event', { detail: task }));
                  }}>
                    <CalendarPlus className="w-4 h-4 mr-2" />
                    Schedule on Calendar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowShareModal(true)}>
                    <Share2 className="w-4 h-4 mr-2" />
                    Share with User
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowTeamShare(true)}>
                    <Users className="w-4 h-4 mr-2" />
                    Share with Team
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowComments(!showComments)}>
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Comments
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowDependencies(true)}>
                    <GitBranch className="w-4 h-4 mr-2" />
                    Manage Dependencies
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    window.dispatchEvent(new CustomEvent('open-version-history', { detail: { entityType: 'Task', entityId: task.id } }));
                  }}>
                    <History className="w-4 h-4 mr-2" />
                    Version History
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onDelete(task.id)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 overflow-hidden"
          >
            <div className={cn("p-4 rounded-xl border", style.bg, style.border)}>
              <CommentThread entityType="task" entityId={task.id} compact />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ShareTaskModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        task={task}
      />
      
      <ShareWithTeam
        isOpen={showTeamShare}
        onClose={() => setShowTeamShare(false)}
        entityType="task"
        entityId={task.id}
      />

      <TaskDependencyManager
        task={task}
        isOpen={showDependencies}
        onClose={() => setShowDependencies(false)}
        onSave={(dependencies) => {
          if (onUpdateDependencies) {
            onUpdateDependencies(task.id, dependencies);
          }
        }}
      />

      <Sheet open={showVersionHistory} onOpenChange={setShowVersionHistory}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
          <VersionHistoryPanel
            entityType="Task"
            entityId={task.id}
            onClose={() => setShowVersionHistory(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}