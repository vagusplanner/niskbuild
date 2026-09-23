import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Brain, TrendingUp, AlertTriangle, Lightbulb, Loader2 } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { toast } from 'sonner';
import HealthAiSourcesDisclaimer from '@/components/health/HealthAiSourcesDisclaimer';
import {
  buildHealthAiCitationPromptRules,
  HEALTH_AI_SOURCE_IDS,
} from '@/lib/health-ai-sources';

export default function AIHealthInsights() {
  const [insights, setInsights] = useState(null);
  const [generating, setGenerating] = useState(false);

  const { data: sleepData = [] } = useQuery({
    queryKey: ['sleep'],
    queryFn: async () => {
      const weekAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');
      const all = await base44.entities.Sleep.list('-date', 30);
      return all.filter((s) => s.date >= weekAgo);
    },
  });

  const { data: moodData = [] } = useQuery({
    queryKey: ['moods'],
    queryFn: async () => {
      const weekAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');
      const all = await base44.entities.Mood.list('-date', 30);
      return all.filter((m) => m.date >= weekAgo);
    },
  });

  const { data: exerciseData = [] } = useQuery({
    queryKey: ['exercise'],
    queryFn: async () => {
      const weekAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');
      const all = await base44.entities.Exercise.list('-date', 30);
      return all.filter((e) => e.date >= weekAgo);
    },
  });

  const { data: nutritionData = [] } = useQuery({
    queryKey: ['nutrition'],
    queryFn: async () => {
      const weekAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');
      const all = await base44.entities.Nutrition.list('-date', 30);
      return all.filter((n) => n.date >= weekAgo);
    },
  });

  const generateInsights = async () => {
    setGenerating(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this wellness tracking data and provide general lifestyle insights and recommendations.

${buildHealthAiCitationPromptRules()}

Sleep Data (last 30 days): ${JSON.stringify(sleepData.map((s) => ({ date: s.date, hours: s.sleep_hours, quality: s.sleep_quality })))}

Mood Data (last 30 days): ${JSON.stringify(moodData.map((m) => ({ date: m.date, mood_rating: m.mood_rating, mood_type: m.mood_type, stress_level: m.stress_level, energy_level: m.energy_level })))}

Exercise Data (last 30 days): ${JSON.stringify(exerciseData.map((e) => ({ date: e.date, activity_type: e.activity_type, duration_minutes: e.duration_minutes, intensity: e.intensity })))}

Nutrition Data (last 30 days): ${JSON.stringify(nutritionData.map((n) => ({ date: n.date, calories: n.calories, protein: n.protein, carbs: n.carbs, water_ml: n.water_ml })))}

Provide:
1. Overall wellness score and trend (general lifestyle signal — not a clinical assessment)
2. Key insights about patterns (correlations between sleep, mood, exercise, nutrition)
3. Wellness alerts for concerning lifestyle patterns (frame as general guidance, not diagnoses)
4. Personalized lifestyle recommendations for improvement — cite allowlisted sources by name
5. Specific action items for the next week
6. source_ids: which allowlist ids you referenced`,
        gdpr_categories: ['health'],
        response_json_schema: {
          type: 'object',
          properties: {
            health_score: { type: 'number', description: 'Overall wellness score 0-100' },
            trend: { type: 'string', description: 'improving, stable, or declining' },
            key_insights: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  category: { type: 'string' },
                },
              },
            },
            health_risks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  risk: { type: 'string' },
                  severity: { type: 'string' },
                  recommendation: { type: 'string' },
                },
              },
            },
            recommendations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  priority: { type: 'string' },
                },
              },
            },
            action_items: {
              type: 'array',
              items: { type: 'string' },
            },
            source_ids: {
              type: 'array',
              items: { type: 'string', enum: HEALTH_AI_SOURCE_IDS },
            },
          },
        },
      });

      setInsights(response);
    } catch (error) {
      console.error('Failed to generate insights:', error);
      const msg = error instanceof Error ? error.message : String(error);
      if (/consent|art\.?\s*9|health/i.test(msg)) {
        toast.error(
          msg ||
            'Health AI requires Health / wellness consent. Enable it under Account → Privacy & Data.'
        );
      } else {
        toast.error(msg || 'Failed to generate insights');
      }
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-600" />
          AI Health Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <HealthAiSourcesDisclaimer className="mb-4" />
        {!insights ? (
          <div className="text-center py-6">
            <Sparkles className="w-12 h-12 text-purple-400 mx-auto mb-3" />
            <p className="text-slate-600 mb-4">
              Get AI-powered analysis of your wellness logs with general lifestyle recommendations
              (not medical advice)
            </p>
            <Button
              onClick={generateInsights}
              disabled={generating}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Insights
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-4 text-center">
              <div className="text-4xl font-bold text-purple-700 mb-1">
                {insights.health_score}/100
              </div>
              <div className="text-sm text-slate-600 flex items-center justify-center gap-2">
                <TrendingUp
                  className={`w-4 h-4 ${
                    insights.trend === 'improving'
                      ? 'text-green-600'
                      : insights.trend === 'declining'
                        ? 'text-red-600'
                        : 'text-slate-600'
                  }`}
                />
                {insights.trend}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">General wellness score — not a clinical assessment</p>
            </div>

            <div>
              <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-yellow-600" />
                Key Insights
              </h4>
              <div className="space-y-2">
                {insights.key_insights?.map((insight, idx) => (
                  <div key={idx} className="bg-white rounded-lg p-3">
                    <div className="font-medium text-slate-800 mb-1">{insight.title}</div>
                    <div className="text-sm text-slate-600">{insight.description}</div>
                  </div>
                ))}
              </div>
            </div>

            {insights.health_risks?.length > 0 && (
              <div>
                <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  Wellness Alerts
                </h4>
                <div className="space-y-2">
                  {insights.health_risks.map((risk, idx) => (
                    <div key={idx} className="bg-red-50 border-2 border-red-200 rounded-lg p-3">
                      <div className="font-medium text-red-800 mb-1 flex items-center gap-2">
                        {risk.risk}
                        <span className="text-xs px-2 py-0.5 bg-red-200 rounded-full">
                          {risk.severity}
                        </span>
                      </div>
                      <div className="text-sm text-red-700">{risk.recommendation}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h4 className="font-semibold text-slate-800 mb-3">Personalized Recommendations</h4>
              <div className="space-y-2">
                {insights.recommendations?.map((rec, idx) => (
                  <div key={idx} className="bg-white rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <span className="text-lg">
                        {rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢'}
                      </span>
                      <div>
                        <div className="font-medium text-slate-800">{rec.title}</div>
                        <div className="text-sm text-slate-600">{rec.description}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-slate-800 mb-3">This Week&apos;s Action Plan</h4>
              <ul className="space-y-2">
                {insights.action_items?.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="text-purple-600 font-bold">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <HealthAiSourcesDisclaimer sourceIds={insights.source_ids} />

            <Button
              onClick={generateInsights}
              disabled={generating}
              variant="outline"
              className="w-full"
            >
              Refresh Insights
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
