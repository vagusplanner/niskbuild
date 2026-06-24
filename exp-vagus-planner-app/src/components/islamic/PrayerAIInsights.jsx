import React, { useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Target,
  Lightbulb,
  AlertCircle,
  Award,
  Clock,
  Calendar,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { subDays, format } from 'date-fns';

export default function PrayerAIInsights() {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);

  const { data: prayerLogs = [] } = useQuery({
    queryKey: ['prayerLogsForInsights'],
    queryFn: async () => {
      const logs = await SDK.entities.PrayerLog.filter({});
      return logs;
    }
  });

  const generateInsights = async () => {
    setLoading(true);
    try {
      // Prepare prayer data
      const last30Days = format(subDays(new Date(), 30), 'yyyy-MM-dd');
      const recentLogs = prayerLogs.filter(log => log.date >= last30Days);
      
      const summary = {
        total_prayers: recentLogs.length,
        prayed: recentLogs.filter(l => l.status === 'prayed').length,
        missed: recentLogs.filter(l => l.status === 'missed').length,
        on_time: recentLogs.filter(l => l.prayed_on_time).length,
        by_prayer: {
          Fajr: { prayed: 0, missed: 0 },
          Dhuhr: { prayed: 0, missed: 0 },
          Asr: { prayed: 0, missed: 0 },
          Maghrib: { prayed: 0, missed: 0 },
          Isha: { prayed: 0, missed: 0 }
        }
      };

      recentLogs.forEach(log => {
        if (summary.by_prayer[log.prayer_name]) {
          if (log.status === 'prayed') {
            summary.by_prayer[log.prayer_name].prayed++;
          } else {
            summary.by_prayer[log.prayer_name].missed++;
          }
        }
      });

      const prompt = `Analyze this user's prayer habits from the last 30 days and provide personalized insights:

Prayer Data:
- Total logged: ${summary.total_prayers}
- Prayers completed: ${summary.prayed} (${((summary.prayed / (30 * 5)) * 100).toFixed(1)}%)
- Prayers missed: ${summary.missed}
- Prayed on time: ${summary.on_time} out of ${summary.prayed}

By Prayer:
${Object.entries(summary.by_prayer).map(([name, data]) => 
  `- ${name}: ${data.prayed} prayed, ${data.missed} missed`
).join('\n')}

Provide:
1. Overall performance assessment (positive and encouraging)
2. Strongest prayer (most consistent)
3. Prayer needing improvement (least consistent)
4. Specific actionable recommendations (3-4 points)
5. Motivational message

Be encouraging, Islamic in tone, and focus on improvement rather than criticism.`;

      const response = await SDK.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            overall_assessment: { type: 'string' },
            completion_rate_analysis: { type: 'string' },
            strongest_prayer: { 
              type: 'object',
              properties: {
                name: { type: 'string' },
                reason: { type: 'string' }
              }
            },
            needs_improvement: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                suggestion: { type: 'string' }
              }
            },
            recommendations: {
              type: 'array',
              items: { type: 'string' }
            },
            motivational_message: { type: 'string' }
          }
        }
      });

      setInsights(response);
      toast.success('AI insights generated successfully');
    } catch (error) {
      toast.error('Failed to generate insights: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-600" />
            AI Prayer Insights
          </CardTitle>
          <p className="text-sm text-slate-600 mt-2">
            Get personalized insights and recommendations based on your prayer habits
          </p>
        </CardHeader>
        <CardContent>
          {!insights ? (
            <Button
              onClick={generateInsights}
              disabled={loading || prayerLogs.length === 0}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Analyzing Your Prayer Habits...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate AI Insights
                </>
              )}
            </Button>
          ) : (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Overall Assessment */}
                <div className="p-4 bg-white rounded-lg border border-purple-200">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-slate-800 mb-1">Overall Performance</h4>
                      <p className="text-sm text-slate-600 leading-relaxed">{insights.overall_assessment}</p>
                    </div>
                  </div>
                </div>

                {/* Completion Rate Analysis */}
                <div className="p-4 bg-white rounded-lg border border-blue-200">
                  <div className="flex items-start gap-3">
                    <Target className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-slate-800 mb-1">Progress Analysis</h4>
                      <p className="text-sm text-slate-600 leading-relaxed">{insights.completion_rate_analysis}</p>
                    </div>
                  </div>
                </div>

                {/* Strongest Prayer */}
                {insights.strongest_prayer && (
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-start gap-3">
                      <Award className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-green-800 mb-1">
                          Strongest Prayer: {insights.strongest_prayer.name}
                        </h4>
                        <p className="text-sm text-green-700 leading-relaxed">{insights.strongest_prayer.reason}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Needs Improvement */}
                {insights.needs_improvement && (
                  <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-amber-800 mb-1">
                          Focus Area: {insights.needs_improvement.name}
                        </h4>
                        <p className="text-sm text-amber-700 leading-relaxed">{insights.needs_improvement.suggestion}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {insights.recommendations && insights.recommendations.length > 0 && (
                  <div className="p-4 bg-white rounded-lg border border-slate-200">
                    <div className="flex items-start gap-3">
                      <Lightbulb className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-800 mb-3">Recommendations</h4>
                        <ul className="space-y-2">
                          {insights.recommendations.map((rec, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-teal-600 font-bold mt-0.5">•</span>
                              <span className="text-sm text-slate-600 leading-relaxed">{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Motivational Message */}
                <div className="p-4 bg-gradient-to-br from-teal-50 to-emerald-50 rounded-lg border border-teal-200">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-teal-800 mb-1">Keep Going!</h4>
                      <p className="text-sm text-teal-700 leading-relaxed italic">{insights.motivational_message}</p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={generateInsights}
                  variant="outline"
                  className="w-full border-purple-300 text-purple-700 hover:bg-purple-50"
                >
                  Refresh Insights
                </Button>
              </motion.div>
            </AnimatePresence>
          )}
        </CardContent>
      </Card>
    </div>
  );
}