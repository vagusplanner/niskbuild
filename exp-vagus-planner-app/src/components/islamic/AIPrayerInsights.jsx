import React, { useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, TrendingUp, Clock, MessageCircle, Loader2, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import moment from 'moment';

export default function AIPrayerInsights() {
  const [question, setQuestion] = useState('');
  const [insights, setInsights] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [loadingInsights, setLoadingInsights] = useState(false);

  // Fetch prayer logs from the last 30 days
  const { data: prayerLogs = [] } = useQuery({
    queryKey: ['prayerLogs', 'last30days'],
    queryFn: async () => {
      const thirtyDaysAgo = moment().subtract(30, 'days').format('YYYY-MM-DD');
      const logs = await SDK.entities.PrayerLog.filter({});
      return logs.filter(log => log.date >= thirtyDaysAgo).sort((a, b) => b.date.localeCompare(a.date));
    }
  });

  const generateInsightsMutation = useMutation({
    mutationFn: async () => {
      setLoadingInsights(true);
      
      // Prepare prayer statistics
      const stats = {
        total_prayers: prayerLogs.length,
        performed: prayerLogs.filter(p => p.status === 'performed').length,
        missed: prayerLogs.filter(p => p.status === 'missed').length,
        qada: prayerLogs.filter(p => p.status === 'qada').length,
        in_congregation: prayerLogs.filter(p => p.in_congregation).length,
        recent_logs: prayerLogs.slice(0, 14).map(p => ({
          date: p.date,
          prayer: p.prayer_name,
          status: p.status,
          location: p.location
        }))
      };

      const response = await SDK.integrations.Core.InvokeLLM({
        prompt: `You are an Islamic prayer habit analyst. Analyze the following prayer data and provide:

1. **Consistency Score** (0-100): Rate their prayer consistency
2. **Strengths**: What they're doing well
3. **Areas for Improvement**: Specific prayers or patterns that need attention
4. **Qada Suggestion**: Best times in their schedule to make up missed prayers
5. **Motivational Message**: Personalized encouragement based on their progress

Prayer Statistics (Last 30 days):
- Total logged: ${stats.total_prayers}
- Performed: ${stats.performed}
- Missed: ${stats.missed}
- Made up (Qada): ${stats.qada}
- In congregation: ${stats.in_congregation}

Recent Prayer Pattern:
${JSON.stringify(stats.recent_logs, null, 2)}

Provide your analysis in a structured, warm, and encouraging tone. Be specific about patterns you notice.`,
        response_json_schema: {
          type: 'object',
          properties: {
            consistency_score: { type: 'number' },
            strengths: { type: 'array', items: { type: 'string' } },
            improvements: { type: 'array', items: { type: 'string' } },
            qada_suggestions: { type: 'array', items: { type: 'string' } },
            motivational_message: { type: 'string' }
          }
        }
      });

      return response;
    },
    onSuccess: (data) => {
      setInsights(data);
      setLoadingInsights(false);
    },
    onError: () => {
      setLoadingInsights(false);
    }
  });

  const askFiqhQuestionMutation = useMutation({
    mutationFn: async (userQuestion) => {
      const response = await SDK.integrations.Core.InvokeLLM({
        prompt: `You are a knowledgeable Islamic scholar specializing in prayer jurisprudence (Salah fiqh). 
        
User's recent prayer context:
- Performed prayers: ${prayerLogs.filter(p => p.status === 'performed').length} in last 30 days
- Missed prayers: ${prayerLogs.filter(p => p.status === 'missed').length}
- Common location: ${prayerLogs.filter(p => p.location === 'home').length > prayerLogs.length / 2 ? 'home' : 'various'}

Question: ${userQuestion}

Provide a clear, concise answer based on mainstream Islamic scholarship. Include:
1. Direct answer to the question
2. Brief supporting evidence (Quran/Hadith if applicable)
3. Practical advice for their situation

Keep the tone warm, supportive, and educational.`
      });

      return response;
    },
    onSuccess: (response) => {
      setChatHistory(prev => [...prev, 
        { type: 'user', text: question },
        { type: 'ai', text: response }
      ]);
      setQuestion('');
    }
  });

  const handleAskQuestion = () => {
    if (question.trim()) {
      askFiqhQuestionMutation.mutate(question);
    }
  };

  return (
    <div className="space-y-6">
      {/* Generate Insights Section */}
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-900">
            <Sparkles className="w-5 h-5" />
            AI Prayer Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!insights ? (
            <div className="text-center py-8">
              <p className="text-slate-600 mb-4">
                Get personalized insights about your prayer habits and consistency
              </p>
              <Button
                onClick={() => generateInsightsMutation.mutate()}
                disabled={loadingInsights || prayerLogs.length === 0}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {loadingInsights ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Generate Insights
                  </>
                )}
              </Button>
              {prayerLogs.length === 0 && (
                <p className="text-sm text-amber-600 mt-2">
                  Start logging your prayers to get AI insights
                </p>
              )}
            </div>
          ) : (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Consistency Score */}
                <div className="bg-white rounded-lg p-4 border-2 border-purple-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-600">Consistency Score</span>
                    <span className="text-2xl font-bold text-purple-600">
                      {insights.consistency_score}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full transition-all"
                      style={{ width: `${insights.consistency_score}%` }}
                    />
                  </div>
                </div>

                {/* Strengths */}
                {insights.strengths?.length > 0 && (
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                      ✨ Your Strengths
                    </h4>
                    <ul className="space-y-1">
                      {insights.strengths.map((strength, idx) => (
                        <li key={idx} className="text-sm text-green-800">• {strength}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Areas for Improvement */}
                {insights.improvements?.length > 0 && (
                  <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                    <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Growth Opportunities
                    </h4>
                    <ul className="space-y-1">
                      {insights.improvements.map((improvement, idx) => (
                        <li key={idx} className="text-sm text-amber-800">• {improvement}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Qada Suggestions */}
                {insights.qada_suggestions?.length > 0 && (
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Best Times for Qada
                    </h4>
                    <ul className="space-y-1">
                      {insights.qada_suggestions.map((suggestion, idx) => (
                        <li key={idx} className="text-sm text-blue-800">• {suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Motivational Message */}
                {insights.motivational_message && (
                  <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg p-4 border border-teal-200">
                    <p className="text-slate-800 leading-relaxed italic">
                      "{insights.motivational_message}"
                    </p>
                  </div>
                )}

                <Button
                  onClick={() => generateInsightsMutation.mutate()}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  Refresh Insights
                </Button>
              </motion.div>
            </AnimatePresence>
          )}
        </CardContent>
      </Card>

      {/* Fiqh Q&A Section */}
      <Card className="border-teal-200 bg-gradient-to-br from-teal-50 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-teal-900">
            <MessageCircle className="w-5 h-5" />
            Ask About Prayer Fiqh
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Chat History */}
          {chatHistory.length > 0 && (
            <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
              {chatHistory.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg ${
                    msg.type === 'user'
                      ? 'bg-teal-100 ml-8 text-slate-800'
                      : 'bg-white border border-slate-200 mr-8 text-slate-700'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                </div>
              ))}
            </div>
          )}

          {/* Question Input */}
          <div className="space-y-2">
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask about prayer times, making up missed prayers, traveling, congregation, etc..."
              className="min-h-20"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAskQuestion();
                }
              }}
            />
            <Button
              onClick={handleAskQuestion}
              disabled={!question.trim() || askFiqhQuestionMutation.isPending}
              className="w-full bg-teal-600 hover:bg-teal-700"
            >
              {askFiqhQuestionMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Thinking...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Ask Question
                </>
              )}
            </Button>
          </div>

          <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded">
            <strong>Example questions:</strong>
            <ul className="mt-1 space-y-0.5">
              <li>• How do I make up missed Fajr prayers?</li>
              <li>• Can I combine prayers when traveling?</li>
              <li>• What if I miss congregation regularly?</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}