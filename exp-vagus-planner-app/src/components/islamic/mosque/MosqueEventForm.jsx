import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Calendar, MapPin, Clock, Users, AlignLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const CATEGORIES = [
  { id: 'jumua',   label: "Jumu'ah",       emoji: '🕌' },
  { id: 'iftar',   label: 'Community Iftar', emoji: '🌙' },
  { id: 'eid',     label: 'Eid Prayer',     emoji: '✨' },
  { id: 'lecture', label: 'Lecture',        emoji: '📚' },
  { id: 'quran',   label: 'Quran Circle',   emoji: '📖' },
  { id: 'hajj',    label: 'Hajj Event',     emoji: '🕋' },
  { id: 'youth',   label: 'Youth',          emoji: '⭐' },
  { id: 'charity', label: 'Charity',        emoji: '❤️' },
  { id: 'other',   label: 'Other',          emoji: '📌' },
];

export default function MosqueEventForm({ onClose, defaultDate, user }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: '',
    category: 'jumua',
    start_datetime: defaultDate
      ? `${format(defaultDate, 'yyyy-MM-dd')}T13:00`
      : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    end_datetime: defaultDate
      ? `${format(defaultDate, 'yyyy-MM-dd')}T14:00`
      : '',
    location: '',
    description: '',
    max_capacity: '',
    is_recurring: false,
    recurrence: 'weekly',
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const mutation = useMutation({
    mutationFn: () => SDK.entities.MosqueEvent.create({
      ...form,
      max_capacity: form.max_capacity ? Number(form.max_capacity) : undefined,
      organizer_email: user?.email,
      organizer_name: user?.full_name || user?.email,
      rsvp_emails: [],
      rsvp_names: [],
      is_public: true,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mosqueEvents'] });
      onClose();
    }
  });

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-safe">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-amber-100 dark:border-amber-800/40 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-slate-900">
          <div>
            <h3 className="font-black text-slate-900 dark:text-slate-100">Create Community Event</h3>
            <p className="text-xs text-amber-600 dark:text-amber-400">Visible to all mosque members</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Event Title *</label>
            <Input
              autoFocus
              placeholder="e.g. Jumu'ah Sermon, Community Iftar…"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              className="border-amber-200 dark:border-amber-800/40 focus:ring-amber-400"
            />
          </div>

          {/* Category */}
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">Category</label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => set('category', c.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all',
                    form.category === c.id
                      ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-amber-300'
                  )}
                >
                  <span>{c.emoji}</span> {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date/Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block flex items-center gap-1">
                <Clock className="w-3 h-3" /> Start *
              </label>
              <Input type="datetime-local" value={form.start_datetime} onChange={e => set('start_datetime', e.target.value)} className="text-xs border-amber-200 dark:border-amber-800/40" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">End</label>
              <Input type="datetime-local" value={form.end_datetime} onChange={e => set('end_datetime', e.target.value)} className="text-xs border-amber-200 dark:border-amber-800/40" />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Location
            </label>
            <Input placeholder="Main hall, East wing, Online…" value={form.location} onChange={e => set('location', e.target.value)} className="border-amber-200 dark:border-amber-800/40" />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block flex items-center gap-1">
              <AlignLeft className="w-3 h-3" /> Description
            </label>
            <textarea
              rows={3}
              placeholder="Details about the event…"
              value={form.description}
              onChange={e => set('description', e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-amber-200 dark:border-amber-800/40 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-400 resize-none"
            />
          </div>

          {/* Capacity + Recurring */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block flex items-center gap-1">
                <Users className="w-3 h-3" /> Max Capacity
              </label>
              <Input type="number" placeholder="Unlimited" value={form.max_capacity} onChange={e => set('max_capacity', e.target.value)} className="border-amber-200 dark:border-amber-800/40" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Recurring?</label>
              <div className="flex items-center gap-2 mt-1.5">
                <button
                  type="button"
                  onClick={() => set('is_recurring', !form.is_recurring)}
                  className={cn(
                    'w-10 h-5 rounded-full transition-colors relative',
                    form.is_recurring ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-700'
                  )}
                >
                  <div className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform', form.is_recurring ? 'translate-x-5' : 'translate-x-0.5')} />
                </button>
                {form.is_recurring && (
                  <select value={form.recurrence} onChange={e => set('recurrence', e.target.value)} className="text-xs border border-amber-200 dark:border-amber-800/40 rounded-lg px-2 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button
            className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 font-bold"
            onClick={() => mutation.mutate()}
            disabled={!form.title.trim() || !form.start_datetime || mutation.isPending}
          >
            {mutation.isPending ? 'Creating…' : 'Create Event'}
          </Button>
        </div>
      </div>
    </div>
  );
}