import React, { useState, useRef, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay,
  addWeeks, subWeeks, addMonths, subMonths, startOfMonth, endOfMonth,
  differenceInMinutes, differenceInDays, addDays, isWithinInterval,
  startOfDay, endOfDay, isBefore, isAfter, min, max
} from 'date-fns';
import { ChevronLeft, ChevronRight, Clock, MapPin, ZoomIn, ZoomOut, Calendar as CalendarIcon, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const CATEGORY_COLORS = {
  work: '#3b82f6',
  personal: '#8b5cf6',
  health: '#10b981',
  prayer: '#f59e0b',
  holiday: '#06b6d4',
  family: '#ec4899',
  social: '#f97316',
  other: '#6b7280',
};

const HOUR_HEIGHT = 64; // px per hour in day-level view
const ZOOM_LEVELS = ['4-days', 'week', '2-weeks', 'month'];
const ZOOM_LABELS = { 'week': '1 Week', '2-weeks': '2 Weeks', '4-days': '4 Days', 'month': '1 Month' };

function getEventColor(event) {
  if (event.color) return event.color;
  return CATEGORY_COLORS[event.category] || CATEGORY_COLORS.other;
}

function getDays(zoom, anchor) {
  switch (zoom) {
    case '4-days':   return eachDayOfInterval({ start: anchor, end: addDays(anchor, 3) });
    case 'week':     return eachDayOfInterval({ start: startOfWeek(anchor, { weekStartsOn: 1 }), end: endOfWeek(anchor, { weekStartsOn: 1 }) });
    case '2-weeks':  return eachDayOfInterval({ start: startOfWeek(anchor, { weekStartsOn: 1 }), end: addDays(startOfWeek(anchor, { weekStartsOn: 1 }), 13) });
    case 'month':    return eachDayOfInterval({ start: startOfMonth(anchor), end: endOfMonth(anchor) });
    default:         return eachDayOfInterval({ start: startOfWeek(anchor, { weekStartsOn: 1 }), end: endOfWeek(anchor, { weekStartsOn: 1 }) });
  }
}

function advance(zoom, anchor, dir) {
  const d = dir === 1 ? 1 : -1;
  switch (zoom) {
    case '4-days':  return addDays(anchor, 4 * d);
    case 'week':    return addWeeks(anchor, d);
    case '2-weeks': return addWeeks(anchor, 2 * d);
    case 'month':   return addMonths(anchor, d);
    default:        return addWeeks(anchor, d);
  }
}

// ─── Gantt-style multi-day bar row ────────────────────────────────────────────
function GanttBar({ event, days, onEventClick }) {
  const color = getEventColor(event);
  try {
    const evStart = parseISO(event.start_date);
    const evEnd   = event.end_date ? parseISO(event.end_date) : evStart;
    const rangeStart = days[0];
    const rangeEnd   = days[days.length - 1];

    if (isAfter(startOfDay(evStart), endOfDay(rangeEnd))) return null;
    if (isBefore(endOfDay(evEnd), startOfDay(rangeStart))) return null;

    const clampedStart = max([evStart, rangeStart]);
    const clampedEnd   = min([evEnd,   endOfDay(rangeEnd)]);

    const totalDays = days.length;
    const startOffset = Math.max(0, differenceInDays(startOfDay(clampedStart), startOfDay(rangeStart)));
    const spanDays    = Math.max(1, differenceInDays(startOfDay(clampedEnd), startOfDay(clampedStart)) + 1);
    const clampedSpan = Math.min(spanDays, totalDays - startOffset);

    const leftPct  = (startOffset / totalDays) * 100;
    const widthPct = (clampedSpan / totalDays) * 100;

    return (
      <motion.button
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => onEventClick(event)}
        title={`${event.title} · ${format(evStart, 'MMM d')}${!isSameDay(evStart, evEnd) ? ' – ' + format(evEnd, 'MMM d') : ''}`}
        className="absolute top-1 h-7 rounded-md text-white text-xs font-medium flex items-center px-2 gap-1 hover:brightness-110 transition-all shadow-sm overflow-hidden whitespace-nowrap z-10 cursor-pointer"
        style={{
          left:  `calc(${leftPct}% + 2px)`,
          width: `calc(${widthPct}% - 4px)`,
          background: color,
        }}
      >
        {!event.is_all_day && (
          <Clock className="w-3 h-3 flex-shrink-0 opacity-80" />
        )}
        <span className="truncate">{event.title}</span>
        {clampedSpan > 1 && (
          <Badge variant="secondary" className="ml-auto text-[9px] px-1 bg-white/20 text-white border-0">
            {clampedSpan}d
          </Badge>
        )}
      </motion.button>
    );
  } catch { return null; }
}

