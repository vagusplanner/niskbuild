import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle, MessageSquare, Sparkles, TrendingUp } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';

export default function AIGroupChatModerator({ groupChatId, messages = [] }) {
  const [insights, setInsights] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { data: groupChat } = useQuery({
    queryKey: ['groupChat', groupChatId],
    queryFn: async () => {
      const chats = await base44.entities.GroupChat.list();
      return chats.find(c => c.id === groupChatId);
    },
    enabled: !!groupChatId
  });

  const analyzeConversation = async () => {
    if (messages.length < 5) return;

    setIsAnalyzing(true);
    try {
      const recentMessages = messages.slice(-20).map(m => ({
        sender: m.sender_name,
        message: m.message,
        timestamp: m.created_date
      }));

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this group chat conversation for moderation and engagement insights:

${JSON.stringify(recentMessages, null, 2)}

Provide:
- sentiment: overall (positive/neutral/negative)
- engagement: level (high/medium/low)
- topicsDiscussed: Array of main topics (max 5)
- activeSpeakers: Array of most active participants
- concerns: Array of any moderation concerns (toxicity, spam, off-topic)
- suggestions: Array of 3 suggestions to improve collaboration
- summary: 2-sentence summary of the discussion

Return ONLY valid JSON.`,
        response_json_schema: {
          type: 'object',
          properties: {
            sentiment: { type: 'string' },
            engagement: { type: 'string' },
            topicsDiscussed: { type: 'array', items: { type: 'string' } },
            activeSpeakers: { type: 'array', items: { type: 'string' } },
            concerns: { type: 'array', items: { type: 'string' } },
            suggestions: { type: 'array', items: { type: 'string' } },
            summary: { type: 'string' }
          }
        }
      });

      setInsights(response);
    } catch (error) {
      console.error('Failed to analyze conversation:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (messages.length >= 5 && !insights && !isAnalyzing) {
      analyzeConversation();
    }
  }, [messages.length]);

  if (!groupChatId || messages.length < 5) {
    return null;
  }

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="w-4 h-4 text-purple-600" />
          AI Chat Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAnalyzing ? (
          <div className="flex items-center justify-center py-4">
            <Sparkles className="w-5 h-5 text-purple-600 animate-pulse" />
            <span className="ml-2 text-sm text-slate-600">Analyzing conversation...</span>
          </div>
        ) : insights ? (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Summary */}
              <div className="p-3 bg-white rounded-lg border border-purple-100">
                <p className="text-xs font-medium text-purple-900 mb-1">Summary</p>
                <p className="text-sm text-slate-700">{insights.summary}</p>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare className="w-3 h-3 text-blue-600" />
                    <p className="text-xs font-medium text-slate-700">Sentiment</p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={
                      insights.sentiment === 'positive'
                        ? 'bg-green-100 text-green-700'
                        : insights.sentiment === 'negative'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-slate-100 text-slate-700'
                    }
                  >
                    {insights.sentiment}
                  </Badge>
                </div>

                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-3 h-3 text-teal-600" />
                    <p className="text-xs font-medium text-slate-700">Engagement</p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={
                      insights.engagement === 'high'
                        ? 'bg-green-100 text-green-700'
                        : insights.engagement === 'low'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }
                  >
                    {insights.engagement}
                  </Badge>
                </div>
              </div>

              {/* Topics */}
              {insights.topicsDiscussed.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-700 mb-2">Topics Discussed</p>
                  <div className="flex flex-wrap gap-1.5">
                    {insights.topicsDiscussed.map((topic, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Concerns */}
              {insights.concerns.length > 0 && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <p className="text-xs font-medium text-amber-900">Moderation Alerts</p>
                  </div>
                  <ul className="space-y-1">
                    {insights.concerns.map((concern, i) => (
                      <li key={i} className="text-xs text-amber-800">• {concern}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Suggestions */}
              <div>
                <p className="text-xs font-medium text-purple-900 mb-2 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Suggestions to Improve
                </p>
                <div className="space-y-2">
                  {insights.suggestions.map((suggestion, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-700">
                      <div className="w-4 h-4 rounded-full bg-purple-100 flex items-center justify-center text-xs font-semibold text-purple-700 flex-shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <p>{suggestion}</p>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={analyzeConversation}
                className="w-full"
              >
                Refresh Analysis
              </Button>
            </motion.div>
          </AnimatePresence>
        ) : null}
      </CardContent>
    </Card>
  );
}