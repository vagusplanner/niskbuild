import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Plus, ChevronLeft, ChevronRight, Calendar, List,
  Shield, Moon
} from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, parseISO, addMonths,
  subMonths, addWeeks, subWeeks, startOfWeek as startOfWk, endOfWeek as endOfWk
} from 'date-fns';
import { cn } from '@/lib/utils';
import { useRoleAccess } from '@/components/auth/useRoleAccess';
import IslamicEditionGate from '@/components/auth/IslamicEditionGate';
import MosqueEventForm from '@/components/islamic/mosque/MosqueEventForm';
import MosqueEventCard from '@/components/islamic/mosque/MosqueEventCard';

const CATEGORY_DOT = {
  jumua: 'bg-emerald-400', iftar: 'bg-indigo-400', eid: 'bg-amber-400',
  lecture: 'bg-blue-400', quran: 'bg-teal-400', hajj: 'bg-purple-400',
  youth: 'bg-orange-400', charity: 'bg-rose-400', other: 'bg-slate-400',
};

const CATEGORY_EMOJI = {
  jumua: '🕌', iftar: '🌙', eid: '✨', lecture: '📚', quran: '📖',
  hajj: '🕋', youth: '⭐', charity: '❤️', other: '📌',
};

function MonthCalendar({ events, today, currentDate, user, isAdmin, onDayClick, selectedDay }) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const eventsOnDay = (day) =>
    events.filter(e => e.start_datetime && isSameDay(parseISO(e.start_datetime), day));

  return (
    <div className="rounded-2xl border border-amber-100 dark:border-amber-800/30 overflow-hidden bg-white dark:bg-slate-900">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-amber-100 dark:border-amber-800/30">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
          <div key={d} className={cn(
            'py-2 text-center text-[11px] font-bold uppercase tracking-wide',
            d === 'Fri' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
          )}>
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {days.map(day => {
          const dayEvents = eventsOnDay(day);
          const isToday = isSameDay(day, today);
          const isSelected = selectedDay && isSameDay(day, selectedDay);
          const inMonth = isSameMonth(day, currentDate);
          const isFriday = day.getDay() === 5;

          return (
            <button
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
              className={cn(
                'min-h-[80px] p-1.5 border-b border-r border-slate-100 dark:border-slate-800 text-left transition-colors hover:bg-amber-50 dark:hover:bg-amber-950/20 flex flex-col',
                !inMonth && 'opacity-30',
                isSelected && 'bg-amber-50 dark:bg-amber-950/30',
                isFriday && inMonth && 'bg-emerald-50/40 dark:bg-emerald-950/10'
              )}
            >
              <div className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mb-1 self-end',
                isToday
                  ? 'bg-amber-500 text-white shadow-sm'
                  : isFriday && inMonth
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-600 dark:text-slate-400'
              )}>
                {format(day, 'd')}
              </div>
              <div className="flex-1 space-y-0.5 w-full overflow-hidden">
                {dayEvents.slice(0, 3).map(e => (
                  <div
                    key={e.id}
                    className={cn(
                      'flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium truncate',
                      CATEGORY_DOT[e.category]?.replace('bg-', 'bg-').replace('400', '100'),
                      'text-slate-700 dark:text-slate-300'
                    )}
                  >
                    <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', CATEGORY_DOT[e.category] || 'bg-slate-400')} />
                    <span className="truncate">{e.title}</span>
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <p className="text-[10px] text-slate-400 pl-1">+{dayEvents.length - 3} more</p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WeekCalendar({ events, today, currentDate, user, isAdmin, onDayClick, selectedDay }) {
  const weekStart = startOfWk(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWk(currentDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const eventsOnDay = (day) =>
    events.filter(e => e.start_datetime && isSameDay(parseISO(e.start_datetime), day));

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map(day => {
        const dayEvents = eventsOnDay(day);
        const isToday = isSameDay(day, today);
        const isFriday = day.getDay() === 5;
        const isSelected = selectedDay && isSameDay(day, selectedDay);

        return (
          <div
            key={day.toISOString()}
            className={cn(
              'rounded-2xl border p-3 min-h-[140px] flex flex-col gap-2 transition-colors cursor-pointer',
              isToday
                ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20'
                : isFriday
                ? 'border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/40 dark:bg-emerald-950/10'
                : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/40',
              isSelected && 'ring-2 ring-amber-400'
            )}
            onClick={() => onDayClick(day)}
          >
            <div className="text-center">
              <p className={cn('text-[10px] font-bold uppercase', isFriday ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400')}>
                {format(day, 'EEE')}
              </p>
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center mx-auto mt-0.5 text-sm font-black',
                isToday ? 'bg-amber-500 text-white' : 'text-slate-700 dark:text-slate-300'
              )}>
                {format(day, 'd')}
              </div>
            </div>
            <div className="flex-1 space-y-1">
              {dayEvents.map(e => (
                <div key={e.id} className={cn('rounded-lg px-2 py-1 text-[10px] font-semibold flex items-center gap-1 truncate',
                  CATEGORY_DOT[e.category]?.replace('400', '100') || 'bg-slate-100',
                  'text-slate-700 dark:text-slate-300'
                )}>
                  <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', CATEGORY_DOT[e.category])} />
                  <span className="truncate">{e.title}</span>
                </div>
              ))}
              {dayEvents.length === 0 && (
                <p className="text-[10px] text-slate-300 dark:text-slate-600 text-center pt-2">—</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MosqueCommunityCalendarContent() {
  const [view, setView] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const today = new Date();

  const { isAdmin, user } = useRoleAccess();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['mosqueEvents'],
    queryFn: () => base44.entities.MosqueEvent.list('-start_datetime', 200),
    refetchInterval: 15000
  });

  const nav = (dir) => {
    if (view === 'month') setCurrentDate(dir > 0 ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    else setCurrentDate(dir > 0 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
  };

  const periodLabel = view === 'month'
    ? format(currentDate, 'MMMM yyyy')
    : `${format(startOfWk(currentDate, { weekStartsOn: 1 }), 'd MMM')} – ${format(endOfWk(currentDate, { weekStartsOn: 1 }), 'd MMM yyyy')}`;

  const selectedDayEvents = selectedDay
    ? events.filter(e => e.start_datetime && isSameDay(parseISO(e.start_datetime), selectedDay))
    : [];

  const upcomingEvents = events
    .filter(e => e.start_datetime && parseISO(e.start_datetime) >= today)
    .sort((a, b) => parseISO(a.start_datetime) - parseISO(b.start_datetime))
    .slice(0, 5);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-safe">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🕌</span>
            <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">Community Calendar</h1>
            <Badge className="bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700 gap-1 text-xs">
              <Shield className="w-3 h-3" /> Enterprise Islamic
            </Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Mosque events, Jumu'ah, Iftars, study circles & more
          </p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 font-bold gap-2 shadow-lg shadow-amber-300/20"
          >
            <Plus className="w-4 h-4" /> Create Event
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-3 space-y-4">
          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => nav(-1)}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              <h2 className="font-black text-slate-900 dark:text-slate-100 min-w-36 text-center">{periodLabel}</h2>
              <button
                onClick={() => nav(1)}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-amber-300 text-amber-600 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 transition-colors ml-1"
              >
                Today
              </button>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
              <button
                onClick={() => setView('month')}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all', view === 'month' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-slate-100' : 'text-slate-500')}
              >
                <Calendar className="w-3.5 h-3.5" /> Month
              </button>
              <button
                onClick={() => setView('week')}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all', view === 'week' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-slate-100' : 'text-slate-500')}
              >
                <List className="w-3.5 h-3.5" /> Week
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="h-80 flex items-center justify-center text-slate-400">
              <div className="animate-spin w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full" />
            </div>
          ) : view === 'month' ? (
            <MonthCalendar
              events={events} today={today} currentDate={currentDate}
              user={user} isAdmin={isAdmin}
              onDayClick={setSelectedDay} selectedDay={selectedDay}
            />
          ) : (
            <WeekCalendar
              events={events} today={today} currentDate={currentDate}
              user={user} isAdmin={isAdmin}
              onDayClick={setSelectedDay} selectedDay={selectedDay}
            />
          )}

          {/* Selected day events */}
          {selectedDay && selectedDayEvents.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300">
                📅 {format(selectedDay, 'EEEE, d MMMM')} — {selectedDayEvents.length} event{selectedDayEvents.length > 1 ? 's' : ''}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedDayEvents.map(e => (
                  <MosqueEventCard key={e.id} event={e} user={user} isAdmin={isAdmin} />
                ))}
              </div>
            </div>
          )}
          {selectedDay && selectedDayEvents.length === 0 && (
            <div className="text-center py-6 text-slate-400">
              <p className="text-sm">No events on {format(selectedDay, 'd MMMM')}.</p>
              {isAdmin && (
                <button onClick={() => setShowForm(true)} className="text-xs text-amber-500 hover:underline mt-1">
                  + Create one
                </button>
              )}
            </div>
          )}
        </div>

        {/* Sidebar: upcoming events */}
        <div className="space-y-4">
          <div>
            <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <Moon className="w-4 h-4 text-amber-500" /> Coming Up
            </h3>
            {upcomingEvents.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <p className="text-xs">No upcoming events.</p>
                {isAdmin && (
                  <button onClick={() => setShowForm(true)} className="text-xs text-amber-500 hover:underline mt-1">Create an event</button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map(e => (
                  <MosqueEventCard key={e.id} event={e} user={user} isAdmin={isAdmin} />
                ))}
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="rounded-2xl border border-slate-100 dark:border-slate-800 p-4 bg-white dark:bg-slate-900">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Categories</p>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(CATEGORY_EMOJI).map(([cat, emoji]) => (
                <div key={cat} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <div className={cn('w-2 h-2 rounded-full flex-shrink-0', CATEGORY_DOT[cat])} />
                  <span>{emoji} {cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Event creation modal */}
      {showForm && (
        <MosqueEventForm
          onClose={() => setShowForm(false)}
          defaultDate={selectedDay}
          user={user}
        />
      )}
    </div>
  );
}

export default function MosqueCommunityCalendar() {
  return (
    <IslamicEditionGate>
      <MosqueCommunityCalendarContent />
    </IslamicEditionGate>
  );
}