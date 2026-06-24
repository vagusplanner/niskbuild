import React, { useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  BookOpen, Heart, Star, Smile, ChevronLeft, ChevronRight,
  Sparkles, MessageSquare, Sun, Moon, Wind, Zap, BookMarked, Plus, X
} from 'lucide-react';
import { format, subDays, addDays } from 'date-fns';
import { toast } from 'sonner';

const MOODS = [
  { value: 'peaceful', label: 'Peaceful', emoji: '😌', color: 'bg-teal-100 text-teal-700 border-teal-300' },
  { value: 'grateful', label: 'Grateful', emoji: '🤲', color: 'bg-amber-100 text-amber-700 border-amber-300' },
  { value: 'focused', label: 'Focused', emoji: '🎯', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 'content', label: 'Content', emoji: '🌿', color: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'emotional', label: 'Emotional', emoji: '💧', color: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
  { value: 'distracted', label: 'Distracted', emoji: '💭', color: 'bg-slate-100 text-slate-600 border-slate-300' },
  { value: 'rushed', label: 'Rushed', emoji: '⏰', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { value: 'struggling', label: 'Struggling', emoji: '🌧️', color: 'bg-red-100 text-red-700 border-red-300' },
];

const KHUSHU_LABELS = ['', 'Distracted', 'Moderate', 'Present', 'Focused', 'Deep Khushu'];

export default function PrayerReflectionJournal({ prayerLog = null, prayerName = 'Daily', date = null, trigger = null }) {
  const [open, setOpen] = useState(false);
  const [viewMode, setViewMode] = useState('write'); // 'write' | 'history'
  const [historyDate, setHistoryDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const [mood, setMood] = useState('');
  const [khushu, setKhushu] = useState(3);
  const [spiritualThought, setSpiritualThought] = useState('');
  const [gratitudeNote, setGratitudeNote] = useState('');
  const [duaMade, setDuaMade] = useState('');
  const [personalNote, setPersonalNote] = useState('');
  const [growthIntention, setGrowthIntention] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState([]);

  const today = format(new Date(), 'yyyy-MM-dd');
  const targetDate = date || today;
  const queryClient = useQueryClient();

  const { data: reflections = [] } = useQuery({
    queryKey: ['prayer-reflections', historyDate],
    queryFn: () => SDK.entities.PrayerReflection.filter({ date: historyDate }),
    enabled: open,
    initialData: []
  });

  const { data: todayReflection = null } = useQuery({
    queryKey: ['prayer-reflection-check', targetDate, prayerName],
    queryFn: async () => {
      const res = await SDK.entities.PrayerReflection.filter({ date: targetDate, prayer_name: prayerName });
      return res[0] || null;
    },
    enabled: open,
  });

  const saveMutation = useMutation({
    mutationFn: (data) => SDK.entities.PrayerReflection.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prayer-reflections'] });
      queryClient.invalidateQueries({ queryKey: ['prayer-reflection-check'] });
      toast.success('Reflection saved 📖');
      resetForm();
      setViewMode('history');
      setHistoryDate(targetDate);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => SDK.entities.PrayerReflection.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prayer-reflections'] });
      queryClient.invalidateQueries({ queryKey: ['prayer-reflection-check'] });
      toast.success('Reflection deleted');
    }
  });

  const resetForm = () => {
    setMood(''); setKhushu(3); setSpiritualThought('');
    setGratitudeNote(''); setDuaMade(''); setPersonalNote('');
    setGrowthIntention(''); setTags([]); setTagInput('');
  };

  const handleSave = () => {
    if (!mood) { toast.error('Please select a mood'); return; }
    saveMutation.mutate({
      date: targetDate,
      prayer_log_id: prayerLog?.id || null,
      prayer_name: prayerName,
      mood,
      khushu_rating: khushu,
      spiritual_thought: spiritualThought || null,
      gratitude_note: gratitudeNote || null,
      dua_made: duaMade || null,
      personal_note: personalNote || null,
      growth_intention: growthIntention || null,
      tags: tags.length > 0 ? tags : null
    });
  };

  const addTag = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      setTags(prev => [...new Set([...prev, tagInput.trim()])]);
      setTagInput('');
    }
  };

  const moodForReflection = (r) => MOODS.find(m => m.value === r.mood);

  return (
    <>
      {trigger ? (
        <div onClick={() => setOpen(true)}>{trigger}</div>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setOpen(true)}
          className="gap-1.5 border-violet-300 text-violet-700 hover:bg-violet-50 h-8"
        >
          <BookOpen className="w-3.5 h-3.5" />
          Reflect
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="z-[200] max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-violet-600" />
              Prayer Reflection Journal
              {prayerName !== 'Daily' && (
                <Badge className="bg-violet-100 text-violet-700 text-xs">{prayerName}</Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {/* Tab switcher */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('write')}
              className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-all ${viewMode === 'write' ? 'bg-white shadow text-violet-700' : 'text-slate-500 hover:text-slate-700'}`}
            >
              ✍️ Write Reflection
            </button>
            <button
              onClick={() => { setViewMode('history'); setHistoryDate(targetDate); }}
              className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-all ${viewMode === 'history' ? 'bg-white shadow text-violet-700' : 'text-slate-500 hover:text-slate-700'}`}
            >
              📖 Journal History
            </button>
          </div>

          <AnimatePresence mode="wait">
            {viewMode === 'write' && (
              <motion.div
                key="write"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {todayReflection && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 flex-shrink-0" />
                    You already have a reflection for this prayer today. Adding another will create a new entry.
                  </div>
                )}

                {/* Mood */}
                <div>
                  <Label className="text-sm font-semibold text-slate-700 mb-2 block">How did you feel? *</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {MOODS.map(m => (
                      <button
                        key={m.value}
                        onClick={() => setMood(m.value)}
                        className={`p-2 rounded-xl border-2 text-center transition-all text-xs font-medium ${
                          mood === m.value ? m.color + ' border-2' : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600'
                        }`}
                      >
                        <div className="text-lg mb-0.5">{m.emoji}</div>
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Khushu Rating */}
                <div>
                  <Label className="text-sm font-semibold text-slate-700 mb-2 block">
                    Khushu (Focus) Level: <span className="text-violet-600">{KHUSHU_LABELS[khushu]}</span>
                  </Label>
                  <div className="flex gap-2 items-center">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        onClick={() => setKhushu(n)}
                        className="flex-1"
                      >
                        <Star
                          className={`w-6 h-6 mx-auto transition-colors ${n <= khushu ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Spiritual thought */}
                <div>
                  <Label className="text-sm font-semibold flex items-center gap-1.5 mb-1">
                    <Sun className="w-3.5 h-3.5 text-amber-500" /> Spiritual Thought or Reflection
                  </Label>
                  <Textarea
                    value={spiritualThought}
                    onChange={e => setSpiritualThought(e.target.value)}
                    placeholder="What verse, hadith, or thought came to mind during prayer?"
                    rows={2}
                  />
                </div>

                {/* Gratitude */}
                <div>
                  <Label className="text-sm font-semibold flex items-center gap-1.5 mb-1">
                    <Heart className="w-3.5 h-3.5 text-rose-500" /> Gratitude
                  </Label>
                  <Textarea
                    value={gratitudeNote}
                    onChange={e => setGratitudeNote(e.target.value)}
                    placeholder="What are you grateful for today?"
                    rows={2}
                  />
                </div>

                {/* Dua */}
                <div>
                  <Label className="text-sm font-semibold flex items-center gap-1.5 mb-1">
                    <Wind className="w-3.5 h-3.5 text-teal-500" /> Dua Made
                  </Label>
                  <Textarea
                    value={duaMade}
                    onChange={e => setDuaMade(e.target.value)}
                    placeholder="What did you ask Allah for?"
                    rows={2}
                  />
                </div>

                {/* Growth intention */}
                <div>
                  <Label className="text-sm font-semibold flex items-center gap-1.5 mb-1">
                    <Zap className="w-3.5 h-3.5 text-violet-500" /> Growth Intention
                  </Label>
                  <Textarea
                    value={growthIntention}
                    onChange={e => setGrowthIntention(e.target.value)}
                    placeholder="How will you improve spiritually today?"
                    rows={2}
                  />
                </div>

                {/* Personal note */}
                <div>
                  <Label className="text-sm font-semibold flex items-center gap-1.5 mb-1">
                    <MessageSquare className="w-3.5 h-3.5 text-blue-500" /> Personal Note
                  </Label>
                  <Textarea
                    value={personalNote}
                    onChange={e => setPersonalNote(e.target.value)}
                    placeholder="Anything else on your mind..."
                    rows={2}
                  />
                </div>

                {/* Tags */}
                <div>
                  <Label className="text-sm font-semibold mb-1 block">Tags (press Enter to add)</Label>
                  <input
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={addTag}
                    placeholder="e.g. Ramadan, gratitude..."
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {tags.map(tag => (
                        <span key={tag} className="flex items-center gap-1 bg-violet-100 text-violet-700 text-xs px-2 py-1 rounded-full">
                          {tag}
                          <button onClick={() => setTags(prev => prev.filter(t => t !== tag))}>
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={handleSave}
                    disabled={saveMutation.isPending}
                    className="flex-1 bg-violet-600 hover:bg-violet-700"
                  >
                    <BookMarked className="w-4 h-4 mr-2" />
                    {saveMutation.isPending ? 'Saving...' : 'Save Reflection'}
                  </Button>
                  <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">Cancel</Button>
                </div>
              </motion.div>
            )}

            {viewMode === 'history' && (
              <motion.div
                key="history"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                {/* Date navigator */}
                <div className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                  <button
                    onClick={() => setHistoryDate(format(subDays(new Date(historyDate), 1), 'yyyy-MM-dd'))}
                    className="p-1 hover:bg-slate-200 rounded-md"
                  >
                    <ChevronLeft className="w-4 h-4 text-slate-600" />
                  </button>
                  <span className="text-sm font-semibold text-slate-700">
                    {historyDate === today ? 'Today' : format(new Date(historyDate + 'T12:00:00'), 'EEEE, d MMM yyyy')}
                  </span>
                  <button
                    onClick={() => {
                      const next = format(addDays(new Date(historyDate), 1), 'yyyy-MM-dd');
                      if (next <= today) setHistoryDate(next);
                    }}
                    className={`p-1 rounded-md ${historyDate >= today ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-200'}`}
                    disabled={historyDate >= today}
                  >
                    <ChevronRight className="w-4 h-4 text-slate-600" />
                  </button>
                </div>

                {reflections.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No reflections for this day.</p>
                    <button
                      onClick={() => setViewMode('write')}
                      className="mt-2 text-violet-600 text-sm font-medium hover:underline"
                    >
                      Write your first reflection →
                    </button>
                  </div>
                ) : (
                  reflections.map(r => {
                    const moodInfo = moodForReflection(r);
                    return (
                      <Card key={r.id} className="border border-violet-100">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              {moodInfo && (
                                <span className={`text-xs px-2 py-1 rounded-full border font-medium ${moodInfo.color}`}>
                                  {moodInfo.emoji} {moodInfo.label}
                                </span>
                              )}
                              <Badge className="bg-violet-100 text-violet-700 text-xs">{r.prayer_name}</Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              {r.khushu_rating && (
                                <div className="flex gap-0.5">
                                  {[1,2,3,4,5].map(n => (
                                    <Star key={n} className={`w-3 h-3 ${n <= r.khushu_rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                                  ))}
                                </div>
                              )}
                              <button
                                onClick={() => deleteMutation.mutate(r.id)}
                                className="text-slate-300 hover:text-red-400 transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {r.spiritual_thought && (
                            <div className="text-sm">
                              <span className="text-amber-600 font-medium text-xs">✨ Spiritual Thought</span>
                              <p className="text-slate-700 mt-0.5">{r.spiritual_thought}</p>
                            </div>
                          )}
                          {r.gratitude_note && (
                            <div className="text-sm">
                              <span className="text-rose-500 font-medium text-xs">❤️ Gratitude</span>
                              <p className="text-slate-700 mt-0.5">{r.gratitude_note}</p>
                            </div>
                          )}
                          {r.dua_made && (
                            <div className="text-sm">
                              <span className="text-teal-600 font-medium text-xs">🤲 Dua</span>
                              <p className="text-slate-700 mt-0.5">{r.dua_made}</p>
                            </div>
                          )}
                          {r.growth_intention && (
                            <div className="text-sm">
                              <span className="text-violet-600 font-medium text-xs">⚡ Growth Intention</span>
                              <p className="text-slate-700 mt-0.5">{r.growth_intention}</p>
                            </div>
                          )}
                          {r.personal_note && (
                            <div className="text-sm">
                              <span className="text-blue-600 font-medium text-xs">💬 Personal Note</span>
                              <p className="text-slate-700 mt-0.5">{r.personal_note}</p>
                            </div>
                          )}
                          {r.tags?.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {r.tags.map(tag => (
                                <span key={tag} className="bg-violet-50 text-violet-600 text-xs px-2 py-0.5 rounded-full border border-violet-200">#{tag}</span>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </>
  );
}