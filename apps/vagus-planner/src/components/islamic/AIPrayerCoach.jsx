import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Sparkles, TrendingUp, Target, Brain, Loader2, Calendar,
  MessageCircle, Send, Clock, Award, Lightbulb, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { format, subDays } from 'date-fns';

function asArray(value) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function prayerName(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value.name) return String(value.name);
  return String(value);
}

function prayerDetail(value, key) {
  if (value && typeof value === 'object') return String(value[key] || value.reason || value.suggestion || '');
  return '';
}

/**
 * Canonical Prayer AI shell: Coach + Insights + Fiqh Q&A.
 * One generate action → one narrative/report shared by Coach & Insights tabs.
 */
export default function AIPrayerCoach({ defaultTab = 'coach' }) {
  const [tab, setTab] = useState(defaultTab);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [asking, setAsking] = useState(false);

  const { data: prayerLogs = [], isLoading: logsLoading, isFetching } = useQuery({
    queryKey: ['prayerLogs', 'coach'],
    queryFn: async () => {
      try {
        const logs = await base44.entities.PrayerLog.list('-prayed_at', 120);
        if (Array.isArray(logs) && logs.length) return logs;
      } catch {
        /* fall through */
      }
      try {
        return (await base44.entities.PrayerLog.list('-created_date', 120)) || [];
      } catch {
        return (await base44.entities.PrayerLog.filter({}).catch(() => [])) || [];
      }
    },
    staleTime: 15_000,
  });

  const recentLogs = useMemo(() => {
    const cutoff = format(subDays(new Date(), 30), 'yyyy-MM-dd');
    return (prayerLogs || []).filter((log) => {
      const raw = log.date || log.prayed_at || log.created_date || log.created_at || '';
      if (!raw) return true; // keep undated logs rather than hiding them
      const day = String(raw).slice(0, 10);
      return day >= cutoff;
    });
  }, [prayerLogs]);

  const hasLogs = recentLogs.length > 0 || prayerLogs.length > 0;
  const logsForAnalysis = recentLogs.length > 0 ? recentLogs : prayerLogs;

  const summary = useMemo(() => {
    const byPrayer = {
      Fajr: { prayed: 0, missed: 0 },
      Dhuhr: { prayed: 0, missed: 0 },
      Asr: { prayed: 0, missed: 0 },
      Maghrib: { prayed: 0, missed: 0 },
      Isha: { prayed: 0, missed: 0 },
    };

    let performed = 0;
    let missed = 0;
    let qada = 0;
    let congregation = 0;
    let onTime = 0;

    for (const log of logsForAnalysis) {
      const status = String(log.status || '').toLowerCase();
      const name = log.prayer_name || log.prayer;
      // Day-row style logs (fajr_status …)
      if (log.fajr_status || log.dhuhr_status) {
        for (const [key, label] of [
          ['fajr_status', 'Fajr'],
          ['dhuhr_status', 'Dhuhr'],
          ['asr_status', 'Asr'],
          ['maghrib_status', 'Maghrib'],
          ['isha_status', 'Isha'],
        ]) {
          const s = String(log[key] || '').toLowerCase();
          if (!s) continue;
          if (s.includes('miss')) {
            missed += 1;
            byPrayer[label].missed += 1;
          } else if (s.includes('qada')) {
            qada += 1;
            performed += 1;
            byPrayer[label].prayed += 1;
          } else if (s.includes('pray') || s.includes('done') || s.includes('performed') || s === 'on_time') {
            performed += 1;
            byPrayer[label].prayed += 1;
          }
        }
        continue;
      }

      if (status.includes('miss')) {
        missed += 1;
        if (byPrayer[name]) byPrayer[name].missed += 1;
      } else if (status.includes('qada')) {
        qada += 1;
        performed += 1;
        if (byPrayer[name]) byPrayer[name].prayed += 1;
      } else if (status.includes('pray') || status.includes('performed') || status === 'done') {
        performed += 1;
        if (byPrayer[name]) byPrayer[name].prayed += 1;
      }
      if (log.in_congregation) congregation += 1;
      if (log.prayed_on_time) onTime += 1;
    }

    return {
      total_logged: logsForAnalysis.length,
      performed,
      missed,
      qada,
      congregation,
      on_time: onTime,
      by_prayer: byPrayer,
      sample: logsForAnalysis.slice(0, 20).map((p) => ({
        date: p.date || p.prayed_at,
        prayer: p.prayer_name || p.prayer,
        status: p.status || p.fajr_status,
        fajr: p.fajr_status,
        dhuhr: p.dhuhr_status,
        asr: p.asr_status,
        maghrib: p.maghrib_status,
        isha: p.isha_status,
      })),
    };
  }, [logsForAnalysis]);

  const generateReport = async () => {
    if (!hasLogs) {
      toast.error('Log at least one prayer first (Islam → Prayer → Log), then analyze.');
      return;
    }
    setLoading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an Islamic prayer coach and habit analyst for Vagus Planner.
Analyze the last 30 days of prayer data and return ONE comprehensive report.

Stats:
- Total log rows: ${summary.total_logged}
- Performed/completed signals: ${summary.performed}
- Missed: ${summary.missed}
- Qada: ${summary.qada}
- In congregation: ${summary.congregation}
- On time: ${summary.on_time}
By prayer:
${Object.entries(summary.by_prayer).map(([n, d]) => `- ${n}: ${d.prayed} prayed, ${d.missed} missed`).join('\n')}

Sample logs:
${JSON.stringify(summary.sample, null, 2)}

Be encouraging, specific, and Islamic in tone. Focus on improvement, not shame.`,
        gdpr_categories: ['religious'],
        response_json_schema: {
          type: 'object',
          properties: {
            consistency_score: { type: 'number' },
            overall_assessment: { type: 'string' },
            completion_rate_analysis: { type: 'string' },
            strongest_prayer: { type: 'string' },
            strongest_reason: { type: 'string' },
            needs_improvement: { type: 'string' },
            improvement_suggestion: { type: 'string' },
            pattern_insights: { type: 'array', items: { type: 'string' } },
            strengths: { type: 'array', items: { type: 'string' } },
            improvements: { type: 'array', items: { type: 'string' } },
            actionable_tips: { type: 'array', items: { type: 'string' } },
            qada_suggestions: { type: 'array', items: { type: 'string' } },
            weekly_goal: { type: 'string' },
            motivation: { type: 'string' },
          },
        },
      });

      if (!result || typeof result !== 'object') {
        throw new Error('Empty AI response');
      }
      if (typeof result.consistency_score !== 'number') {
        throw new Error('Invalid report: missing consistency_score');
      }

      const normalized = {
        consistency_score: Math.max(0, Math.min(100, Number(result.consistency_score) || 0)),
        overall_assessment: String(result.overall_assessment || ''),
        completion_rate_analysis: String(result.completion_rate_analysis || ''),
        strongest_prayer: prayerName(result.strongest_prayer),
        strongest_reason: String(result.strongest_reason || prayerDetail(result.strongest_prayer, 'reason') || ''),
        needs_improvement: prayerName(result.needs_improvement),
        improvement_suggestion: String(result.improvement_suggestion || prayerDetail(result.needs_improvement, 'suggestion') || ''),
        pattern_insights: asArray(result.pattern_insights),
        strengths: asArray(result.strengths),
        improvements: asArray(result.improvements),
        actionable_tips: asArray(result.actionable_tips?.length ? result.actionable_tips : result.recommendations),
        qada_suggestions: asArray(result.qada_suggestions),
        weekly_goal: String(result.weekly_goal || ''),
        motivation: String(result.motivation || result.motivational_message || ''),
      };

      setReport(normalized);
      toast.success('Prayer analysis complete');
      if (tab === 'ask') setTab('coach');
    } catch (error) {
      toast.error(error?.message || 'Failed to analyze prayers');
    } finally {
      setLoading(false);
    }
  };

  const askFiqh = async () => {
    if (!question.trim()) return;
    setAsking(true);
    const asked = question.trim();
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a knowledgeable Islamic scholar specializing in prayer jurisprudence (Salah fiqh).

User prayer context (last 30 days):
- Performed signals: ${summary.performed}
- Missed: ${summary.missed}
- Qada: ${summary.qada}

Question: ${asked}

Provide a clear answer with:
1. Direct answer
2. Brief supporting evidence (Qur'an/Hadith if applicable)
3. Practical advice

Warm, supportive, educational tone. Not a fatwa substitute — note mainstream scholarship.`,
        gdpr_categories: ['religious'],
      });
      const text = typeof response === 'string' ? response : response?.answer || JSON.stringify(response);
      if (!text || text.length < 8) throw new Error('Empty fiqh response');
      setChatHistory((prev) => [...prev, { type: 'user', text: asked }, { type: 'ai', text }]);
      setQuestion('');
    } catch (error) {
      toast.error(error?.message || 'Could not answer right now');
    } finally {
      setAsking(false);
    }
  };

  const analyzeButton = (
    <Button
      onClick={generateReport}
      disabled={loading || logsLoading || isFetching}
      className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60"
      title={!hasLogs ? 'Log a prayer first, then tap Analyze' : undefined}
    >
      {loading || logsLoading ? (
        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {logsLoading ? 'Loading logs…' : 'Analyzing...'}</>
      ) : (
        <><Sparkles className="w-4 h-4 mr-2" /> {report ? 'Refresh Analysis' : 'Analyze My Prayers'}</>
      )}
    </Button>
  );

  return (
    <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-indigo-600" />
              AI Prayer Coach
            </CardTitle>
            <CardDescription>
              Coaching, insights, and fiqh Q&A from one place
            </CardDescription>
          </div>
          {analyzeButton}
        </div>
      </CardHeader>
      <CardContent>
        {!hasLogs ? (
          <div className="text-center py-8 space-y-2">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Start logging your prayers to get AI insights!</p>
            <p className="text-xs text-slate-400">Go to Islam → Prayer → Log, then return here and tap Analyze.</p>
          </div>
        ) : (
          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="coach" className="text-xs">Coach</TabsTrigger>
              <TabsTrigger value="insights" className="text-xs">Insights</TabsTrigger>
              <TabsTrigger value="ask" className="text-xs">Ask Fiqh</TabsTrigger>
            </TabsList>

            <TabsContent value="coach" className="space-y-4 mt-0">
              {!report ? (
                <div className="text-center py-8">
                  <p className="text-slate-600">Click “Analyze My Prayers” for a personalized coaching report</p>
                </div>
              ) : (
                <>
                  <div className="p-4 bg-white rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700">Consistency Score</span>
                      <span className="text-2xl font-bold text-indigo-600">{report.consistency_score}%</span>
                    </div>
                    <Progress value={report.consistency_score} className="h-3" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-medium text-emerald-900">Strongest</span>
                      </div>
                      <p className="text-sm font-semibold text-emerald-700 capitalize">{report.strongest_prayer || '—'}</p>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <div className="flex items-center gap-2 mb-1">
                        <Target className="w-4 h-4 text-amber-600" />
                        <span className="text-xs font-medium text-amber-900">Focus On</span>
                      </div>
                      <p className="text-sm font-semibold text-amber-700 capitalize">{report.needs_improvement || '—'}</p>
                    </div>
                  </div>

                  {report.pattern_insights.length > 0 && (
                    <div className="p-4 bg-white rounded-lg">
                      <h4 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2">
                        <Brain className="w-4 h-4 text-indigo-600" /> Pattern Insights
                      </h4>
                      <ul className="space-y-1">
                        {report.pattern_insights.map((insight, i) => (
                          <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                            <span className="text-indigo-600 mt-1">•</span>
                            <span>{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {report.actionable_tips.length > 0 && (
                    <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
                      <h4 className="text-sm font-semibold text-purple-900 mb-3">Actionable Tips</h4>
                      <div className="space-y-2">
                        {report.actionable_tips.map((tip, i) => (
                          <div key={i} className="p-2 bg-white rounded-md text-sm text-slate-700">
                            {i + 1}. {tip}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {report.weekly_goal && (
                    <div className="p-4 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg border-2 border-teal-300">
                      <div className="flex items-start gap-2">
                        <Target className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-semibold text-teal-900 mb-1">This Week&apos;s Goal</h4>
                          <p className="text-sm text-teal-700">{report.weekly_goal}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {report.motivation && (
                    <div className="p-4 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg text-white">
                      <p className="text-sm italic text-center">&ldquo;{report.motivation}&rdquo;</p>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="insights" className="space-y-4 mt-0">
              {!report ? (
                <div className="text-center py-8">
                  <p className="text-slate-600 mb-2">Insights use the same analysis as Coach</p>
                  <p className="text-xs text-slate-500">Generate once — view narrative details here</p>
                </div>
              ) : (
                <>
                  {report.overall_assessment && (
                    <div className="p-4 bg-white rounded-lg border border-purple-200">
                      <div className="flex items-start gap-3">
                        <TrendingUp className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="font-semibold text-slate-800 mb-1">Overall Performance</h4>
                          <p className="text-sm text-slate-600 leading-relaxed">{report.overall_assessment}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {report.completion_rate_analysis && (
                    <div className="p-4 bg-white rounded-lg border border-blue-200">
                      <div className="flex items-start gap-3">
                        <Target className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="font-semibold text-slate-800 mb-1">Progress Analysis</h4>
                          <p className="text-sm text-slate-600 leading-relaxed">{report.completion_rate_analysis}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {report.strongest_prayer && (
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-start gap-3">
                        <Award className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="font-semibold text-green-800 mb-1">Strongest: {report.strongest_prayer}</h4>
                          {report.strongest_reason && (
                            <p className="text-sm text-green-700">{report.strongest_reason}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {report.needs_improvement && (
                    <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="font-semibold text-amber-800 mb-1">Focus: {report.needs_improvement}</h4>
                          {report.improvement_suggestion && (
                            <p className="text-sm text-amber-700">{report.improvement_suggestion}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {report.strengths.length > 0 && (
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <h4 className="font-semibold text-green-900 mb-2">Your Strengths</h4>
                      <ul className="space-y-1">
                        {report.strengths.map((s, i) => (
                          <li key={i} className="text-sm text-green-800">• {s}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {report.improvements.length > 0 && (
                    <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                      <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                        <Lightbulb className="w-4 h-4" /> Growth Opportunities
                      </h4>
                      <ul className="space-y-1">
                        {report.improvements.map((s, i) => (
                          <li key={i} className="text-sm text-amber-800">• {s}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {report.qada_suggestions.length > 0 && (
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                        <Clock className="w-4 h-4" /> Best Times for Qada
                      </h4>
                      <ul className="space-y-1">
                        {report.qada_suggestions.map((s, i) => (
                          <li key={i} className="text-sm text-blue-800">• {s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="ask" className="space-y-4 mt-0">
              {chatHistory.length > 0 && (
                <div className="space-y-3 max-h-72 overflow-y-auto">
                  {chatHistory.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg text-sm whitespace-pre-wrap ${
                        msg.type === 'user'
                          ? 'bg-teal-100 ml-6 text-slate-800'
                          : 'bg-white border border-slate-200 mr-6 text-slate-700'
                      }`}
                    >
                      {msg.text}
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-teal-900">
                  <MessageCircle className="w-4 h-4" /> Ask About Prayer Fiqh
                </div>
                <Textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask about prayer times, Qada, traveling, congregation…"
                  className="min-h-20"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      askFiqh();
                    }
                  }}
                />
                <Button
                  onClick={askFiqh}
                  disabled={!question.trim() || asking}
                  className="w-full bg-teal-600 hover:bg-teal-700"
                >
                  {asking ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Thinking...</>
                  ) : (
                    <><Send className="w-4 h-4 mr-2" /> Ask Question</>
                  )}
                </Button>
                <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded">
                  <strong>Examples:</strong> How do I make up missed Fajr? Can I combine prayers when traveling?
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