// ─── Hour-level timed event block ─────────────────────────────────────────────
function TimedEventBlock({ event, onEventClick }) {
  const color = getEventColor(event);
  try {
    const start = parseISO(event.start_date);
    const end   = event.end_date ? parseISO(event.end_date) : new Date(start.getTime() + 60 * 60 * 1000);
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const durationMins = Math.max(30, differenceInMinutes(end, start));
    const topPx    = (startMinutes / 60) * HOUR_HEIGHT;
    const heightPx = Math.max(28, (durationMins / 60) * HOUR_HEIGHT - 2);

    return (
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={() => onEventClick(event)}
        className="absolute left-1 right-1 rounded-md text-white text-[11px] font-medium flex flex-col px-1.5 py-0.5 hover:brightness-110 transition-all shadow-sm overflow-hidden cursor-pointer z-10"
        style={{ top: topPx, height: heightPx, background: color }}
      >
        <span className="font-semibold truncate">{event.title}</span>
        <span className="opacity-80 text-[9px]">
          {format(start, 'h:mm')}–{format(end, 'h:mm a')}
        </span>
        {event.location && heightPx > 50 && (
          <span className="opacity-70 text-[9px] flex items-center gap-0.5 mt-0.5">
            <MapPin className="w-2 h-2" />{event.location}
          </span>
        )}
      </motion.button>
    );
  } catch { return null; }
}

