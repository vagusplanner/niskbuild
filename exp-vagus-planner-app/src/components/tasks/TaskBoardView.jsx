import React, { useState } from 'react';
import VoiceTaskInput from './VoiceTaskInput';
import DueDateAlertBanner from './DueDateAlertBanner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Clock, AlertCircle, Flag, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const COLUMNS = [
  { id: 'todo', title: 'To Do', color: 'amber' },
  { id: 'in_progress', title: 'In Progress', color: 'blue' },
  { id: 'completed', title: 'Completed', color: 'green' }
];

const priorityConfig = {
  low: { color: 'bg-blue-100 text-blue-800', icon: Flag },
  medium: { color: 'bg-amber-100 text-amber-800', icon: Flag },
  high: { color: 'bg-orange-100 text-orange-800', icon: Flag },
  urgent: { color: 'bg-red-100 text-red-800', icon: AlertCircle }
};

export default function TaskBoardView({ tasks, onTaskClick, onStatusChange, onDeleteTask, onTasksCreated }) {
  const [showVoice, setShowVoice] = useState(false);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const isOverdue = (task) => {
    if (!task.due_date || task.status === 'completed') return false;
    const d = new Date(task.due_date); d.setHours(0, 0, 0, 0);
    return d < todayStart;
  };

  const isDueToday = (task) => {
    if (!task.due_date || task.status === 'completed') return false;
    const d = new Date(task.due_date); d.setHours(0, 0, 0, 0);
    return d.getTime() === todayStart.getTime();
  };

  return (
    <div>
      <VoiceTaskInput
        isOpen={showVoice}
        onClose={() => setShowVoice(false)}
        onTasksCreated={(created) => { onTasksCreated?.(created); setShowVoice(false); }}
      />
      <DueDateAlertBanner tasks={tasks} />
      <div className="mb-3 flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowVoice(true)}
          className="border-[#29ABE2]/40 text-[#29ABE2] hover:bg-[#29ABE2]/10 gap-1.5"
        >
          <Mic className="w-3.5 h-3.5" /> Voice Add
        </Button>
      </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {COLUMNS.map(column => {
        const columnTasks = tasks.filter(t => t.status === column.id);
        
        return (
          <Card key={column.id} className="bg-white">
            <CardHeader className={`bg-${column.color}-50 border-b border-${column.color}-100`}>
              <CardTitle className="flex items-center justify-between">
                <span className={`text-${column.color}-700`}>{column.title}</span>
                <Badge className={`bg-${column.color}-100 text-${column.color}-800`}>
                  {columnTasks.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
              {columnTasks.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  No tasks
                </div>
              ) : (
                columnTasks.map((task, idx) => {
                  const PriorityIcon = priorityConfig[task.priority]?.icon || Flag;
                  const overdueTask = isOverdue(task);
                  
                  return (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => onTaskClick(task)}
                      className={`p-4 rounded-lg border cursor-pointer hover:shadow-md transition-all relative overflow-hidden ${
                        overdueTask ? 'border-red-400 bg-red-50' :
                        isDueToday(task) ? 'border-amber-400 bg-amber-50' :
                        'border-slate-200 bg-white'
                      }`}
                    >
                      {(overdueTask || isDueToday(task)) && (
                        <div className={`absolute top-0 left-0 right-0 h-0.5 ${overdueTask ? 'bg-red-500' : 'bg-amber-500'}`} />
                      )}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-medium text-slate-800 flex-1 line-clamp-2">
                          {task.title}
                        </h4>
                        <Badge className={priorityConfig[task.priority]?.color}>
                          <PriorityIcon className="w-3 h-3" />
                        </Badge>
                      </div>
                      
                      {task.description && (
                        <p className="text-sm text-slate-600 line-clamp-2 mb-2">
                          {task.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-xs text-slate-500">
                        {task.due_date && (
                          <span className={`flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                            overdueTask ? 'bg-red-100 text-red-700' :
                            isDueToday(task) ? 'bg-amber-100 text-amber-700' :
                            'text-slate-500'
                          }`}>
                            <Clock className="w-3 h-3" />
                            {overdueTask ? `Overdue` : isDueToday(task) ? 'Today' : format(new Date(task.due_date), 'MMM d')}
                          </span>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {task.category}
                        </Badge>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
    </div>
  );
}