import React, { useState, useEffect } from 'react';
import { format, startOfWeek, addDays, isSameDay, isToday, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Clock } from 'lucide-react';
import { toHijri } from '@/components/utils/hijriUtils';
import HabitCalendarOverlay from '@/components/habits/HabitCalendarOverlay';

export default function WeekView({ currentDate, events = [], onEventClick, weekStartsOn = 1, showFastingDays = true }) {
  const [hijriDates, setHijriDates] = useState({});
  const weekStart = startOfWeek(currentDate, { weekStartsOn });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  
  const hours = Array.from({ length: 24 }, (_, i) => i);

  useEffect(() => {
    const loadHijriDates = async () => {
      const dates = {};
      for (const d of weekDays) {
        const hijri = await toHijri(d);
        dates[format(d, 'yyyy-MM-dd')] = hijri;
      }
      setHijriDates(dates);
    };
    loadHijriDates();
  }, [currentDate]);

  const getEventsForDayAndHour = (day, hour) => {
    return events.filter(event => {
      if (event.is_all_day) return false;
      const eventDate = new Date(event.start_date);
      const eventHour = eventDate.getHours();
      return isSameDay(eventDate, day) && eventHour === hour;
    });
  };

  const getAllDayEvents = (day) => {
    return events.filter(event => {
      const eventDate = new Date(event.start_date);
      return event.is_all_day && isSameDay(eventDate, day);
    });
  };

  const categoryColors = {
    work: 'bg-blue-100 text-blue-800 border-blue-300',
    personal: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    health: 'bg-rose-100 text-rose-800 border-rose-300',
    prayer: 'bg-violet-100 text-violet-800 border-violet-300',
    holiday: 'bg-amber-100 text-amber-800 border-amber-300',
    family: 'bg-pink-100 text-pink-800 border-pink-300',
    social: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    other: 'bg-slate-100 text-slate-800 border-slate-300'
  };

  return (
    <div className="overflow-auto h-[600px] border rounded-xl bg-white">
      {/* Header with days */}
      <div className="sticky top-0 bg-white z-10 border-b grid grid-cols-[60px_repeat(7,1fr)]">
        <div className="border-r" />
        {weekDays.map(day => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const hijri = hijriDates[dateKey];
          return (
            <div
              key={day.toString()}
              className={cn(
                "p-3 text-center border-r",
                isToday(day) && "bg-emerald-50"
              )}
            >
              <div className="text-xs text-slate-500 font-medium">
                {format(day, 'EEE')}
              </div>
              <div className={cn(
                "text-lg font-semibold mt-1",
                isToday(day) ? "text-emerald-600" : "text-slate-700"
              )}>
                {format(day, 'd')}
              </div>
              {hijri && (
                <div className="text-[10px] text-emerald-600 font-medium">
                  {hijri.day}
                </div>
              )}
              {showFastingDays && hijri && (
                <div className="flex justify-center gap-1 mt-1">
                  {[1, 4].includes(day.getDay()) && (
                    <span className="text-xs" title="Fasting">🌙</span>
                  )}
                  {hijri.day >= 13 && hijri.day <= 15 && (
                    <span className="text-xs" title="White Days">🤍</span>
                  )}
                  {hijri.monthName === 'Ramadan' && (
                    <span className="text-xs" title="Ramadan">⭐</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* All-day events row */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b bg-slate-50">
        <div className="p-2 text-xs text-slate-500 border-r flex items-center justify-center">
          All Day
        </div>
        {weekDays.map(day => {
          const allDayEvents = getAllDayEvents(day);
          return (
            <div key={day.toString()} className="p-2 border-r min-h-[60px] relative">
              {allDayEvents.map(event => (
                <button
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  className={cn(
                    "w-full p-1.5 rounded text-xs mb-1 text-left border",
                    categoryColors[event.category] || categoryColors.other
                  )}
                >
                  <div className="font-medium truncate">{event.title}</div>
                </button>
              ))}
              <div className="absolute bottom-1 left-1 right-1">
                <HabitCalendarOverlay date={day} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      {hours.map(hour => (
        <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b hover:bg-slate-50">
          <div className="p-2 text-xs text-slate-500 border-r text-right">
            {format(new Date().setHours(hour, 0), 'h a')}
          </div>
          {weekDays.map(day => {
            const hourEvents = getEventsForDayAndHour(day, hour);
            return (
              <div key={day.toString()} className="p-2 border-r min-h-[60px] relative">
                {hourEvents.map(event => (
                  <button
                    key={event.id}
                    onClick={() => onEventClick(event)}
                    className={cn(
                      "w-full p-1.5 rounded text-xs mb-1 text-left border",
                      categoryColors[event.category] || categoryColors.other
                    )}
                  >
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span className="font-medium">{format(parseISO(event.start_date), 'h:mm a')}</span>
                    </div>
                    <div className="truncate">{event.title}</div>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}