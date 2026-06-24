import React, { useState, useEffect, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, isToday } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Clock, GripVertical, Star, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { toHijri } from '@/components/utils/hijriUtils';
import HabitCalendarOverlay from '@/components/habits/HabitCalendarOverlay';
import { useQuery } from '@tanstack/react-query';

const CATEGORY_COLORS = {
  work: 'bg-blue-100 border-blue-500 text-blue-900 dark:bg-blue-900 dark:text-blue-100',
  personal: 'bg-emerald-100 border-emerald-500 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100',
  health: 'bg-rose-100 border-rose-500 text-rose-900 dark:bg-rose-900 dark:text-rose-100',
  prayer: 'bg-violet-100 border-violet-500 text-violet-900 dark:bg-violet-900 dark:text-violet-100',
  holiday: 'bg-amber-100 border-amber-500 text-amber-900 dark:bg-amber-900 dark:text-amber-100',
  family: 'bg-pink-100 border-pink-500 text-pink-900 dark:bg-pink-900 dark:text-pink-100',
  social: 'bg-cyan-100 border-cyan-500 text-cyan-900 dark:bg-cyan-900 dark:text-cyan-100',
  other: 'bg-slate-100 border-slate-500 text-slate-900 dark:bg-slate-700 dark:text-slate-100'
};

