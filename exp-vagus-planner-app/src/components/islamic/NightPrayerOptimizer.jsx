import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Star, Clock, Loader2, Sparkles, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery } from '@tanstack/react-query';

export default function NightPrayerOptimizer() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sleepTime, setSleepTime] = useState('22:30');
  const [wakeTime, setWakeTime] = useState('06:00');

  const { data: settings = [] } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => SDK.entities.UserSettings.list(),
  });

  const { data: sleepLogs = [] } = useQuery({
    queryKey: ['sleepLogs'],
    queryFn: () => SDK.entities.Sleep.list('-created_date', 7),
  });

  const generate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const s = settings[0] || {};
      const city = s.location_city || 'London';
      const avgSleep = sleepLogs.length > 0
        ? Math.round(sleepLogs.reduce((a, l) => a + (l.duration_hours || 7), 0) / sleepLogs.length)
        : 7;

      const res = await SDK.integrations.Core.InvokeLLM({
        prompt: `You are an Islamic sleep and prayer expert. Optimise a Tahajjud (night prayer) schedule.

User data:
- Location: ${city}
- Typical sleep time: ${sleepTime}
- Typical wake time: ${wakeTime}
- Average sleep duration: ${avgSleep} hours
- Fajr prayer is typically around 5:00–5:30 AM

Provide:
1. tahajjud_start: best time to start Tahajjud (HH:MM format)
2. tahajjud_end: latest time before Fajr (HH:MM format)
3. sleep_tip: one tip to adjust sleep for easier Tahajjud (max 20 words)
4. rakats_suggestion: recommended number of rakats (2, 4, 6, 8, or 11 witr included)
5. dua_suggestion: one short dua or dhikr to recite before sleeping (transliterated + meaning)
6. motivation: one hadith or ayah about the virtue of Tahajjud (with source)
7. alarm_windows: array of 2 optimal alarm time strings`,
        response_json_schema: {
          type: 'object',
          properties: {
            tahajjud_start: { type: 'string' },
            tahajjud_end: { type: 'string' },
            sleep_tip: { type: 'string' },
            rakats_suggestion: { type: 'number' },
            dua_suggestion: { type: 'string' },
            motivation: { type: 'string' },
            alarm_windows: { type: 'array', items: { type: 'string' } },
          }
        }
      });
      setResult(res);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  return (
    <div className="rounded-2xl border border-indigo-100 dark:border-indigo-900 bg-gradient-to-br from-indigo-50 to-slate-50 dark:from-indigo-950/30 dark:to-slate-900 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-5 py-4 bg-gradient-to-r from-indigo-700 to-violet-700 flex items-center gap-3">
        <div className="p-2 bg-white/10 rounded-xl">
          <Moon className="w-5 h-5 text-indigo-200" />
        </div>
        <div>
          <h3 className="font-bold text-white text-sm">Tahajjud / Night Prayer Optimizer</h3>
          <p className="text-xs text-indigo-200">AI suggests best Qiyam al-Layl window</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Usual bedtime</label>
            <input type="time" value={sleepTime} onChange={e => setSleepTime(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Usual wake time</label>
            <input type="time" value={wakeTime} onChange={e => setWakeTime(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
        </div>

        <Button onClick={generate} disabled={loading} className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:opacity-90 h-9">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Calculating…</> : <><Sparkles className="w-4 h-4 mr-2" />Optimise My Tahajjud</>}
        </Button>

        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              {/* Time window */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-indigo-600 rounded-xl text-center text-white">
                  <p className="text-[10px] font-bold opacity-70 uppercase">Start Tahajjud</p>
                  <p className="text-2xl font-black">{result.tahajjud_start}</p>
                </div>
                <div className="p-3 bg-violet-600 rounded-xl text-center text-white">
                  <p className="text-[10px] font-bold opacity-70 uppercase">Before Fajr</p>
                  <p className="text-2xl font-black">{result.tahajjud_end}</p>
                </div>
              </div>

              {/* Rakats */}
              <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-indigo-100 dark:border-indigo-900">
                <Star className="w-5 h-5 text-indigo-500 fill-indigo-400 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300">Recommended: {result.rakats_suggestion} Rakats</p>
                  <p className="text-xs text-slate-500">{result.sleep_tip}</p>
                </div>
              </div>

              {/* Alarm windows */}
              {result.alarm_windows?.length > 0 && (
                <div className="flex gap-2">
                  <Bell className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Alarm suggestions</p>
                    <div className="flex gap-2 flex-wrap">
                      {result.alarm_windows.map((t, i) => (
                        <span key={i} className="px-2.5 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-xs font-bold rounded-full border border-amber-200 dark:border-amber-800">{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Dua before sleep */}
              <div className="p-3 bg-teal-50 dark:bg-teal-950/30 rounded-xl border border-teal-100 dark:border-teal-900">
                <p className="text-xs font-bold text-teal-700 dark:text-teal-400 mb-1">🤲 Dua Before Sleep</p>
                <p className="text-xs text-teal-800 dark:text-teal-300 italic">{result.dua_suggestion}</p>
              </div>

              {/* Motivation */}
              <div className="p-3 bg-slate-800 rounded-xl">
                <p className="text-xs text-slate-300 italic leading-relaxed">✨ {result.motivation}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}