import React, { useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Plus, Smile, Heart, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { format, subDays } from 'date-fns';

const MOOD_TYPES = [
  { value: 'happy', label: 'Happy', emoji: '😊', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  { value: 'calm', label: 'Calm', emoji: '😌', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 'energetic', label: 'Energetic', emoji: '⚡', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { value: 'content', label: 'Content', emoji: '🙂', color: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'tired', label: 'Tired', emoji: '😴', color: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
  { value: 'stressed', label: 'Stressed', emoji: '😰', color: 'bg-red-100 text-red-700 border-red-300' },
  { value: 'anxious', label: 'Anxious', emoji: '😟', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { value: 'sad', label: 'Sad', emoji: '😢', color: 'bg-slate-100 text-slate-700 border-slate-300' }
];

export default function MoodTracker() {
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    time: format(new Date(), 'HH:mm'),
    mood_rating: 5,
    mood_type: 'happy',
    stress_level: 5,
    energy_level: 5,
    activities: [],
    triggers: '',
    notes: '',
    gratitude: ''
  });
  const queryClient = useQueryClient();

  const { data: recentMoods = [] } = useQuery({
    queryKey: ['moods'],
    queryFn: async () => {
      const weekAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');
      const all = await SDK.entities.Mood.list('-created_date', 50);
      return all.filter(m => m.date >= weekAgo);
    }
  });

  const createMutation = useMutation({
    mutationFn: (data) => SDK.entities.Mood.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moods'] });
      setShowDialog(false);
      setFormData({
        date: format(new Date(), 'yyyy-MM-dd'),
        time: format(new Date(), 'HH:mm'),
        mood_rating: 5,
        mood_type: 'happy',
        stress_level: 5,
        energy_level: 5,
        activities: [],
        triggers: '',
        notes: '',
        gratitude: ''
      });
      toast.success('Mood logged!');
    }
  });

  const averageMood = recentMoods.length > 0
    ? (recentMoods.reduce((acc, m) => acc + m.mood_rating, 0) / recentMoods.length).toFixed(1)
    : 0;

  const moodDistribution = MOOD_TYPES.map(type => ({
    ...type,
    count: recentMoods.filter(m => m.mood_type === type.value).length
  })).filter(t => t.count > 0).sort((a, b) => b.count - a.count);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Smile className="w-5 h-5 text-pink-600" />
              Mood Tracking
            </CardTitle>
            <Button onClick={() => setShowDialog(true)} size="sm" className="bg-pink-600 hover:bg-pink-700">
              <Plus className="w-4 h-4 mr-2" />
              Log Mood
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Average Mood */}
          <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-600 mb-1">7-Day Average</div>
                <div className="text-3xl font-bold text-slate-800">{averageMood}/10</div>
              </div>
              <div className="text-5xl">
                {averageMood >= 7 ? '😊' : averageMood >= 5 ? '🙂' : averageMood >= 3 ? '😐' : '😔'}
              </div>
            </div>
          </div>

          {/* Mood Distribution */}
          <div className="mb-6">
            <h4 className="font-semibold text-sm text-slate-700 mb-3">Recent Moods</h4>
            <div className="flex flex-wrap gap-2">
              {moodDistribution.map(mood => (
                <div
                  key={mood.value}
                  className={`px-3 py-2 rounded-lg border-2 ${mood.color} flex items-center gap-2`}
                >
                  <span className="text-xl">{mood.emoji}</span>
                  <span className="text-sm font-medium">{mood.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Entries */}
          <div>
            <h4 className="font-semibold text-sm text-slate-700 mb-3">Recent Entries</h4>
            {recentMoods.slice(0, 3).map(mood => {
              const moodType = MOOD_TYPES.find(t => t.value === mood.mood_type);
              return (
                <div key={mood.id} className="mb-3 p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{moodType?.emoji}</span>
                      <div>
                        <div className="font-medium text-slate-800">{moodType?.label}</div>
                        <div className="text-xs text-slate-500">{format(new Date(mood.date), 'MMM d')} • {mood.time}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-slate-700">{mood.mood_rating}/10</div>
                    </div>
                  </div>
                  {mood.notes && (
                    <p className="text-sm text-slate-600 mt-2">{mood.notes}</p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Log Mood Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>How are you feeling?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Mood Type</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {MOOD_TYPES.map(mood => (
                  <button
                    key={mood.value}
                    onClick={() => setFormData({ ...formData, mood_type: mood.value })}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      formData.mood_type === mood.value ? mood.color : 'border-slate-200'
                    }`}
                  >
                    <div className="text-2xl mb-1">{mood.emoji}</div>
                    <div className="text-xs">{mood.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Mood Rating: {formData.mood_rating}/10</Label>
              <Slider
                value={[formData.mood_rating]}
                onValueChange={([val]) => setFormData({ ...formData, mood_rating: val })}
                min={1}
                max={10}
                step={1}
                className="mt-2"
              />
            </div>

            <div>
              <Label>Stress Level: {formData.stress_level}/10</Label>
              <Slider
                value={[formData.stress_level]}
                onValueChange={([val]) => setFormData({ ...formData, stress_level: val })}
                min={1}
                max={10}
                step={1}
                className="mt-2"
              />
            </div>

            <div>
              <Label>Energy Level: {formData.energy_level}/10</Label>
              <Slider
                value={[formData.energy_level]}
                onValueChange={([val]) => setFormData({ ...formData, energy_level: val })}
                min={1}
                max={10}
                step={1}
                className="mt-2"
              />
            </div>

            <div>
              <Label>What influenced your mood?</Label>
              <Input
                value={formData.triggers}
                onChange={(e) => setFormData({ ...formData, triggers: e.target.value })}
                placeholder="Work, family, exercise..."
              />
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="How are you feeling today?"
                rows={3}
              />
            </div>

            <div>
              <Label>Gratitude (Optional)</Label>
              <Textarea
                value={formData.gratitude}
                onChange={(e) => setFormData({ ...formData, gratitude: e.target.value })}
                placeholder="Something you're grateful for today..."
                rows={2}
              />
            </div>

            <Button
              onClick={() => createMutation.mutate(formData)}
              className="w-full bg-pink-600 hover:bg-pink-700"
            >
              Log Mood
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}