import React from 'react';
import { format, addHours, startOfDay, isSameHour, parse } from 'date-fns';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Plus, X } from 'lucide-react';
import { motion } from 'framer-motion';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

const CATEGORY_COLORS = {
  work: 'bg-blue-500',
  personal: 'bg-emerald-500',
  health: 'bg-rose-500',
  prayer: 'bg-violet-500',
  holiday: 'bg-amber-500',
  family: 'bg-pink-500',
  social: 'bg-cyan-500',
  other: 'bg-slate-500'
};

export default function DayHourlyView({ 
  selectedDate, 
  events = [],
  onAddEvent,
  onEditEvent,
  onClose
}) {
  const dayStart = startOfDay(selectedDate);
  
  const getEventsForHour = (hour) => {
    return events.filter(event => {
      const eventStart = new Date(event.start_date);
      return eventStart.getHours() === hour;
    });
  };

  const handleHourClick = (hour) => {
    const date = addHours(dayStart, hour);
    onAddEvent(date);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-teal-50 to-cyan-50">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold text-slate-800">
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-sm text-slate-600">
            Click on any hour to add an event
          </p>
        </div>

        {/* Hourly Timeline */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-1">
            {HOURS.map(hour => {
              const hourEvents = getEventsForHour(hour);
              const timeLabel = format(addHours(dayStart, hour), 'h:mm a');
              
              return (
                <div key={hour} className="flex gap-3">
                  {/* Time Label */}
                  <div className="w-20 flex-shrink-0 text-right pt-1">
                    <span className="text-sm font-medium text-slate-600">
                      {timeLabel}
                    </span>
                  </div>

                  {/* Hour Slot */}
                  <div className="flex-1 min-h-[60px] relative">
                    <button
                      onClick={() => handleHourClick(hour)}
                      className="absolute inset-0 border-2 border-dashed border-slate-200 rounded-lg hover:border-teal-300 hover:bg-teal-50/50 transition-all group"
                    >
                      <Plus className="w-4 h-4 text-slate-400 group-hover:text-teal-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>

                    {/* Events in this hour */}
                    {hourEvents.length > 0 && (
                      <div className="relative z-10 space-y-1 p-1">
                        {hourEvents.map(event => {
                          const colorClass = CATEGORY_COLORS[event.category] || CATEGORY_COLORS.other;
                          return (
                            <motion.div
                              key={event.id}
                              initial={{ scale: 0.95, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              className={`${colorClass} bg-opacity-90 rounded-lg p-3 cursor-pointer hover:bg-opacity-100 transition-all shadow-sm hover:shadow-md`}
                              onClick={() => onEditEvent(event)}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-white text-sm truncate">
                                    {event.title}
                                  </h4>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-white/90 flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {format(new Date(event.start_date), 'h:mm a')} - {format(new Date(event.end_date), 'h:mm a')}
                                    </span>
                                  </div>
                                  {event.location && (
                                    <span className="text-xs text-white/80 flex items-center gap-1 mt-1">
                                      <MapPin className="w-3 h-3" />
                                      {event.location}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-slate-600">
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-teal-500"></div>
                {events.length} events today
              </span>
            </div>
            <Button onClick={onClose} variant="outline">
              Back to Month View
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}