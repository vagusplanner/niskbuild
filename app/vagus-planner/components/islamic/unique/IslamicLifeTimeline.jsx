import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Star, Plus, Milestone, Loader2, BookOpen, Moon, Heart, Trophy, Map, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { format } from 'date-fns';

const MILESTONE_TYPES = [
  { value: 'birth',           label: 'Birth / Beginning',    emoji: '👶', color: 'bg-blue-400' },
  { value: 'quran_start',     label: 'Started Quran',        emoji: '📖', color: 'bg-emerald-400' },
  { value: 'first_prayer',    label: 'First Prayer',         emoji: '🕌', color: 'bg-amber-400' },
  { value: 'memorized_surah', label: 'Memorized Surah',      emoji: '⭐', color: 'bg-violet-400' },
  { value: 'shahada',         label: 'Shahada / Reversion',  emoji: '🤲', color: 'bg-teal-400' },
  { value: 'hajj',            label: 'Hajj',                 emoji: '🕋', color: 'bg-orange-400' },
  { value: 'umrah',           label: 'Umrah',                emoji: '🌙', color: 'bg-indigo-400' },
  { value: 'marriage',        label: 'Nikah / Marriage',     emoji: '💍', color: 'bg-rose-400' },
  { value: 'learning',        label: 'Islamic Education',    emoji: '🎓', color: 'bg-cyan-400' },
  { value: 'charity',         label: 'Major Sadaqah',        emoji: '❤️', color: 'bg-pink-400' },
  { value: 'achievement',     label: 'Spiritual Achievement',emoji: '🏆', color: 'bg-yellow-400' },
  { value: 'other',           label: 'Other Milestone',      emoji: '✨', color: 'bg-slate-400' },
];

