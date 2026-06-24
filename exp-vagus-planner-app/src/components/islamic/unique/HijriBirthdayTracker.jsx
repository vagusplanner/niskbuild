import React, { useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Gift, Plus, Trash2, Bell, Calendar, Star, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';

// Gregorian → approximate Hijri conversion
function toHijri(date) {
  const jd = Math.floor((14 + 153 * (date.getMonth() + 2 - 12 * Math.floor((date.getMonth() + 2) / 14)) + Math.floor((153 * (date.getMonth() + 2 - 12 * Math.floor((date.getMonth() + 2) / 14)) + 2) / 5) + 365 * (date.getFullYear() + 4716) + Math.floor((date.getFullYear() + 4716) / 4) - Math.floor((date.getFullYear() + 4716) / 100) + Math.floor((date.getFullYear() + 4716) / 400) - 1401) + 0.5);
  const l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const ll = l - 10631 * n + 354;
  const j = Math.floor((10985 - ll) / 5316) * Math.floor((50 * ll) / 17719) + Math.floor(ll / 5670) * Math.floor((43 * ll) / 15238);
  const lll = ll - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const month = Math.floor((24 * lll) / 709);
  const day = lll - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;
  const MONTHS = ['Muharram','Safar','Rabi al-Awwal','Rabi al-Thani','Jumada al-Awwal','Jumada al-Thani','Rajab',"Sha'ban",'Ramadan','Shawwal',"Dhu al-Qi'dah",'Dhu al-Hijjah'];
  return { day, month, year, monthName: MONTHS[month - 1] };
}

// Next occurrence of a Hijri month/day in Gregorian (approximate)
function daysUntilNextHijri(hijriMonth, hijriDay) {
  const today = new Date();
  for (let offset = 0; offset < 400; offset++) {
    const d = addDays(today, offset);
    const h = toHijri(d);
    if (h.month === hijriMonth && h.day === hijriDay) return offset;
  }
  return 365;
}

const OCCASION_TYPES = [
  { value: 'birthday', label: 'Birthday', emoji: '🎂' },
  { value: 'anniversary', label: 'Anniversary', emoji: '💍' },
  { value: 'milestone', label: 'Milestone', emoji: '⭐' },
  { value: 'hajj', label: 'Hajj / Umrah Date', emoji: '🕋' },
];

export default function HijriBirthdayTracker() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', date: '', type: 'birthday', notes: '' });
  const [saving, setSaving] = useState(false);

  const { data: occasions = [], isLoading } = useQuery({
    queryKey: ['hijriOccasions'],
    queryFn: () => SDK.entities.IslamicEvent.filter({ category: 'personal' }, 'title', 50),
  });

  const save = async () => {
    if (!form.name || !form.date) return toast.error('Name and date are required');
    setSaving(true);
    const greg = new Date(form.date);
    const hijri = toHijri(greg);
    const daysUntil = daysUntilNextHijri(hijri.month, hijri.day);
    const nextDate = format(addDays(new Date(), daysUntil), 'yyyy-MM-dd');

    await SDK.entities.IslamicEvent.create({
      title: `${form.name} (${OCCASION_TYPES.find(t=>t.value===form.type)?.emoji || '⭐'} ${form.type})`,
      category: 'personal',
      start_date: form.date,
      notes: JSON.stringify({ hijriDay: hijri.day, hijriMonth: hijri.month, hijriYear: hijri.year, hijriMonthName: hijri.monthName, type: form.type, userNotes: form.notes, nextHijriDate: nextDate }),
    });

    // Also create a calendar reminder
    await SDK.entities.Event.create({
      title: `🌙 ${form.name}'s Hijri ${form.type}`,
      start_date: `${nextDate}T09:00:00`,
      end_date: `${nextDate}T10:00:00`,
      category: 'personal',
      is_recurring: true,
      recurrence_type: 'yearly',
      notes: `Hijri date: ${hijri.day} ${hijri.monthName} ${hijri.year}`,
      reminders: [{ minutes_before: 1440, type: 'notification', sent: false }],
    });

    qc.invalidateQueries(['hijriOccasions']);
    toast.success(`✅ Saved! Yearly Hijri reminder added to your calendar.`);
    setForm({ name: '', date: '', type: 'birthday', notes: '' });
    setShowAdd(false);
    setSaving(false);
  };

  const remove = async (id) => {
    await SDK.entities.IslamicEvent.delete(id);
    qc.invalidateQueries(['hijriOccasions']);
    toast.success('Removed');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-amber-500" />
          <h3 className="font-black text-slate-800 dark:text-slate-100">Hijri Birthdays & Anniversaries</h3>
        </div>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)} className="bg-amber-500 hover:bg-amber-600 text-white h-8">
          <Plus className="w-3.5 h-3.5 mr-1" /> Add
        </Button>
      </div>

      {showAdd && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-4 space-y-3">
          <input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))}
            placeholder="Person / occasion name" className="w-full px-3 py-2 text-sm rounded-xl border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400" />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-amber-700 dark:text-amber-400 font-semibold mb-1 block">Gregorian Date</label>
              <input type="date" value={form.date} onChange={e => setForm(f=>({...f,date:e.target.value}))}
                className="w-full px-3 py-2 text-sm rounded-xl border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div>
              <label className="text-xs text-amber-700 dark:text-amber-400 font-semibold mb-1 block">Type</label>
              <select value={form.type} onChange={e => setForm(f=>({...f,type:e.target.value}))}
                className="w-full px-3 py-2 text-sm rounded-xl border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-800 focus:outline-none">
                {OCCASION_TYPES.map(t => <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>)}
              </select>
            </div>
          </div>
          {form.date && (
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
              🌙 Hijri: {(() => { const h = toHijri(new Date(form.date)); return `${h.day} ${h.monthName} ${h.year} AH`; })()}
            </p>
          )}
          <textarea value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))}
            placeholder="Notes (optional)" rows={2}
            className="w-full px-3 py-2 text-sm rounded-xl border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-800 focus:outline-none resize-none" />
          <div className="flex gap-2">
            <Button onClick={save} disabled={saving} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : '✅ Save & Add to Calendar'}
            </Button>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </motion.div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-amber-500" /></div>
      ) : occasions.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-sm">
          <Gift className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>No Hijri occasions yet.</p>
          <p className="text-xs mt-1">Add birthdays & anniversaries — reminders auto-sync to your calendar on the correct Islamic date each year.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {occasions.map(occ => {
            let meta = {};
            try { meta = JSON.parse(occ.notes || '{}'); } catch (_) {}
            const daysUntil = meta.hijriMonth ? daysUntilNextHijri(meta.hijriMonth, meta.hijriDay) : null;
            return (
              <div key={occ.id} className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-amber-100 dark:border-amber-900/30 shadow-sm">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{occ.title}</p>
                  {meta.hijriMonthName && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                      🌙 {meta.hijriDay} {meta.hijriMonthName} · {daysUntil === 0 ? '🎉 Today!' : `${daysUntil}d away`}
                    </p>
                  )}
                  {meta.userNotes && <p className="text-xs text-slate-400 mt-0.5 truncate">{meta.userNotes}</p>}
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                    <Calendar className="w-3 h-3 text-emerald-500" />
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Synced</span>
                  </div>
                  <button onClick={() => remove(occ.id)} className="p-1 text-slate-300 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}