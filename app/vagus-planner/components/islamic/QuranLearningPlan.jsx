import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { GraduationCap, Plus, CheckCircle2, Circle, Calendar, BookOpen } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';

const SURAHS = [
  { number: 1,   name: 'Al-Fatihah',  verses: 7  },
  { number: 2,   name: 'Al-Baqarah',  verses: 286 },
  { number: 3,   name: 'Ali-Imran',   verses: 200 },
  { number: 36,  name: 'Ya-Sin',      verses: 83 },
  { number: 67,  name: 'Al-Mulk',     verses: 30 },
  { number: 112, name: 'Al-Ikhlas',   verses: 4  },
  { number: 113, name: 'Al-Falaq',    verses: 5  },
  { number: 114, name: 'An-Nas',      verses: 6  },
];

const VERSES_PER_DAY_OPTIONS = [1, 2, 3, 5, 7, 10];

export default function QuranLearningPlan() {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedSurah, setSelectedSurah] = useState('1');
  const [versesPerDay, setVersesPerDay] = useState('1');
  const queryClient = useQueryClient();

  const { data: goals = [] } = useQuery({
    queryKey: ['quranLearningGoals'],
    queryFn: () => base44.entities.Goal.filter({ category: 'spiritual' })
  });

  const quranPlans = goals.filter(g => g.title?.startsWith('📖 Learn'));

  const createPlanMutation = useMutation({
    mutationFn: async ({ surah, vpd }) => {
      const daysNeeded = Math.ceil(surah.verses / vpd);
      const endDate = addDays(new Date(), daysNeeded);
      const steps = Array.from({ length: surah.verses }, (_, i) => ({
        title: `Verse ${i + 1}${vpd > 1 ? `–${Math.min(i + vpd, surah.verses)}` : ''} of ${surah.name}`,
        completed: false,
        due_date: addDays(new Date(), Math.floor(i / vpd)).toISOString().split('T')[0]
      })).filter((_, i) => i % vpd === 0);

      return base44.entities.Goal.create({
        title: `📖 Learn ${surah.name} (${surah.verses} verses)`,
        description: `Learn Surah ${surah.name} at ${vpd} verse${vpd > 1 ? 's' : ''} per day. Complete in ~${daysNeeded} days.`,
        category: 'spiritual',
        priority: 'medium',
        status: 'in_progress',
        target_date: endDate.toISOString().split('T')[0],
        action_steps: steps,
        progress: 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quranLearningGoals'] });
      queryClient.invalidateQueries({ queryKey: ['activeGoals'] });
      toast.success('Learning plan created! Daily reminders linked to your goals 📖');
      setShowCreate(false);
    }
  });

  const toggleStepMutation = useMutation({
    mutationFn: ({ goal, stepIndex }) => {
      const steps = [...(goal.action_steps || [])];
      steps[stepIndex] = { ...steps[stepIndex], completed: !steps[stepIndex].completed };
      const completed = steps.filter(s => s.completed).length;
      const progress = Math.round((completed / steps.length) * 100);
      return base44.entities.Goal.update(goal.id, { action_steps: steps, progress, status: progress === 100 ? 'completed' : 'in_progress' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quranLearningGoals'] });
    }
  });

  const surah = SURAHS.find(s => s.number === Number(selectedSurah));
  const vpd = Number(versesPerDay);
  const daysPreview = surah ? Math.ceil(surah.verses / vpd) : 0;

  return (
    <Card className="border-emerald-200 dark:border-emerald-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-emerald-900 dark:text-emerald-100 text-base">
            <GraduationCap className="w-5 h-5" />
            Quran Learning Plans
          </CardTitle>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 h-8 text-xs" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            New Plan
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Create form */}
        {showCreate && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 space-y-3">
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Create a Learning Plan</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Surah</label>
                <Select value={selectedSurah} onValueChange={setSelectedSurah}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {SURAHS.map(s => (
                      <SelectItem key={s.number} value={s.number.toString()}>
                        {s.name} ({s.verses}v)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Verses / day</label>
                <Select value={versesPerDay} onValueChange={setVersesPerDay}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VERSES_PER_DAY_OPTIONS.map(n => (
                      <SelectItem key={n} value={n.toString()}>{n} verse{n > 1 ? 's' : ''}/day</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {surah && (
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-lg p-2">
                <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                <span><strong>{surah.name}</strong> has {surah.verses} verses → complete in <strong>~{daysPreview} days</strong> (finish by {format(addDays(new Date(), daysPreview), 'MMM d, yyyy')})</span>
              </div>
            )}
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              size="sm"
              disabled={!surah || createPlanMutation.isPending}
              onClick={() => createPlanMutation.mutate({ surah, vpd })}
            >
              {createPlanMutation.isPending ? 'Creating...' : 'Create Plan & Link to Goals'}
            </Button>
          </div>
        )}

        {/* Active plans */}
        {quranPlans.length === 0 && !showCreate && (
          <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-sm">
            <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
            No learning plans yet. Create one to start memorising verse by verse!
          </div>
        )}

        {quranPlans.map(plan => {
          const steps = plan.action_steps || [];
          const completedSteps = steps.filter(s => s.completed).length;
          const todayStr = new Date().toISOString().split('T')[0];
          const todayStep = steps.find(s => s.due_date === todayStr && !s.completed);
          const todayStepIndex = steps.findIndex(s => s.due_date === todayStr && !s.completed);

          return (
            <div key={plan.id} className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm text-slate-800 dark:text-slate-100">{plan.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{plan.description}</p>
                </div>
                <Badge variant={plan.status === 'completed' ? 'default' : 'secondary'} className="text-xs shrink-0">
                  {plan.status === 'completed' ? 'Done ✅' : `${plan.progress || 0}%`}
                </Badge>
              </div>
              <Progress value={plan.progress || 0} className="h-1.5" />
              <p className="text-xs text-slate-500">{completedSteps}/{steps.length} daily steps done</p>

              {/* Today's task */}
              {todayStep && (
                <button
                  onClick={() => toggleStepMutation.mutate({ goal: plan, stepIndex: todayStepIndex })}
                  className="w-full flex items-center gap-2 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-800 text-left hover:bg-emerald-100 dark:hover:bg-emerald-950/60 transition-colors"
                >
                  <Circle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">Today: {todayStep.title}</p>
                    <p className="text-xs text-slate-500">Tap to mark complete</p>
                  </div>
                </button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}