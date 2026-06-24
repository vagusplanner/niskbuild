import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { Calendar, MapPin, Clock } from 'lucide-react';

export default function CalendarAgendaView({ events = [], onEventClick = () => {}, currentMonth = new Date() }) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const eventsByDate = daysInMonth.map(day => ({
    date: day,
    events: events.filter(event => {
      if (!event.start_date) return false;
      try {
        return isSameDay(parseISO(event.start_date), day);
      } catch {
        return false;
      }
    }).sort((a, b) => {
      const timeA = a.start_date ? new Date(a.start_date).getTime() : 0;
      const timeB = b.start_date ? new Date(b.start_date).getTime() : 0;
      return timeA - timeB;
    })
  })).filter(day => day.events.length > 0);

  if (eventsByDate.length === 0) {
    return (
      <Card className="bg-white">
        <CardContent className="py-12 text-center">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No events scheduled for {format(currentMonth, 'MMMM yyyy')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {eventsByDate.map(({ date, events }) => (
        <Card key={date.toISOString()} className="bg-white">
          <CardHeader className="pb-3 bg-gradient-to-r from-teal-50 to-cyan-50">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-teal-600" />
              {format(date, 'EEEE, MMMM d, yyyy')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3">
              {events.map(event => (
                <button
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  className="w-full text-left p-4 rounded-lg border hover:border-teal-300 hover:bg-teal-50/50 transition-all"
                  style={{
                    borderLeftWidth: '4px',
                    borderLeftColor: event.color || '#14b8a6'
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-800">{event.title}</h3>
                        <Badge variant="outline" className="text-xs">
                          {event.category}
                        </Badge>
                      </div>
                      
                      {event.description && (
                        <p className="text-sm text-slate-600 mb-2">{event.description}</p>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                       {!event.is_all_day && event.start_date && event.end_date && (
                         <div className="flex items-center gap-1">
                           <Clock className="w-3 h-3" />
                           {(() => {
                             try {
                               return `${format(parseISO(event.start_date), 'h:mm a')} - ${format(parseISO(event.end_date), 'h:mm a')}`;
                             } catch {
                               return 'Invalid time';
                             }
                           })()}
                         </div>
                       )}
                        {event.is_all_day && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            All day
                          </div>
                        )}
                        {event.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {event.location}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}