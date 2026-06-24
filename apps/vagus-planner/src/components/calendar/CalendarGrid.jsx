import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, isToday, isWithinInterval, getDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { toHijri } from '@/components/utils/hijriUtils';
import { base44 } from '@/api/base44Client';

function CalendarGrid({ 
  currentDate, 
  selectedDate, 
  onDateSelect, 
  events = [],
  weekStartsOn = 1,
  periods = [],
  predictedPeriodDays = []
}) {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    base44.entities.Task.list('-due_date', 100).then(taskList => {
      setTasks(taskList.filter(t => t.due_date && t.status !== 'completed'));
    }).catch(() => setTasks([]));
  }, []);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn });

  const days = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  if (weekStartsOn === 0) {
    weekDays.unshift(weekDays.pop());
  }

  const getEventsForDay = (date) => {
    return events.filter(event => 
      isSameDay(new Date(event.date), date)
    );
  };

  const getTasksForDay = (date) => {
    return tasks.filter(task => 
      task.due_date && isSameDay(new Date(task.due_date), date)
    );
  };

  const isPeriodDay = (date) => {
    return periods.some(period => {
      const start = new Date(period.start_date);
      const end = period.end_date ? new Date(period.end_date) : addDays(start, 5);
      return isWithinInterval(date, { start, end });
    });
  };

  const isPredictedPeriodDay = (date) => {
    return predictedPeriodDays.some(d => isSameDay(d, date));
  };

  const getFastingTypes = (date) => {
    const hijri = toHijri(date);
    const dayOfWeek = getDay(date);
    const types = [];

    // Ramadan (month 9)
    if (hijri.month === 9) {
      types.push('ramadan');
    }

    // Monday (1) or Thursday (4)
    if (dayOfWeek === 1 || dayOfWeek === 4) {
      types.push('mondayThursday');
    }

    // White Days (13, 14, 15 of Hijri month)
    if (hijri.day === 13 || hijri.day === 14 || hijri.day === 15) {
      types.push('whiteDays');
    }

    return types;
  };

  const categoryColors = {
    work: 'bg-blue-500',
    personal: 'bg-emerald-500',
    health: 'bg-rose-500',
    prayer: 'bg-violet-500',
    holiday: 'bg-amber-500',
    family: 'bg-pink-500',
    social: 'bg-cyan-500',
    other: 'bg-slate-500'
  };

  const fastingColors = {
    ramadan: 'bg-emerald-500',
    mondayThursday: 'bg-blue-500',
    whiteDays: 'bg-purple-500'
  };

  return (
    <div className="select-none">
      {/* Week day headers */}
      <div className="grid grid-cols-7 mb-2">
        {weekDays.map(dayName => (
          <div 
            key={dayName} 
            className="text-center text-sm font-medium text-slate-400 py-2"
          >
            {dayName}
          </div>
        ))}
      </div>

      {/* Calendar days */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((dayItem, index) => {
          const dayEvents = getEventsForDay(dayItem);
          const dayTasks = getTasksForDay(dayItem);
          const isCurrentMonth = isSameMonth(dayItem, currentDate);
          const isSelected = selectedDate && isSameDay(dayItem, selectedDate);
          const isTodayDate = isToday(dayItem);
          const hasPeriod = isPeriodDay(dayItem);
          const hasPredictedPeriod = isPredictedPeriodDay(dayItem);
          const hijriDate = toHijri(dayItem);
          const fastingTypes = getFastingTypes(dayItem);

          return (
            <motion.button
              key={dayItem.toString()}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.01 }}
              onClick={() => onDateSelect(dayItem)}
              className={cn(
                "aspect-square p-1 rounded-xl transition-all relative group",
                "hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50",
                !isCurrentMonth && "opacity-30",
                hasPeriod && !isSelected && "bg-rose-100 hover:bg-rose-200",
                hasPredictedPeriod && !hasPeriod && !isSelected && "bg-rose-50 border border-rose-200 border-dashed",
                isSelected && "bg-emerald-500 text-white hover:bg-emerald-600",
                isTodayDate && !isSelected && !hasPeriod && "ring-2 ring-emerald-500"
              )}
            >
              <div className="flex flex-col items-center justify-center h-full">
                <div className={cn(
                  "text-sm font-medium",
                  isSelected ? "text-white" : hasPeriod ? "text-rose-700 font-bold" : isTodayDate ? "text-emerald-600" : "text-slate-700"
                )}>
                  {format(dayItem, 'd')}
                </div>
                
                {/* Hijri date */}
                <div className={cn(
                  "text-[10px] mt-0.5",
                  isSelected ? "text-white/80" : "text-violet-600/70"
                )}>
                  {hijriDate.day}
                </div>
              </div>
              
              {/* Event & Task indicators */}
              {(dayEvents.length > 0 || dayTasks.length > 0) && (
                <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex gap-0.5">
                  {dayEvents.slice(0, 2).map((event, i) => (
                    <div 
                      key={`event-${i}`}
                      className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        isSelected ? "bg-white/80" : categoryColors[event.category] || 'bg-slate-400'
                      )}
                    />
                  ))}
                  {dayTasks.slice(0, 2).map((task, i) => (
                    <div 
                      key={`task-${i}`}
                      className={cn(
                        "w-1.5 h-1.5 rounded-sm",
                        isSelected ? "bg-white/80" : "bg-emerald-500"
                      )}
                    />
                  ))}
                </div>
              )}

              {/* Fasting day indicators */}
              {fastingTypes.length > 0 && (
                <div className="absolute top-1 right-1 flex gap-0.5">
                  {fastingTypes.map((type, i) => (
                    <div 
                      key={i}
                      className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        isSelected ? "bg-white/80" : fastingColors[type]
                      )}
                      title={type === 'ramadan' ? 'Ramadan' : type === 'mondayThursday' ? 'Monday/Thursday' : 'White Days'}
                    />
                  ))}
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

export default CalendarGrid;