import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, Star, Clock } from 'lucide-react';
import { toast } from 'sonner';

const SUNNAH_PRAYERS = [
  { id: 'fajr_sunnah', name: 'Fajr Sunnah', rakaat: 2, type: 'Qabliyya', before: 'Fajr', desc: '2 rakaat before Fajr — lightest of prayers but most beloved' },
  { id: 'dhuhr_before', name: 'Dhuhr Qabliyya', rakaat: 4, type: 'Qabliyya', before: 'Dhuhr', desc: '4 rakaat before Dhuhr' },
  { id: 'dhuhr_after', name: "Dhuhr Ba\u02BFdiyya", rakaat: 2, type: "Badiyya", after: 'Dhuhr', desc: '2 rakaat after Dhuhr' },
  { id: 'maghrib_after', name: "Maghrib Ba\u02BFdiyya", rakaat: 2, type: "Badiyya", after: 'Maghrib', desc: '2 rakaat after Maghrib' },
  { id: 'isha_after', name: "Isha Ba\u02BFdiyya", rakaat: 2, type: "Badiyya", after: 'Isha', desc: '2 rakaat after Isha' },
  { id: 'witr', name: 'Witr', rakaat: 3, type: 'Witr', after: 'Isha', desc: 'Minimum 1 rakaat, recommended 3 — best to pray before sleeping' },
  { id: 'duha', name: 'Duha (Chāsht)', rakaat: 4, type: 'Nafl', desc: 'Mid-morning prayer, 2–12 rakaat — great reward' },
  { id: 'tahajjud', name: 'Tahajjud', rakaat: 8, type: 'Night', desc: 'Night prayer after waking — most virtuous voluntary prayer' },
];

const TYPE_COLORS = {
  'Qabliyya': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Badiyya': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  'Witr': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'Nafl': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Night': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
};

export default function SunnahPrayerScheduler() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const queryClient = useQueryClient();
  const [addingToCalendar, setAddingToCalendar] = useState(null);

  const { data: logs = [] } = useQuery({
    queryKey: ['prayerLogs', today],
    queryFn: () => base44.entities.PrayerLog.filter({ date: today }),
    staleTime: 30000,
  });

  const logMutation = useMutation({
    mutationFn: (prayerId) => base44.entities.PrayerLog.create({
      prayer_name: prayerId,
      date: today,
      status: 'prayed',
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['prayerLogs'] }),
  });

  const addToCalendar = async (prayer) => {
    setAddingToCalendar(prayer.id);
    try {
      const now = new Date();
      const start = new Date(now.setHours(now.getHours() + 1, 0, 0, 0));
      const end = new Date(start.getTime() + prayer.rakaat * 5 * 60000);
      await base44.entities.Event.create({
        title: `🕌 ${prayer.name} (${prayer.rakaat} rakaat)`,
        description: prayer.desc,
        start_date: start.toISOString(),
        end_date: end.toISOString(),
        category: 'prayer',
      });
      toast.success(`${prayer.name} added to calendar`);
    } catch {
      toast.error('Failed to add to calendar');
    }
    setAddingToCalendar(null);
  };

  const isDone = (id) => logs.some(l => l.prayer_name === id && l.status === 'prayed');
  const doneCount = SUNNAH_PRAYERS.filter(p => isDone(p.id)).length;

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 border border-purple-200 dark:border-purple-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-purple-600" />
          <span className="text-sm font-bold text-purple-800 dark:text-purple-300">Sunnah Prayers</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-purple-700 dark:text-purple-400">{doneCount}/{SUNNAH_PRAYERS.length}</span>
          <span className="text-xs text-purple-500">today</span>
        </div>
      </div>

      {/* Prayer list */}
      <div className="space-y-2">
        {SUNNAH_PRAYERS.map(prayer => {
          const done = isDone(prayer.id);
          return (
            <div
              key={prayer.id}
              className={`rounded-xl border p-3 transition-all ${
                done
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                  : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => !done && logMutation.mutate(prayer.id)}
                  disabled={done}
                  className="mt-0.5 flex-shrink-0"
                >
                  {done
                    ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    : <Circle className="w-5 h-5 text-slate-300 hover:text-emerald-400 transition-colors" />
                  }
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-bold ${done ? 'text-emerald-700 dark:text-emerald-400 line-through' : 'text-slate-800 dark:text-slate-100'}`}>
                      {prayer.name}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TYPE_COLORS[prayer.type]}`}>
                      {prayer.type}
                    </span>
                    <span className="text-[10px] text-slate-400">{prayer.rakaat} rakaat</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{prayer.desc}</p>
                </div>
                <button
                  onClick={() => addToCalendar(prayer)}
                  disabled={addingToCalendar === prayer.id}
                  className="flex-shrink-0 p-1.5 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 text-purple-500 transition-colors"
                  title="Schedule in calendar"
                >
                  <Clock className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}