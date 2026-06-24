import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Dumbbell, Flame, Clock, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfWeek, subDays } from 'date-fns';

const ACTIVITY_TYPES = [
  { value: 'cardio', label: '🏃 Cardio', icon: '🏃' },
  { value: 'strength', label: '💪 Strength', icon: '💪' },
  { value: 'yoga', label: '🧘 Yoga', icon: '🧘' },
  { value: 'sports', label: '⚽ Sports', icon: '⚽' },
  { value: 'walking', label: '🚶 Walking', icon: '🚶' },
  { value: 'running', label: '🏃 Running', icon: '🏃' },
  { value: 'cycling', label: '🚴 Cycling', icon: '🚴' },
  { value: 'swimming', label: '🏊 Swimming', icon: '🏊' }
];

export default function ExerciseTracker() {
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    activity_type: 'cardio',
    activity_name: '',
    duration_minutes: '',
    calories_burned: '',
    intensity: 'moderate',
    distance_km: '',
    notes: '',
    feeling_after: 'normal'
  });
  const queryClient = useQueryClient();

  const { data: todayExercises = [] } = useQuery({
    queryKey: ['exercise', formData.date],
    queryFn: () => base44.entities.Exercise.filter({ date: formData.date }, '-created_date')
  });

  const { data: weekExercises = [] } = useQuery({
    queryKey: ['exercise', 'week'],
    queryFn: async () => {
      const weekStart = format(startOfWeek(new Date()), 'yyyy-MM-dd');
      const all = await base44.entities.Exercise.list('-date', 100);
      return all.filter(e => e.date >= weekStart);
    }
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Exercise.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise'] });
      setShowDialog(false);
      setFormData({
        date: format(new Date(), 'yyyy-MM-dd'),
        activity_type: 'cardio',
        activity_name: '',
        duration_minutes: '',
        calories_burned: '',
        intensity: 'moderate',
        distance_km: '',
        notes: '',
        feeling_after: 'normal'
      });
      toast.success('Exercise logged!');
    }
  });

  const weekStats = weekExercises.reduce((acc, ex) => ({
    totalMinutes: acc.totalMinutes + (ex.duration_minutes || 0),
    totalCalories: acc.totalCalories + (ex.calories_burned || 0),
    workouts: acc.workouts + 1
  }), { totalMinutes: 0, totalCalories: 0, workouts: 0 });

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-purple-600" />
              Exercise Tracking
            </CardTitle>
            <Button onClick={() => setShowDialog(true)} size="sm" className="bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4 mr-2" />
              Log Workout
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Weekly Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-purple-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-purple-700">{weekStats.workouts}</div>
              <div className="text-xs text-purple-600">Workouts</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <Clock className="w-4 h-4 text-blue-600 mx-auto mb-1" />
              <div className="text-xl font-bold text-blue-700">{weekStats.totalMinutes}min</div>
              <div className="text-xs text-blue-600">This Week</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-3 text-center">
              <Flame className="w-4 h-4 text-orange-600 mx-auto mb-1" />
              <div className="text-xl font-bold text-orange-700">{weekStats.totalCalories}</div>
              <div className="text-xs text-orange-600">Calories</div>
            </div>
          </div>

          {/* Today's Exercises */}
          <div>
            <h4 className="font-semibold text-sm text-slate-700 mb-3">Today's Workouts</h4>
            {todayExercises.length > 0 ? (
              <div className="space-y-2">
                {todayExercises.map(ex => (
                  <div key={ex.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {ACTIVITY_TYPES.find(a => a.value === ex.activity_type)?.icon || '🏃'}
                      </span>
                      <div>
                        <div className="font-medium text-slate-800">{ex.activity_name}</div>
                        <div className="text-xs text-slate-500">
                          {ex.duration_minutes} min • {ex.intensity}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-orange-600">{ex.calories_burned || 0} cal</div>
                      {ex.distance_km && (
                        <div className="text-xs text-slate-500">{ex.distance_km} km</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400">
                No workouts logged today
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Log Exercise Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Log Workout</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Activity Type</Label>
              <Select value={formData.activity_type} onValueChange={(val) => setFormData({ ...formData, activity_type: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Activity Name</Label>
              <Input
                value={formData.activity_name}
                onChange={(e) => setFormData({ ...formData, activity_name: e.target.value })}
                placeholder="e.g., Morning Run"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Duration (min)</Label>
                <Input
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: parseFloat(e.target.value) || '' })}
                />
              </div>
              <div>
                <Label>Calories</Label>
                <Input
                  type="number"
                  value={formData.calories_burned}
                  onChange={(e) => setFormData({ ...formData, calories_burned: parseFloat(e.target.value) || '' })}
                />
              </div>
            </div>
            <div>
              <Label>Intensity</Label>
              <Select value={formData.intensity} onValueChange={(val) => setFormData({ ...formData, intensity: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="vigorous">Vigorous</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Distance (km) - Optional</Label>
              <Input
                type="number"
                value={formData.distance_km}
                onChange={(e) => setFormData({ ...formData, distance_km: parseFloat(e.target.value) || '' })}
              />
            </div>
            <div>
              <Label>How do you feel?</Label>
              <Select value={formData.feeling_after} onValueChange={(val) => setFormData({ ...formData, feeling_after: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="energized">😃 Energized</SelectItem>
                  <SelectItem value="great">😊 Great</SelectItem>
                  <SelectItem value="normal">😐 Normal</SelectItem>
                  <SelectItem value="tired">😓 Tired</SelectItem>
                  <SelectItem value="sore">😣 Sore</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => createMutation.mutate(formData)}
              disabled={!formData.activity_name || !formData.duration_minutes}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              Log Workout
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}