export default function CalendarTimelineView({ events = [], onEventClick = () => {}, currentDate = new Date() }) {
  const [zoom, setZoom]     = useState('week');
  const [anchor, setAnchor] = useState(startOfWeek(currentDate, { weekStartsOn: 1 }));
  const [mode, setMode]     = useState('gantt'); // 'gantt' | 'hourly'
  const scrollRef = useRef(null);

  const days = getDays(zoom, anchor);

  // Scroll to 7am on mount in hourly mode
  useEffect(() => {
    if (mode === 'hourly' && scrollRef.current) {
      scrollRef.current.scrollTop = 7 * HOUR_HEIGHT;
    }
  }, [mode]);

  // Split events: all-day/multi-day go to gantt rows; timed single-day go to hourly
  const allDayEvents = events.filter(e => {
    if (e.is_all_day) return true;
    if (!e.end_date) return false;
    try {
      const s = parseISO(e.start_date);
      const en = parseISO(e.end_date);
      return differenceInDays(en, s) >= 1;
    } catch { return false; }
  });

  const timedEvents = events.filter(e => !e.is_all_day && e.start_date && (!e.end_date || (() => {
    try { return differenceInDays(parseISO(e.end_date), parseISO(e.start_date)) < 1; } catch { return true; }
  })()));

  const getTimedForDay = (day) => timedEvents.filter(e => {
    try { return isSameDay(parseISO(e.start_date), day); } catch { return false; }
  });

  // Multi-day event lanes (simple greedy row packing)
  const visibleMultiDay = allDayEvents.filter(e => {
    try {
      const s = parseISO(e.start_date);
      const en = e.end_date ? parseISO(e.end_date) : s;
      return !isAfter(startOfDay(s), endOfDay(days[days.length - 1])) &&
             !isBefore(endOfDay(en), startOfDay(days[0]));
    } catch { return false; }
  });

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-teal-50/60 to-cyan-50/60 dark:from-teal-950/30 dark:to-cyan-950/30 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-teal-600" />
          <span className="font-semibold text-slate-800 dark:text-slate-100">Timeline</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode toggle */}
          <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            {[['gantt', 'Gantt'], ['hourly', 'Hourly']].map(([v, l]) => (
              <button
                key={v}
                onClick={() => setMode(v)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium transition-colors",
                  mode === v
                    ? "bg-teal-600 text-white"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                )}
              >{l}</button>
            ))}
          </div>

          {/* Zoom */}
          <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            {ZOOM_LEVELS.map(z => (
              <button
                key={z}
                onClick={() => setZoom(z)}
                className={cn(
                  "px-2.5 py-1.5 text-xs font-medium transition-colors",
                  zoom === z
                    ? "bg-teal-600 text-white"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                )}
              >{ZOOM_LABELS[z]}</button>
            ))}
          </div>

          {/* Navigation */}
          <Button variant="outline" size="sm" onClick={() => setAnchor(advance(zoom, anchor, -1))}><ChevronLeft className="w-4 h-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setAnchor(startOfWeek(new Date(), { weekStartsOn: 1 }))}>Today</Button>
          <Button variant="outline" size="sm" onClick={() => setAnchor(advance(zoom, anchor, 1))}><ChevronRight className="w-4 h-4" /></Button>
        </div>

        <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">
          {format(days[0], 'MMM d')} – {format(days[days.length - 1], 'MMM d, yyyy')}
        </span>
      </div>

      {/* ── Day header row ── */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex-shrink-0">
        {mode === 'hourly' && <div className="w-14 flex-shrink-0 border-r border-slate-200 dark:border-slate-700" />}
        {days.map(day => {
          const isToday = isSameDay(day, now);
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "flex-1 py-2 text-center border-r last:border-r-0 border-slate-200 dark:border-slate-700",
                isToday && "bg-teal-50 dark:bg-teal-950/40"
              )}
            >
              <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">{format(day, 'EEE')}</div>
              <div className={cn("text-sm font-bold", isToday ? "text-teal-700 dark:text-teal-400" : "text-slate-700 dark:text-slate-200")}>
                {format(day, 'd')}
              </div>
              <div className="text-[9px] text-slate-400">{format(day, 'MMM')}</div>
            </div>
          );
        })}
      </div>

      {/* ── GANTT mode ── */}
      {mode === 'gantt' && (
        <div className="flex-1 overflow-y-auto">
          {/* All-day / multi-day rows */}
          {visibleMultiDay.length === 0 && (
            <div className="px-4 py-3 text-sm text-slate-400 dark:text-slate-500 italic">No multi-day events in this range.</div>
          )}
          {visibleMultiDay.map(event => (
            <div key={event.id} className="relative h-10 border-b border-slate-100 dark:border-slate-800">
              <GanttBar event={event} days={days} onEventClick={onEventClick} />
            </div>
          ))}

          {/* Timed events — one row per day column */}
          <div className="border-t border-slate-200 dark:border-slate-700 mt-1">
            <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
              <Clock className="w-3 h-3" /> Timed Events
            </div>
            {timedEvents.length === 0 && (
              <div className="px-4 py-2 text-sm text-slate-400 italic">No timed events.</div>
            )}
            <div className="flex">
              {days.map(day => {
                const dayEvents = getTimedForDay(day);
                return (
                  <div key={day.toISOString()} className="flex-1 border-r last:border-r-0 border-slate-100 dark:border-slate-800 min-h-[60px] p-1 space-y-1">
                    {dayEvents.map(event => {
                      const color = getEventColor(event);
                      return (
                        <button
                          key={event.id}
                          onClick={() => onEventClick(event)}
                          className="w-full text-left px-2 py-1 rounded-md text-[11px] text-white font-medium truncate hover:brightness-110"
                          style={{ background: color }}
                        >
                          {event.start_date && (() => {
                            try { return format(parseISO(event.start_date), 'h:mm'); } catch { return ''; }
                          })()} {event.title}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── HOURLY mode ── */}
      {mode === 'hourly' && (
        <div ref={scrollRef} className="flex-1 overflow-y-auto relative">
          <div className="flex" style={{ height: 24 * HOUR_HEIGHT }}>
            {/* Time gutter */}
            <div className="w-14 flex-shrink-0 border-r border-slate-200 dark:border-slate-700 relative">
              {hours.map(h => (
                <div key={h} className="absolute left-0 right-0 flex items-start pl-2" style={{ top: h * HOUR_HEIGHT }}>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                    {format(new Date(2000, 0, 1, h), 'h a')}
                  </span>
                </div>
              ))}
              {/* Horizontal hour lines */}
              {hours.map(h => (
                <div key={`l${h}`} className="absolute left-0 right-0 border-t border-slate-100 dark:border-slate-800" style={{ top: h * HOUR_HEIGHT }} />
              ))}
            </div>

            {/* Day columns */}
            {days.map(day => {
              const isToday = isSameDay(day, now);
              const dayEvents = getTimedForDay(day);
              return (
                <div key={day.toISOString()} className={cn("flex-1 relative border-r last:border-r-0 border-slate-100 dark:border-slate-800", isToday && "bg-teal-50/20 dark:bg-teal-950/10")}>
                  {/* Hour grid lines */}
                  {hours.map(h => (
                    <div key={h} className="absolute left-0 right-0 border-t border-slate-100 dark:border-slate-800" style={{ top: h * HOUR_HEIGHT }} />
                  ))}
                  {/* Current time line */}
                  {isToday && (
                    <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: (nowMinutes / 60) * HOUR_HEIGHT }}>
                      <div className="relative">
                        <div className="absolute -left-1 -top-1.5 w-3 h-3 rounded-full bg-red-500" />
                        <div className="h-0.5 bg-red-500" />
                      </div>
                    </div>
                  )}
                  {/* Events */}
                  {dayEvents.map(event => (
                    <TimedEventBlock key={event.id} event={event} onEventClick={onEventClick} />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Legend ── */}
      <div className="flex items-center gap-4 px-4 py-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex-wrap">
        {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
          <div key={cat} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
            <span className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">{cat}</span>
          </div>
        ))}
        {mode === 'hourly' && (
          <div className="flex items-center gap-1.5 ml-auto">
            <div className="w-4 h-0.5 bg-red-500 rounded" />
            <span className="text-[10px] text-slate-500">Now</span>
          </div>
        )}
      </div>
    </div>
  );
}