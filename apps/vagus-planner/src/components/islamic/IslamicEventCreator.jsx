import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Calendar, Repeat2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const HIJRI_MONTHS = [
  'Muharram', 'Safar', "Rabi' al-Awwal", "Rabi' al-Thani",
  'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', "Sha'ban",
  'Ramadan', 'Shawwal', "Dhul-Qa'dah", 'Dhul-Hijjah'
];

const EVENT_TYPES = [
  { value: 'ramadan', label: 'Ramadan', color: 'purple' },
  { value: 'eid', label: 'Eid', color: 'green' },
  { value: 'hajj_phase', label: 'Hajj Phase', color: 'amber' },
  { value: 'ashura', label: 'Ashura', color: 'red' },
  { value: 'mawlid', label: 'Mawlid', color: 'teal' },
  { value: 'special_night', label: 'Special Night', color: 'indigo' },
  { value: 'sacred_month', label: 'Sacred Month', color: 'blue' },
  { value: 'friday_prayer', label: 'Friday Prayer', color: 'cyan' },
  { value: 'custom', label: 'Custom', color: 'slate' }
];

export default function IslamicEventCreator({ onEventCreated }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    hijri_month: 1,
    hijri_day: 1,
    hijri_year: '',
    event_type: 'custom',
    description: '',
    is_recurring: true,
    recurrence_type: 'yearly',
    recurrence_days: [5], // Friday by default
    color: 'teal',
    reminder_enabled: true
  });

  const { data: hijriDate } = useQuery({
    queryKey: ['currentHijri'],
    queryFn: async () => {
      const response = await fetch('https://api.aladhan.com/v1/today');
      const data = await response.json();
      return data.data.hijri;
    }
  });

  const createEventMutation = useMutation({
    mutationFn: (data) => base44.entities.IslamicEvent.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['islamic-events']);
      setOpen(false);
      toast.success('Islamic event created!');
      if (onEventCreated) onEventCreated();
      setFormData({
        title: '',
        hijri_month: 1,
        hijri_day: 1,
        hijri_year: '',
        event_type: 'custom',
        description: '',
        is_recurring: true,
        recurrence_type: 'yearly',
        recurrence_days: [5],
        color: 'teal',
        reminder_enabled: true
      });
    }
  });

  const loadSuggestions = async () => {
    if (!hijriDate) return;
    setLoadingSuggestions(true);
    try {
      const { data } = await base44.functions.invoke('suggestIslamicDates', {
        current_hijri_month: hijriDate.month.number,
        current_hijri_year: hijriDate.year
      });
      setSuggestions(data);
    } catch (error) {
      toast.error('Failed to load suggestions');
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const applySuggestion = (suggestion) => {
    setFormData(prev => ({
      ...prev,
      title: suggestion.name,
      hijri_month: suggestion.month,
      hijri_day: suggestion.day,
      event_type: suggestion.type,
      is_recurring: suggestion.recurring,
      recurrence_type: suggestion.type === 'friday_prayer' ? 'weekly' : 'yearly'
    }));
    setSuggestions(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title) {
      toast.error('Please enter event title');
      return;
    }
    createEventMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-teal-600 hover:bg-teal-700">
          <Plus className="w-4 h-4" />
          Create Islamic Event
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Islamic Event</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quick Suggestions */}
          {!suggestions ? (
            <Button
              onClick={loadSuggestions}
              disabled={loadingSuggestions || !hijriDate}
              variant="outline"
              className="w-full"
            >
              {loadingSuggestions ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading Suggestions...
                </>
              ) : (
                '✨ Show Upcoming Islamic Dates'
              )}
            </Button>
          ) : (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg p-4 border border-teal-200 space-y-2"
            >
              <p className="text-sm font-semibold text-teal-900">Upcoming Important Dates:</p>
              <div className="space-y-2">
                {suggestions?.upcoming_dates?.map((date, idx) => (
                  <motion.button
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => applySuggestion(date)}
                    className="w-full text-left p-2 bg-white rounded-lg hover:bg-teal-100 transition-colors border border-teal-100"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{date.name}</p>
                        <p className="text-xs text-slate-600">{date.day} {HIJRI_MONTHS[date.month - 1]}</p>
                      </div>
                      <Badge className="bg-teal-100 text-teal-700">{date.type}</Badge>
                    </div>
                  </motion.button>
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSuggestions(null)}
                className="w-full text-xs"
              >
                Create Custom Event
              </Button>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Event Title</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Laylat al-Qadr"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Hijri Month</label>
                <select
                  value={formData.hijri_month}
                  onChange={(e) => setFormData({ ...formData, hijri_month: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                >
                  {HIJRI_MONTHS.map((m, i) => (
                    <option key={i} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Day</label>
                <Input
                  type="number"
                  min="1"
                  max="30"
                  value={formData.hijri_day}
                  onChange={(e) => setFormData({ ...formData, hijri_day: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Year (optional)</label>
                <Input
                  type="number"
                  value={formData.hijri_year}
                  onChange={(e) => setFormData({ ...formData, hijri_year: e.target.value })}
                  placeholder="For non-recurring"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Event Type</label>
              <select
                value={formData.event_type}
                onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                {EVENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Description</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Add details..."
              />
            </div>

            {/* Recurrence Options */}
            <div className="bg-slate-50 rounded-lg p-3 space-y-3 border border-slate-200">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_recurring}
                  onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm font-medium text-slate-700 flex items-center gap-1">
                  <Repeat2 className="w-4 h-4" />
                  Make Recurring
                </span>
              </label>

              {formData.is_recurring && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                  <select
                    value={formData.recurrence_type}
                    onChange={(e) => setFormData({ ...formData, recurrence_type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  >
                    <option value="weekly">Weekly (e.g., Friday Prayers)</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>

                  {formData.recurrence_type === 'weekly' && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Recur on Days</label>
                      <div className="grid grid-cols-4 gap-2">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              const newDays = formData.recurrence_days.includes(i)
                                ? formData.recurrence_days.filter(d => d !== i)
                                : [...formData.recurrence_days, i];
                              setFormData({ ...formData, recurrence_days: newDays });
                            }}
                            className={`p-2 rounded text-xs font-semibold ${
                              formData.recurrence_days.includes(i)
                                ? 'bg-teal-600 text-white'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.reminder_enabled}
                onChange={(e) => setFormData({ ...formData, reminder_enabled: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm text-slate-700">Enable reminders</span>
            </label>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={createEventMutation.isPending} className="flex-1 bg-teal-600 hover:bg-teal-700">
                {createEventMutation.isPending ? 'Creating...' : 'Create Event'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}