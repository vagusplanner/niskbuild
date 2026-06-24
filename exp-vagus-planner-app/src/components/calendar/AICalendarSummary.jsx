import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Calendar, TrendingUp, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { SDK } from '@/lib/custom-sdk.js';
import { format, addDays, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

export default function AICalendarSummary({ events = [], tasks = [], settings = {} }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateSummary = async () => {
    setLoading(true);
    try {
      const today = new Date();
      const next7Days = addDays(today, 7);
      const next30Days = addDays(today, 30);

      // Get upcoming events
      const upcomingWeek = events.filter(e => {
        const eventDate = new Date(e.date);
        return isWithinInterval(eventDate, { start: today, end: next7Days });
      });

      const upcomingMonth = events.filter(e => {
        const eventDate = new Date(e.date);
        return isWithinInterval(eventDate, { start: today, end: next30Days });
      });

      // Get high priority tasks
      const urgentTasks = tasks.filter(t => 
        t.status !== 'completed' && 
        (t.priority === 'high' || t.priority === 'urgent')
      ).slice(0, 10);

      const result = await SDK.integrations.Core.InvokeLLM({
        prompt: `You are an AI calendar assistant. Analyze the user's upcoming schedule and provide an insightful summary.

NEXT 7 DAYS EVENTS:
${JSON.stringify(upcomingWeek.map(e => ({
  title: e.title,
  date: e.date,
  start_time: e.start_time,
  category: e.category,
  is_all_day: e.is_all_day
})), null, 2)}

NEXT 30 DAYS EVENTS:
${upcomingMonth.length} total events

URGENT TASKS:
${JSON.stringify(urgentTasks.map(t => ({
  title: t.title,
  due_date: t.due_date,
  priority: t.priority,
  status: t.status
})), null, 2)}

Provide a comprehensive summary including:

1. **Overview**: Brief overview of the upcoming week (2-3 sentences)
2. **Busiest Days**: Identify the 2-3 busiest days in the next week with dates
3. **Free Time**: Identify windows of free time for planning
4. **Recommendations**: Smart suggestions for time management, prep needs, or schedule optimizations
5. **Workload Analysis**: Assess if the schedule is balanced, too busy, or has room for more
6. **Priority Items**: Highlight most important events/tasks that need attention

Be conversational, insightful, and actionable. Think like a personal assistant who knows the user's schedule well.`,
        response_json_schema: {
          type: "object",
          properties: {
            overview: { type: "string" },
            busiest_days: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  date: { type: "string" },
                  reason: { type: "string" },
                  event_count: { type: "number" }
                }
              }
            },
            free_time_windows: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  day: { type: "string" },
                  suggestion: { type: "string" }
                }
              }
            },
            recommendations: {
              type: "array",
              items: { type: "string" }
            },
            workload_status: {
              type: "object",
              properties: {
                level: { 
                  type: "string",
                  enum: ["light", "balanced", "busy", "overloaded"]
                },
                assessment: { type: "string" }
              }
            },
            priority_highlights: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  item: { type: "string" },
                  type: { type: "string" },
                  urgency: { type: "string" }
                }
              }
            }
          }
        }
      });

      setSummary(result);
    } catch (error) {
      console.error('Failed to generate summary:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (events.length > 0) {
      generateSummary();
    }
  }, []);

  const getWorkloadColor = (level) => {
    const colors = {
      light: 'bg-green-100 text-green-700 border-green-200',
      balanced: 'bg-blue-100 text-blue-700 border-blue-200',
      busy: 'bg-amber-100 text-amber-700 border-amber-200',
      overloaded: 'bg-red-100 text-red-700 border-red-200'
    };
    return colors[level] || colors.balanced;
  };

  const getWorkloadIcon = (level) => {
    if (level === 'overloaded') return AlertCircle;
    if (level === 'busy') return TrendingUp;
    return Calendar;
  };

  return (
    <Card className="p-6 bg-white border-emerald-100 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-600" />
          <h3 className="text-xl font-bold text-slate-800">AI Schedule Insights</h3>
        </div>
        <Button
          onClick={generateSummary}
          disabled={loading}
          size="sm"
          variant="outline"
          className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </Button>
      </div>

      {loading && !summary && (
        <div className="space-y-3">
          <div className="h-4 bg-slate-100 rounded animate-pulse" />
          <div className="h-4 bg-slate-100 rounded animate-pulse w-3/4" />
          <div className="h-4 bg-slate-100 rounded animate-pulse w-1/2" />
        </div>
      )}

      {summary && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-5"
        >
          {/* Overview */}
          <div>
            <p className="text-slate-700 leading-relaxed">{summary.overview}</p>
          </div>

          {/* Workload Status */}
          {summary.workload_status && (
            <div className={`p-4 rounded-xl border ${getWorkloadColor(summary.workload_status.level)}`}>
              <div className="flex items-center gap-2 mb-2">
                {React.createElement(getWorkloadIcon(summary.workload_status.level), {
                  className: 'w-5 h-5'
                })}
                <span className="font-semibold capitalize">{summary.workload_status.level} Schedule</span>
              </div>
              <p className="text-sm">{summary.workload_status.assessment}</p>
            </div>
          )}

          {/* Priority Highlights */}
          {summary.priority_highlights?.length > 0 && (
            <div>
              <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                Priority Items
              </h4>
              <div className="space-y-2">
                {summary.priority_highlights.map((item, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
                    <div className="w-2 h-2 bg-amber-500 rounded-full mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-slate-800">{item.item}</p>
                      <p className="text-xs text-slate-600">{item.urgency}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Busiest Days */}
          {summary.busiest_days?.length > 0 && (
            <div>
              <h4 className="font-semibold text-slate-800 mb-2">Busiest Days Ahead</h4>
              <div className="space-y-2">
                {summary.busiest_days.map((day, index) => (
                  <div key={index} className="p-3 bg-rose-50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-slate-800">
                        {format(new Date(day.date), 'EEEE, MMM d')}
                      </span>
                      <span className="text-xs font-medium text-rose-600">
                        {day.event_count} events
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">{day.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Free Time Windows */}
          {summary.free_time_windows?.length > 0 && (
            <div>
              <h4 className="font-semibold text-slate-800 mb-2">Available Time</h4>
              <div className="space-y-2">
                {summary.free_time_windows.map((window, index) => (
                  <div key={index} className="p-3 bg-emerald-50 rounded-lg">
                    <p className="text-sm font-medium text-slate-800 mb-1">{window.day}</p>
                    <p className="text-sm text-slate-600">{window.suggestion}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {summary.recommendations?.length > 0 && (
            <div>
              <h4 className="font-semibold text-slate-800 mb-2">Smart Recommendations</h4>
              <ul className="space-y-2">
                {summary.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="text-emerald-600 mt-1">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      )}
    </Card>
  );
}