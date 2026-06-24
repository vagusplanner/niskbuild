import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon, Clock, MapPin } from 'lucide-react';
import {
  format, startOfYear, endOfYear, eachMonthOfInterval, getDaysInMonth,
  startOfMonth, getDay, isSameDay, parseISO, isSameMonth, isToday,
  eachDayOfInterval, startOfDay
} from 'date-fns';
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

function getEventColor(event) {
  if (event.color) return event.color;
  return CATEGORY_COLORS[event.category] || CATEGORY_COLORS.other;
}

function MiniMonth({ monthDate, year, events, selectedDate, onDateSelect, onEventClick }) {
  const daysInMonth = getDaysInMonth(monthDate);
  const firstDay    = startOfMonth(monthDate);
  // Shift so week starts on Monday (0=Sun→6, 1=Mon→0, …)
  const startDow = (getDay(firstDay) + 6) % 7;
  const today = new Date();

  const getEventsForDay = (date) =>
    events.filter(e => {
      try { return isSameDay(parseISO(e.start_date.split('T')[0] || e.start_date), date); }
      catch { return false; }
    });

  const monthEvents = events.filter(e => {
    try { return isSameMonth(parseISO(e.start_date.split('T')[0] || e.start_date), monthDate); }
    catch { return false; }
  });

  const days = [];
  for (let i = 0; i < startDow; i++) days.push(<div key={`e${i}`} className="aspect-square" />);

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, monthDate.getMonth(), d);
    const dayEvents = getEventsForDay(date);
    const isT = isSameDay(date, today);
    const isSel = isSameDay(date, selectedDate);
    // up to 3 category dots
    const dotColors = dayEvents.slice(0, 3).map(getEventColor);

    days.push(
      <button
        key={d}
        onClick={() => onDateSelect(date)}
        className={cn(
          "aspect-square flex flex-col items-center justify-center rounded text-[10px] transition-colors relative group",
          isSel  ? "bg-teal-600 text-white font-bold"
                 : isT ? "bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 font-bold"
                       : dayEvents.length > 0 ? "hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium"
                                              : "hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
        )}
      >
        <span>{d}</span>
        {dotColors.length > 0 && (
          <div className="flex gap-0.5 mt-0.5">
            {dotColors.map((c, i) => (
              <div key={i} className="w-1 h-1 rounded-full" style={{ background: isSel ? 'white' : c }} />
            ))}
          </div>
        )}
      </button>
    );
  }

  return (
    <Card className="p-3 hover:shadow-md transition-shadow cursor-pointer dark:bg-slate-800 dark:border-slate-700">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold text-sm text-slate-800 dark:text-slate-100">{format(monthDate, 'MMMM')}</div>
        {monthEvents.length > 0 && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{monthEvents.length}</Badge>
        )}
      </div>
      {/* Day-of-week header: Mon–Sun */}
      <div className="grid grid-cols-7 gap-0.5 text-[9px] text-slate-400 dark:text-slate-500 mb-1 font-medium">
        {['Mo','Tu','We','Th','Fr','Sa','Su'].map(d => <div key={d} className="text-center">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-0.5">{days}</div>
    </Card>
  );
}

