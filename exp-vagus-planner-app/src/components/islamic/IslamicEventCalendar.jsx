import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { 
  ChevronLeft, ChevronRight, Star, Moon, RotateCcw
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday,
  addMonths, subMonths, addWeeks, subWeeks, addDays, subDays,
  parseISO, startOfDay, getYear
} from 'date-fns';
import IslamicEventDetailModal from './IslamicEventDetailModal';
import { useIslamicEventsForYear } from './useIslamicEventsForYear';

const EVENT_TYPE_COLORS = {
  ramadan:       { bg: 'bg-emerald-500', light: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-500' },
  eid:           { bg: 'bg-amber-500',   light: 'bg-amber-100 text-amber-800',    dot: 'bg-amber-500' },
  hajj:          { bg: 'bg-blue-500',    light: 'bg-blue-100 text-blue-800',      dot: 'bg-blue-500' },
  ashura:        { bg: 'bg-purple-500',  light: 'bg-purple-100 text-purple-800',  dot: 'bg-purple-500' },
  mawlid:        { bg: 'bg-rose-500',    light: 'bg-rose-100 text-rose-800',      dot: 'bg-rose-500' },
  sacred_month:  { bg: 'bg-teal-500',    light: 'bg-teal-100 text-teal-800',      dot: 'bg-teal-500' },
  custom:        { bg: 'bg-slate-500',   light: 'bg-slate-100 text-slate-800',    dot: 'bg-slate-500' },
};

function getColor(event) {
  return EVENT_TYPE_COLORS[event.event_type] || EVENT_TYPE_COLORS.custom;
}

function getEventsForDay(events, day) {
  return events.filter(e => {
    if (!e.gregorian_date) return false;
    try { return isSameDay(parseISO(e.gregorian_date), day); } catch { return false; }
  });
}

// ── Month Grid ───────────────────────────────────────────────────────────────
function MonthView({ current, events, onSelectEvent }) {
  const monthStart = startOfMonth(current);
  const monthEnd = endOfMonth(current);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="flex-1">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700">
        {weekDays.map(d => (
          <div key={d} className="py-2 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
            {d}
          </div>
        ))}
      </div>
      {/* Day cells */}
      <div className="grid grid-cols-7 flex-1">
        {days.map(day => {
          const dayEvents = getEventsForDay(events, day);
          const inMonth = isSameMonth(day, current);
          return (
            <div
              key={day.toISOString()}
              className={cn(
                'min-h-[90px] p-1 border-b border-r border-slate-100 dark:border-slate-800',
                !inMonth && 'bg-slate-50/50 dark:bg-slate-900/30'
              )}
            >
              <span className={cn(
                'inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium mb-1',
                isToday(day) ? 'bg-teal-500 text-white' : inMonth ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-600'
              )}>
                {format(day, 'd')}
              </span>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map(event => (
                  <button
                    key={event.id}
                    onClick={() => onSelectEvent(event)}
                    className={cn(
                      'w-full text-left text-[10px] font-medium px-1.5 py-0.5 rounded truncate',
                      getColor(event).light,
                      'hover:opacity-80 transition-opacity'
                    )}
                  >
                    {event.title}
                  </button>
                ))}
                {dayEvents.length > 3 && (
                  <span className="text-[10px] text-slate-400 px-1">+{dayEvents.length - 3} more</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Week View ────────────────────────────────────────────────────────────────
function WeekView({ current, events, onSelectEvent }) {
  const weekStart = startOfWeek(current, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });

  return (
    <div className="flex-1">
      <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700">
        {days.map(day => (
          <div key={day.toISOString()} className="py-3 text-center border-r border-slate-100 dark:border-slate-800 last:border-r-0">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{format(day, 'EEE')}</p>
            <span className={cn(
              'inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold mt-1',
              isToday(day) ? 'bg-teal-500 text-white' : 'text-slate-800 dark:text-slate-200'
            )}>
              {format(day, 'd')}
            </span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 min-h-[400px]">
        {days.map(day => {
          const dayEvents = getEventsForDay(events, day);
          return (
            <div key={day.toISOString()} className={cn(
              'p-2 border-r border-slate-100 dark:border-slate-800 last:border-r-0 space-y-1',
              isToday(day) && 'bg-teal-50/40 dark:bg-teal-950/20'
            )}>
              {dayEvents.map(event => (
                <button
                  key={event.id}
                  onClick={() => onSelectEvent(event)}
                  className={cn(
                    'w-full text-left text-xs font-medium px-2 py-1.5 rounded-lg',
                    getColor(event).light,
                    'hover:opacity-80 transition-opacity'
                  )}
                >
                  <span className="block truncate">{event.title}</span>
                  <span className="text-[10px] opacity-70 capitalize">{event.event_type?.replace('_', ' ')}</span>
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Day View ─────────────────────────────────────────────────────────────────
function DayView({ current, events, onSelectEvent }) {
  const dayEvents = getEventsForDay(events, current);

  return (
    <div className="flex-1 p-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          {format(current, 'EEEE, MMMM d, yyyy')}
        </h3>
        {isToday(current) && (
          <Badge className="bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300 text-xs mt-1">Today</Badge>
        )}
      </div>
      {dayEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Moon className="w-10 h-10 mb-3 opacity-40" />
          <p className="text-sm">No Islamic events today</p>
        </div>
      ) : (
        <div className="space-y-3">
          {dayEvents.map(event => (
            <button
              key={event.id}
              onClick={() => onSelectEvent(event)}
              className={cn(
                'w-full text-left p-4 rounded-xl border transition-all hover:shadow-md',
                'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn('w-3 h-3 rounded-full mt-1 flex-shrink-0', getColor(event).dot)} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 dark:text-slate-100">{event.title}</p>
                  {event.description && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{event.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs capitalize">
                      {event.event_type?.replace('_', ' ')}
                    </Badge>
                    {event.is_recurring && (
                      <span className="text-xs text-slate-400">Recurring yearly</span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function IslamicEventCalendar() {
  const [view, setView] = useState('month');
  const [current, setCurrent] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);

  const { data: rawEvents = [], isLoading } = useQuery({
    queryKey: ['islamicEvents'],
    queryFn: () => SDK.entities.IslamicEvent.list('-gregorian_date', 200),
  });

  const targetYear = getYear(current);
  const { expandedEvents: events, isComputing } = useIslamicEventsForYear(rawEvents, targetYear);

  const navigate = (dir) => {
    if (view === 'month') setCurrent(dir > 0 ? addMonths(current, 1) : subMonths(current, 1));
    else if (view === 'week') setCurrent(dir > 0 ? addWeeks(current, 1) : subWeeks(current, 1));
    else setCurrent(dir > 0 ? addDays(current, 1) : subDays(current, 1));
  };

  const title = useMemo(() => {
    if (view === 'month') return format(current, 'MMMM yyyy');
    if (view === 'week') {
      const ws = startOfWeek(current, { weekStartsOn: 1 });
      return `${format(ws, 'MMM d')} – ${format(addDays(ws, 6), 'MMM d, yyyy')}`;
    }
    return format(current, 'EEEE, MMMM d, yyyy');
  }, [view, current]);

  const upcomingCount = events.filter(e => {
    try { return e.gregorian_date && parseISO(e.gregorian_date) >= startOfDay(new Date()); } catch { return false; }
  }).length;

  return (
    <div className="flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/40 dark:to-emerald-950/40">
        <div className="flex items-center gap-2">
          <Moon className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          <span className="font-semibold text-slate-800 dark:text-slate-100">Islamic Events</span>
          {upcomingCount > 0 && (
            <Badge className="bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300 text-xs">
              {upcomingCount} upcoming
            </Badge>
          )}
          {isComputing && (
            <RotateCcw className="w-3.5 h-3.5 text-teal-400 animate-spin" />
          )}
        </div>
        {/* View switcher */}
        <div className="flex items-center gap-1 bg-white dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
          {['month', 'week', 'day'].map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                'px-3 py-1 text-xs font-medium rounded-md transition-all capitalize',
                view === v
                  ? 'bg-teal-500 text-white shadow'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 dark:border-slate-800">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-400" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</span>
          <button
            onClick={() => setCurrent(new Date())}
            className="text-xs text-teal-600 dark:text-teal-400 hover:underline"
          >
            Today
          </button>
        </div>
        <button
          onClick={() => navigate(1)}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-400" />
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 px-4 py-2 border-b border-slate-100 dark:border-slate-800">
        {Object.entries(EVENT_TYPE_COLORS).filter(([k]) => k !== 'custom').map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className={cn('w-2 h-2 rounded-full', color.dot)} />
            <span className="text-[11px] text-slate-500 dark:text-slate-400 capitalize">{type.replace('_', ' ')}</span>
          </div>
        ))}
      </div>

      {/* Calendar body */}
      {isLoading || isComputing ? (
        <div className="flex items-center justify-center h-64 text-slate-400">
          <Star className="w-6 h-6 animate-spin mr-2" />
          Loading events…
        </div>
      ) : (
        <>
          {view === 'month' && <MonthView current={current} events={events} onSelectEvent={setSelectedEvent} />}
          {view === 'week' && <WeekView current={current} events={events} onSelectEvent={setSelectedEvent} />}
          {view === 'day'  && <DayView  current={current} events={events} onSelectEvent={setSelectedEvent} />}
        </>
      )}

      {/* Event detail modal */}
      {selectedEvent && (
        <IslamicEventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </div>
  );
}