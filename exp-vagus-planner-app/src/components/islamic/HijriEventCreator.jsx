import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Moon, Plus } from 'lucide-react';
import { toast } from 'sonner';

// Key Islamic recurring annual events with approx 2026 Gregorian dates
const ISLAMIC_ANNUAL_EVENTS = [
  { name: 'Laylat al-Qadr (27th Ramadan)', gregorian: '2026-03-24', category: 'prayer', color: '#8b5cf6' },
  { name: 'Eid al-Fitr', gregorian: '2026-03-31', category: 'holiday', color: '#f59e0b' },
  { name: 'Eid al-Adha', gregorian: '2026-06-17', category: 'holiday', color: '#f59e0b' },
  { name: 'Islamic New Year (1 Muharram)', gregorian: '2026-07-18', category: 'personal', color: '#06b6d4' },
  { name: 'Day of Ashura (10 Muharram)', gregorian: '2026-07-27', category: 'prayer', color: '#8b5cf6' },
  { name: 'Mawlid al-Nabi ﷺ', gregorian: '2026-09-24', category: 'personal', color: '#e8b84b' },
  { name: 'Isra wal Miraj', gregorian: '2026-02-18', category: 'prayer', color: '#8b5cf6' },
  { name: '1st Ramadan (Fasting begins)', gregorian: '2026-02-18', category: 'personal', color: '#3ecfa0' },
];

const HIJRI_MONTHS = [
  'Muharram', 'Safar', "Rabi' al-Awwal", "Rabi' al-Thani",
  'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', "Sha'ban",
  'Ramadan', 'Shawwal', "Dhul Qa'dah", 'Dhul Hijjah'
];

export default function HijriEventCreator() {
  const [form, setForm] = useState({
    title: '',
    hijri_month: '',
    hijri_day: '',
    gregorian_date: '',
    category: 'personal',
    description: '',
  });
  const [showCustom, setShowCustom] = useState(false);
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => {
      const date = data.gregorian_date;
      return SDK.entities.Event.create({
        title: data.title,
        description: data.description || `Islamic event — ${data.hijri_month ? `${data.hijri_day} ${data.hijri_month}` : ''}`,
        start_date: `${date}T08:00:00`,
        end_date: `${date}T09:00:00`,
        is_all_day: true,
        category: data.category,
        color: '#8b5cf6',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Islamic event added to calendar!');
      setForm({ title: '', hijri_month: '', hijri_day: '', gregorian_date: '', category: 'personal', description: '' });
      setShowCustom(false);
    },
    onError: () => toast.error('Failed to create event'),
  });

  const addPreset = async (event) => {
    await SDK.entities.Event.create({
      title: event.name,
      start_date: `${event.gregorian}T00:00:00`,
      end_date: `${event.gregorian}T23:59:59`,
      is_all_day: true,
      category: event.category,
      color: event.color,
      description: 'Islamic annual event',
    });
    queryClient.invalidateQueries({ queryKey: ['events'] });
    toast.success(`${event.name} added!`);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Moon className="w-4 h-4 text-indigo-500" />
          <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Hijri Calendar Events</span>
        </div>
        <button
          onClick={() => setShowCustom(s => !s)}
          className="flex items-center gap-1 text-xs text-indigo-600 font-semibold hover:underline"
        >
          <Plus className="w-3.5 h-3.5" /> Custom
        </button>
      </div>

      {/* Preset events */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">2026 Islamic Events</p>
        {ISLAMIC_ANNUAL_EVENTS.map(event => (
          <div key={event.name} className="flex items-center gap-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-3">
            <div className="w-2 h-8 rounded-full flex-shrink-0" style={{ background: event.color }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{event.name}</p>
              <p className="text-xs text-slate-400">{new Date(event.gregorian).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            </div>
            <button
              onClick={() => addPreset(event)}
              className="flex-shrink-0 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-semibold transition-colors"
            >
              + Add
            </button>
          </div>
        ))}
      </div>

      {/* Custom event form */}
      {showCustom && (
        <div className="rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/20 p-4 space-y-3">
          <p className="text-xs font-bold text-indigo-700 dark:text-indigo-400">Create Custom Hijri Event</p>
          <Input
            placeholder="Event name (e.g. 15th Sha'ban)"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-2">
            <Select value={form.hijri_month} onValueChange={v => setForm(f => ({ ...f, hijri_month: v }))}>
              <SelectTrigger className="text-xs"><SelectValue placeholder="Hijri Month" /></SelectTrigger>
              <SelectContent>
                {HIJRI_MONTHS.map(m => <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input
              type="number"
              placeholder="Day (1-30)"
              min={1} max={30}
              value={form.hijri_day}
              onChange={e => setForm(f => ({ ...f, hijri_day: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Gregorian date</label>
            <Input
              type="date"
              value={form.gregorian_date}
              onChange={e => setForm(f => ({ ...f, gregorian_date: e.target.value }))}
            />
          </div>
          <Input placeholder="Description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <Button
            onClick={() => createMutation.mutate(form)}
            disabled={!form.title || !form.gregorian_date || createMutation.isPending}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Calendar className="w-4 h-4 mr-2" />
            {createMutation.isPending ? 'Adding…' : 'Add to Calendar'}
          </Button>
        </div>
      )}
    </div>
  );
}