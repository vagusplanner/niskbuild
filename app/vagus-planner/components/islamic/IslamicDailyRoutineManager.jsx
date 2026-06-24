import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Calendar, Check, Flame, Sparkles, BookOpen, Moon } from 'lucide-react';
import { toast } from 'sonner';
import DailyRoutineForm from './DailyRoutineForm';
import AILifestyleSuggestions from './AILifestyleSuggestions';

export default function IslamicDailyRoutineManager() {
  const [showForm, setShowForm] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState(null);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const queryClient = useQueryClient();

  const { data: routines = [] } = useQuery({
    queryKey: ['dailyRoutines'],
    queryFn: () => base44.entities.DailyRoutine.list('-created_date')
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.DailyRoutine.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dailyRoutines'] });
      setShowForm(false);
      setEditingRoutine(null);
      toast.success('Routine added!');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DailyRoutine.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dailyRoutines'] });
      toast.success('Routine updated!');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DailyRoutine.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dailyRoutines'] });
      toast.success('Routine removed');
    }
  });

  const toggleActive = (routine) => {
    updateMutation.mutate({
      id: routine.id,
      data: { is_active: !routine.is_active }
    });
  };

  const markCompleted = (routine) => {
    const now = new Date().toISOString();
    const lastCompleted = routine.last_completed ? new Date(routine.last_completed) : null;
    const today = new Date().setHours(0, 0, 0, 0);
    const lastDate = lastCompleted ? lastCompleted.setHours(0, 0, 0, 0) : null;
    
    const isNewDay = !lastDate || today > lastDate;
    const newStreak = isNewDay ? (routine.streak_days || 0) + 1 : routine.streak_days || 0;

    updateMutation.mutate({
      id: routine.id,
      data: {
        last_completed: now,
        completion_count: (routine.completion_count || 0) + 1,
        streak_days: newStreak
      }
    });
    toast.success('✅ Completed!');
  };

  const activeRoutines = routines.filter(r => r.is_active);
  const todayCompleted = activeRoutines.filter(r => {
    if (!r.last_completed) return false;
    const lastDate = new Date(r.last_completed).toDateString();
    const today = new Date().toDateString();
    return lastDate === today;
  });

  const getTimeLabel = (targetTime) => {
    const labels = {
      'after_fajr': 'After Fajr',
      'after_dhuhr': 'After Dhuhr',
      'after_asr': 'After Asr',
      'after_maghrib': 'After Maghrib',
      'after_isha': 'After Isha',
      'before_sleep': 'Before Sleep',
      'friday_only': 'Friday Only',
      'anytime': 'Anytime'
    };
    return labels[targetTime] || targetTime;
  };

  const getRoutineIcon = (type) => {
    const icons = {
      'quran_reading': <BookOpen className="w-4 h-4" />,
      'dhikr': <Moon className="w-4 h-4" />,
      'dua': <Moon className="w-4 h-4" />,
      'tasbih': <Moon className="w-4 h-4" />
    };
    return icons[type] || <Calendar className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-teal-600" />
                Islamic Daily Routine
              </CardTitle>
              <CardDescription>
                AI-powered daily Islamic lifestyle tracker
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowAISuggestions(true)}
                variant="outline"
                size="sm"
                className="border-purple-300 text-purple-700 hover:bg-purple-50"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                AI Suggest
              </Button>
              <Button
                onClick={() => {
                  setEditingRoutine(null);
                  setShowForm(true);
                }}
                size="sm"
                className="bg-teal-600 hover:bg-teal-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Routine
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-teal-600">{activeRoutines.length}</div>
              <div className="text-xs text-slate-600">Active Routines</div>
            </div>
            <div className="bg-white rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-emerald-600">{todayCompleted.length}</div>
              <div className="text-xs text-slate-600">Completed Today</div>
            </div>
            <div className="bg-white rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {Math.max(...activeRoutines.map(r => r.streak_days || 0), 0)}
              </div>
              <div className="text-xs text-slate-600">Best Streak</div>
            </div>
          </div>

          {activeRoutines.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-500 mb-4">No routines yet. Start building your Islamic lifestyle!</p>
              <Button
                onClick={() => setShowAISuggestions(true)}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Get AI Suggestions
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {activeRoutines.map((routine) => {
                const isCompletedToday = todayCompleted.some(r => r.id === routine.id);
                
                return (
                  <div
                    key={routine.id}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      isCompletedToday
                        ? 'bg-emerald-50 border-emerald-300'
                        : 'bg-white border-slate-200 hover:border-teal-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`p-2 rounded-lg ${
                          isCompletedToday ? 'bg-emerald-200' : 'bg-teal-100'
                        }`}>
                          {getRoutineIcon(routine.routine_type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-slate-800">{routine.title}</h4>
                            {routine.ai_suggested && (
                              <Badge variant="outline" className="text-xs border-purple-300 text-purple-700">
                                <Sparkles className="w-3 h-3 mr-1" />
                                AI
                              </Badge>
                            )}
                            {routine.streak_days > 0 && (
                              <Badge variant="outline" className="text-xs border-orange-300 text-orange-700">
                                <Flame className="w-3 h-3 mr-1" />
                                {routine.streak_days}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-600">{routine.description}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {getTimeLabel(routine.target_time)}
                            </Badge>
                            {routine.target_count && (
                              <Badge variant="outline" className="text-xs">
                                {routine.target_count}x
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs capitalize">
                              {routine.frequency}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={routine.is_active}
                          onCheckedChange={() => toggleActive(routine)}
                        />
                        {!isCompletedToday && (
                          <Button
                            size="sm"
                            onClick={() => markCompleted(routine)}
                            className="bg-emerald-600 hover:bg-emerald-700"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {showForm && (
        <DailyRoutineForm
          routine={editingRoutine}
          onClose={() => {
            setShowForm(false);
            setEditingRoutine(null);
          }}
          onSave={(data) => {
            if (editingRoutine) {
              updateMutation.mutate({ id: editingRoutine.id, data });
            } else {
              createMutation.mutate(data);
            }
          }}
        />
      )}

      {showAISuggestions && (
        <AILifestyleSuggestions
          onClose={() => setShowAISuggestions(false)}
          onAcceptSuggestion={(suggestion) => {
            createMutation.mutate({ ...suggestion, ai_suggested: true });
            setShowAISuggestions(false);
          }}
        />
      )}
    </div>
  );
}