import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar as CalendarIcon, 
  Filter,
  Sparkles,
  Sun,
  Clock,
  ChevronRight,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import WeatherWidget from './WeatherWidget';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function CompactCalendarToolbar({ 
  currentDate,
  onDateSelect,
  onNewEvent,
  onNaturalLanguage,
  onFilter,
  settings,
  events = []
}) {
  const [showQuickJump, setShowQuickJump] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);

  const todayEvents = events.filter(e => {
    const eventDate = new Date(e.start_date);
    const today = new Date();
    return eventDate.toDateString() === today.toDateString();
  });

  const upcomingCount = events.filter(e => {
    const eventDate = new Date(e.start_date);
    return eventDate > new Date();
  }).length;

  const toolbarItems = [
    {
      icon: Sparkles,
      label: 'AI Quick Add',
      color: 'text-violet-600',
      bgHover: 'hover:bg-violet-50 dark:hover:bg-violet-950',
      onClick: onNaturalLanguage,
      badge: null
    },
    {
      icon: CalendarIcon,
      label: 'Jump to Date',
      color: 'text-teal-600',
      bgHover: 'hover:bg-teal-50 dark:hover:bg-teal-950',
      onClick: () => setShowQuickJump(!showQuickJump),
      badge: null,
      isPopover: true,
      popoverContent: (
        <Calendar
          mode="single"
          selected={currentDate}
          onSelect={(date) => {
            onDateSelect(date);
            setShowQuickJump(false);
          }}
          className="rounded-lg border"
        />
      )
    },
    {
      icon: Clock,
      label: 'Today',
      color: 'text-orange-600',
      bgHover: 'hover:bg-orange-50 dark:hover:bg-orange-950',
      onClick: () => onDateSelect(new Date()),
      badge: todayEvents.length > 0 ? todayEvents.length : null
    },
    {
      icon: Zap,
      label: 'Quick Actions',
      color: 'text-amber-600',
      bgHover: 'hover:bg-amber-50 dark:hover:bg-amber-950',
      onClick: () => setShowQuickActions(!showQuickActions),
      badge: upcomingCount > 5 ? '!' : null,
      isPopover: true,
      popoverContent: (
        <div className="w-64 p-2 space-y-1">
          <h4 className="font-semibold text-sm mb-2 px-2">Quick Actions</h4>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-sm"
            onClick={() => {
              onFilter({ type: 'urgent' });
              setShowQuickActions(false);
            }}
          >
            <Filter className="w-4 h-4 mr-2" />
            Show Urgent Only
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-sm"
            onClick={() => {
              onDateSelect(new Date());
              setShowQuickActions(false);
            }}
          >
            <Sun className="w-4 h-4 mr-2" />
            Today's Schedule
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-sm"
            onClick={() => {
              // Navigate to next week
              const nextWeek = new Date();
              nextWeek.setDate(nextWeek.getDate() + 7);
              onDateSelect(nextWeek);
              setShowQuickActions(false);
            }}
          >
            <ChevronRight className="w-4 h-4 mr-2" />
            Next Week
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="fixed left-60 top-20 z-30 hidden flex-col gap-2 bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 p-2">
      {toolbarItems.map((item, idx) => {
        const Icon = item.icon;
        
        if (item.isPopover) {
          return (
            <Popover key={idx}>
              <PopoverTrigger asChild>
                <button
                  className={cn(
                    "relative p-3 rounded-xl transition-all group",
                    item.bgHover
                  )}
                  title={item.label}
                >
                  <Icon className={cn("w-5 h-5", item.color)} />
                  {item.badge && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                      {item.badge}
                    </span>
                  )}
                  <span className="absolute left-full ml-2 px-2 py-1 bg-slate-900 dark:bg-slate-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    {item.label}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent side="right" className="w-auto p-0">
                {item.popoverContent}
              </PopoverContent>
            </Popover>
          );
        }

        return (
          <button
            key={idx}
            onClick={item.onClick}
            className={cn(
              "relative p-3 rounded-xl transition-all group",
              item.bgHover
            )}
            title={item.label}
          >
            <Icon className={cn("w-5 h-5", item.color)} />
            {item.badge && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {item.badge}
              </span>
            )}
            <span className="absolute left-full ml-2 px-2 py-1 bg-slate-900 dark:bg-slate-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              {item.label}
            </span>
          </button>
        );
      })}

      {/* Current Date Indicator */}
      <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
        <div className="text-center px-2 py-1">
          <div className="text-xs font-medium text-slate-900 dark:text-slate-100">
            {format(currentDate, 'd')}
          </div>
          <div className="text-[10px] text-slate-500">
            {format(currentDate, 'MMM')}
          </div>
        </div>
      </div>
    </div>
  );
}