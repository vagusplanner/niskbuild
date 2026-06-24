import React, { useState } from 'react';
import VoiceTaskInput from './VoiceTaskInput';
import DueDateAlertBanner from './DueDateAlertBanner';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { Clock, AlertCircle, Trash2, MoreVertical, Mic } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const priorityColors = {
  low: 'bg-blue-100 text-blue-800',
  medium: 'bg-amber-100 text-amber-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800'
};

export default function TaskListView({ tasks, onTaskClick, onStatusChange, onDeleteTask, onTasksCreated }) {
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('due_date');
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

  const filteredTasks = tasks
    .filter(task => {
      if (filter === 'all') return true;
      if (filter === 'overdue') return isOverdue(task);
      return task.status === filter;
    })
    .sort((a, b) => {
      if (sortBy === 'due_date') {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date) - new Date(b.due_date);
      }
      if (sortBy === 'priority') {
        const priority = { urgent: 4, high: 3, medium: 2, low: 1 };
        return priority[b.priority] - priority[a.priority];
      }
      return 0;
    });

  return (
    <div>
      <VoiceTaskInput
        isOpen={showVoice}
        onClose={() => setShowVoice(false)}
        onTasksCreated={(created) => { onTasksCreated?.(created); setShowVoice(false); }}
      />
      <DueDateAlertBanner tasks={tasks} />
      <div className="mb-4 flex gap-2 flex-wrap items-center">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          All
        </Button>
        <Button
          variant={filter === 'todo' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('todo')}
        >
          To Do
        </Button>
        <Button
          variant={filter === 'in_progress' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('in_progress')}
        >
          In Progress
        </Button>
        <Button
          variant={filter === 'completed' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('completed')}
        >
          Completed
        </Button>
        <Button
          variant={filter === 'overdue' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('overdue')}
        >
          Overdue
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowVoice(true)}
          className="ml-auto border-[#29ABE2]/40 text-[#29ABE2] hover:bg-[#29ABE2]/10 gap-1.5"
        >
          <Mic className="w-3.5 h-3.5" /> Voice Add
        </Button>
      </div>

      <Card className="divide-y">
        {filteredTasks.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            No tasks found
          </div>
        ) : (
          filteredTasks.map(task => {
            const overdueTask = isOverdue(task);
            const dueTodayTask = isDueToday(task);
            
            return (
              <div
                key={task.id}
                className={`p-4 transition-colors relative ${
                  overdueTask ? 'bg-red-50 border-l-4 border-l-red-500' :
                  isDueToday(task) ? 'bg-amber-50 border-l-4 border-l-amber-500' :
                  'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-4">
                  <Checkbox
                    checked={task.status === 'completed'}
                    onCheckedChange={(checked) => {
                      onStatusChange(task.id, checked ? 'completed' : 'todo');
                    }}
                    className="mt-1"
                  />
                  
                  <div className="flex-1 cursor-pointer" onClick={() => onTaskClick(task)}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h4 className={`font-medium text-slate-800 ${
                          task.status === 'completed' ? 'line-through text-slate-400' : ''
                        }`}>
                          {task.title}
                        </h4>
                        {task.description && (
                          <p className="text-sm text-slate-600 mt-1 line-clamp-1">
                            {task.description}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge className={priorityColors[task.priority]}>
                          {task.priority}
                        </Badge>
                        {task.due_date && (
                          <span className={`text-xs font-semibold flex items-center gap-1 px-2 py-0.5 rounded-full ${
                            overdueTask ? 'bg-red-100 text-red-700' :
                            isDueToday(task) ? 'bg-amber-100 text-amber-700' :
                            'text-slate-500'
                          }`}>
                            <Clock className="w-3 h-3" />
                            {overdueTask ? `Overdue · ${format(new Date(task.due_date), 'MMM d')}` :
                             isDueToday(task) ? 'Due Today' :
                             format(new Date(task.due_date), 'MMM d')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onTaskClick(task)}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDeleteTask(task.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })
        )}
      </Card>
    </div>
  );
}