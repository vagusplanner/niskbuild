import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { X, Moon, Bell, BellOff, Calendar, RotateCcw, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import IslamicEventReminderModal from './IslamicEventReminderModal';

const EVENT_TYPE_COLORS = {
  ramadan:       'bg-emerald-100 text-emerald-800 border-emerald-200',
  eid:           'bg-amber-100 text-amber-800 border-amber-200',
  hajj:          'bg-blue-100 text-blue-800 border-blue-200',
  ashura:        'bg-purple-100 text-purple-800 border-purple-200',
  mawlid:        'bg-rose-100 text-rose-800 border-rose-200',
  sacred_month:  'bg-teal-100 text-teal-800 border-teal-200',
  custom:        'bg-slate-100 text-slate-800 border-slate-200',
};

const DOT_COLORS = {
  ramadan: 'bg-emerald-500', eid: 'bg-amber-500', hajj: 'bg-blue-500',
  ashura: 'bg-purple-500', mawlid: 'bg-rose-500', sacred_month: 'bg-teal-500', custom: 'bg-slate-400',
};

export default function IslamicEventDetailModal({ event, onClose }) {
  const [showReminder, setShowReminder] = useState(false);
  const [localEvent, setLocalEvent] = useState(event);

  if (!localEvent) return null;

  const typeColor = EVENT_TYPE_COLORS[localEvent.event_type] || EVENT_TYPE_COLORS.custom;
  const dotColor = DOT_COLORS[localEvent.event_type] || DOT_COLORS.custom;

  return (
    <React.Fragment>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start gap-3">
            <div className={cn('w-3 h-3 rounded-full mt-1.5 flex-shrink-0', dotColor)} />
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{localEvent.title}</h2>
              <Badge className={cn('text-xs mt-1 capitalize border', typeColor)}>
                {localEvent.event_type?.replace('_', ' ')}
              </Badge>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {localEvent.description && (
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{localEvent.description}</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            {localEvent.gregorian_date && (
              <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <Calendar className="w-4 h-4 text-teal-500 flex-shrink-0" />
                <div>
                  <p className="text-[11px] text-slate-400">Gregorian Date</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {format(parseISO(localEvent.gregorian_date), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
            )}
            {(localEvent.hijri_day && localEvent.hijri_month) && (
              <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <Moon className="w-4 h-4 text-teal-500 flex-shrink-0" />
                <div>
                  <p className="text-[11px] text-slate-400">Hijri Date</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {localEvent.hijri_day}/{localEvent.hijri_month}{localEvent.hijri_year ? `/${localEvent.hijri_year}` : ''}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {localEvent.is_recurring && (
              <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                <RotateCcw className="w-4 h-4" />
                <span>Repeats yearly{localEvent._computed ? ` · ${localEvent._hijri_year} AH` : ''}</span>
              </div>
            )}
          </div>

          {/* Reminders summary */}
          {localEvent.reminder_enabled && localEvent.reminders?.length > 0 && (
            <div className="p-3 bg-teal-50 dark:bg-teal-950/30 rounded-xl border border-teal-100 dark:border-teal-900">
              <p className="text-xs font-semibold text-teal-700 dark:text-teal-300 mb-2 flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5" /> Active Reminders
              </p>
              <div className="space-y-1">
                {localEvent.reminders.map((r, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-xs text-teal-600 dark:text-teal-400">
                      {r.time_value} {r.time_unit} before · in-app
                    </span>
                    {r.sent && <Badge className="text-[10px] bg-teal-100 text-teal-700">Sent</Badge>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'flex-1 gap-1.5',
              localEvent.reminder_enabled ? 'border-teal-300 text-teal-700 dark:text-teal-300' : ''
            )}
            onClick={() => setShowReminder(true)}
          >
            {localEvent.reminder_enabled
              ? <><Bell className="w-3.5 h-3.5" /> Edit Reminders</>
              : <><BellOff className="w-3.5 h-3.5" /> Set Reminder</>
            }
          </Button>
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>

    {showReminder && (
      <IslamicEventReminderModal
        event={localEvent}
        onClose={() => setShowReminder(false)}
        onSaved={(updated) => setLocalEvent(updated)}
      />
    )}
    </React.Fragment>
  );
}