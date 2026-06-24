import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  format, addDays, addWeeks, addMonths, subDays, subWeeks, subMonths,
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, isToday, isSameMonth, parseISO
} from 'date-fns';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft, ChevronRight, Calendar, Clock, MapPin,
  AlertTriangle, Sparkles, CheckSquare, Moon, RefreshCw,
  Loader2, CheckCircle2, X
} from 'lucide-react';
import { toHijri } from '@/components/utils/hijriUtils';
import ConflictResolutionModal from './ConflictResolutionModal';
import { toast } from 'sonner';

// ─── helpers ─────────────────────────────────────────────────────────────────

const CAT_COLORS = {
  work:     { bg: 'bg-blue-100 dark:bg-blue-900/40',     text: 'text-blue-800 dark:text-blue-200',     border: 'border-l-blue-500',   dot: 'bg-blue-500' },
  personal: { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-800 dark:text-emerald-200', border: 'border-l-emerald-500', dot: 'bg-emerald-500' },
  health:   { bg: 'bg-rose-100 dark:bg-rose-900/40',     text: 'text-rose-800 dark:text-rose-200',     border: 'border-l-rose-500',   dot: 'bg-rose-500' },
  prayer:   { bg: 'bg-violet-100 dark:bg-violet-900/40', text: 'text-violet-800 dark:text-violet-200', border: 'border-l-violet-500', dot: 'bg-violet-500' },
  holiday:  { bg: 'bg-amber-100 dark:bg-amber-900/40',   text: 'text-amber-800 dark:text-amber-200',   border: 'border-l-amber-500',  dot: 'bg-amber-500' },
  family:   { bg: 'bg-pink-100 dark:bg-pink-900/40',     text: 'text-pink-800 dark:text-pink-200',     border: 'border-l-pink-500',   dot: 'bg-pink-500' },
  social:   { bg: 'bg-cyan-100 dark:bg-cyan-900/40',     text: 'text-cyan-800 dark:text-cyan-200',     border: 'border-l-cyan-500',   dot: 'bg-cyan-500' },
  other:    { bg: 'bg-slate-100 dark:bg-slate-800',      text: 'text-slate-800 dark:text-slate-200',   border: 'border-l-slate-400',  dot: 'bg-slate-400' },
};

const TASK_PRIORITY = {
  urgent: 'bg-red-100 text-red-700 border-l-red-500',
  high:   'bg-orange-100 text-orange-700 border-l-orange-500',
  medium: 'bg-yellow-100 text-yellow-700 border-l-yellow-500',
  low:    'bg-slate-100 text-slate-600 border-l-slate-400',
};

function catStyle(cat) { return CAT_COLORS[cat] || CAT_COLORS.other; }

function formatTime(isoStr) {
  if (!isoStr) return '';
  try { return format(parseISO(isoStr), 'h:mm a'); } catch { return ''; }
}

/** Detect overlapping timed events on a single day */
function detectDayConflicts(dayEvents) {
  const timed = dayEvents.filter(e => !e.is_all_day && e.start_date && e.end_date);
  const conflicting = new Set();
  for (let i = 0; i < timed.length; i++) {
    for (let j = i + 1; j < timed.length; j++) {
      const s1 = new Date(timed[i].start_date), e1 = new Date(timed[i].end_date);
      const s2 = new Date(timed[j].start_date), e2 = new Date(timed[j].end_date);
      if (s1 < e2 && e1 > s2) {
        conflicting.add(timed[i].id);
        conflicting.add(timed[j].id);
      }
    }
  }
  return conflicting;
}

// ─── sub-components ───────────────────────────────────────────────────────────

function EventPill({ event, conflicting, onClick, compact = false }) {
  const s = catStyle(event.category);
  return (
    <button
      onClick={() => onClick(event)}
      className={cn(
        'w-full text-left rounded-lg border-l-4 transition-all hover:opacity-90 hover:shadow-sm',
        compact ? 'px-1.5 py-0.5' : 'px-2 py-1.5',
        s.bg, s.text, s.border,
        conflicting && 'ring-2 ring-orange-400 ring-offset-1'
      )}
    >
      <div className={cn('font-medium truncate flex items-center gap-1', compact ? 'text-[11px]' : 'text-xs')}>
        {conflicting && <AlertTriangle className="w-2.5 h-2.5 text-orange-500 flex-shrink-0" />}
        {event.is_all_day ? '🌙 ' : ''}{event.title}
      </div>
      {!compact && !event.is_all_day && event.start_date && (
        <div className="text-[10px] opacity-70 flex items-center gap-0.5 mt-0.5">
          <Clock className="w-2.5 h-2.5" />
          {formatTime(event.start_date)}{event.end_date ? ` – ${formatTime(event.end_date)}` : ''}
        </div>
      )}
    </button>
  );
}

function TaskPill({ task, compact = false }) {
  const cls = TASK_PRIORITY[task.priority] || TASK_PRIORITY.medium;
  return (
    <div className={cn(
      'rounded-lg border-l-4 text-left',
      compact ? 'px-1.5 py-0.5' : 'px-2 py-1.5',
      cls
    )}>
      <div className={cn('flex items-center gap-1 font-medium truncate', compact ? 'text-[11px]' : 'text-xs')}>
        <CheckSquare className={cn('flex-shrink-0', compact ? 'w-2.5 h-2.5' : 'w-3 h-3')} />
        {task.title}
      </div>
    </div>
  );
}

function FastingBadge({ hijri, dayOfWeek, compact = false }) {
  if (!hijri) return null;
  const tags = [];
  if (hijri.month === 9) tags.push({ label: 'Ramadan', icon: '⭐', cls: 'bg-indigo-100 text-indigo-700' });
  if (dayOfWeek === 1 || dayOfWeek === 4) tags.push({ label: compact ? 'M/T' : 'Mon/Thu', icon: '🌙', cls: 'bg-purple-100 text-purple-700' });
  if (hijri.day >= 13 && hijri.day <= 15) tags.push({ label: compact ? 'WD' : 'White Days', icon: '🤍', cls: 'bg-sky-100 text-sky-700' });
  if (tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-0.5">
      {tags.map((t, i) => (
        <span key={i} className={cn('text-[10px] px-1 rounded font-medium', t.cls)}>
          {t.icon} {!compact && t.label}
        </span>
      ))}
    </div>
  );
}

// ─── MONTH VIEW ───────────────────────────────────────────────────────────────

function MonthView({ currentDate, events, tasks, conflicts, onEventClick, onConflictClick, weekStartsOn = 1, hijriCache }) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const headers = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  if (weekStartsOn === 0) { headers.unshift(headers.pop()); }

  return (
    <div className="select-none">
      <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700">
        {headers.map(h => (
          <div key={h} className="py-2 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            {h}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 auto-rows-fr border-l border-t border-slate-200 dark:border-slate-700">
        {days.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayEvents = events.filter(e => e.start_date && isSameDay(parseISO(e.start_date), day));
          const dayTasks = tasks.filter(t => t.due_date && isSameDay(new Date(t.due_date), day));
          const conflictSet = detectDayConflicts(dayEvents);
          const hasConflict = conflictSet.size > 0;
          const hijri = hijriCache[dateKey];
          const inMonth = isSameMonth(day, currentDate);
          const today = isToday(day);
          const dayConflicts = conflicts.filter(c => c.conflict_date === dateKey);

          return (
            <div
              key={dateKey}
              className={cn(
                'min-h-[100px] p-1.5 border-r border-b border-slate-200 dark:border-slate-700 transition-colors',
                !inMonth && 'bg-slate-50/50 dark:bg-slate-900/30',
                today && 'bg-emerald-50/60 dark:bg-emerald-950/20',
                hasConflict && 'bg-orange-50/60 dark:bg-orange-950/20'
              )}
            >
              {/* Day number row */}
              <div className="flex items-start justify-between mb-1">
                <div className="flex flex-col items-center">
                  <span className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold',
                    today ? 'bg-emerald-600 text-white' : inMonth ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-600'
                  )}>
                    {format(day, 'd')}
                  </span>
                  {hijri && (
                    <span className="text-[9px] text-violet-500 dark:text-violet-400 font-medium leading-tight">
                      {hijri.day}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-0.5">
                  {hasConflict && (
                    <button onClick={() => onConflictClick(dayConflicts[0] || { conflict_date: dateKey })}
                      className="text-orange-500 hover:text-orange-700" title="Conflict!">
                      <AlertTriangle className="w-3 h-3" />
                    </button>
                  )}
                  <FastingBadge hijri={hijri} dayOfWeek={day.getDay()} compact />
                </div>
              </div>

              {/* Events */}
              <div className="space-y-0.5">
                {dayEvents.slice(0, 2).map(evt => (
                  <EventPill key={evt.id} event={evt} conflicting={conflictSet.has(evt.id)} onClick={onEventClick} compact />
                ))}
                {dayTasks.slice(0, 1).map(t => (
                  <TaskPill key={t.id} task={t} compact />
                ))}
                {(dayEvents.length + dayTasks.length > 3) && (
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 px-1">
                    +{dayEvents.length + dayTasks.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── WEEK VIEW ────────────────────────────────────────────────────────────────

function WeekViewUnified({ currentDate, events, tasks, conflicts, onEventClick, onConflictClick, weekStartsOn = 1, hijriCache }) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="overflow-auto border rounded-xl bg-white dark:bg-slate-900" style={{ maxHeight: '70vh' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 grid border-b bg-white dark:bg-slate-900" style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}>
        <div className="border-r border-slate-200 dark:border-slate-700" />
        {weekDays.map(day => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const hijri = hijriCache[dateKey];
          const today = isToday(day);
          const dayConflicts = conflicts.filter(c => c.conflict_date === dateKey);
          return (
            <div key={dateKey} className={cn('p-2 text-center border-r border-slate-200 dark:border-slate-700', today && 'bg-emerald-50 dark:bg-emerald-950/30')}>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">{format(day, 'EEE')}</div>
              <div className={cn('text-base font-bold', today ? 'text-emerald-600' : 'text-slate-700 dark:text-slate-200')}>
                {format(day, 'd')}
              </div>
              {hijri && <div className="text-[10px] text-violet-500">{hijri.day}</div>}
              <FastingBadge hijri={hijri} dayOfWeek={day.getDay()} compact />
              {dayConflicts.length > 0 && (
                <button onClick={() => onConflictClick(dayConflicts[0])} className="mt-0.5">
                  <Badge variant="outline" className="text-[9px] border-orange-400 text-orange-600 px-1 gap-0.5">
                    <AlertTriangle className="w-2.5 h-2.5" />{dayConflicts.length}
                  </Badge>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* All-day row */}
      <div className="grid border-b bg-slate-50 dark:bg-slate-800/50" style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}>
        <div className="p-1 text-[10px] text-slate-400 border-r border-slate-200 dark:border-slate-700 flex items-center justify-center">All day</div>
        {weekDays.map(day => {
          const allDay = events.filter(e => e.is_all_day && e.start_date && isSameDay(parseISO(e.start_date), day));
          const dayTasks = tasks.filter(t => t.due_date && isSameDay(new Date(t.due_date), day));
          return (
            <div key={day.toISOString()} className="p-1 border-r border-slate-200 dark:border-slate-700 space-y-0.5 min-h-[48px]">
              {allDay.map(e => <EventPill key={e.id} event={e} conflicting={false} onClick={onEventClick} compact />)}
              {dayTasks.map(t => <TaskPill key={t.id} task={t} compact />)}
            </div>
          );
        })}
      </div>

      {/* Hour rows */}
      {hours.map(hour => (
        <div key={hour} className="grid border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/40 dark:hover:bg-slate-800/30" style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}>
          <div className="p-1 text-[10px] text-slate-400 dark:text-slate-500 border-r border-slate-200 dark:border-slate-700 text-right pr-2 pt-2">
            {format(new Date().setHours(hour, 0), 'h a')}
          </div>
          {weekDays.map(day => {
            const hourEvents = events.filter(e => {
              if (e.is_all_day || !e.start_date) return false;
              const d = parseISO(e.start_date);
              return isSameDay(d, day) && d.getHours() === hour;
            });
            const conflictSet = detectDayConflicts(events.filter(e => e.start_date && isSameDay(parseISO(e.start_date), day)));
            return (
              <div key={day.toISOString()} className="p-1 border-r border-slate-200 dark:border-slate-700 space-y-0.5 min-h-[48px]">
                {hourEvents.map(e => (
                  <EventPill key={e.id} event={e} conflicting={conflictSet.has(e.id)} onClick={onEventClick} compact />
                ))}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── DAY VIEW ─────────────────────────────────────────────────────────────────

function DayViewUnified({ currentDate, events, tasks, conflicts, onEventClick, onConflictClick, hijriCache }) {
  const dateKey = format(currentDate, 'yyyy-MM-dd');
  const hijri = hijriCache[dateKey];
  const dayEvents = events.filter(e => e.start_date && isSameDay(parseISO(e.start_date), currentDate));
  const dayTasks = tasks.filter(t => t.due_date && isSameDay(new Date(t.due_date), currentDate));
  const conflictSet = detectDayConflicts(dayEvents);
  const dayConflicts = conflicts.filter(c => c.conflict_date === dateKey);
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="overflow-auto border rounded-xl bg-white dark:bg-slate-900" style={{ maxHeight: '70vh' }}>
      {/* Date header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b px-4 py-3">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              {format(currentDate, 'EEEE, MMMM d, yyyy')}
            </h2>
            {hijri && (
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm text-violet-600 dark:text-violet-400">{hijri.day} {hijri.monthName} {hijri.year} AH</span>
                <FastingBadge hijri={hijri} dayOfWeek={currentDate.getDay()} />
              </div>
            )}
          </div>
          {dayConflicts.length > 0 && (
            <button onClick={() => onConflictClick(dayConflicts[0])}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-lg text-xs font-medium text-orange-700 hover:bg-orange-100 transition-colors">
              <AlertTriangle className="w-3.5 h-3.5" />
              {dayConflicts.length} conflict{dayConflicts.length > 1 ? 's' : ''} — Fix with AI
            </button>
          )}
        </div>
      </div>

      {/* All-day + tasks */}
      {(dayEvents.some(e => e.is_all_day) || dayTasks.length > 0) && (
        <div className="border-b bg-slate-50 dark:bg-slate-800/50 p-3 space-y-1.5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">All Day & Tasks</p>
          {dayEvents.filter(e => e.is_all_day).map(e => (
            <EventPill key={e.id} event={e} conflicting={conflictSet.has(e.id)} onClick={onEventClick} />
          ))}
          {dayTasks.map(t => <TaskPill key={t.id} task={t} />)}
        </div>
      )}

      {/* Hourly grid */}
      {hours.map(hour => {
        const hourEvents = dayEvents.filter(e => !e.is_all_day && e.start_date && parseISO(e.start_date).getHours() === hour);
        return (
          <div key={hour} className={cn('grid border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/40 dark:hover:bg-slate-800/20', hourEvents.length > 0 && 'bg-white dark:bg-slate-900')} style={{ gridTemplateColumns: '72px 1fr' }}>
            <div className="p-3 text-xs text-slate-400 dark:text-slate-500 text-right border-r border-slate-100 dark:border-slate-800 pt-3">
              {format(new Date().setHours(hour, 0), 'h:mm a')}
            </div>
            <div className="p-2 space-y-1.5 min-h-[56px]">
              {hourEvents.map(e => <EventPill key={e.id} event={e} conflicting={conflictSet.has(e.id)} onClick={onEventClick} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── AGENDA VIEW ─────────────────────────────────────────────────────────────

function AgendaView({ currentDate, events, tasks, conflicts, onEventClick, onConflictClick, hijriCache }) {
  const rangeStart = startOfMonth(currentDate);
  const rangeEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });

  const daysWithItems = days.map(day => {
    const dateKey = format(day, 'yyyy-MM-dd');
    const dayEvents = events.filter(e => e.start_date && isSameDay(parseISO(e.start_date), day))
      .sort((a, b) => {
        if (a.is_all_day) return -1;
        if (b.is_all_day) return 1;
        return new Date(a.start_date) - new Date(b.start_date);
      });
    const dayTasks = tasks.filter(t => t.due_date && isSameDay(new Date(t.due_date), day));
    return { day, dateKey, dayEvents, dayTasks, hijri: hijriCache[dateKey], dayConflicts: conflicts.filter(c => c.conflict_date === dateKey) };
  }).filter(d => d.dayEvents.length > 0 || d.dayTasks.length > 0);

  if (daysWithItems.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400 dark:text-slate-600">
        <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm">No events or tasks for {format(currentDate, 'MMMM yyyy')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {daysWithItems.map(({ day, dateKey, dayEvents, dayTasks, hijri, dayConflicts }) => {
        const conflictSet = detectDayConflicts(dayEvents);
        const today = isToday(day);
        return (
          <motion.div key={dateKey} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className={cn('rounded-xl border overflow-hidden', today ? 'border-emerald-300 dark:border-emerald-700' : 'border-slate-200 dark:border-slate-700')}>
            {/* Day header */}
            <div className={cn('flex items-center justify-between px-4 py-2.5',
              today ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-slate-50 dark:bg-slate-800/50')}>
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-center">
                  <span className={cn('text-lg font-bold leading-none', today ? 'text-emerald-600' : 'text-slate-700 dark:text-slate-200')}>
                    {format(day, 'd')}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{format(day, 'EEE')}</span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">{format(day, 'MMMM yyyy')}</div>
                  {hijri && <div className="text-xs text-violet-600 dark:text-violet-400">{hijri.day} {hijri.monthName}</div>}
                </div>
                <FastingBadge hijri={hijri} dayOfWeek={day.getDay()} />
              </div>
              <div className="flex items-center gap-2">
                {dayConflicts.length > 0 && (
                  <button onClick={() => onConflictClick(dayConflicts[0])}
                    className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 font-medium hover:underline">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {dayConflicts.length} conflict
                  </button>
                )}
                <Badge variant="outline" className="text-xs">
                  {dayEvents.length + dayTasks.length} item{dayEvents.length + dayTasks.length !== 1 ? 's' : ''}
                </Badge>
              </div>
            </div>

            {/* Items */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
              {dayEvents.map(evt => {
                const s = catStyle(evt.category);
                const hasConflict = conflictSet.has(evt.id);
                return (
                  <button key={evt.id} onClick={() => onEventClick(evt)}
                    className={cn('w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors',
                      hasConflict && 'bg-orange-50/50 dark:bg-orange-950/20')}>
                    <div className={cn('w-1 self-stretch rounded-full flex-shrink-0', s.dot)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {hasConflict && <AlertTriangle className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />}
                        <span className={cn('font-semibold text-sm', s.text)}>{evt.title}</span>
                        <Badge variant="outline" className="text-[10px] px-1">{evt.category}</Badge>
                        {hasConflict && <Badge variant="outline" className="text-[10px] px-1 border-orange-400 text-orange-600">conflict</Badge>}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {evt.is_all_day ? (
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />All day</span>
                        ) : evt.start_date ? (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(evt.start_date)}{evt.end_date ? ` – ${formatTime(evt.end_date)}` : ''}
                          </span>
                        ) : null}
                        {evt.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{evt.location}</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
              {dayTasks.map(task => (
                <div key={task.id} className="px-4 py-3 flex items-start gap-3 bg-slate-50/30 dark:bg-slate-800/20">
                  <CheckSquare className={cn('w-4 h-4 flex-shrink-0 mt-0.5',
                    task.priority === 'urgent' ? 'text-red-500' : task.priority === 'high' ? 'text-orange-500' : 'text-slate-400')} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{task.title}</span>
                      <Badge variant="outline" className={cn('text-[10px] px-1',
                        task.priority === 'urgent' ? 'border-red-400 text-red-600' :
                        task.priority === 'high' ? 'border-orange-400 text-orange-600' : '')}>
                        {task.priority}
                      </Badge>
                    </div>
                    {task.category && <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{task.category}</div>}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

const VIEWS = [
  { id: 'month', label: 'Month', icon: Calendar },
  { id: 'week',  label: 'Week',  icon: RefreshCw },
  { id: 'day',   label: 'Day',   icon: Clock },
  { id: 'agenda', label: 'Agenda', icon: CheckSquare },
];

export default function UnifiedCalendarView({
  events = [],
  onEventClick = () => {},
  onEditEvent = () => {},
}) {
  const [view, setView] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [conflictModal, setConflictModal] = useState(null);
  const [hijriCache, setHijriCache] = useState({});
  const queryClient = useQueryClient();

  // Fetch tasks with deadlines
  const { data: tasks = [] } = useQuery({
    queryKey: ['unifiedTasks'],
    queryFn: () => base44.entities.Task.filter({ status: { $ne: 'completed' } }, '-due_date', 200),
  });

  // Fetch active conflicts
  const { data: conflicts = [] } = useQuery({
    queryKey: ['conflicts', 'active'],
    queryFn: () => base44.entities.ConflictResolution.filter({ status: 'active' }),
    refetchInterval: 60_000,
  });

  // Preload Hijri dates for visible range
  React.useEffect(() => {
    let cancelled = false;
    const loadRange = async () => {
      let start, end;
      if (view === 'month') {
        start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
        end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
      } else if (view === 'week') {
        start = startOfWeek(currentDate, { weekStartsOn: 1 });
        end = endOfWeek(currentDate, { weekStartsOn: 1 });
      } else if (view === 'day') {
        start = end = currentDate;
      } else {
        start = startOfMonth(currentDate);
        end = endOfMonth(currentDate);
      }
      const days = eachDayOfInterval({ start, end });
      const newCache = {};
      for (const d of days) {
        const key = format(d, 'yyyy-MM-dd');
        if (!hijriCache[key]) {
          const h = await toHijri(d);
          if (!cancelled) newCache[key] = h;
        }
      }
      if (!cancelled && Object.keys(newCache).length > 0) {
        setHijriCache(prev => ({ ...prev, ...newCache }));
      }
    };
    loadRange();
    return () => { cancelled = true; };
  }, [view, currentDate]);

  const navigate = (dir) => {
    if (view === 'month') setCurrentDate(dir > 0 ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    else if (view === 'week') setCurrentDate(dir > 0 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    else setCurrentDate(dir > 0 ? addDays(currentDate, 1) : subDays(currentDate, 1));
  };

  const viewLabel = useMemo(() => {
    if (view === 'month') return format(currentDate, 'MMMM yyyy');
    if (view === 'week') {
      const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
      const we = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(ws, 'MMM d')} – ${format(we, 'MMM d, yyyy')}`;
    }
    if (view === 'day') return format(currentDate, 'EEEE, MMMM d, yyyy');
    return format(currentDate, 'MMMM yyyy');
  }, [view, currentDate]);

  const activeConflicts = conflicts.filter(c => c.status === 'active');

  return (
    <div className="space-y-3">
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        {/* View switcher */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          {VIEWS.map(v => {
            const Icon = v.icon;
            return (
              <button key={v.id} onClick={() => setView(v.id)}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                  view === v.id
                    ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200')}>
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{v.label}</span>
              </button>
            );
          })}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="h-8 w-8">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <button onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1 text-sm font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-colors">
            {viewLabel}
          </button>
          <Button variant="outline" size="icon" onClick={() => navigate(1)} className="h-8 w-8">
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())} className="text-xs text-slate-500 hover:text-slate-700">
            Today
          </Button>
        </div>
      </div>

      {/* ── Conflict banner ── */}
      <AnimatePresence>
        {activeConflicts.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-3 px-4 py-2.5 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400 flex-shrink-0" />
            <p className="text-sm text-orange-800 dark:text-orange-200 flex-1">
              <span className="font-semibold">{activeConflicts.length} schedule conflict{activeConflicts.length > 1 ? 's' : ''}</span>
              {' '}detected — days with conflicts are highlighted in orange.
            </p>
            <Button size="sm" onClick={() => setConflictModal(activeConflicts[0])}
              className="h-7 px-3 text-xs bg-orange-600 hover:bg-orange-700 gap-1 flex-shrink-0">
              <Sparkles className="w-3 h-3" /> Fix with AI
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Legend ── */}
      <div className="flex items-center gap-3 flex-wrap text-xs text-slate-500 dark:text-slate-400">
        {Object.entries(CAT_COLORS).slice(0, 5).map(([cat, s]) => (
          <span key={cat} className="flex items-center gap-1">
            <span className={cn('w-2 h-2 rounded-full', s.dot)} />
            {cat}
          </span>
        ))}
        <span className="flex items-center gap-1">
          <CheckSquare className="w-3 h-3 text-slate-400" /> task deadline
        </span>
        <span className="flex items-center gap-1">
          <Moon className="w-3 h-3 text-purple-400" /> fasting day
        </span>
        <span className="flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 text-orange-400" /> conflict
        </span>
      </div>

      {/* ── Calendar views ── */}
      <AnimatePresence mode="wait">
        <motion.div key={view} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>
          {view === 'month' && (
            <MonthView
              currentDate={currentDate} events={events} tasks={tasks}
              conflicts={conflicts} onEventClick={onEventClick} onConflictClick={setConflictModal}
              hijriCache={hijriCache}
            />
          )}
          {view === 'week' && (
            <WeekViewUnified
              currentDate={currentDate} events={events} tasks={tasks}
              conflicts={conflicts} onEventClick={onEventClick} onConflictClick={setConflictModal}
              hijriCache={hijriCache}
            />
          )}
          {view === 'day' && (
            <DayViewUnified
              currentDate={currentDate} events={events} tasks={tasks}
              conflicts={conflicts} onEventClick={onEventClick} onConflictClick={setConflictModal}
              hijriCache={hijriCache}
            />
          )}
          {view === 'agenda' && (
            <AgendaView
              currentDate={currentDate} events={events} tasks={tasks}
              conflicts={conflicts} onEventClick={onEventClick} onConflictClick={setConflictModal}
              hijriCache={hijriCache}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* ── Conflict resolution modal ── */}
      {conflictModal && (
        <ConflictResolutionModal
          conflict={conflictModal}
          events={events}
          onClose={() => setConflictModal(null)}
          onResolve={() => {
            queryClient.invalidateQueries({ queryKey: ['conflicts', 'active'] });
            setConflictModal(null);
          }}
        />
      )}
    </div>
  );
}