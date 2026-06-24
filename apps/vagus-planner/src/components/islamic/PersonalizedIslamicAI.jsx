import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  BookOpen, 
  Target,
  TrendingUp,
  Loader2,
  ChevronRight,
  Star,
  Award
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function PersonalizedIslamicAI() {
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(false);

  const { data: quranReadings = [] } = useQuery({
    queryKey: ['quranReadings'],
    queryFn: () => base44.entities.QuranReading.list('-created_date', 30)
  });

  const { data: prayerLogs = [] } = useQuery({
    queryKey: ['prayerLogs'],
    queryFn: () => base44.entities.PrayerLog.list('-date', 30)
  });

  const { data: fastingRecords = [] } = useQuery({
    queryKey: ['fastingRecords'],
    queryFn: () => base44.entities.FastingRecord.list('-date', 30)
  });

  const { data: learningProgress = [] } = useQuery({
    queryKey: ['learningProgress'],
    queryFn: () => base44.entities.LearningProgress.list('-updated_date', 20)
  });

  const generateRecommendations = async () => {
    setLoading(true);
    try {
      const user = await base44.auth.me();
      
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `As an Islamic learning advisor, analyze this user's spiritual activity and provide personalized recommendations.

USER ACTIVITY DATA:
- Quran readings in last 30 days: ${quranReadings.length} sessions
- Prayer completion rate: ${Math.round((prayerLogs.filter(p => p.completed).length / (prayerLogs.length || 1)) * 100)}%
- Fasting days completed: ${fastingRecords.filter(f => f.completed).length}
- Learning modules completed: ${learningProgress.filter(l => l.completed).length}
- Current learning topics: ${learningProgress.slice(0, 3).map(l => l.topic_name).join(', ')}

PROVIDE RECOMMENDATIONS IN THIS STRUCTURE:
{
  "next_steps": [
    {
      "title": "Clear actionable recommendation",
      "description": "Why this is beneficial for the user's spiritual growth",
      "type": "quran|hadith|learning|practice",
      "priority": "high|medium|low",
      "estimated_time": "time in minutes"
    }
  ],
  "learning_path": {
    "title": "Suggested learning path based on activity",
    "modules": ["Module 1", "Module 2", "Module 3"],
    "duration": "estimated weeks/months"
  },
  "strength_areas": ["Area where user is strong", "Another strength"],
  "improvement_areas": ["Area to focus on", "Another area"],
  "daily_goal": "One specific, achievable goal for today",
  "motivation": "Encouraging message based on their progress"
}

Make recommendations specific, actionable, and encouraging. Consider Islamic teachings and gradual progression.`,
        response_json_schema: {
          type: "object",
          properties: {
            next_steps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  type: { type: "string" },
                  priority: { type: "string" },
                  estimated_time: { type: "string" }
                }
              }
            },
            learning_path: {
              type: "object",
              properties: {
                title: { type: "string" },
                modules: { type: "array", items: { type: "string" } },
                duration: { type: "string" }
              }
            },
            strength_areas: { type: "array", items: { type: "string" } },
            improvement_areas: { type: "array", items: { type: "string" } },
            daily_goal: { type: "string" },
            motivation: { type: "string" }
          }
        }
      });

      setRecommendations(response);
    } catch (error) {
      toast.error('Failed to generate recommendations');
    } finally {
      setLoading(false);
    }
  };

  const priorityColors = {
    high: 'bg-rose-100 text-rose-700 border-rose-300',
    medium: 'bg-amber-100 text-amber-700 border-amber-300',
    low: 'bg-blue-100 text-blue-700 border-blue-300'
  };

  const typeIcons = {
    quran: BookOpen,
    hadith: BookOpen,
    learning: Target,
    practice: Star
  };

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-900">
          <Sparkles className="w-5 h-5" />
          Your Personalized Islamic Learning Path
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {!recommendations ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-semibold text-lg text-purple-900 mb-2">
              Get AI-Powered Guidance
            </h3>
            <p className="text-purple-700 mb-4 max-w-md mx-auto">
              Receive personalized recommendations based on your spiritual journey, activities, and learning progress
            </p>
            <Button
              onClick={generateRecommendations}
              disabled={loading}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing Your Journey...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Get Personalized Recommendations
                </>
              )}
            </Button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Daily Goal */}
            <div className="p-4 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl text-white">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5" />
                <h3 className="font-semibold">Today's Goal</h3>
              </div>
              <p className="text-emerald-50">{recommendations.daily_goal}</p>
            </div>

            {/* Motivation */}
            <div className="p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-purple-200">
              <p className="text-purple-900 italic">"{recommendations.motivation}"</p>
            </div>

            {/* Strengths & Areas to Improve */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded-xl border border-emerald-200">
                <div className="flex items-center gap-2 mb-3">
                  <Award className="w-5 h-5 text-emerald-600" />
                  <h4 className="font-semibold text-emerald-900">Your Strengths</h4>
                </div>
                <ul className="space-y-2">
                  {recommendations.strength_areas?.map((area, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-emerald-700">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                      {area}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 bg-white rounded-xl border border-amber-200">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-5 h-5 text-amber-600" />
                  <h4 className="font-semibold text-amber-900">Areas to Focus On</h4>
                </div>
                <ul className="space-y-2">
                  {recommendations.improvement_areas?.map((area, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-amber-700">
                      <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                      {area}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Next Steps */}
            <div className="space-y-3">
              <h4 className="font-semibold text-purple-900 flex items-center gap-2">
                <ChevronRight className="w-5 h-5" />
                Recommended Next Steps
              </h4>
              <div className="grid gap-3">
                {recommendations.next_steps?.map((step, idx) => {
                  const Icon = typeIcons[step.type] || BookOpen;
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="p-4 bg-white rounded-xl border border-purple-100 hover:border-purple-300 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <Icon className="w-5 h-5 text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h5 className="font-semibold text-purple-900">{step.title}</h5>
                            <Badge className={priorityColors[step.priority] || ''}>
                              {step.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600 mb-2">{step.description}</p>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span className="capitalize">{step.type}</span>
                            <span>•</span>
                            <span>{step.estimated_time}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Learning Path */}
            {recommendations.learning_path && (
              <div className="p-4 bg-white rounded-xl border border-indigo-200">
                <h4 className="font-semibold text-indigo-900 mb-3">
                  {recommendations.learning_path.title}
                </h4>
                <div className="space-y-2 mb-3">
                  {recommendations.learning_path.modules?.map((module, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-sm">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-xs">
                        {idx + 1}
                      </div>
                      <span className="text-slate-700">{module}</span>
                    </div>
                  ))}
                </div>
                <Badge variant="outline" className="text-indigo-700">
                  Estimated duration: {recommendations.learning_path.duration}
                </Badge>
              </div>
            )}

            {/* Refresh Button */}
            <Button
              onClick={generateRecommendations}
              disabled={loading}
              variant="outline"
              className="w-full border-purple-300"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Refresh Recommendations
            </Button>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}