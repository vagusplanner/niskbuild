import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Sparkles, TrendingUp, Target, Brain, Loader2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { format, subDays } from 'date-fns';

export default function AIPrayerCoach() {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);

  const { data: prayerLogs = [] } = useQuery({
    queryKey: ['recentPrayerLogs'],
    queryFn: () => base44.entities.PrayerLog.list('-date', 30)
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list('-created_date', 50)
  });

  const analyzePatterns = async () => {
    setLoading(true);
    try {
      const last30Days = subDays(new Date(), 30);
      const recentLogs = prayerLogs.filter(log => new Date(log.date) >= last30Days);

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this user's prayer patterns from the last 30 days and provide personalized coaching:

Prayer logs: ${JSON.stringify(recentLogs.map(log => ({
  date: log.date,
  fajr: log.fajr_status,
  dhuhr: log.dhuhr_status,
  asr: log.asr_status,
  maghrib: log.maghrib_status,
  isha: log.isha_status
})))}

Provide:
1. **Consistency Score**: Rate prayer consistency 0-100
2. **Strongest Prayer**: Which prayer they're most consistent with
3. **Needs Improvement**: Which prayer needs focus
4. **Pattern Insights**: Notable patterns (e.g., "struggles with Fajr on weekends", "consistent with all prayers during weekdays")
5. **Actionable Tips**: 3 specific, practical tips to improve
6. **Motivation**: Encouraging message based on their progress
7. **Weekly Goal**: Specific achievable goal for next week

Be encouraging, specific, and Islamic in tone.`,
        response_json_schema: {
          type: "object",
          properties: {
            consistency_score: { type: "number" },
            strongest_prayer: { type: "string" },
            needs_improvement: { type: "string" },
            pattern_insights: { 
              type: "array",
              items: { type: "string" }
            },
            actionable_tips: {
              type: "array",
              items: { type: "string" }
            },
            motivation: { type: "string" },
            weekly_goal: { type: "string" }
          }
        }
      });

      setInsights(result);
      toast.success('Analysis complete!');
    } catch (error) {
      toast.error('Failed to analyze patterns');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-indigo-600" />
              AI Prayer Coach
            </CardTitle>
            <CardDescription>
              Personalized prayer insights and guidance
            </CardDescription>
          </div>
          <Button
            onClick={analyzePatterns}
            disabled={loading || prayerLogs.length === 0}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Analyze My Prayers
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {prayerLogs.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Start logging your prayers to get AI insights!</p>
          </div>
        ) : insights ? (
          <div className="space-y-4">
            {/* Consistency Score */}
            <div className="p-4 bg-white rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Consistency Score</span>
                <span className="text-2xl font-bold text-indigo-600">{insights.consistency_score}%</span>
              </div>
              <Progress value={insights.consistency_score} className="h-3" />
            </div>

            {/* Strengths & Areas for Improvement */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-medium text-emerald-900">Strongest</span>
                </div>
                <p className="text-sm font-semibold text-emerald-700 capitalize">
                  {insights.strongest_prayer}
                </p>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-medium text-amber-900">Focus On</span>
                </div>
                <p className="text-sm font-semibold text-amber-700 capitalize">
                  {insights.needs_improvement}
                </p>
              </div>
            </div>

            {/* Pattern Insights */}
            <div className="p-4 bg-white rounded-lg">
              <h4 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2">
                <Brain className="w-4 h-4 text-indigo-600" />
                Pattern Insights
              </h4>
              <ul className="space-y-1">
                {insights.pattern_insights.map((insight, i) => (
                  <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                    <span className="text-indigo-600 mt-1">•</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Actionable Tips */}
            <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
              <h4 className="text-sm font-semibold text-purple-900 mb-3">💡 Actionable Tips</h4>
              <div className="space-y-2">
                {insights.actionable_tips.map((tip, i) => (
                  <div key={i} className="p-2 bg-white rounded-md text-sm text-slate-700">
                    {i + 1}. {tip}
                  </div>
                ))}
              </div>
            </div>

            {/* Weekly Goal */}
            <div className="p-4 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg border-2 border-teal-300">
              <div className="flex items-start gap-2">
                <Target className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-teal-900 mb-1">This Week's Goal</h4>
                  <p className="text-sm text-teal-700">{insights.weekly_goal}</p>
                </div>
              </div>
            </div>

            {/* Motivation */}
            <div className="p-4 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg text-white">
              <p className="text-sm italic text-center">"{insights.motivation}"</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-slate-600">Click "Analyze My Prayers" to get personalized insights</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}