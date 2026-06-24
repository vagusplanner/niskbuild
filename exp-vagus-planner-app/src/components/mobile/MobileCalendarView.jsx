import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { motion, AnimatePresence } from 'framer-motion';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MobileBottomSheet from './MobileBottomSheet';
import EventForm from '@/components/calendar/EventForm';

export default function MobileCalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => SDK.entities.Event.list('-start_date')
  });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getEventsForDay = (day) => {
    return events.filter(event => {
      if (!event.start_date) return false;
      return isSameDay(new Date(event.start_date), day);
    });
  };

  const selectedDayEvents = getEventsForDay(selectedDate);

  return (
    <>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-safe">
        {/* Header */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 safe-area-top">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {format(currentDate, 'MMMM yyyy')}
              </h1>
              <Button
                onClick={() => setShowNewEvent(true)}
                className="rounded-full h-10 w-10 p-0 bg-teal-600 hover:bg-teal-700"
              >
                <Plus className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCurrentDate(new Date());
                  setSelectedDate(new Date());
                }}
              >
                Today
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="p-4">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
              <div key={i} className="text-center text-xs font-medium text-slate-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => {
              const dayEvents = getEventsForDay(day);
              const isSelected = isSameDay(day, selectedDate);
              const isCurrentDay = isToday(day);

              return (
                <motion.button
                  key={day.toString()}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.01 }}
                  onClick={() => setSelectedDate(day)}
                  className={`aspect-square rounded-xl p-1 transition-all relative ${
                    isSelected
                      ? 'bg-teal-600 text-white shadow-lg scale-105'
                      : isCurrentDay
                      ? 'bg-teal-50 dark:bg-teal-950 text-teal-600 border border-teal-300'
                      : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="text-sm font-medium">
                    {format(day, 'd')}
                  </div>
                  {dayEvents.length > 0 && (
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                      {dayEvents.slice(0, 3).map((_, i) => (
                        <div
                          key={i}
                          className={`w-1 h-1 rounded-full ${
                            isSelected ? 'bg-white' : 'bg-teal-600'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Events */}
        <div className="px-4 pb-4">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
            {format(selectedDate, 'EEEE, MMMM d')}
          </h3>
          
          <AnimatePresence mode="wait">
            {selectedDayEvents.length > 0 ? (
              <div className="space-y-2">
                {selectedDayEvents.map((event, index) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => setSelectedEvent(event)}
                    className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-slate-200 dark:border-slate-800 active:scale-[0.98] transition-transform"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-1 h-12 bg-teal-600 rounded-full" />
                      <div className="flex-1">
                        <h4 className="font-medium text-slate-900 dark:text-slate-100">
                          {event.title}
                        </h4>
                        <p className="text-sm text-slate-500">
                          {format(new Date(event.start_date), 'h:mm a')}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8 text-slate-500"
              >
                No events scheduled
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* New Event Bottom Sheet */}
      <MobileBottomSheet
        isOpen={showNewEvent}
        onClose={() => setShowNewEvent(false)}
        title="New Event"
        snapPoints={[0.9]}
      >
        <EventForm
          isOpen={true}
          onClose={() => setShowNewEvent(false)}
          onSave={() => setShowNewEvent(false)}
          selectedDate={selectedDate}
        />
      </MobileBottomSheet>

      {/* Event Details Bottom Sheet */}
      <MobileBottomSheet
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        title="Event Details"
        snapPoints={[0.7, 0.9]}
      >
        {selectedEvent && (
          <EventForm
            isOpen={true}
            event={selectedEvent}
            onClose={() => setSelectedEvent(null)}
            onSave={() => setSelectedEvent(null)}
          />
        )}
      </MobileBottomSheet>
    </>
  );
}