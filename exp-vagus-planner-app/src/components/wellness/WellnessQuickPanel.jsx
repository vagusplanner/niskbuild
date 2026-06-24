import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Activity, Dumbbell, Utensils, Smile, Moon, X, Plus, Droplets } from 'lucide-react';
import { format } from 'date-fns';

export default function WellnessQuickPanel({ selectedDate, onClose, onEventCreated }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  // Fetch today's wellness data
  const { data: exercises = [] } = useQuery({
    queryKey: ['exercises', dateStr],
    queryFn: () => SDK.entities.Exercise.filter({ date: dateStr })
  });

  const { data: nutrition = [] } = useQuery({
    queryKey: ['nutrition', dateStr],
    queryFn: () => SDK.entities.Nutrition.filter({ date: dateStr })
  });

  const { data: moods = [] } = useQuery({
    queryKey: ['moods', dateStr],
    queryFn: () => SDK.entities.Mood.filter({ date: dateStr })
  });

  const { data: sleeps = [] } = useQuery({
    queryKey: ['sleep', dateStr],
    queryFn: () => SDK.entities.Sleep.filter({ date: dateStr })
  });

  const todayExercise = exercises[0];
  const todayNutrition = nutrition[0];
  const todayMood = moods[0];
  const todaySleep = sleeps[0];

  // Quick stats
  const totalCalories = todayNutrition?.calories || 0;
  const totalExerciseMinutes = todayExercise?.duration_minutes || 0;
  const waterGlasses = todayNutrition?.water_intake || 0;

  const quickActions = [
    {
      id: 'exercise',
      label: 'Log Workout',
      icon: Dumbbell,
      color: 'bg-orange-50 dark:bg-orange-950 text-orange-600',
      action: () => setActiveTab('exercise')
    },
    {
      id: 'nutrition',
      label: 'Log Meal',
      icon: Utensils,
      color: 'bg-green-50 dark:bg-green-950 text-green-600',
      action: () => setActiveTab('nutrition')
    },
    {
      id: 'mood',
      label: 'Track Mood',
      icon: Smile,
      color: 'bg-yellow-50 dark:bg-yellow-950 text-yellow-600',
      action: () => setActiveTab('mood')
    },
    {
      id: 'sleep',
      label: 'Log Sleep',
      icon: Moon,
      color: 'bg-purple-50 dark:bg-purple-950 text-purple-600',
      action: () => setActiveTab('sleep')
    }
  ];

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-teal-600" />
          Wellness Tracker
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeTab === 'overview' && (
          <>
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800">
                <Dumbbell className="w-4 h-4 text-orange-600 mb-1" />
                <div className="text-lg font-bold text-orange-900 dark:text-orange-100">
                  {totalExerciseMinutes}
                </div>
                <div className="text-xs text-orange-700 dark:text-orange-300">min</div>
              </div>
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                <Utensils className="w-4 h-4 text-green-600 mb-1" />
                <div className="text-lg font-bold text-green-900 dark:text-green-100">
                  {totalCalories}
                </div>
                <div className="text-xs text-green-700 dark:text-green-300">cal</div>
              </div>
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                <Droplets className="w-4 h-4 text-blue-600 mb-1" />
                <div className="text-lg font-bold text-blue-900 dark:text-blue-100">
                  {waterGlasses}
                </div>
                <div className="text-xs text-blue-700 dark:text-blue-300">glasses</div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map(action => {
                const Icon = action.icon;
                return (
                  <Button
                    key={action.id}
                    variant="outline"
                    onClick={action.action}
                    className="h-auto py-3 flex flex-col gap-2"
                  >
                    <div className={`p-2 rounded-lg ${action.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs">{action.label}</span>
                  </Button>
                );
              })}
            </div>
          </>
        )}

        {activeTab === 'exercise' && (
          <ExerciseForm
            date={dateStr}
            existingData={todayExercise}
            onSuccess={(data) => {
              queryClient.invalidateQueries({ queryKey: ['exercises'] });
              if (onEventCreated) {
                onEventCreated({
                  title: `🏃 ${data.type}`,
                  category: 'health',
                  start_date: new Date(`${dateStr}T${data.start_time || '08:00'}`).toISOString(),
                  end_date: new Date(`${dateStr}T${data.end_time || '09:00'}`).toISOString(),
                  description: `${data.duration_minutes} minutes - ${data.calories_burned || 0} calories`
                });
              }
              setActiveTab('overview');
              toast.success('Workout logged!');
            }}
            onCancel={() => setActiveTab('overview')}
          />
        )}

        {activeTab === 'nutrition' && (
          <NutritionForm
            date={dateStr}
            existingData={todayNutrition}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['nutrition'] });
              setActiveTab('overview');
              toast.success('Meal logged!');
            }}
            onCancel={() => setActiveTab('overview')}
          />
        )}

        {activeTab === 'mood' && (
          <MoodForm
            date={dateStr}
            existingData={todayMood}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['moods'] });
              setActiveTab('overview');
              toast.success('Mood tracked!');
            }}
            onCancel={() => setActiveTab('overview')}
          />
        )}

        {activeTab === 'sleep' && (
          <SleepForm
            date={dateStr}
            existingData={todaySleep}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['sleep'] });
              setActiveTab('overview');
              toast.success('Sleep logged!');
            }}
            onCancel={() => setActiveTab('overview')}
          />
        )}
      </CardContent>
    </Card>
  );
}

function ExerciseForm({ date, existingData, onSuccess, onCancel }) {
  const [formData, setFormData] = useState(existingData || {
    type: 'running',
    duration_minutes: 30,
    start_time: '08:00',
    end_time: '08:30'
  });

  const mutation = useMutation({
    mutationFn: async (data) => {
      if (existingData) {
        return await SDK.entities.Exercise.update(existingData.id, data);
      }
      return await SDK.entities.Exercise.create({ ...data, date });
    },
    onSuccess
  });

  return (
    <div className="space-y-3">
      <div>
        <Label>Exercise Type</Label>
        <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v})}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="running">Running</SelectItem>
            <SelectItem value="cycling">Cycling</SelectItem>
            <SelectItem value="swimming">Swimming</SelectItem>
            <SelectItem value="gym">Gym Workout</SelectItem>
            <SelectItem value="yoga">Yoga</SelectItem>
            <SelectItem value="walking">Walking</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Duration (minutes)</Label>
        <Input
          type="number"
          value={formData.duration_minutes}
          onChange={(e) => setFormData({...formData, duration_minutes: parseInt(e.target.value)})}
          className="mt-1"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Start Time</Label>
          <Input
            type="time"
            value={formData.start_time}
            onChange={(e) => setFormData({...formData, start_time: e.target.value})}
            className="mt-1"
          />
        </div>
        <div>
          <Label>End Time</Label>
          <Input
            type="time"
            value={formData.end_time}
            onChange={(e) => setFormData({...formData, end_time: e.target.value})}
            className="mt-1"
          />
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button onClick={() => mutation.mutate(formData)} className="flex-1">Save</Button>
      </div>
    </div>
  );
}

function NutritionForm({ date, existingData, onSuccess, onCancel }) {
  const [formData, setFormData] = useState(existingData || {
    meal_type: 'breakfast',
    calories: 0,
    water_intake: 0
  });

  const mutation = useMutation({
    mutationFn: async (data) => {
      if (existingData) {
        return await SDK.entities.Nutrition.update(existingData.id, data);
      }
      return await SDK.entities.Nutrition.create({ ...data, date });
    },
    onSuccess
  });

  return (
    <div className="space-y-3">
      <div>
        <Label>Meal Type</Label>
        <Select value={formData.meal_type} onValueChange={(v) => setFormData({...formData, meal_type: v})}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="breakfast">Breakfast</SelectItem>
            <SelectItem value="lunch">Lunch</SelectItem>
            <SelectItem value="dinner">Dinner</SelectItem>
            <SelectItem value="snack">Snack</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Calories</Label>
        <Input
          type="number"
          value={formData.calories}
          onChange={(e) => setFormData({...formData, calories: parseInt(e.target.value)})}
          className="mt-1"
        />
      </div>
      <div>
        <Label>Water (glasses)</Label>
        <Input
          type="number"
          value={formData.water_intake}
          onChange={(e) => setFormData({...formData, water_intake: parseInt(e.target.value)})}
          className="mt-1"
        />
      </div>
      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button onClick={() => mutation.mutate(formData)} className="flex-1">Save</Button>
      </div>
    </div>
  );
}

function MoodForm({ date, existingData, onSuccess, onCancel }) {
  const [formData, setFormData] = useState(existingData || {
    mood: 'good',
    energy_level: 5,
    notes: ''
  });

  const mutation = useMutation({
    mutationFn: async (data) => {
      if (existingData) {
        return await SDK.entities.Mood.update(existingData.id, data);
      }
      return await SDK.entities.Mood.create({ ...data, date });
    },
    onSuccess
  });

  return (
    <div className="space-y-3">
      <div>
        <Label>How are you feeling?</Label>
        <Select value={formData.mood} onValueChange={(v) => setFormData({...formData, mood: v})}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="excellent">😄 Excellent</SelectItem>
            <SelectItem value="good">🙂 Good</SelectItem>
            <SelectItem value="okay">😐 Okay</SelectItem>
            <SelectItem value="bad">😞 Bad</SelectItem>
            <SelectItem value="terrible">😢 Terrible</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Energy Level (1-10)</Label>
        <Input
          type="number"
          min="1"
          max="10"
          value={formData.energy_level}
          onChange={(e) => setFormData({...formData, energy_level: parseInt(e.target.value)})}
          className="mt-1"
        />
      </div>
      <div>
        <Label>Notes (optional)</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({...formData, notes: e.target.value})}
          placeholder="How was your day?"
          className="mt-1"
        />
      </div>
      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button onClick={() => mutation.mutate(formData)} className="flex-1">Save</Button>
      </div>
    </div>
  );
}

function SleepForm({ date, existingData, onSuccess, onCancel }) {
  const [formData, setFormData] = useState(existingData || {
    hours: 8,
    quality: 'good',
    notes: ''
  });

  const mutation = useMutation({
    mutationFn: async (data) => {
      if (existingData) {
        return await SDK.entities.Sleep.update(existingData.id, data);
      }
      return await SDK.entities.Sleep.create({ ...data, date });
    },
    onSuccess
  });

  return (
    <div className="space-y-3">
      <div>
        <Label>Hours of Sleep</Label>
        <Input
          type="number"
          step="0.5"
          value={formData.hours}
          onChange={(e) => setFormData({...formData, hours: parseFloat(e.target.value)})}
          className="mt-1"
        />
      </div>
      <div>
        <Label>Quality</Label>
        <Select value={formData.quality} onValueChange={(v) => setFormData({...formData, quality: v})}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="excellent">Excellent</SelectItem>
            <SelectItem value="good">Good</SelectItem>
            <SelectItem value="fair">Fair</SelectItem>
            <SelectItem value="poor">Poor</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Notes (optional)</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({...formData, notes: e.target.value})}
          placeholder="Any dreams or disturbances?"
          className="mt-1"
        />
      </div>
      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button onClick={() => mutation.mutate(formData)} className="flex-1">Save</Button>
      </div>
    </div>
  );
}