function MonthDetailPanel({ monthDate, year, events, onClose, onEventClick, onDateSelect }) {
  const monthEvents = events.filter(e => {
    try { return isSameMonth(parseISO(e.start_date.split('T')[0] || e.start_date), monthDate); }
    catch { return false; }
  }).sort((a, b) => a.start_date.localeCompare(b.start_date));

  const byCategory = monthEvents.reduce((acc, e) => {
    const cat = e.category || 'other';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      className="col-span-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-teal-600" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{format(monthDate, 'MMMM yyyy')}</h3>
          <Badge>{monthEvents.length} events</Badge>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
          <X className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      {/* Category breakdown */}
      {Object.keys(byCategory).length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.entries(byCategory).map(([cat, count]) => (
            <div key={cat} className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium text-white" style={{ background: CATEGORY_COLORS[cat] || '#6b7280' }}>
              {cat} · {count}
            </div>
          ))}
        </div>
      )}

      {/* Event list */}
      {monthEvents.length === 0 ? (
        <p className="text-slate-400 dark:text-slate-500 text-sm italic">No events this month.</p>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {monthEvents.map(event => {
            const color = getEventColor(event);
            let dateStr = '';
            try {
              dateStr = format(parseISO(event.start_date), event.is_all_day ? 'EEE, MMM d' : 'EEE, MMM d · h:mm a');
            } catch {}
            return (
              <button
                key={event.id}
                onClick={() => { onEventClick(event); onDateSelect(parseISO(event.start_date.split('T')[0])); }}
                className="w-full text-left flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
              >
                <div className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: color }} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-slate-800 dark:text-slate-100 group-hover:text-teal-700 dark:group-hover:text-teal-400 truncate">
                    {event.title}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                    <Clock className="w-3 h-3" />{dateStr}
                    {event.location && <><MapPin className="w-3 h-3 ml-1" />{event.location}</>}
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] capitalize flex-shrink-0">{event.category || 'other'}</Badge>
              </button>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

export default function YearlyView({ events = [], selectedDate, onDateSelect, onEventClick = () => {} }) {
  const [year, setYear]               = useState(selectedDate ? selectedDate.getFullYear() : new Date().getFullYear());
  const [expandedMonth, setExpandedMonth] = useState(null);

  const months = eachMonthOfInterval({
    start: startOfYear(new Date(year, 0, 1)),
    end:   endOfYear(new Date(year, 0, 1))
  });

  const totalEvents = events.filter(e => {
    try { return parseISO(e.start_date).getFullYear() === year; } catch { return false; }
  });

  const toggleMonth = (monthIdx) => {
    setExpandedMonth(prev => prev === monthIdx ? null : monthIdx);
  };

  return (
    <div className="space-y-4">
      {/* Year Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{year}</h2>
          <Badge variant="secondary">{totalEvents.length} events</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { setYear(y => y - 1); setExpandedMonth(null); }}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setYear(new Date().getFullYear()); setExpandedMonth(null); }}>
            This Year
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setYear(y => y + 1); setExpandedMonth(null); }}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Category legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
          <div key={cat} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
            <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">{cat}</span>
          </div>
        ))}
      </div>

      {/* 12-Month Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {months.map((month, idx) => (
          <React.Fragment key={idx}>
            <div
              onClick={() => toggleMonth(idx)}
              className={cn("cursor-pointer rounded-xl transition-all", expandedMonth === idx && "ring-2 ring-teal-500")}
            >
              <MiniMonth
                monthDate={month}
                year={year}
                events={events}
                selectedDate={selectedDate || new Date()}
                onDateSelect={(d) => { onDateSelect(d); }}
                onEventClick={onEventClick}
              />
            </div>

            {/* Expanded detail panel – injected after the row that contains this month */}
            <AnimatePresence>
              {expandedMonth === idx && (() => {
                // Insert after completing a row of 4 (desktop), 3 (md), 2 (sm)
                // We always render it right after for simplicity; CSS grid handles visual
                return (
                  <MonthDetailPanel
                    key={`detail-${idx}`}
                    monthDate={month}
                    year={year}
                    events={events}
                    onClose={() => setExpandedMonth(null)}
                    onEventClick={onEventClick}
                    onDateSelect={onDateSelect}
                  />
                );
              })()}
            </AnimatePresence>
          </React.Fragment>
        ))}
      </div>

      {/* Year summary stats */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Year at a Glance</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Object.entries(
            totalEvents.reduce((acc, e) => { const c = e.category || 'other'; acc[c] = (acc[c] || 0) + 1; return acc; }, {})
          ).sort(([, a], [, b]) => b - a).slice(0, 4).map(([cat, count]) => (
            <div key={cat} className="text-center p-3 rounded-lg" style={{ background: (CATEGORY_COLORS[cat] || '#6b7280') + '18' }}>
              <div className="text-2xl font-bold" style={{ color: CATEGORY_COLORS[cat] || '#6b7280' }}>{count}</div>
              <div className="text-xs text-slate-600 dark:text-slate-400 capitalize mt-0.5">{cat}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}