import React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, List, LayoutGrid, Clock, GanttChart } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CalendarViewOptions({ currentView, onViewChange }) {
  const views = [
    { id: 'month', icon: Calendar, label: 'Month' },
    { id: 'week', icon: LayoutGrid, label: 'Week' },
    { id: 'workweek', icon: Calendar, label: 'Work Week' },
    { id: 'day', icon: Clock, label: 'Day' },
    { id: 'year', icon: Calendar, label: 'Year' },
    { id: 'timeline', icon: GanttChart, label: 'Timeline' },
    { id: 'agenda', icon: List, label: 'Agenda' }
  ];

  return (
    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
      {views.map(view => {
        const Icon = view.icon;
        return (
          <Button
            key={view.id}
            variant="ghost"
            size="sm"
            onClick={() => onViewChange(view.id)}
            className={cn(
              "h-8 px-2 md:px-3 text-xs",
              currentView === view.id && "bg-white dark:bg-slate-700 shadow-sm"
            )}
          >
            <Icon className="w-3.5 h-3.5 md:mr-1.5" />
            <span className="hidden md:inline">{view.label}</span>
          </Button>
        );
      })}
    </div>
  );
}