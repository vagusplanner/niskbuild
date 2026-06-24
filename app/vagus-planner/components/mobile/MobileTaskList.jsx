import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Plus, CheckCircle2, Circle, Calendar, Clock, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import MobileBottomSheet from './MobileBottomSheet';
import TaskForm from '@/components/tasks/TaskForm';

export default function MobileTaskList() {
  const [showNewTask, setShowNewTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-updated_date')
  });

  const upcomingTasks = tasks.filter(t => t.status !== 'completed').slice(0, 10);

  const priorityColors = {
    urgent: 'bg-red-100 text-red-700 border-red-300',
    high: 'bg-orange-100 text-orange-700 border-orange-300',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    low: 'bg-green-100 text-green-700 border-green-300'
  };

  return (
    <>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-safe">
        {/* Header */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 safe-area-top">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Tasks</h1>
                <p className="text-sm text-slate-500">{upcomingTasks.length} upcoming</p>
              </div>
              <Button
                onClick={() => setShowNewTask(true)}
                className="rounded-full h-12 w-12 p-0 bg-teal-600 hover:bg-teal-700 shadow-lg"
              >
                <Plus className="w-6 h-6" />
              </Button>
            </div>
          </div>
        </div>

        {/* Task List */}
        <div className="p-4 space-y-3">
          {upcomingTasks.map((task, index) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => setSelectedTask(task)}
              className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 active:scale-[0.98] transition-transform"
            >
              <div className="flex items-start gap-3">
                <button className="mt-0.5">
                  {task.status === 'completed' ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-400" />
                  )}
                </button>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-slate-900 dark:text-slate-100 mb-1">
                    {task.title}
                  </h3>
                  
                  {task.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-2">
                      {task.description}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    {task.priority && (
                      <Badge className={`text-xs ${priorityColors[task.priority]}`}>
                        {task.priority}
                      </Badge>
                    )}
                    
                    {task.due_date && (
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(task.due_date), 'MMM d')}
                      </div>
                    )}
                    
                    {task.estimated_minutes && (
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="w-3 h-3" />
                        {task.estimated_minutes}m
                      </div>
                    )}
                  </div>
                </div>
                
                <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
              </div>
            </motion.div>
          ))}

          {upcomingTasks.length === 0 && (
            <div className="text-center py-12">
              <Circle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No tasks yet</p>
              <Button
                onClick={() => setShowNewTask(true)}
                variant="link"
                className="mt-2 text-teal-600"
              >
                Create your first task
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* New Task Bottom Sheet */}
      <MobileBottomSheet
        isOpen={showNewTask}
        onClose={() => setShowNewTask(false)}
        title="New Task"
        snapPoints={[0.9]}
      >
        <TaskForm
          onClose={() => setShowNewTask(false)}
          onSave={() => setShowNewTask(false)}
        />
      </MobileBottomSheet>

      {/* Task Details Bottom Sheet */}
      <MobileBottomSheet
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        title="Task Details"
        snapPoints={[0.6, 0.9]}
      >
        {selectedTask && (
          <TaskForm
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
            onSave={() => setSelectedTask(null)}
          />
        )}
      </MobileBottomSheet>
    </>
  );
}