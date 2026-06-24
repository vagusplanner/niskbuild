import React, { useState, useMemo } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  BookOpen, Plus, Flame, CheckCircle2, Trophy, Calendar, Target, ChevronRight
} from 'lucide-react';
import { format, subDays, differenceInDays } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { SURAHS, TOTAL_VERSES } from './QURAN_DATA';

// Juz names
const JUZ_NAMES = Array.from({ length: 30 }, (_, i) => ({ number: i + 1, name: `Juz ${i + 1}` }));

export default function QuranProgressTracker() {
  const [logMode, setLogMode] = useState('surah'); // surah | juz | pages
  const [showLog, setShowLog] = useState(false);
  const [logForm, setLogForm] = useState({
    surah_number: 1, surah_name: 'Al-Fatihah', from_verse: 1, to_verse: 7,
    juz: 1, pages_from: 1, pages_to: 1,
    duration_minutes: 15, notes: ''
  });
  const queryClient = useQueryClient();

  const { data: readings = [] } = useQuery({
    queryKey: ['quranReadings'],
    queryFn: () => SDK.entities.QuranReading.list('-date', 200)
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['quranGoals'],
    queryFn: () => SDK.entities.QuranGoal.list('-created_date')
  });

  const logMutation = useMutation({
    mutationFn: async (data) => {
      const entry = {
        date: format(new Date(), 'yyyy-MM-dd'),
        source: 'app',
        completed: true,
        ...data
      };
      return SDK.entities.QuranReading.create(entry);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quranReadings'] });
      toast.success('Reading logged! 📖');
      setShowLog(false);
    }
  });

  const handleLogSubmit = (e) => {
    e.preventDefault();
    let data = { duration_minutes: logForm.duration_minutes, notes: logForm.notes };
    if (logMode === 'surah') {
      const surah = SURAHS.find(s => s.number === logForm.surah_number);
      data = {
        ...data,
        surah_number: logForm.surah_number,
        surah_name: surah?.name || '',
        from_verse: logForm.from_verse,
        to_verse: logForm.to_verse,
        verses_count: Math.max(0, logForm.to_verse - logForm.from_verse + 1)
      };
    } else if (logMode === 'juz') {
      data = { ...data, surah_number: 0, surah_name: `Juz ${logForm.juz}`, verses_count: Math.round(TOTAL_VERSES / 30) };
    } else {
      data = { ...data, surah_number: 0, surah_name: `Pages ${logForm.pages_from}–${logForm.pages_to}`, verses_count: (logForm.pages_to - logForm.pages_from + 1) * 10 };
    }
    logMutation.mutate(data);
  };

  // Stats
  const totalVersesRead = useMemo(() => readings.reduce((sum, r) => sum + (r.verses_count || 0), 0), [readings]);
  const overallProgress = Math.min(100, Math.round((totalVersesRead / TOTAL_VERSES) * 100));
  const todayReadings = readings.filter(r => r.date === format(new Date(), 'yyyy-MM-dd'));
  const todayVerses = todayReadings.reduce((sum, r) => sum + (r.verses_count || 0), 0);

  // Streak
  const streak = useMemo(() => {
    let s = 0;
    let d = new Date();
    for (let i = 0; i < 365; i++) {
      const ds = format(subDays(d, i), 'yyyy-MM-dd');
      if (readings.some(r => r.date === ds)) s++;
      else break;
    }
    return s;
  }, [readings]);

  // Surahs completed (all verses logged)
  const completedSurahs = useMemo(() => {
    const surahVerses = {};
    readings.forEach(r => {
      if (r.surah_number > 0) {
        surahVerses[r.surah_number] = (surahVerses[r.surah_number] || 0) + (r.verses_count || 0);
      }
    });
    return SURAHS.filter(s => (surahVerses[s.number] || 0) >= s.verses).length;
  }, [readings]);

  const activeGoal = goals.find(g => g.status === 'active');

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: BookOpen, label: 'Quran Progress', value: `${overallProgress}%`, color: 'teal', sub: `${totalVersesRead.toLocaleString()} / ${TOTAL_VERSES} verses` },
          { icon: Flame, label: 'Reading Streak', value: `${streak}d`, color: 'orange', sub: streak > 0 ? 'Keep it up!' : 'Start today' },
          { icon: CheckCircle2, label: 'Surahs Done', value: `${completedSurahs}/114`, color: 'green', sub: 'Completed surahs' },
          { icon: Target, label: 'Today', value: `${todayVerses}`, color: 'blue', sub: 'verses read today' }
        ].map(({ icon: Icon, label, value, color, sub }) => (
          <Card key={label} className={`bg-gradient-to-br from-${color}-50 to-${color}-100/50 border-${color}-200`}>
            <CardContent className="p-3 sm:p-4 text-center">
              <Icon className={`w-5 h-5 text-${color}-600 mx-auto mb-1`} />
              <p className={`text-xl font-bold text-${color}-700`}>{value}</p>
              <p className={`text-xs text-${color}-600 font-medium`}>{label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Overall Progress Bar */}
      <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-emerald-800 flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> Full Quran Completion
            </span>
            <Badge className="bg-emerald-100 text-emerald-800">{overallProgress}%</Badge>
          </div>
          <Progress value={overallProgress} className="h-3 bg-emerald-100" />
          {overallProgress === 100 && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-emerald-700 font-semibold mt-2 text-sm">
              🎉 Masha'Allah! You have completed the Quran!
            </motion.p>
          )}
        </CardContent>
      </Card>

      {/* Active Goal */}
      {activeGoal && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-blue-800 text-sm">{activeGoal.title}</p>
                <p className="text-xs text-blue-600">
                  {activeGoal.target_verses_per_day} verses/day goal
                  {activeGoal.target_completion_date && ` · Target: ${format(new Date(activeGoal.target_completion_date), 'MMM d, yyyy')}`}
                </p>
              </div>
              {streak > 0 && (
                <Badge className="bg-orange-100 text-orange-800"><Flame className="w-3 h-3 mr-1" />{streak} day streak</Badge>
              )}
            </div>
            {activeGoal.target_verses_per_day > 0 && (
              <div className="mt-2">
                <Progress value={Math.min(100, (todayVerses / activeGoal.target_verses_per_day) * 100)} className="h-2" />
                <p className="text-xs text-blue-500 mt-1">{todayVerses}/{activeGoal.target_verses_per_day} verses today</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Log Reading Button */}
      <Button onClick={() => setShowLog(true)} className="w-full bg-emerald-600 hover:bg-emerald-700">
        <Plus className="w-4 h-4 mr-2" /> Log Today's Reading
      </Button>

      {/* Recent Readings */}
      {readings.slice(0, 5).length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-600 mb-2">Recent Sessions</h3>
          <div className="space-y-2">
            {readings.slice(0, 5).map(r => (
              <div key={r.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                <div className="p-2 bg-emerald-100 rounded-lg flex-shrink-0">
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{r.surah_name}</p>
                  <p className="text-xs text-slate-400">{r.date} · {r.verses_count} verses{r.duration_minutes ? ` · ${r.duration_minutes} min` : ''}</p>
                </div>
                {r.completed && <CheckCircle2 className="w-4 h-4 text-teal-500 flex-shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Log Dialog */}
      <Dialog open={showLog} onOpenChange={setShowLog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-600" /> Log Reading
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleLogSubmit} className="space-y-4">
            {/* Mode Switch */}
            <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
              {[['surah', 'By Surah'], ['juz', 'By Juz'], ['pages', 'By Pages']].map(([m, l]) => (
                <button
                  key={m} type="button"
                  onClick={() => setLogMode(m)}
                  className={cn("flex-1 py-1.5 text-xs font-medium rounded-md transition-all",
                    logMode === m ? 'bg-white shadow text-emerald-700' : 'text-slate-500 hover:text-slate-700'
                  )}
                >
                  {l}
                </button>
              ))}
            </div>

            {logMode === 'surah' && (
              <>
                <div>
                  <Label>Surah</Label>
                  <Select
                    value={String(logForm.surah_number)}
                    onValueChange={v => {
                      const s = SURAHS.find(s => s.number === Number(v));
                      setLogForm(f => ({ ...f, surah_number: Number(v), surah_name: s?.name || '', to_verse: s?.verses || 1 }));
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {SURAHS.map(s => (
                        <SelectItem key={s.number} value={String(s.number)}>
                          {s.number}. {s.name} ({s.verses}v)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>From Verse</Label>
                    <Input type="number" min={1} value={logForm.from_verse}
                      onChange={e => setLogForm(f => ({ ...f, from_verse: Number(e.target.value) }))} />
                  </div>
                  <div>
                    <Label>To Verse</Label>
                    <Input type="number" min={1} value={logForm.to_verse}
                      onChange={e => setLogForm(f => ({ ...f, to_verse: Number(e.target.value) }))} />
                  </div>
                </div>
              </>
            )}

            {logMode === 'juz' && (
              <div>
                <Label>Juz Number</Label>
                <Select value={String(logForm.juz)} onValueChange={v => setLogForm(f => ({ ...f, juz: Number(v) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {JUZ_NAMES.map(j => <SelectItem key={j.number} value={String(j.number)}>{j.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {logMode === 'pages' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>From Page</Label>
                  <Input type="number" min={1} max={604} value={logForm.pages_from}
                    onChange={e => setLogForm(f => ({ ...f, pages_from: Number(e.target.value) }))} />
                </div>
                <div>
                  <Label>To Page</Label>
                  <Input type="number" min={1} max={604} value={logForm.pages_to}
                    onChange={e => setLogForm(f => ({ ...f, pages_to: Number(e.target.value) }))} />
                </div>
              </div>
            )}

            <div>
              <Label>Duration (minutes)</Label>
              <Input type="number" min={1} value={logForm.duration_minutes}
                onChange={e => setLogForm(f => ({ ...f, duration_minutes: Number(e.target.value) }))} />
            </div>

            <div>
              <Label>Reflections (optional)</Label>
              <Textarea rows={2} placeholder="Any thoughts or notes..."
                value={logForm.notes} onChange={e => setLogForm(f => ({ ...f, notes: e.target.value }))} />
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowLog(false)}>Cancel</Button>
              <Button type="submit" disabled={logMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700">
                {logMutation.isPending ? 'Saving...' : 'Log Reading'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}