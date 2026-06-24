import React, { useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, Flame, Calendar, Target, CheckCircle2, 
  Clock, TrendingUp, Sparkles, Play, Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';

export default function QuranReadingChallenge() {
  const [dailyTarget, setDailyTarget] = useState('1');
  const [readingTime, setReadingTime] = useState('20:00');
  const [startingChallenge, setStartingChallenge] = useState(false);
  const [todayPages, setTodayPages] = useState('');
  const [recordingProgress, setRecordingProgress] = useState(false);

  const queryClient = useQueryClient();

  // Check if user has an active Quran reading goal
  const { data: goals = [] } = useQuery({
    queryKey: ['quran-goals'],
    queryFn: async () => {
      const allGoals = await SDK.entities.Goal.filter({
        category: 'spiritual',
        status: { $in: ['not_started', 'in_progress'] }
      });
      return allGoals.filter(g => g.title.includes('Quran') || g.title.includes('قرآن'));
    }
  });

  const activeGoal = goals[0];

  // Get today's Quran reading event
  const { data: todayEvents = [] } = useQuery({
    queryKey: ['quran-events-today'],
    queryFn: async () => {
      const today = new Date();
      const todayStart = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const todayEnd = new Date(today.setHours(23, 59, 59, 999)).toISOString();
      
      const allEvents = await SDK.entities.Event.filter({
        category: 'prayer'
      });
      
      return allEvents.filter(e => {
        if (!e.start_date) return false;
        const eventDate = new Date(e.start_date);
        return eventDate >= new Date(todayStart) && eventDate <= new Date(todayEnd);
      });
    }
  });

  const todayReadingEvent = todayEvents.find(e => 
    e.title.includes('Quran') || e.title.includes('قرآن')
  );

  const startChallengeMutation = useMutation({
    mutationFn: async (params) => {
      return SDK.functions.invoke('startQuranChallenge', params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quran-goals'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Quran reading challenge started! 🎯');
      setStartingChallenge(false);
    },
    onError: () => {
      toast.error('Failed to start challenge');
      setStartingChallenge(false);
    }
  });

  const recordProgressMutation = useMutation({
    mutationFn: async (pages) => {
      if (!activeGoal) return;

      // Find today's action step
      const today = format(new Date(), 'yyyy-MM-dd');
      const todayStepIndex = activeGoal.action_steps?.findIndex(step => 
        step.due_date === today && !step.completed
      );

      if (todayStepIndex === -1) {
        throw new Error('No pending reading for today');
      }

      // Mark step as completed
      const updatedSteps = [...(activeGoal.action_steps || [])];
      updatedSteps[todayStepIndex] = {
        ...updatedSteps[todayStepIndex],
        completed: true,
        pages_read: parseInt(pages)
      };

      // Calculate progress
      const completedSteps = updatedSteps.filter(s => s.completed).length;
      const progress = Math.round((completedSteps / updatedSteps.length) * 100);

      return SDK.entities.Goal.update(activeGoal.id, {
        action_steps: updatedSteps,
        progress,
        status: progress === 100 ? 'completed' : 'in_progress'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quran-goals'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast.success('Progress recorded! 📖 Keep it up!');
      setTodayPages('');
      setRecordingProgress(false);
    }
  });

  const handleStartChallenge = () => {
    setStartingChallenge(true);
    startChallengeMutation.mutate({
      daily_pages: parseInt(dailyTarget),
      reading_time: readingTime
    });
  };

  const handleRecordProgress = () => {
    if (!todayPages || parseInt(todayPages) <= 0) {
      toast.error('Please enter number of pages read');
      return;
    }
    setRecordingProgress(true);
    recordProgressMutation.mutate(todayPages);
  };

  // Calculate streak
  const calculateStreak = () => {
    if (!activeGoal?.action_steps) return 0;
    
    const sortedSteps = [...activeGoal.action_steps]
      .sort((a, b) => new Date(b.due_date) - new Date(a.due_date));
    
    let streak = 0;
    const today = new Date();
    
    for (const step of sortedSteps) {
      const stepDate = new Date(step.due_date);
      if (differenceInDays(today, stepDate) > streak && step.completed) {
        streak++;
      } else if (!step.completed && differenceInDays(today, stepDate) >= 0) {
        break;
      }
    }
    
    return streak;
  };

  const streak = calculateStreak();
  const completedToday = activeGoal?.action_steps?.some(step => 
    step.due_date === format(new Date(), 'yyyy-MM-dd') && step.completed
  );

  if (!activeGoal) {
    return (
      <Card className="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 border-emerald-200">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white rounded-xl shadow-sm">
              <BookOpen className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-emerald-900">Daily Quran Reading Challenge</CardTitle>
              <p className="text-sm text-emerald-600 mt-1">Build a consistent reading habit</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-white/60 rounded-lg">
            <p className="text-sm text-slate-700 mb-4">
              Start your journey to complete the Quran. Set a daily target, and we'll:
            </p>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Create a personalized reading goal
              </li>
              <li className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                Schedule daily reading in your calendar
              </li>
              <li className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                Send you daily reminders
              </li>
              <li className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Track your progress and streaks
              </li>
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm text-emerald-800">Daily Pages</Label>
              <Input
                type="number"
                min="1"
                max="50"
                value={dailyTarget}
                onChange={(e) => setDailyTarget(e.target.value)}
                className="bg-white"
              />
              <p className="text-xs text-slate-500">
                {Math.ceil(604 / parseInt(dailyTarget || 1))} days to complete
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-emerald-800">Reading Time</Label>
              <Input
                type="time"
                value={readingTime}
                onChange={(e) => setReadingTime(e.target.value)}
                className="bg-white"
              />
              <p className="text-xs text-slate-500">
                Daily reminder time
              </p>
            </div>
          </div>

          <Button
            onClick={handleStartChallenge}
            disabled={startingChallenge}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
          >
            {startingChallenge ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            Start Challenge
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 border-emerald-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white rounded-xl shadow-sm">
              <BookOpen className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-emerald-900">Reading Challenge</CardTitle>
              <p className="text-sm text-emerald-600">{activeGoal.title}</p>
            </div>
          </div>
          {streak > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-2 px-3 py-2 bg-orange-100 rounded-xl"
            >
              <Flame className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold text-orange-600">{streak}</p>
                <p className="text-xs text-orange-700">day streak</p>
              </div>
            </motion.div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Overview */}
        <div className="p-4 bg-white/60 rounded-lg space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Overall Progress</span>
            <span className="font-semibold text-emerald-700">{activeGoal.progress || 0}%</span>
          </div>
          <Progress value={activeGoal.progress || 0} className="h-3" />
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              {activeGoal.action_steps?.filter(s => s.completed).length || 0} / {activeGoal.action_steps?.length || 0} days
            </span>
            {activeGoal.target_date && (
              <span>
                Target: {format(new Date(activeGoal.target_date), 'MMM d, yyyy')}
              </span>
            )}
          </div>
        </div>

        {/* Today's Reading */}
        <div className="p-4 bg-white rounded-lg border-2 border-emerald-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-600" />
              <span className="font-semibold text-emerald-900">Today's Reading</span>
            </div>
            {completedToday ? (
              <Badge className="bg-green-100 text-green-700 border-green-200">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Completed
              </Badge>
            ) : (
              <Badge variant="outline" className="border-orange-300 text-orange-700">
                Pending
              </Badge>
            )}
          </div>

          {!completedToday ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  placeholder="Pages read"
                  value={todayPages}
                  onChange={(e) => setTodayPages(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={handleRecordProgress}
                  disabled={recordingProgress}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {recordingProgress ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                </Button>
              </div>
              {todayReadingEvent && todayReadingEvent.start_date && (
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Scheduled: {format(new Date(todayReadingEvent.start_date), 'HH:mm')}
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 p-3 rounded-lg">
              <Sparkles className="w-4 h-4" />
              <span>Great job! You've completed today's reading!</span>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 bg-white rounded-lg text-center">
            <p className="text-2xl font-bold text-emerald-600">
              {activeGoal.action_steps?.filter(s => s.completed).length || 0}
            </p>
            <p className="text-xs text-slate-600">Days Read</p>
          </div>
          <div className="p-3 bg-white rounded-lg text-center">
            <p className="text-2xl font-bold text-orange-600">{streak}</p>
            <p className="text-xs text-slate-600">Streak</p>
          </div>
          <div className="p-3 bg-white rounded-lg text-center">
            <p className="text-2xl font-bold text-blue-600">
              {activeGoal.action_steps?.length - (activeGoal.action_steps?.filter(s => s.completed).length || 0)}
            </p>
            <p className="text-xs text-slate-600">Days Left</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}