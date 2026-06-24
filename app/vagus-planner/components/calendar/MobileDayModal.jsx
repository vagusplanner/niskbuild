import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, isSameDay } from 'date-fns';
import { Clock, MapPin, Calendar, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MobileDayModal({ isOpen, onClose, date, events, onEventClick, onAddEvent }) {
  if (!date) return null;

  const sortedEvents = [...events].sort((a, b) => 
    new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
  );

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] p-0 gap-0">
        <DialogHeader className="p-4 pb-3 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">
                {format(date, 'EEEE')}
              </DialogTitle>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {format(date, 'MMMM d, yyyy')}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-full"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 p-4">
          {sortedEvents.length > 0 ? (
            <div className="space-y-3">
              {sortedEvents.map((event) => (
                <button
                  key={event.id}
                  onClick={() => {
                    onEventClick(event);
                    onClose();
                  }}
                  className="w-full text-left p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-600 transition-all bg-white dark:bg-slate-800 touch-manipulation"
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-1 h-full rounded-full flex-shrink-0",
                      categoryColors[event.category] || 'bg-slate-500'
                    )} />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base text-slate-900 dark:text-slate-100 mb-1 truncate">
                        {event.title}
                      </h3>
                      
                      {!event.is_all_day && event.start_date && (
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mb-1">
                          <Clock className="w-4 h-4 flex-shrink-0" />
                          <span>
                            {format(new Date(event.start_date), 'h:mm a')} - {format(new Date(event.end_date), 'h:mm a')}
                          </span>
                        </div>
                      )}
                      
                      {event.location && (
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mb-2">
                          <MapPin className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      )}

                      {event.description && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-2">
                          {event.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs capitalize">
                          {event.category}
                        </Badge>
                        {event.is_all_day && (
                          <Badge variant="outline" className="text-xs">
                            All Day
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400 mb-4">
                No events scheduled
              </p>
              <Button
                onClick={() => {
                  onAddEvent();
                  onClose();
                }}
                className="bg-teal-600 hover:bg-teal-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Event
              </Button>
            </div>
          )}
        </div>

        {sortedEvents.length > 0 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-700">
            <Button
              onClick={() => {
                onAddEvent();
                onClose();
              }}
              className="w-full bg-teal-600 hover:bg-teal-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Event to {format(date, 'MMM d')}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}