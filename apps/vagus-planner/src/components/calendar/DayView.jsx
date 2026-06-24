import React, { useState, useEffect } from 'react';
import { format, isSameDay, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Clock, MapPin } from 'lucide-react';
import { toHijri } from '@/components/utils/hijriUtils';
import HabitCalendarOverlay from '@/components/habits/HabitCalendarOverlay';

export default function DayView({ currentDate, events = [], onEventClick, showFastingDays = true }) {
  const [hijriDate, setHijriDate] = useState(null);

  useEffect(() => {
    toHijri(currentDate).then(setHijriDate);
  }, [currentDate]);
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getEventsForHour = (hour) => {
    return events.filter(event => {
      if (event.is_all_day) return false;
      const eventDate = new Date(event.start_date);
      const eventHour = eventDate.getHours();
      return isSameDay(eventDate, currentDate) && eventHour === hour;
    });
  };

  const getAllDayEvents = () => {
    return events.filter(event => {
      const eventDate = new Date(event.start_date);
      return event.is_all_day && isSameDay(eventDate, currentDate);
    });
  };

  const categoryColors = {
    work: 'bg-blue-50 text-blue-900 border-l-blue-500',
    personal: 'bg-emerald-50 text-emerald-900 border-l-emerald-500',
    health: 'bg-rose-50 text-rose-900 border-l-rose-500',
    prayer: 'bg-violet-50 text-violet-900 border-l-violet-500',
    holiday: 'bg-amber-50 text-amber-900 border-l-amber-500',
    family: 'bg-pink-50 text-pink-900 border-l-pink-500',
    social: 'bg-cyan-50 text-cyan-900 border-l-cyan-500',
    other: 'bg-slate-50 text-slate-900 border-l-slate-500'
  };

  const allDayEvents = getAllDayEvents();

  return (
    <div className="overflow-auto h-[700px] border rounded-xl bg-white">
      {/* Header */}
      <div className="sticky top-0 bg-white z-10 border-b p-4">
        <h2 className="text-2xl font-bold text-slate-800">
          {format(currentDate, 'EEEE, MMMM d, yyyy')}
        </h2>
        {hijriDate && (
          <div className="mt-2 flex items-center gap-3">
            <div className="text-sm text-emerald-600 font-medium">
              {hijriDate.day} {hijriDate.monthName} {hijriDate.year} AH
            </div>
            {showFastingDays && (
              <div className="flex gap-2">
                {[1, 4].includes(currentDate.getDay()) && (
                  <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">
                    🌙 Recommended fasting
                  </span>
                )}
                {hijriDate.day >= 13 && hijriDate.day <= 15 && (
                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                    🤍 White Days
                  </span>
                )}
                {hijriDate.monthName === 'Ramadan' && (
                  <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded">
                    ⭐ Ramadan
                  </span>
                )}
              </div>
            )}
          </div>
        )}
        <div className="mt-3">
          <HabitCalendarOverlay date={currentDate} />
        </div>
      </div>

      {/* All-day events */}
      {allDayEvents.length > 0 && (
        <div className="border-b bg-slate-50 p-4">
          <div className="text-sm font-medium text-slate-600 mb-3">All Day</div>
          <div className="space-y-2">
            {allDayEvents.map(event => (
              <button
                key={event.id}
                onClick={() => onEventClick(event)}
                className={cn(
                  "w-full p-3 rounded-lg text-left border-l-4 transition-all hover:scale-[1.01]",
                  categoryColors[event.category] || categoryColors.other
                )}
              >
                <div className="font-semibold">{event.title}</div>
                {event.location && (
                  <div className="text-sm mt-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {event.location}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Time slots */}
      <div>
        {hours.map(hour => {
          const hourEvents = getEventsForHour(hour);
          return (
            <div key={hour} className="grid grid-cols-[80px_1fr] border-b hover:bg-slate-50">
              <div className="p-4 text-sm text-slate-500 border-r text-right font-medium">
                {format(new Date().setHours(hour, 0), 'h:mm a')}
              </div>
              <div className="p-4 space-y-2">
                {hourEvents.map(event => (
                  <button
                    key={event.id}
                    onClick={() => onEventClick(event)}
                    className={cn(
                      "w-full p-3 rounded-lg text-left border-l-4 transition-all hover:scale-[1.01]",
                      categoryColors[event.category] || categoryColors.other
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-semibold">{event.title}</div>
                      <div className="text-sm text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(parseISO(event.start_date), 'h:mm a')}
                        {event.end_date && ` - ${format(parseISO(event.end_date), 'h:mm a')}`}
                      </div>
                    </div>
                    {event.location && (
                      <div className="text-sm flex items-center gap-1 text-slate-600">
                        <MapPin className="w-3 h-3" />
                        {event.location}
                      </div>
                    )}
                    {event.description && (
                      <div className="text-sm text-slate-600 mt-1 line-clamp-2">
                        {event.description}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}