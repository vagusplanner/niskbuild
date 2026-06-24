import React, { useState, useEffect } from 'react';
import { X, Bell, BellOff, Plus, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

const REMINDER_PRESETS = [
  { label: '1 week before',  time_value: 7,  time_unit: 'days' },
  { label: '3 days before',  time_value: 3,  time_unit: 'days' },
  { label: '1 day before',   time_value: 1,  time_unit: 'days' },
  { label: '12 hours before',time_value: 12, time_unit: 'hours' },
  { label: '1 hour before',  time_value: 1,  time_unit: 'hours' },
  { label: '30 min before',  time_value: 30, time_unit: 'minutes' },
];

export default function IslamicEventReminderModal({ event, onClose, onSaved }) {
  const [reminders, setReminders] = useState([]);
  const [saving, setSaving] = useState(false);

  // Load existing reminders from event
  useEffect(() => {
    if (event?.reminders?.length) {
      setReminders(event.reminders.map(r => ({ ...r })));
    } else {
      setReminders([]);
    }
  }, [event?.id]);

  if (!event) return null;

  const isPresetActive = (preset) =>
    reminders.some(r => r.time_value === preset.time_value && r.time_unit === preset.time_unit);

  const togglePreset = (preset) => {
    if (isPresetActive(preset)) {
      setReminders(prev => prev.filter(r => !(r.time_value === preset.time_value && r.time_unit === preset.time_unit)));
    } else {
      setReminders(prev => [...prev, { time_value: preset.time_value, time_unit: preset.time_unit, method: 'in_app', sent: false }]);
    }
  };

  const removeReminder = (idx) => setReminders(prev => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.IslamicEvent.update(event.id, {
        reminder_enabled: reminders.length > 0,
        reminders: reminders,
      });
      toast.success(reminders.length > 0 ? `${reminders.length} reminder${reminders.length > 1 ? 's' : ''} set for ${event.title}` : 'Reminders cleared');
      onSaved?.({ ...event, reminder_enabled: reminders.length > 0, reminders });
      onClose();
    } catch (err) {
      toast.error('Failed to save reminders');
    } finally {
      setSaving(false);
    }
  };

  const dateLabel = event.gregorian_date
    ? format(parseISO(event.gregorian_date), 'MMM d, yyyy')
    : 'Date TBD';

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/40 dark:to-emerald-950/40">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Set Reminders</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[180px]">{event.title} · {dateLabel}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/60 transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Presets */}
        <div className="p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Quick Select</p>
          <div className="grid grid-cols-2 gap-2">
            {REMINDER_PRESETS.map(preset => {
              const active = isPresetActive(preset);
              return (
                <button
                  key={preset.label}
                  onClick={() => togglePreset(preset)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all',
                    active
                      ? 'bg-teal-500 text-white border-teal-500 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/30'
                  )}
                >
                  {active ? <Check className="w-3 h-3 flex-shrink-0" /> : <Bell className="w-3 h-3 flex-shrink-0" />}
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Active reminders summary */}
          {reminders.length > 0 && (
            <div className="mt-3 p-3 bg-teal-50 dark:bg-teal-950/30 rounded-xl border border-teal-100 dark:border-teal-900">
              <p className="text-xs font-semibold text-teal-700 dark:text-teal-300 mb-2">
                Active reminders ({reminders.length})
              </p>
              <div className="space-y-1.5">
                {reminders
                  .sort((a, b) => {
                    const toMin = r => r.time_unit === 'days' ? r.time_value * 1440 : r.time_unit === 'hours' ? r.time_value * 60 : r.time_value;
                    return toMin(b) - toMin(a);
                  })
                  .map((r, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Bell className="w-3 h-3 text-teal-500" />
                        <span className="text-xs text-teal-700 dark:text-teal-300">
                          {r.time_value} {r.time_unit} before · in-app
                        </span>
                      </div>
                      <button onClick={() => removeReminder(reminders.indexOf(r))} className="p-0.5 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3 h-3 text-slate-400" />
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {reminders.length === 0 && (
            <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
              <BellOff className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-400">No reminders set</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-4 pb-4">
          <Button variant="outline" size="sm" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            className="flex-1 bg-teal-500 hover:bg-teal-600 text-white"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save Reminders'}
          </Button>
        </div>
      </div>
    </div>
  );
}