import React, { useState, useEffect } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  CheckSquare, 
  Plus, 
  Calendar,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Filter,
  X,
  Pin,
  PinOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { cn } from '@/lib/utils';
import TaskForm from '@/components/tasks/TaskForm';

const priorityColors = {
  urgent: 'bg-red-100 text-red-700 border-red-300',
  high: 'bg-orange-100 text-orange-700 border-orange-300',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  low: 'bg-blue-100 text-blue-700 border-blue-300'
};

const statusColors = {
  todo: 'text-slate-600',
  in_progress: 'text-blue-600',
  completed: 'text-green-600 line-through',
  blocked: 'text-red-600'
};

export default function CalendarTaskPanel({ selectedDate, onTaskClick, onAISchedule, isPinned, onTogglePin, onClose }) {
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [filterStatus, setFilterStatus] = useState('active');
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    overdue: true,
    today: true,
    upcoming: true,
    noDate: false
  });
  const queryClient = useQueryClient();

  // Auto-collapse after 3 seconds of no interaction (only if not pinned)
  useEffect(() => {
    if (isPinned) return;

    let timeout;
    const resetTimeout = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        setIsExpanded(false);
      }, 3000);
    };

    if (isExpanded) {
      resetTimeout();
    }

    return () => clearTimeout(timeout);
  }, [isExpanded, isPinned]);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => SDK.entities.Task.list('-updated_date', 100)
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => SDK.entities.Task.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previous = queryClient.getQueryData(['tasks']);
      queryClient.setQueryData(['tasks'], (old = []) =>
        old.map(t => t.id === id ? { ...t, ...data } : t)
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(['tasks'], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id) => SDK.entities.Task.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  });

  const toggleTask = (task) => {
    const newStatus = task.status === 'completed' ? 'todo' : 'completed';
    updateTaskMutation.mutate({
      id: task.id,
      data: { status: newStatus }
    });
  };

  const filteredTasks = tasks.filter(task => {
    if (filterStatus === 'active') return task.status !== 'completed';
    if (filterStatus === 'completed') return task.status === 'completed';
    return true;
  });

  // Group tasks by due date
  const overdueTasks = filteredTasks.filter(t => t.due_date && isPast(new Date(t.due_date)) && t.status !== 'completed');
  const todayTasks = filteredTasks.filter(t => t.due_date && isToday(new Date(t.due_date)));
  const tomorrowTasks = filteredTasks.filter(t => t.due_date && isTomorrow(new Date(t.due_date)));
  const upcomingTasks = filteredTasks.filter(t => 
    t.due_date && 
    !isPast(new Date(t.due_date)) && 
    !isToday(new Date(t.due_date)) && 
    !isTomorrow(new Date(t.due_date))
  );
  const noDateTasks = filteredTasks.filter(t => !t.due_date);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const TaskItem = ({ task }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="group flex items-start gap-2 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
    >
      <Checkbox
        checked={task.status === 'completed'}
        onCheckedChange={() => toggleTask(task)}
        className="mt-1"
      />
      <div className="flex-1 min-w-0" onClick={() => {
        setEditingTask(task);
        setShowForm(true);
        onTaskClick?.(task);
      }}>
        <p className={`text-sm cursor-pointer ${statusColors[task.status]}`}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {task.priority && (
            <Badge variant="outline" className={`text-xs ${priorityColors[task.priority]}`}>
              {task.priority}
            </Badge>
          )}
          {task.due_date && (
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(new Date(task.due_date), 'MMM d')}
            </span>
          )}
          {task.event_id && (
            <span className="text-xs text-teal-600 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Linked
            </span>
          )}
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="opacity-0 group-hover:opacity-100 h-7 w-7"
        onClick={() => deleteTaskMutation.mutate(task.id)}
      >
        <X className="w-3 h-3" />
      </Button>
    </motion.div>
  );

  const TaskSection = ({ title, tasks, section, badge }) => (
    <div className="border-b border-slate-200 dark:border-slate-700 last:border-0">
      <button
        onClick={() => toggleSection(section)}
        className="w-full flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          {expandedSections[section] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <span className="font-medium text-sm">{title}</span>
          {badge && <Badge variant="secondary" className="text-xs">{badge}</Badge>}
        </div>
        <Badge variant="outline" className="text-xs">{tasks.length}</Badge>
      </button>
      <AnimatePresence>
        {expandedSections[section] && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-1">
              {tasks.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">No tasks</p>
              ) : (
                tasks.map(task => <TaskItem key={task.id} task={task} />)
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const shouldShowExpanded = isPinned || isExpanded;

  return (
    <>
      <motion.div
        className={cn(
          "border-l border-slate-200 dark:border-slate-800 flex-shrink-0 bg-white dark:bg-slate-900 relative h-full overflow-hidden",
          "transition-all duration-300 ease-in-out"
        )}
        initial={false}
        animate={{ width: shouldShowExpanded ? 320 : 56 }}
        onMouseEnter={() => !isPinned && setIsExpanded(true)}
        onMouseLeave={() => !isPinned && setIsExpanded(false)}
      >
        {/* Collapsed View - Vertical Tab */}
        <AnimatePresence>
          {!shouldShowExpanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center py-4 gap-3"
            >
              <div className="flex flex-col items-center gap-2 py-2">
                <CheckSquare className="w-5 h-5 text-teal-600" />
                <Badge className="text-[10px] px-1.5 py-0.5">{filteredTasks.length}</Badge>
              </div>
              
              {overdueTasks.length > 0 && (
                <div className="flex flex-col items-center gap-1 p-1.5 bg-red-50 dark:bg-red-950 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span className="text-[10px] font-semibold text-red-700 dark:text-red-400">
                    {overdueTasks.length}
                  </span>
                </div>
              )}
              
              <div className="mt-auto space-y-2 pb-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setEditingTask(null);
                    setShowForm(true);
                  }}
                  className="w-9 h-9"
                >
                  <Plus className="w-4 h-4" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onAISchedule}
                  className="w-9 h-9 text-violet-600"
                >
                  <Sparkles className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Expanded View */}
        <AnimatePresence>
          {shouldShowExpanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col"
            >
              <Card className="h-full flex flex-col border-0 rounded-none shadow-none">
                <CardHeader className="border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CheckSquare className="w-5 h-5 text-teal-600" />
                    Tasks
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    {onClose && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="lg:hidden h-8 w-8"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onTogglePin}
                      className={cn(
                        "h-8 w-8 hidden lg:flex",
                        isPinned && "text-teal-600 bg-teal-50 dark:bg-teal-950"
                      )}
                    >
                      {isPinned ? <Pin className="w-4 h-4" /> : <PinOff className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onAISchedule}
                      className="h-8 w-8 text-violet-600"
                    >
                      <Sparkles className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="default"
                      size="icon"
                      onClick={() => {
                        setEditingTask(null);
                        setShowForm(true);
                      }}
                      className="h-8 w-8 bg-teal-600 hover:bg-teal-700"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  </div>
                  
                  <div className="flex gap-2 mt-3">
                    {['active', 'completed', 'all'].map(status => (
                      <Button
                        key={status}
                        variant={filterStatus === status ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilterStatus(status)}
                        className="text-xs flex-1"
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Button>
                    ))}
                  </div>
                </CardHeader>

                <CardContent className="flex-1 overflow-y-auto p-0">
                  {isLoading ? (
                    <div className="p-4 space-y-3">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                      ))}
                    </div>
                  ) : (
                    <>
                      {overdueTasks.length > 0 && (
                        <TaskSection 
                          title="Overdue" 
                          tasks={overdueTasks} 
                          section="overdue"
                          badge={<AlertCircle className="w-3 h-3 text-red-600" />}
                        />
                      )}
                      <TaskSection title="Today" tasks={todayTasks} section="today" />
                      {tomorrowTasks.length > 0 && (
                        <TaskSection title="Tomorrow" tasks={tomorrowTasks} section="tomorrow" />
                      )}
                      <TaskSection title="Upcoming" tasks={upcomingTasks} section="upcoming" />
                      {noDateTasks.length > 0 && (
                        <TaskSection title="No Due Date" tasks={noDateTasks} section="noDate" />
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <TaskForm
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingTask(null);
        }}
        task={editingTask}
        selectedDate={selectedDate}
      />
    </>
  );
}