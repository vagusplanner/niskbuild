import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, TrendingUp, Clock, Target, Calendar, 
  Zap, AlertCircle, CheckCircle, Loader2, BarChart3
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function ProductivityInsights() {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: settings } = useQuery({
    queryKey: ['userSettings'],
    queryFn: async () => {
      const list = await base44.entities.UserSettings.list();
      return list[0] || null;
    }
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list('-created_date', 100)
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 100)
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['goals'],
    queryFn: () => base44.entities.Goal.list('-created_date')
  });

  const generateInsights = async () => {
    setLoading(true);
    try {
      const completedTasks = tasks.filter(t => t.status === 'completed');
      const activeTasks = tasks.filter(t => t.status !== 'completed');
      const completedGoals = goals.filter(g => g.status === 'completed');
      
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an AI productivity coach analyzing a user's work patterns and profile settings.

User Profile Settings:
- Work Style: ${settings?.work_style || 'Not set'}
- Focus Areas: ${settings?.focus_areas?.join(', ') || 'Not set'}
- Default Meeting Duration: ${settings?.default_meeting_duration || 30} minutes
- AI Proactive Suggestions: ${settings?.ai_proactive_suggestions ? 'Enabled' : 'Disabled'}
- Notification Preferences: ${settings?.notifications_enabled ? 'Enabled' : 'Disabled'}

Historical Data:
- Total Events: ${events.length}
- Total Tasks: ${tasks.length}
- Completed Tasks: ${completedTasks.length}
- Active Tasks: ${activeTasks.length}
- Total Goals: ${goals.length}
- Completed Goals: ${completedGoals.length}

Task Categories Distribution: ${
  tasks.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + 1;
    return acc;
  }, {})
}

Analyze this data and provide:
1. Key productivity patterns based on their work style and focus areas
2. Alignment between their settings and actual usage patterns
3. Recommendations for optimizing their profile settings
4. Time management insights based on event/task distribution
5. Goal achievement patterns and suggestions

Return as JSON with structured insights.`,
        response_json_schema: {
          type: 'object',
          properties: {
            productivity_score: { 
              type: 'number',
              description: 'Overall productivity score 0-100'
            },
            key_strengths: {
              type: 'array',
              items: { type: 'string' },
              description: 'Top 3 productivity strengths'
            },
            improvement_areas: {
              type: 'array',
              items: { type: 'string' },
              description: 'Top 3 areas for improvement'
            },
            settings_recommendations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  setting: { type: 'string' },
                  current_value: { type: 'string' },
                  suggested_value: { type: 'string' },
                  reasoning: { type: 'string' }
                }
              },
              description: 'Recommended settings changes'
            },
            time_patterns: {
              type: 'object',
              properties: {
                most_productive_category: { type: 'string' },
                task_completion_rate: { type: 'number' },
                average_task_duration_insight: { type: 'string' }
              }
            },
            goal_insights: {
              type: 'object',
              properties: {
                goal_completion_rate: { type: 'number' },
                most_successful_goal_type: { type: 'string' },
                suggestions: { type: 'string' }
              }
            },
            weekly_optimization_tips: {
              type: 'array',
              items: { type: 'string' },
              description: 'Weekly actionable tips'
            }
          }
        }
      });

      setInsights(response);
    } catch (error) {
      console.error('Failed to generate insights:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!insights && !loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            AI Productivity Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-12">
          <Brain className="w-16 h-16 text-purple-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Discover Your Productivity Patterns</h3>
          <p className="text-slate-500 mb-6">
            Get AI-powered insights based on your profile settings and activity history
          </p>
          <Button 
            onClick={generateInsights}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Brain className="w-4 h-4 mr-2" />
            Generate Insights
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-slate-600">Analyzing your productivity patterns...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Productivity Score */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 mb-1">Productivity Score</p>
                <h2 className="text-4xl font-bold">{insights?.productivity_score || 0}/100</h2>
              </div>
              <div className="w-24 h-24 rounded-full border-4 border-white/30 flex items-center justify-center">
                <TrendingUp className="w-12 h-12" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Tabs defaultValue="strengths" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="strengths">Strengths</TabsTrigger>
          <TabsTrigger value="improvements">Improvements</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
        </TabsList>

        {/* Strengths Tab */}
        <TabsContent value="strengths">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Key Strengths
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {insights?.key_strengths?.map((strength, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex items-start gap-3 p-3 bg-green-50 rounded-lg"
                >
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <p className="text-slate-700">{strength}</p>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Improvements Tab */}
        <TabsContent value="improvements">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-orange-600" />
                Areas for Improvement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {insights?.improvement_areas?.map((area, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg"
                >
                  <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
                  <p className="text-slate-700">{area}</p>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Recommendations Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-600" />
                Recommended Settings Changes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {insights?.settings_recommendations?.map((rec, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="p-4 border border-purple-200 rounded-lg space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-slate-800">{rec.setting}</h4>
                    <Badge variant="outline" className="text-purple-600">Suggested</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">Current:</p>
                      <p className="font-medium text-slate-700">{rec.current_value}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Suggested:</p>
                      <p className="font-medium text-purple-600">{rec.suggested_value}</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600">{rec.reasoning}</p>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Patterns Tab */}
        <TabsContent value="patterns" className="space-y-6">
          {/* Time Patterns */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                Time Management Patterns
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600 mb-1">Most Productive Category</p>
                  <p className="text-lg font-semibold text-slate-800">
                    {insights?.time_patterns?.most_productive_category || 'N/A'}
                  </p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-600 mb-1">Task Completion Rate</p>
                  <p className="text-lg font-semibold text-slate-800">
                    {insights?.time_patterns?.task_completion_rate || 0}%
                  </p>
                </div>
              </div>
              <p className="text-sm text-slate-600">
                {insights?.time_patterns?.average_task_duration_insight}
              </p>
            </CardContent>
          </Card>

          {/* Goal Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-600" />
                Goal Achievement Patterns
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-purple-600 mb-1">Completion Rate</p>
                  <p className="text-lg font-semibold text-slate-800">
                    {insights?.goal_insights?.goal_completion_rate || 0}%
                  </p>
                </div>
                <div className="p-4 bg-indigo-50 rounded-lg">
                  <p className="text-sm text-indigo-600 mb-1">Most Successful Type</p>
                  <p className="text-lg font-semibold text-slate-800">
                    {insights?.goal_insights?.most_successful_goal_type || 'N/A'}
                  </p>
                </div>
              </div>
              <p className="text-sm text-slate-600">{insights?.goal_insights?.suggestions}</p>
            </CardContent>
          </Card>

          {/* Weekly Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-teal-600" />
                Weekly Optimization Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {insights?.weekly_optimization_tips?.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-semibold text-teal-600">{idx + 1}</span>
                    </div>
                    <p className="text-slate-700">{tip}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-center">
        <Button 
          onClick={generateInsights}
          variant="outline"
          className="border-purple-200 text-purple-600 hover:bg-purple-50"
        >
          <Brain className="w-4 h-4 mr-2" />
          Refresh Insights
        </Button>
      </div>
    </div>
  );
}