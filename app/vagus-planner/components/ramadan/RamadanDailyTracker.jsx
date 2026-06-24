import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Moon, Heart, Check, Loader2, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

const today = format(new Date(), 'yyyy-MM-dd');

export default function RamadanDailyTracker({ ramadanDay }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['ramadanActivity', today],
    queryFn: () => base44.entities.RamadanActivity.filter({ date: today }),
  });

  const activity = activities[0];

  const [state, setState] = useState({
    quran_pages_read: activity?.quran_pages_read ?? 0,
    taraweeh_completed: activity?.taraweeh_completed ?? false,
    charity_amount: activity?.charity_amount ?? 0,
    mood: activity?.mood ?? '',
    notes: activity?.notes ?? '',
  });

  // Sync state once activity loads
  React.useEffect(() => {
    if (activity) {
      setState({
        quran_pages_read: activity.quran_pages_read ?? 0,
        taraweeh_completed: activity.taraweeh_completed ?? false,
        charity_amount: activity.charity_amount ?? 0,
        mood: activity.mood ?? '',
        notes: activity.notes ?? '',
      });
    }
  }, [activity?.id]);

  const save = async () => {
    setSaving(true);
    const data = { ...state, date: today, day_number: ramadanDay ?? 1 };
    if (activity?.id) {
      await base44.entities.RamadanActivity.update(activity.id, data);
    } else {
      await base44.entities.RamadanActivity.create(data);
    }
    await queryClient.invalidateQueries({ queryKey: ['ramadanActivity'] });
    setSaving(false);
    toast.success('Daily tracker saved ✓');
  };

  const MOODS = [
    { value: 'excellent', emoji: '🌟', label: 'Excellent' },
    { value: 'good', emoji: '😊', label: 'Good' },
    { value: 'okay', emoji: '😐', label: 'Okay' },
    { value: 'struggling', emoji: '😔', label: 'Struggling' },
  ];

  if (isLoading) return (
    <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-violet-500" /></div>
  );

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Moon className="w-5 h-5 text-violet-600" />
          Today's Ibadah Tracker
          {ramadanDay && <Badge className="bg-violet-100 text-violet-700 text-xs">Day {ramadanDay}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 pt-0">

        {/* Quran Pages */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-teal-600" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Quran Pages Read</span>
            </div>
            <Badge className="bg-teal-50 text-teal-700 border-teal-200 font-bold">{state.quran_pages_read} pages</Badge>
          </div>
          <Slider
            min={0} max={20} step={1}
            value={[state.quran_pages_read]}
            onValueChange={([v]) => setState(s => ({ ...s, quran_pages_read: v }))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>0</span><span>5</span><span>10</span><span>15</span><span>20</span>
          </div>
          {state.quran_pages_read >= 20 && (
            <p className="text-xs text-teal-600 mt-1 font-medium">🎉 Jazakallah! Full Juz completed today!</p>
          )}
        </div>

        {/* Taraweeh */}
        <div
          className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${
            state.taraweeh_completed
              ? 'border-violet-400 bg-violet-50 dark:bg-violet-950/30'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50'
          }`}
          onClick={() => setState(s => ({ ...s, taraweeh_completed: !s.taraweeh_completed }))}
        >
          <div className="flex items-center gap-3">
            <Moon className="w-5 h-5 text-violet-600" />
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Taraweeh Prayer</p>
              <p className="text-xs text-slate-500">20 rakah night prayer</p>
            </div>
          </div>
          <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
            state.taraweeh_completed ? 'bg-violet-500 border-violet-500' : 'border-slate-300'
          }`}>
            {state.taraweeh_completed && <Check className="w-4 h-4 text-white" />}
          </div>
        </div>

        {/* Charity */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Heart className="w-4 h-4 text-rose-500" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Charity / Sadaqah</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <DollarSign className="w-4 h-4 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
              <input
                type="number"
                min="0"
                step="0.01"
                value={state.charity_amount || ''}
                onChange={e => setState(s => ({ ...s, charity_amount: parseFloat(e.target.value) || 0 }))}
                className="w-full pl-7 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-violet-400 outline-none"
                placeholder="Amount given today"
              />
            </div>
            {[1, 5, 10].map(amt => (
              <button
                key={amt}
                onClick={() => setState(s => ({ ...s, charity_amount: s.charity_amount + amt }))}
                className="px-2.5 py-2 text-xs font-medium rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors"
              >
                +£{amt}
              </button>
            ))}
          </div>
        </div>

        {/* Mood */}
        <div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Today's Spiritual Mood</p>
          <div className="grid grid-cols-4 gap-2">
            {MOODS.map(m => (
              <button
                key={m.value}
                onClick={() => setState(s => ({ ...s, mood: m.value }))}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all text-xs ${
                  state.mood === m.value
                    ? 'border-violet-400 bg-violet-50 dark:bg-violet-950/30'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <span className="text-lg">{m.emoji}</span>
                <span className="text-slate-600 dark:text-slate-400">{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <textarea
            value={state.notes}
            onChange={e => setState(s => ({ ...s, notes: e.target.value }))}
            placeholder="Reflections, duas, or notes for today…"
            rows={2}
            className="w-full text-sm p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-violet-400 outline-none resize-none"
          />
        </div>

        <Button onClick={save} disabled={saving} className="w-full bg-violet-600 hover:bg-violet-700 text-white">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
          Save Today's Progress
        </Button>
      </CardContent>
    </Card>
  );
}