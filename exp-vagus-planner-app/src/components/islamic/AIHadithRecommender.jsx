import React, { useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Sparkles, Loader2, Calendar, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function AIHadithRecommender() {
  const [query, setQuery] = useState('');
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [useCalendarContext, setUseCalendarContext] = useState(true);

  const { data: settings = [] } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => SDK.entities.UserSettings.list()
  });

  const { data: todayEvents = [] } = useQuery({
    queryKey: ['todayEvents'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      return SDK.entities.Event.filter({ start_date: today });
    }
  });

  const { data: upcomingEvents = [] } = useQuery({
    queryKey: ['upcomingEvents'],
    queryFn: async () => {
      const today = new Date().toISOString();
      return SDK.entities.Event.list('start_date', 10);
    }
  });

  const userSettings = settings[0] || {};

  const generateRecommendations = async () => {
    setLoading(true);
    try {
      const calendarContext = useCalendarContext 
        ? `Today's Events: ${todayEvents.map(e => e.title).join(', ') || 'None'}\nUpcoming: ${upcomingEvents.slice(0, 3).map(e => e.title).join(', ')}`
        : '';

      const response = await SDK.integrations.Core.InvokeLLM({
        prompt: `As an Islamic knowledge expert, recommend relevant Hadith based on the user's context and needs.

USER CONTEXT:
- Focus Areas: ${userSettings.focus_areas?.join(', ') || 'General'}
- Work Style: ${userSettings.work_style || 'Not specified'}
${query ? `- Specific Query: ${query}` : ''}
${calendarContext ? `- Calendar Context:\n${calendarContext}` : ''}

Provide Hadith recommendations in this format:
{
  "recommendations": [
    {
      "hadith_text": "The hadith narration",
      "narrator": "Name of narrator",
      "reference": "Collection and number (e.g., Sahih Bukhari 6011)",
      "relevance": "Why this hadith is relevant to their situation",
      "practical_lesson": "Key takeaway and how to apply it",
      "category": "worship|character|knowledge|family|work",
      "priority": "high|medium|low"
    }
  ],
  "daily_reminder": "A brief motivational message based on the hadiths",
  "action_items": [
    "Specific action they can take today",
    "Another actionable item"
  ]
}

Select hadiths that are authentic (Sahih), practical, and directly applicable to their current situation.`,
        response_json_schema: {
          type: "object",
          properties: {
            recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  hadith_text: { type: "string" },
                  narrator: { type: "string" },
                  reference: { type: "string" },
                  relevance: { type: "string" },
                  practical_lesson: { type: "string" },
                  category: { type: "string" },
                  priority: { type: "string" }
                }
              }
            },
            daily_reminder: { type: "string" },
            action_items: { type: "array", items: { type: "string" } }
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

  const categoryColors = {
    worship: 'bg-purple-100 text-purple-700',
    character: 'bg-blue-100 text-blue-700',
    knowledge: 'bg-emerald-100 text-emerald-700',
    family: 'bg-pink-100 text-pink-700',
    work: 'bg-amber-100 text-amber-700'
  };

  const priorityColors = {
    high: 'bg-rose-100 text-rose-700 border-rose-300',
    medium: 'bg-amber-100 text-amber-700 border-amber-300',
    low: 'bg-slate-100 text-slate-700 border-slate-300'
  };

  return (
    <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-emerald-900">
          <BookOpen className="w-5 h-5" />
          AI Hadith Recommender
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Describe your situation or ask a question (e.g., 'I'm facing difficulty at work', 'How to be more patient', or leave blank for general recommendations)"
            rows={3}
            className="bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="calendar-context"
            checked={useCalendarContext}
            onChange={(e) => setUseCalendarContext(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="calendar-context" className="text-sm text-emerald-800 cursor-pointer">
            <Calendar className="w-4 h-4 inline mr-1" />
            Use my calendar events for context
          </label>
        </div>

        <Button
          onClick={generateRecommendations}
          disabled={loading}
          className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Finding Relevant Hadiths...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Get Hadith Recommendations
            </>
          )}
        </Button>

        {recommendations && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 mt-6"
          >
            {/* Daily Reminder */}
            {recommendations.daily_reminder && (
              <div className="p-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="w-5 h-5" />
                  <h4 className="font-semibold">Daily Reminder</h4>
                </div>
                <p className="text-sm text-emerald-50">{recommendations.daily_reminder}</p>
              </div>
            )}

            {/* Hadith Recommendations */}
            <div className="space-y-4">
              {recommendations.recommendations?.map((hadith, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="p-5 bg-white rounded-xl border-2 border-emerald-100 hover:border-emerald-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge className={categoryColors[hadith.category] || 'bg-slate-100'}>
                        {hadith.category}
                      </Badge>
                      <Badge className={priorityColors[hadith.priority] || ''}>
                        {hadith.priority}
                      </Badge>
                    </div>
                  </div>

                  <div className="mb-4 p-4 bg-emerald-50 rounded-lg border-l-4 border-emerald-500">
                    <p className="text-slate-800 leading-relaxed italic">
                      "{hadith.hadith_text}"
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-xs text-emerald-700">
                      <span className="font-semibold">{hadith.narrator}</span>
                      <span>•</span>
                      <span>{hadith.reference}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h5 className="font-semibold text-sm text-slate-900 mb-1">
                        🎯 Why This Matters for You
                      </h5>
                      <p className="text-sm text-slate-700">{hadith.relevance}</p>
                    </div>

                    <div className="p-3 bg-teal-50 rounded-lg">
                      <h5 className="font-semibold text-sm text-teal-900 mb-1">
                        💡 Practical Lesson
                      </h5>
                      <p className="text-sm text-teal-800">{hadith.practical_lesson}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Action Items */}
            {recommendations.action_items && recommendations.action_items.length > 0 && (
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                <h4 className="font-semibold text-amber-900 mb-3">✅ Action Items for Today</h4>
                <ul className="space-y-2">
                  {recommendations.action_items.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-amber-800">
                      <span className="w-5 h-5 rounded-full bg-amber-200 flex items-center justify-center flex-shrink-0 text-xs font-bold text-amber-900">
                        {idx + 1}
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Button
              onClick={generateRecommendations}
              variant="outline"
              className="w-full border-emerald-300"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Get New Recommendations
            </Button>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}