export default function DraggableEventGrid({ 
  currentDate, 
  events = [], 
  onEventMove, 
  onEventClick,
  onDayClick,
  weekStartsOn = 1,
  showFastingDays = true
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [hijriDates, setHijriDates] = useState({});
  const [isMobile, setIsMobile] = useState(false);

  // Journal dots — fetch once
  const { data: journalEntries = [] } = useQuery({
    queryKey: ['reflections'],
    staleTime: 60_000,
  });
  const journalDotMap = React.useMemo(() => {
    const map = {};
    const MOOD_COLORS = {
      joyful: '#22c55e', grateful: '#f59e0b', peaceful: '#38bdf8', hopeful: '#a78bfa',
      anxious: '#f97316', sad: '#94a3b8', frustrated: '#ef4444', reflective: '#8b5cf6',
      motivated: '#10b981', tired: '#6b7280'
    };
    journalEntries.forEach(e => { map[e.date] = MOOD_COLORS[e.mood] || '#E8B84B'; });
    return map;
  }, [journalEntries]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn });

  const days = [];
  let day = calendarStart;
  const seenDays = new Set();
  while (day <= calendarEnd) {
    const key = format(day, 'yyyy-MM-dd');
    if (!seenDays.has(key)) {
      seenDays.add(key);
      days.push(day);
    }
    day = addDays(day, 1);
  }

  // Load Hijri dates for all visible days
  useEffect(() => {
    const loadHijriDates = async () => {
      const dates = {};
      for (const d of days) {
        const hijri = await toHijri(d);
        dates[format(d, 'yyyy-MM-dd')] = hijri;
      }
      setHijriDates(dates);
    };
    loadHijriDates();
  }, [currentDate]);

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

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = (result) => {
    setIsDragging(false);
    
    if (!result.destination) {
      toast.info('Event drop cancelled');
      return;
    }
    
    const sourceDate = result.source.droppableId;
    const destDate = result.destination.droppableId;
    
    if (sourceDate === destDate) return;

    const eventId = result.draggableId;
    const event = events.find(e => e.id === eventId);
    
    if (!event) return;

    const newDate = new Date(destDate);
    const oldDate = new Date(event.start_date);
    
    // Calculate time difference
    const timeDiff = oldDate.getHours() * 60 + oldDate.getMinutes();
    newDate.setHours(Math.floor(timeDiff / 60), timeDiff % 60);
    
    // Calculate end date if multi-day event
    const duration = new Date(event.end_date).getTime() - new Date(event.start_date).getTime();
    const newEndDate = new Date(newDate.getTime() + duration);

    // Pass to parent with confirmation
    onEventMove?.(event, {
      ...event,
      start_date: newDate.toISOString(),
      end_date: newEndDate.toISOString()
    }, oldDate, newDate);
  };

  return (
    <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="bg-white dark:bg-slate-950 rounded-lg overflow-hidden">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-800">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="bg-slate-50 dark:bg-slate-900 py-2 lg:py-3 text-center">
              <span className="text-xs lg:text-sm font-semibold text-slate-600 dark:text-slate-400">
                {isMobile ? day.substring(0, 1) : day}
              </span>
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-800">
          {days.map(dayItem => {
            const dayEvents = getEventsForDay(dayItem);
            const isCurrentMonth = isSameMonth(dayItem, currentDate);
            const isTodayDate = isToday(dayItem);
            const dateKey = format(dayItem, 'yyyy-MM-dd');

            return (
              <Droppable key={dateKey} droppableId={dateKey}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    onClick={() => {
                      if (isMobile && onDayClick && !isDragging) {
                        onDayClick(dayItem);
                      }
                    }}
                    className={cn(
                      "min-h-[85px] lg:min-h-[140px] bg-white dark:bg-slate-950 p-1.5 lg:p-2 transition-all relative",
                      !isCurrentMonth && "bg-slate-50 dark:bg-slate-900 opacity-60",
                      isTodayDate && "ring-2 ring-inset ring-teal-500",
                      snapshot.isDraggingOver && "bg-teal-50 dark:bg-teal-950 ring-2 ring-teal-400 shadow-inner",
                      isMobile && "cursor-pointer active:bg-slate-50 dark:active:bg-slate-800"
                    )}
                  >
                    {snapshot.isDraggingOver && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-xs font-semibold text-teal-600 dark:text-teal-400 bg-white dark:bg-slate-900 px-3 py-1 rounded-full shadow-lg border-2 border-teal-500">
                          Drop here
                        </div>
                      </div>
                    )}
                    {/* Date Number & Hijri */}
                    <div className="mb-1 lg:mb-2">
                      <div className={cn(
                        "text-base lg:text-sm font-semibold",
                        isTodayDate ? "text-teal-600 dark:text-teal-400" : "text-slate-700 dark:text-slate-300"
                      )}>
                        {format(dayItem, 'd')}
                      </div>
                      {hijriDates[dateKey] && isCurrentMonth && (
                        <div className="text-[9px] lg:text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                          {hijriDates[dateKey].day}
                        </div>
                      )}
                    </div>

                    {/* Fasting Indicators */}
                    {showFastingDays && isCurrentMonth && hijriDates[dateKey] && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {[1, 4].includes(dayItem.getDay()) && (
                          <span className="text-[10px] px-1 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 rounded" title="Recommended fasting day">
                            🌙
                          </span>
                        )}
                        {hijriDates[dateKey].day >= 13 && hijriDates[dateKey].day <= 15 && (
                          <span className="text-[10px] px-1 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded" title="White Days (13-15)">
                            🤍
                          </span>
                        )}
                        {hijriDates[dateKey].monthName === 'Ramadan' && (
                          <span className="text-[10px] px-1 py-0.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 rounded" title="Ramadan">
                            ⭐
                          </span>
                        )}
                      </div>
                    )}

                    {/* Events */}
                    <div className="space-y-0.5 lg:space-y-1">
                      {dayEvents.slice(0, isMobile ? 2 : 4).map((event, index) => {
                        const categoryStyle = CATEGORY_COLORS[event.category] || CATEGORY_COLORS.other;
                        
                        return (
                          <Draggable
                            key={event.id}
                            draggableId={event.id}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                onClick={(e) => {
                                  if (!isDragging && onEventClick) {
                                    e.stopPropagation();
                                    onEventClick(event);
                                  }
                                }}
                                className={cn(
                                  "group p-1.5 lg:p-2 rounded-md border-l-2 lg:border-l-4 transition-all cursor-move hover:shadow-md touch-manipulation relative overflow-hidden",
                                  categoryStyle,
                                  snapshot.isDragging && "shadow-2xl rotate-2 scale-105 ring-4 ring-teal-500/50",
                                  event.priority === 'high' && "ring-1 lg:ring-2 ring-red-400"
                                )}
                              >
                                {/* Glitter only for all-day events created within the last 24h */}
                                {event.is_all_day && event.created_date && (new Date() - new Date(event.created_date)) < 86400000 && (
                                  <span className="absolute top-0.5 right-0.5 pointer-events-none">
                                    <Sparkles className="w-3 h-3 text-yellow-400 opacity-70" />
                                  </span>
                                )}
                                <div className="flex items-start gap-0.5 lg:gap-1">
                                  <GripVertical className="hidden lg:block w-3 h-3 opacity-50 flex-shrink-0 mt-0.5" />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-1">
                                      <p className="text-xs font-semibold truncate leading-tight">
                                        {event.title}
                                      </p>
                                      {event.priority === 'high' && (
                                        <Star className="hidden lg:block w-3 h-3 text-red-600 fill-red-600 flex-shrink-0" />
                                      )}
                                    </div>
                                    {!event.is_all_day && (
                                      <div className="flex items-center gap-0.5 lg:gap-1 mt-0.5">
                                        <Clock className="w-2.5 h-2.5 lg:w-3 lg:h-3 opacity-70" />
                                        <span className="text-[9px] lg:text-[10px] opacity-80">
                                          {format(new Date(event.start_date), 'HH:mm')}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>

                    {/* Overflow indicator */}
                    {dayEvents.length > (isMobile ? 2 : 4) && (
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                        +{dayEvents.length - (isMobile ? 2 : 4)}
                      </div>
                    )}

                    {/* Journal dot */}
                    {isCurrentMonth && journalDotMap[dateKey] && (
                      <div className="flex items-center gap-1 mt-1" title="Journal entry">
                        <div
                          style={{ background: journalDotMap[dateKey] }}
                          className="w-2 h-2 rounded-full flex-shrink-0"
                        />
                        <span className="text-[9px] text-slate-400 hidden lg:inline">journal</span>
                      </div>
                    )}

                    {/* Habit overlay */}
                    {isCurrentMonth && <HabitCalendarOverlay date={dayItem} />}
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </div>
    </DragDropContext>
  );
}