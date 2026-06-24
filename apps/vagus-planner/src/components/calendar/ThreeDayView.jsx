import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, addDays, isSameDay } from 'date-fns';
import { Clock, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ThreeDayView({ currentDate, events, onEventClick, onDateClick }) {
  const days = [currentDate, addDays(currentDate, 1), addDays(currentDate, 2)];

  const getEventsForDay = (day) => {
    return events.filter(event => 
      isSameDay(new Date(event.start_date), day)
    ).sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
  };

  const categoryColors = {
    work: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300',
    personal: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300',
    health: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300',
    prayer: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300',
    family: 'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-950 dark:text-pink-300',
    social: 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-300'
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {days.map((day, dayIndex) => {
        const dayEvents = getEventsForDay(day);
        const isToday = isSameDay(day, new Date());

        return (
          <motion.div
            key={day.toISOString()}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: dayIndex * 0.1 }}
          >
            <Card className={`p-4 h-full ${isToday ? 'ring-2 ring-teal-500 dark:ring-teal-400' : ''}`}>
              <div className="mb-4">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  {format(day, 'EEEE')}
                  {isToday && (
                    <Badge className="ml-2 bg-teal-500">Today</Badge>
                  )}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {format(day, 'MMMM d, yyyy')}
                </p>
              </div>

              <div className="space-y-2">
                {dayEvents.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-slate-400 dark:text-slate-500">No events scheduled</p>
                    <button
                      onClick={() => onDateClick?.(day)}
                      className="text-xs text-teal-600 hover:text-teal-700 mt-2"
                    >
                      + Add event
                    </button>
                  </div>
                ) : (
                  dayEvents.map((event, index) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: dayIndex * 0.1 + index * 0.05 }}
                      onClick={() => onEventClick?.(event)}
                      className={`p-3 rounded-lg border-l-4 cursor-pointer transition-all hover:shadow-md ${
                        categoryColors[event.category] || categoryColors.personal
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm mb-1 truncate">
                            {event.title}
                          </h4>
                          <div className="flex items-center gap-2 text-xs">
                            <Clock className="w-3 h-3" />
                            <span>
                              {event.is_all_day ? 'All day' : format(new Date(event.start_date), 'h:mm a')}
                            </span>
                          </div>
                          {event.location && (
                            <div className="flex items-center gap-2 text-xs mt-1">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate">{event.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
                </p>
              </div>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}