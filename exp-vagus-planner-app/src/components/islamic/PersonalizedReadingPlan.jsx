import React, { useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Target, 
  TrendingUp, 
  BookOpen,
  CheckCircle2,
  Clock,
  Sparkles,
  Zap,
  Loader2,
  Play
} from 'lucide-react';
import { format, addDays, differenceInDays } from 'date-fns';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function PersonalizedReadingPlan() {
  const [generating, setGenerating] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const queryClient = useQueryClient();

  const [planConfig, setPlanConfig] = useState({
    goal_type: 'complete_quran',
    daily_commitment_minutes: 30,
    preferred_time: 'morning',
    completion_months: 6
  });

  // Fetch existing reading records
  const { data: readings = [] } = useQuery({
    queryKey: ['quran-readings'],
    queryFn: () => SDK.entities.QuranReading.list('-date', 100)
  });

  // Fetch goals
  const { data: goals = [] } = useQuery({
    queryKey: ['quran-goals'],
    queryFn: () => SDK.entities.QuranGoal.list()
  });

  const activeGoal = goals.find(g => g.status === 'active');

  // Generate personalized plan
  const generatePlan = async () => {
    setGenerating(true);
    try {
      // Calculate reading history stats
      const recentReadings = readings.slice(0, 30);
      const avgVersesPerDay = recentReadings.length > 0
        ? recentReadings.reduce((sum, r) => sum + (r.verses_count || 0), 0) / recentReadings.length
        : 0;

      const consistencyScore = recentReadings.length / 30;

      const plan = await SDK.integrations.Core.InvokeLLM({
        prompt: `Create a personalized Quran reading plan based on this user profile:

User Stats:
- Goal: ${planConfig.goal_type}
- Daily commitment: ${planConfig.daily_commitment_minutes} minutes
- Preferred time: ${planConfig.preferred_time}
- Target completion: ${planConfig.completion_months} months
- Recent average: ${avgVersesPerDay.toFixed(1)} verses/day
- Consistency: ${(consistencyScore * 100).toFixed(0)}%
- Total readings recorded: ${readings.length}
${activeGoal ? `- Active goal: ${activeGoal.title}` : ''}

Create a realistic, achievable plan with:
1. Daily verse targets (adjust based on their history)
2. Weekly milestones
3. Recommended Surahs to focus on (considering difficulty and length)
4. Tips for maintaining consistency
5. Motivational insights

Format as JSON:
{
  "daily_verses_target": number,
  "weekly_goal_verses": number,
  "recommended_surahs": [
    {"surah": number, "name": "name", "reason": "why recommended"}
  ],
  "weekly_schedule": [
    {"day": "Monday", "focus": "what to focus on", "verses": number}
  ],
  "tips": ["tip1", "tip2", "tip3"],
  "motivation": "personalized motivational message",
  "estimated_completion_date": "date in YYYY-MM-DD format"
}`,
        response_json_schema: {
          type: "object",
          properties: {
            daily_verses_target: { type: "number" },
            weekly_goal_verses: { type: "number" },
            recommended_surahs: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  surah: { type: "number" },
                  name: { type: "string" },
                  reason: { type: "string" }
                }
              }
            },
            weekly_schedule: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  day: { type: "string" },
                  focus: { type: "string" },
                  verses: { type: "number" }
                }
              }
            },
            tips: {
              type: "array",
              items: { type: "string" }
            },
            motivation: { type: "string" },
            estimated_completion_date: { type: "string" }
          }
        }
      });

      // Create or update the goal with the plan
      if (activeGoal) {
        await SDK.entities.QuranGoal.update(activeGoal.id, {
          target_verses_per_day: plan.daily_verses_target,
          target_completion_date: plan.estimated_completion_date
        });
      } else {
        await SDK.entities.QuranGoal.create({
          title: `${planConfig.goal_type.replace('_', ' ')} Plan`,
          goal_type: planConfig.goal_type,
          target_verses_per_day: plan.daily_verses_target,
          target_completion_date: plan.estimated_completion_date,
          start_date: format(new Date(), 'yyyy-MM-dd'),
          status: 'active'
        });
      }

      // Store the plan details
      localStorage.setItem('quran_reading_plan', JSON.stringify(plan));
      
      queryClient.invalidateQueries(['quran-goals']);
      setShowSetup(false);
      toast.success('Reading plan generated!');
      
      return plan;
    } catch (error) {
      toast.error('Failed to generate plan');
    } finally {
      setGenerating(false);
    }
  };

  // Calculate progress
  const calculateProgress = () => {
    if (!activeGoal) return { today: 0, week: 0, total: 0 };

    const today = format(new Date(), 'yyyy-MM-dd');
    const todayReadings = readings.filter(r => r.date === today);
    const todayVerses = todayReadings.reduce((sum, r) => sum + (r.verses_count || 0), 0);

    const weekStart = format(addDays(new Date(), -7), 'yyyy-MM-dd');
    const weekReadings = readings.filter(r => r.date >= weekStart);
    const weekVerses = weekReadings.reduce((sum, r) => sum + (r.verses_count || 0), 0);

    const totalVerses = activeGoal.current_verses_memorized || 0;

    return {
      today: todayVerses,
      week: weekVerses,
      total: totalVerses
    };
  };

  const progress = calculateProgress();
  const storedPlan = localStorage.getItem('quran_reading_plan');
  const currentPlan = storedPlan ? JSON.parse(storedPlan) : null;

  if (showSetup || !currentPlan) {
    return (
      <Card className="border-indigo-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-indigo-900">
            <Sparkles className="w-5 h-5" />
            Create Your Personalized Reading Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Reading Goal</Label>
            <Select
              value={planConfig.goal_type}
              onValueChange={(val) => setPlanConfig({ ...planConfig, goal_type: val })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="complete_quran">Complete Quran</SelectItem>
                <SelectItem value="daily_verses">Daily Verses</SelectItem>
                <SelectItem value="specific_surahs">Specific Surahs</SelectItem>
                <SelectItem value="review_memorization">Review & Memorization</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Daily Commitment (minutes)</Label>
            <Select
              value={planConfig.daily_commitment_minutes.toString()}
              onValueChange={(val) => setPlanConfig({ ...planConfig, daily_commitment_minutes: parseInt(val) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Preferred Reading Time</Label>
            <Select
              value={planConfig.preferred_time}
              onValueChange={(val) => setPlanConfig({ ...planConfig, preferred_time: val })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="morning">Morning (After Fajr)</SelectItem>
                <SelectItem value="afternoon">Afternoon</SelectItem>
                <SelectItem value="evening">Evening (After Maghrib)</SelectItem>
                <SelectItem value="night">Night (Before Sleep)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Target Completion (months)</Label>
            <Input
              type="number"
              min="1"
              max="24"
              value={planConfig.completion_months}
              onChange={(e) => setPlanConfig({ ...planConfig, completion_months: parseInt(e.target.value) })}
            />
          </div>

          <Button
            onClick={generatePlan}
            disabled={generating}
            className="w-full bg-indigo-600 hover:bg-indigo-700"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating Your Plan...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate AI Plan
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="text-sm text-green-700 font-medium">Today</span>
            </div>
            <div className="text-3xl font-bold text-green-900">
              {progress.today} <span className="text-lg text-green-600">/ {currentPlan.daily_verses_target}</span>
            </div>
            <Progress 
              value={(progress.today / currentPlan.daily_verses_target) * 100} 
              className="mt-2 h-2"
            />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-blue-700 font-medium">This Week</span>
            </div>
            <div className="text-3xl font-bold text-blue-900">
              {progress.week} <span className="text-lg text-blue-600">/ {currentPlan.weekly_goal_verses}</span>
            </div>
            <Progress 
              value={(progress.week / currentPlan.weekly_goal_verses) * 100} 
              className="mt-2 h-2"
            />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-purple-600" />
              <span className="text-sm text-purple-700 font-medium">Total Progress</span>
            </div>
            <div className="text-3xl font-bold text-purple-900">
              {activeGoal?.streak || 0} <span className="text-lg text-purple-600">day streak</span>
            </div>
            <div className="text-xs text-purple-600 mt-2">
              Target: {format(new Date(currentPlan.estimated_completion_date), 'MMM d, yyyy')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommended Surahs */}
      <Card className="border-teal-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-teal-900">
            <BookOpen className="w-5 h-5" />
            Recommended for You
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {currentPlan.recommended_surahs.map((rec, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="p-4 bg-teal-50 rounded-xl border border-teal-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-teal-900">
                      Surah {rec.surah}: {rec.name}
                    </h4>
                    <p className="text-sm text-teal-700 mt-1">{rec.reason}</p>
                  </div>
                  <Badge className="bg-teal-600">Week {idx + 1}</Badge>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Weekly Schedule */}
      <Card className="border-indigo-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-indigo-900">
            <Calendar className="w-5 h-5" />
            Your Weekly Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {currentPlan.weekly_schedule.map((day, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-20 font-semibold text-indigo-900">{day.day}</div>
                  <div className="text-sm text-indigo-700">{day.focus}</div>
                </div>
                <Badge className="bg-indigo-600">{day.verses} verses</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tips & Motivation */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-amber-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-900">
              <Zap className="w-5 h-5" />
              Tips for Success
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {currentPlan.tips.map((tip, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-amber-800">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 text-amber-600 flex-shrink-0" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rose-50 to-pink-50 border-rose-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-rose-900">
              <TrendingUp className="w-5 h-5" />
              Motivation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-rose-800 leading-relaxed">{currentPlan.motivation}</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-center">
        <Button
          onClick={() => {
            localStorage.removeItem('quran_reading_plan');
            setShowSetup(true);
          }}
          variant="outline"
          className="border-indigo-300"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Generate New Plan
        </Button>
      </div>
    </div>
  );
}