import React from 'react';
import { format, startOfWeek, endOfWeek, addDays, isSameDay, isToday, startOfMonth, endOfMonth, isSameMonth } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Clock, MapPin } from 'lucide-react';

import { eventChipStyle } from '@/lib/event-chip-colors';

const PRIORITY_STYLES = {
  high: 'ring-2 ring-red-400 shadow-lg',
  medium: 'ring-1 ring-yellow-300',
  low: 'opacity-90'
};

export default function MultiWeekView({ currentDate, events = [], onEventClick, weekStartsOn = 1, weeksToShow = 4, eventColorMode = {} }) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  
  // Generate weeks to display
  const weeks = [];
  let weekStart = startOfWeek(monthStart, { weekStartsOn });
  
  for (let i = 0; i < weeksToShow; i++) {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn });
    const days = [];
    let day = weekStart;
    
    while (day <= weekEnd) {
      days.push(new Date(day));
      day = addDays(day, 1);
    }
    
    weeks.push({ start: weekStart, end: weekEnd, days });
    weekStart = addDays(weekEnd, 1);
  }

  const getEventsForDay = (date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start_date);
      return isSameDay(eventDate, date);
    }).sort((a, b) => {
      const timeA = new Date(a.start_date).getTime();
      const timeB = new Date(b.start_date).getTime();
      return timeA - timeB;
    });
  };

  return (
    <div className="space-y-6">
      {weeks.map((week, weekIdx) => (
        <Card key={weekIdx} className="p-4 border-2 border-slate-200 dark:border-slate-700">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400">
              Week {weekIdx + 1}: {format(week.start, 'MMM d')} - {format(week.end, 'MMM d')}
            </h3>
          </div>
          
          <div className="grid grid-cols-7 gap-2">
            {/* Day headers */}
            {week.days.map((day, dayIdx) => (
              <div key={dayIdx} className="text-center pb-2 border-b border-slate-200 dark:border-slate-700">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {format(day, 'EEE')}
                </div>
                <div className={cn(
                  "text-sm font-semibold mt-1",
                  isToday(day) && "text-teal-600 dark:text-teal-400",
                  !isSameMonth(day, currentDate) && "text-slate-400",
                  isSameMonth(day, currentDate) && !isToday(day) && "text-slate-700 dark:text-slate-300"
                )}>
                  {format(day, 'd')}
                </div>
              </div>
            ))}
            
            {/* Day cells with events */}
            {week.days.map((day, dayIdx) => {
              const dayEvents = getEventsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              
              return (
                <div 
                  key={dayIdx} 
                  className={cn(
                    "min-h-[120px] p-2 rounded-lg transition-all",
                    isToday(day) && "bg-teal-50 dark:bg-teal-950/30 ring-2 ring-teal-500/50",
                    !isCurrentMonth && "bg-slate-50 dark:bg-slate-900/50 opacity-60"
                  )}
                >
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((event, idx) => {
                      const priorityStyle = PRIORITY_STYLES[event.priority] || '';
                      
                      return (
                        <button
                          key={idx}
                          onClick={() => onEventClick?.(event)}
                          className={cn(
                            "w-full text-left p-2 rounded-md ring-1 ring-black/5 transition-all hover:scale-105",
                            priorityStyle,
                            "cursor-pointer group"
                          )}
                          style={eventChipStyle(event, eventColorMode)}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold truncate">
                                {event.title}
                              </p>
                              {!event.is_all_day && (
                                <div className="flex items-center gap-1 mt-1">
                                  <Clock className="w-3 h-3 opacity-80" />
                                  <span className="text-[10px] opacity-90">
                                    {format(new Date(event.start_date), 'HH:mm')}
                                  </span>
                                </div>
                              )}
                            </div>
                            {event.priority === 'high' && (
                              <span className="text-[10px] bg-red-600 text-white px-1 py-0.5 rounded font-bold">!</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                    
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 text-center py-1">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}