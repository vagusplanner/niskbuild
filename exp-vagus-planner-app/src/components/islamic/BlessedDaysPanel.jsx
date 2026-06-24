/**
 * BlessedDaysPanel
 * Displays upcoming blessed Hijri days with live countdown, Sunnah actions, 
 * and notification preferences. Replaces the old IslamicEventsNotificationPanel.
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellOff, ChevronDown, ChevronUp, BookOpen, Star, Calendar, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BLESSED_DAYS, COLOR_MAP } from '@/lib/blessedDaysData';

function hijriDaysUntil(targetMonth, targetDay, currentMonth, currentDay) {
  const MONTH_LENGTHS = [30,29,30,29,30,29,30,29,30,29,30,29];
  let days = 0;
  let m = currentMonth, d = currentDay;
  for (let i = 0; i < 400; i++) {
    if (m === targetMonth && d === targetDay) return days;
    d++;
    days++;
    const monthLen = MONTH_LENGTHS[m - 1] || 29;
    if (d > monthLen) { d = 1; m++; if (m > 12) m = 1; }
  }
  return null;
}

function DayCard({ item, daysAway }) {
  const [expanded, setExpanded] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`blessed_notif_${item.id}`) || 'true'); } catch { return true; }
  });

  const toggleNotif = (e) => {
    e.stopPropagation();
    const next = !notifEnabled;
    setNotifEnabled(next);
    localStorage.setItem(`blessed_notif_${item.id}`, JSON.stringify(next));
  };

  const colors = COLOR_MAP[item.color] || COLOR_MAP.indigo;
  const isToday = daysAway === 0;
  const isTomorrow = daysAway === 1;
  const isUrgent = item.priority === 'urgent';

  const daysLabel = isToday ? 'TODAY' : isTomorrow ? 'Tomorrow' : `In ${daysAway} days`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('rounded-2xl border overflow-hidden transition-all', colors.bg, colors.border, isToday && 'ring-2 ring-offset-1 ring-amber-400')}
    >
      {/* Header row */}
      <button
        className="w-full flex items-start gap-3 p-4 text-left"
        onClick={() => setExpanded(v => !v)}
      >
        <span className="text-2xl flex-shrink-0 mt-0.5">{item.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <p className={cn('text-sm font-black', colors.text)}>{item.name}</p>
            {item.arabic && <span className="text-xs opacity-60 font-medium" dir="rtl">{item.arabic}</span>}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn(
              'text-[10px] font-bold px-2 py-0.5 rounded-full',
              isToday ? 'bg-amber-400 text-white' : isTomorrow ? 'bg-orange-100 text-orange-700' : colors.badge
            )}>
              {isToday && <Star className="w-2.5 h-2.5 inline mr-0.5 fill-current" />}
              {daysLabel}
            </span>
            <span className={cn('text-[10px] px-2 py-0.5 rounded-full', colors.badge, 'opacity-70 capitalize')}>
              {item.priority}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={toggleNotif}
            className={cn('p-1.5 rounded-lg transition-colors', notifEnabled ? 'text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/40' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800')}
            title={notifEnabled ? 'Disable reminder' : 'Enable reminder'}
          >
            {notifEnabled ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
          </button>
          {expanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
        </div>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-current border-opacity-10"
          >
            <div className="px-4 pb-4 pt-3 space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{item.description}</p>
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                  <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Recommended Sunnah Actions</p>
                </div>
                <ul className="space-y-1.5">
                  {item.sunnah_actions.map((action, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                      <span className="text-amber-500 font-bold flex-shrink-0 mt-0.5">•</span>
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function BlessedDaysPanel({ limit = 5 }) {
  const [hijriDate, setHijriDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetch('https://api.aladhan.com/v1/gToH/' + new Date().toLocaleDateString('en-GB').replace(/\//g, '-'))
      .then(r => r.json())
      .then(json => {
        const h = json.data.hijri;
        setHijriDate({ day: parseInt(h.day), month: parseInt(h.month.number), monthName: h.month.en, year: parseInt(h.year) });
      })
      .catch(() => setHijriDate({ day: 1, month: 1, monthName: 'Muharram', year: 1446 }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/50 dark:bg-indigo-950/10 p-5 animate-pulse">
        <div className="h-4 w-40 bg-indigo-100 dark:bg-indigo-900/40 rounded mb-3" />
        <div className="space-y-2">
          <div className="h-14 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl" />
          <div className="h-14 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!hijriDate) return null;

  // Compute days away for each blessed day, filter relevant ones
  const withDaysAway = BLESSED_DAYS.map(d => ({
    ...d,
    daysAway: hijriDaysUntil(d.hijri_month, d.hijri_day, hijriDate.month, hijriDate.day),
  }))
  .filter(d => d.daysAway !== null && d.daysAway <= 60)
  .sort((a, b) => a.daysAway - b.daysAway);

  const visible = showAll ? withDaysAway : withDaysAway.slice(0, limit);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-black text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
            Blessed Days & Reminders
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {hijriDate.day} {hijriDate.monthName} {hijriDate.year} AH
          </p>
        </div>
        <Badge className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border-0 text-[10px]">
          {withDaysAway.length} upcoming
        </Badge>
      </div>

      {/* Day cards */}
      {visible.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-4">No upcoming blessed days in the next 60 days</p>
      ) : (
        <div className="space-y-2">
          {visible.map(item => (
            <DayCard key={item.id} item={item} daysAway={item.daysAway} />
          ))}
        </div>
      )}

      {withDaysAway.length > limit && (
        <button
          onClick={() => setShowAll(v => !v)}
          className="w-full text-xs text-indigo-600 dark:text-indigo-400 font-semibold flex items-center justify-center gap-1 py-2 hover:underline"
        >
          {showAll ? <><ChevronUp className="w-3.5 h-3.5" /> Show less</> : <><ChevronDown className="w-3.5 h-3.5" /> Show {withDaysAway.length - limit} more</>}
        </button>
      )}

      <p className="text-[10px] text-slate-400 text-center">
        Email & push reminders sent automatically · Manage in Settings
      </p>
    </div>
  );
}