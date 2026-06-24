import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, isToday, startOfDay } from 'date-fns';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Clock, MapPin, Moon } from 'lucide-react';

export default function EnhancedCalendarGrid({ 
  currentDate, 
  selectedDate, 
  onDateSelect, 
  events = [],
  onEventDrop,
  weekStartsOn = 1,
  showFastingDays = true,
  onDayClick
}) {
  const [draggedEvent, setDraggedEvent] = useState(null);
  const [dragOverDate, setDragOverDate] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
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
    const dayEvents = events.filter(event => {
      const eventDate = startOfDay(new Date(event.start_date));
      return isSameDay(eventDate, startOfDay(date));
    });
    
    // Remove duplicates by event title and start time to avoid showing recurring events multiple times
    const uniqueEvents = [];
    const seen = new Set();
    
    for (const event of dayEvents) {
      // Create unique key based on title, category, and time
      const eventTime = event.start_date ? new Date(event.start_date).toTimeString().substring(0, 5) : 'allday';
      const key = `${event.title}-${event.category}-${eventTime}`;
      
      if (!seen.has(key)) {
        seen.add(key);
        uniqueEvents.push(event);
      }
    }
    
    return uniqueEvents;
  };

  // Check if a date is a recommended fasting day (Monday or Thursday)
  const isFastingDay = (date) => {
    if (!showFastingDays) return false;
    const dayOfWeek = date.getDay();
    return dayOfWeek === 1 || dayOfWeek === 4; // Monday or Thursday
  };

  // Check if there's already a fasting event on this day
  const hasFastingEvent = (date) => {
    const dayEvents = getEventsForDay(date);
    return dayEvents.some(event => 
      event.category === 'prayer' && 
      (event.title?.includes('Fasting') || event.title?.includes('🌙'))
    );
  };

  // Convert Gregorian date to Hijri
  const gregorianToHijri = (date) => {
    const gYear = date.getFullYear();
    const gMonth = date.getMonth() + 1;
    const gDay = date.getDate();
    
    // Simple Hijri conversion algorithm (approximate)
    const julianDay = Math.floor((1461 * (gYear + 4800 + Math.floor((gMonth - 14) / 12))) / 4) +
                      Math.floor((367 * (gMonth - 2 - 12 * Math.floor((gMonth - 14) / 12))) / 12) -
                      Math.floor((3 * Math.floor((gYear + 4900 + Math.floor((gMonth - 14) / 12)) / 100)) / 4) +
                      gDay - 32075;
    
    const hijriJD = julianDay - 1948440 + 1;
    const hijriYear = Math.floor((30 * hijriJD + 10646) / 10631);
    const hijriMonth = Math.ceil((hijriJD - Math.floor((11 * hijriYear + 3) / 30) * 354) / 29.5);
    const hijriDay = hijriJD - Math.floor((11 * hijriYear + 3) / 30) * 354 - Math.floor((hijriMonth - 1) * 29.5) + 1;
    
    return {
      year: hijriYear,
      month: hijriMonth > 12 ? hijriMonth - 12 : hijriMonth,
      day: Math.floor(hijriDay)
    };
  };

  // Check if date is a white day (13th, 14th, 15th of Hijri month)
  const isWhiteDay = (date) => {
    if (!showFastingDays) return false;
    const hijri = gregorianToHijri(date);
    return hijri.day === 13 || hijri.day === 14 || hijri.day === 15;
  };

  // Check if date is in Ramadan
  const isRamadan = (date) => {
    if (!showFastingDays) return false;
    const hijri = gregorianToHijri(date);
    return hijri.month === 9; // Ramadan is 9th month
  };

  const handleDragStart = (e, event) => {
    setDraggedEvent(event);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, date) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDate(date);
  };

  const handleDragLeave = () => {
    setDragOverDate(null);
  };

  const handleDrop = (e, targetDate) => {
    e.preventDefault();
    if (draggedEvent && onEventDrop) {
      onEventDrop(draggedEvent, targetDate);
    }
    setDraggedEvent(null);
    setDragOverDate(null);
  };

  const categoryColors = {
    work: 'bg-blue-500 hover:bg-blue-600',
    personal: 'bg-emerald-500 hover:bg-emerald-600',
    health: 'bg-rose-500 hover:bg-rose-600',
    prayer: 'bg-violet-500 hover:bg-violet-600',
    holiday: 'bg-amber-500 hover:bg-amber-600',
    family: 'bg-pink-500 hover:bg-pink-600',
    social: 'bg-cyan-500 hover:bg-cyan-600',
    other: 'bg-slate-500 hover:bg-slate-600'
  };

  return (
    <div className="select-none">
      {/* Week day headers */}
      <div className="grid grid-cols-7 mb-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
        {weekDays.map(dayName => (
          <div 
            key={dayName} 
            className="text-center text-base lg:text-sm font-semibold text-slate-700 dark:text-slate-300 py-3"
          >
            {dayName}
          </div>
        ))}
      </div>

      {/* Calendar days */}
      <div className="grid grid-cols-7 gap-1 lg:gap-2">
        {days.map((dayItem) => {
          const dayEvents = getEventsForDay(dayItem);
          const isCurrentMonth = isSameMonth(dayItem, currentDate);
          const isSelected = selectedDate && isSameDay(dayItem, selectedDate);
          const isTodayDate = isToday(dayItem);
          const isDragOver = dragOverDate && isSameDay(dragOverDate, dayItem);
          const isFasting = isFastingDay(dayItem) && !hasFastingEvent(dayItem);
          const isWhiteMoonDay = isWhiteDay(dayItem) && !hasFastingEvent(dayItem);
          const isRamadanDay = isRamadan(dayItem);

          return (
            <div
              key={dayItem.toString()}
              onDragOver={(e) => handleDragOver(e, dayItem)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, dayItem)}
              className={cn(
                "min-h-[90px] lg:min-h-[120px] p-1.5 lg:p-2 rounded-lg lg:rounded-xl transition-all border-2",
                !isCurrentMonth && "opacity-40 bg-slate-50",
                isCurrentMonth && !isFasting && !isWhiteMoonDay && !isRamadanDay && "bg-white hover:bg-slate-50",
                isCurrentMonth && isFasting && !isWhiteMoonDay && !isRamadanDay && "bg-gradient-to-br from-purple-50/60 to-pink-50/40 hover:from-purple-50 hover:to-pink-50",
                isCurrentMonth && isWhiteMoonDay && !isRamadanDay && "bg-gradient-to-br from-blue-50/70 to-indigo-50/50 hover:from-blue-50 hover:to-indigo-50",
                isCurrentMonth && isRamadanDay && "bg-gradient-to-br from-amber-50/80 to-yellow-50/60 hover:from-amber-50 hover:to-yellow-50 border-amber-300",
                isSelected && "ring-2 ring-emerald-500",
                isTodayDate && !isSelected && "border-emerald-400",
                isFasting && !isSelected && !isTodayDate && !isRamadanDay && "border-purple-200",
                isWhiteMoonDay && !isSelected && !isTodayDate && !isRamadanDay && "border-blue-200",
                isDragOver && "bg-emerald-50 border-emerald-400 border-dashed",
                !isDragOver && !isFasting && !isWhiteMoonDay && !isRamadanDay && "border-transparent"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <button
                  onClick={() => {
                    if (isMobile && onDayClick) {
                      onDayClick(dayItem);
                    } else {
                      onDateSelect(dayItem);
                    }
                  }}
                  className={cn(
                    "w-9 h-9 lg:w-8 lg:h-8 rounded-full flex items-center justify-center text-base lg:text-sm font-medium transition-colors touch-manipulation",
                    isSelected && "bg-emerald-500 text-white",
                    isTodayDate && !isSelected && "bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-bold",
                    !isSelected && !isTodayDate && "hover:bg-slate-100 dark:hover:bg-slate-700"
                  )}
                >
                  {format(dayItem, 'd')}
                </button>
                {isRamadanDay && (
                  <div className="flex items-center gap-0.5">
                    <span className="text-lg" title="Ramadan">🌙</span>
                    <span className="text-xs font-bold text-amber-600">R</span>
                  </div>
                )}
                {!isRamadanDay && isWhiteMoonDay && (
                  <Moon className="w-3.5 h-3.5 text-blue-500 animate-pulse" title="White Days (13th, 14th, 15th Hijri)" />
                )}
                {!isRamadanDay && !isWhiteMoonDay && isFasting && (
                  <Moon className="w-3 h-3 text-purple-500 animate-pulse" title="Recommended fasting day (Monday/Thursday)" />
                )}
              </div>

              {/* Events list */}
              <div className="space-y-0.5 lg:space-y-1">
                {dayEvents.slice(0, 2).map((event) => (
                  <motion.div
                    key={event.id}
                    draggable={!event.is_recurring}
                    onDragStart={(e) => handleDragStart(e, event)}
                    whileHover={{ scale: 1.02 }}
                    className={cn(
                      "p-1 rounded-md lg:rounded-lg text-white text-xs cursor-move truncate touch-manipulation",
                      categoryColors[event.category] || 'bg-slate-500',
                      event.is_recurring && "cursor-not-allowed opacity-70"
                    )}
                    title={event.is_recurring ? "Recurring events cannot be dragged" : "Drag to reschedule"}
                  >
                    <div className="flex items-center gap-0.5 lg:gap-1">
                      {!event.is_all_day && event.start_date && (
                        <Clock className="hidden lg:block w-3 h-3 flex-shrink-0" />
                      )}
                      <span className="truncate font-medium text-xs leading-tight">{event.title}</span>
                    </div>
                  </motion.div>
                ))}
                {dayEvents.length > 2 && (
                  <div className="text-xs text-slate-500 dark:text-slate-400 pl-1 font-medium">
                    +{dayEvents.length - 2}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}