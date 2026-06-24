import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, parseISO, isWithinInterval, setHours, setMinutes } from 'date-fns';

const WORK_HOURS = Array.from({ length: 12 }, (_, i) => i + 7); // 7am to 6pm

export default function WorkWeekView({ events = [], selectedDate, onDateChange, onEventClick }) {
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday
  const workDays = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i)); // Mon-Fri

  const getEventsForDayAndHour = (day, hour) => {
    return events.filter(event => {
      const eventStart = typeof event.start_date === 'string' 
        ? parseISO(event.start_date) 
        : event.start_date;
      const eventEnd = typeof event.end_date === 'string' 
        ? parseISO(event.end_date) 
        : event.end_date;

      const dayStart = setHours(setMinutes(day, 0), hour);
      const dayEnd = setHours(setMinutes(day, 59), hour);

      return isWithinInterval(eventStart, { start: dayStart, end: dayEnd }) ||
             isWithinInterval(dayEnd, { start: dayStart, end: dayEnd }) ||
             (eventStart <= dayStart && eventEnd >= dayEnd);
    });
  };

  const previousWeek = () => {
    onDateChange(addDays(selectedDate, -7));
  };

  const nextWeek = () => {
    onDateChange(addDays(selectedDate, 7));
  };

  return (
    <div>
      {/* Week Navigation */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-800">
          {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 4), 'MMM d, yyyy')}
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={previousWeek}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => onDateChange(new Date())}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={nextWeek}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Work Week Grid */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Header - Days */}
            <div className="grid grid-cols-6 border-b bg-slate-50">
              <div className="p-3 text-sm font-medium text-slate-500">Time</div>
              {workDays.map((day, index) => {
                const isToday = isSameDay(day, new Date());
                return (
                  <div
                    key={index}
                    className={`p-3 text-center border-l ${
                      isToday ? 'bg-teal-50' : ''
                    }`}
                  >
                    <div className="text-xs text-slate-500 uppercase">
                      {format(day, 'EEE')}
                    </div>
                    <div className={`text-lg font-bold ${
                      isToday ? 'text-teal-600' : 'text-slate-800'
                    }`}>
                      {format(day, 'd')}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Time Slots */}
            <div className="divide-y">
              {WORK_HOURS.map((hour) => (
                <div key={hour} className="grid grid-cols-6">
                  {/* Time Label */}
                  <div className="p-2 text-sm text-slate-500 flex items-start">
                    <Clock className="w-3 h-3 mr-1 mt-0.5" />
                    {format(setHours(new Date(), hour), 'ha')}
                  </div>

                  {/* Day Cells */}
                  {workDays.map((day, dayIndex) => {
                    const dayEvents = getEventsForDayAndHour(day, hour);
                    const isToday = isSameDay(day, new Date());

                    return (
                      <div
                        key={dayIndex}
                        className={`min-h-[60px] p-1 border-l ${
                          isToday ? 'bg-teal-50/30' : 'bg-white'
                        } hover:bg-slate-50 transition-colors`}
                      >
                        {dayEvents.map((event, eventIndex) => (
                          <button
                            key={eventIndex}
                            onClick={() => onEventClick(event)}
                            className="w-full text-left p-1.5 mb-1 rounded bg-blue-100 hover:bg-blue-200 border-l-2 border-blue-600 transition-colors"
                          >
                            <p className="text-xs font-medium text-blue-900 truncate">
                              {event.title}
                            </p>
                            <p className="text-xs text-blue-700">
                              {event.start_date && format(parseISO(event.start_date), 'h:mm a')}
                            </p>
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}