function TimelineNode({ milestone, index }) {
  const type = MILESTONE_TYPES.find(t => t.value === milestone.milestone_type) || MILESTONE_TYPES[11];
  const isLeft = index % 2 === 0;

  return (
    <div className={`relative flex items-center gap-4 mb-6 ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}>
      {/* Line */}
      <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-teal-200 to-emerald-200 dark:from-teal-800 dark:to-emerald-800 -translate-x-1/2 -z-10" />

      {/* Node */}
      <div className={`w-10 h-10 rounded-full ${type.color} flex items-center justify-center flex-shrink-0 shadow-md ring-4 ring-white dark:ring-slate-900 text-lg z-10 mx-auto`}
        style={{ position: 'absolute', left: 'calc(50% - 20px)' }}>
        {type.emoji}
      </div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, x: isLeft ? -20 : 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
        className={`w-[45%] ${isLeft ? 'mr-auto pr-2' : 'ml-auto pl-2'}`}
        style={{ marginLeft: isLeft ? '0' : 'auto', marginRight: isLeft ? 'auto' : '0' }}
      >
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-3 shadow-sm">
          <p className="text-xs font-black text-slate-800 dark:text-slate-100">{milestone.title}</p>
          <p className="text-[10px] text-teal-600 dark:text-teal-400 font-medium mt-0.5">{type.label}</p>
          {milestone.date && <p className="text-[9px] text-slate-400 mt-0.5">{milestone.date}</p>}
          {milestone.description && <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{milestone.description}</p>}
        </div>
      </motion.div>
    </div>
  );
}

export default function IslamicLifeTimeline() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', milestone_type: 'first_prayer', date: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const { data: milestones = [], isLoading } = useQuery({
    queryKey: ['lifeTimeline'],
    queryFn: () => base44.entities.IslamicEvent.filter({ category: 'personal' }, 'date', 100)
      .then(r => r.filter(e => MILESTONE_TYPES.some(t => e.milestone_type === t.value || e.notes?.includes('"timeline":true'))))
      .catch(() => []),
  });

  const { data: prayerLogs = [] } = useQuery({ queryKey: ['prayerLogs'], queryFn: () => base44.entities.PrayerLog.list('-date', 100) });
  const { data: quranMemory = [] } = useQuery({ queryKey: ['quranMemorization'], queryFn: () => base44.entities.QuranMemorization.list('-created_date', 50).catch(() => []) });
  const { data: hajjFeedback = [] } = useQuery({ queryKey: ['hajjFeedback'], queryFn: () => base44.entities.HajjFeedback.list('-created_date', 5).catch(() => []) });

  const save = async () => {
    if (!form.title) return toast.error('Title is required');
    setSaving(true);
    await base44.entities.IslamicEvent.create({
      title: form.title,
      category: 'personal',
      start_date: form.date ? `${form.date}T00:00:00` : new Date().toISOString(),
      date: form.date || format(new Date(), 'yyyy-MM-dd'),
      description: form.description,
      milestone_type: form.milestone_type,
      notes: JSON.stringify({ timeline: true, type: form.milestone_type }),
    });
    qc.invalidateQueries(['lifeTimeline']);
    toast.success('✨ Milestone added to your Islamic Life Timeline!');
    setForm({ title: '', milestone_type: 'first_prayer', date: '', description: '' });
    setShowAdd(false);
    setSaving(false);
  };

  const autoPopulate = async () => {
    setGenerating(true);
    // Auto-detect milestones from existing data
    const auto = [];
    if (prayerLogs.length > 0) {
      const first = [...prayerLogs].sort((a,b) => a.date?.localeCompare(b.date))[0];
      auto.push({ title: 'First Prayer Logged', milestone_type: 'first_prayer', date: first?.date || '', description: 'Your journey of consistent prayer began.' });
    }
    if (quranMemory.filter(q => q.status === 'memorized').length > 0) {
      const q = quranMemory.find(q => q.status === 'memorized');
      auto.push({ title: `Memorized Surah ${q?.surah_name}`, milestone_type: 'memorized_surah', date: q?.last_reviewed || '', description: `Alhamdulillah — ${q?.surah_name} memorized!` });
    }
    if (hajjFeedback.length > 0) {
      auto.push({ title: 'Hajj / Umrah Journey', milestone_type: 'hajj', date: hajjFeedback[0]?.created_date?.split('T')[0] || '', description: 'A blessed pilgrimage completed.' });
    }

    for (const m of auto) {
      await base44.entities.IslamicEvent.create({
        title: m.title, category: 'personal',
        start_date: m.date ? `${m.date}T00:00:00` : new Date().toISOString(),
        date: m.date || format(new Date(), 'yyyy-MM-dd'),
        description: m.description, milestone_type: m.milestone_type,
        notes: JSON.stringify({ timeline: true, type: m.milestone_type }),
      });
    }
    qc.invalidateQueries(['lifeTimeline']);
    toast.success(`✅ Auto-added ${auto.length} milestones from your activity data!`);
    setGenerating(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-amber-500" />
          <h3 className="font-black text-slate-800 dark:text-slate-100">Islamic Life Timeline</h3>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={autoPopulate} disabled={generating} className="h-8 text-xs">
            {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
            Auto
          </Button>
          <Button size="sm" onClick={() => setShowAdd(!showAdd)} className="bg-amber-500 hover:bg-amber-600 text-white h-8">
            <Plus className="w-3.5 h-3.5 mr-1" /> Add
          </Button>
        </div>
      </div>

      {showAdd && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-4 space-y-3">
          <input value={form.title} onChange={e => setForm(f=>({...f,title:e.target.value}))}
            placeholder="Milestone title (e.g. Completed Surah Al-Baqarah)"
            className="w-full px-3 py-2 text-sm rounded-xl border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400" />
          <div className="grid grid-cols-2 gap-2">
            <select value={form.milestone_type} onChange={e => setForm(f=>({...f,milestone_type:e.target.value}))}
              className="px-3 py-2 text-sm rounded-xl border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-800 focus:outline-none">
              {MILESTONE_TYPES.map(t => <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>)}
            </select>
            <input type="date" value={form.date} onChange={e => setForm(f=>({...f,date:e.target.value}))}
              className="px-3 py-2 text-sm rounded-xl border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <textarea value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))}
            placeholder="Reflection or description..." rows={2}
            className="w-full px-3 py-2 text-sm rounded-xl border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-800 focus:outline-none resize-none" />
          <div className="flex gap-2">
            <Button onClick={save} disabled={saving} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : '✨ Add Milestone'}
            </Button>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </motion.div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-amber-500" /></div>
      ) : milestones.length === 0 ? (
        <div className="text-center py-10 space-y-3">
          <div className="text-5xl">✨</div>
          <p className="text-slate-500 text-sm font-medium">Your Islamic Life Timeline is empty</p>
          <p className="text-xs text-slate-400">Add milestones like your first prayer, Hajj, or Quran completion — or tap Auto to detect from your data.</p>
        </div>
      ) : (
        <div className="relative pt-4 pb-8">
          {/* Central line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-teal-200 via-emerald-200 to-amber-200 dark:from-teal-800 dark:via-emerald-800 dark:to-amber-800 -translate-x-1/2" />
          {milestones.sort((a,b) => (a.date||'').localeCompare(b.date||'')).map((m, i) => (
            <TimelineNode key={m.id} milestone={m} index={i} />
          ))}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-amber-400 ring-4 ring-white dark:ring-slate-900" />
        </div>
      )}
    </div>
  );
}