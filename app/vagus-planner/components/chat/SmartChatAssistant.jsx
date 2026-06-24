import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { 
  Sparkles, Calendar, CheckCircle, Clock, FileText, 
  TrendingUp, Loader2, ChevronDown, ChevronUp, Send 
} from 'lucide-react';
import { format, isToday, isTomorrow } from 'date-fns';
import { toast } from 'sonner';

export default function SmartChatAssistant({ conversationId, onActionComplete }) {
  const [expanded, setExpanded] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [insights, setInsights] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list('-start_date', 30)
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.filter({ status: { $ne: 'completed' } }, '-due_date', 50)
  });

  const generateSmartInsights = async () => {
    setAnalyzing(true);
    try {
      const today = new Date();
      const todayEvents = events.filter(e => isToday(new Date(e.start_date)));
      const tomorrowEvents = events.filter(e => isTomorrow(new Date(e.start_date)));
      const upcomingEvents = events.slice(0, 10);
      
      const urgentTasks = tasks.filter(t => t.priority === 'urgent' || t.priority === 'high');
      const dueTodayTasks = tasks.filter(t => t.due_date && isToday(new Date(t.due_date)));

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate a concise, actionable daily summary for ${user?.full_name || 'the user'}.

TODAY'S EVENTS (${todayEvents.length}):
${todayEvents.map(e => `- ${e.start_time || 'All day'}: ${e.title} (${e.category})`).join('\n')}

TOMORROW'S EVENTS (${tomorrowEvents.length}):
${tomorrowEvents.map(e => `- ${e.start_time || 'All day'}: ${e.title}`).join('\n')}

URGENT/HIGH PRIORITY TASKS (${urgentTasks.length}):
${urgentTasks.map(t => `- ${t.title} (Due: ${t.due_date || 'No deadline'}, Priority: ${t.priority})`).join('\n')}

TASKS DUE TODAY (${dueTodayTasks.length}):
${dueTodayTasks.map(t => `- ${t.title}`).join('\n')}

Provide:
1. SUMMARY: Brief overview (2-3 sentences)
2. TOP_PRIORITIES: List 3-5 most important items for today
3. RECOMMENDATIONS: 2-3 actionable suggestions
4. QUICK_STATS: Key numbers (events today, tasks due, free time slots)

Be concise, motivating, and actionable. Use emojis sparingly.`,
        response_json_schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            top_priorities: { type: "array", items: { type: "string" } },
            recommendations: { type: "array", items: { type: "string" } },
            quick_stats: {
              type: "object",
              properties: {
                events_today: { type: "number" },
                tasks_due_today: { type: "number" },
                urgent_tasks: { type: "number" },
                estimated_busy_hours: { type: "number" }
              }
            }
          }
        }
      });

      setInsights(result);
    } catch (error) {
      console.error('Failed to generate insights:', error);
      toast.error('Failed to generate insights');
    } finally {
      setAnalyzing(false);
    }
  };

  const quickActions = [
    {
      label: "What's my schedule today?",
      action: () => {
        const todayEvents = events.filter(e => isToday(new Date(e.start_date)));
        if (todayEvents.length === 0) {
          toast.info("You have no events scheduled for today! Time to be productive.");
        } else {
          const summary = todayEvents.map(e => 
            `${e.start_time || 'All day'}: ${e.title}`
          ).join('\n');
          toast.success(`Today's Schedule:\n${summary}`);
        }
      }
    },
    {
      label: "Top priorities today",
      action: () => generateSmartInsights()
    },
    {
      label: "What's due soon?",
      action: () => {
        const dueSoon = tasks.filter(t => {
          if (!t.due_date) return false;
          const due = new Date(t.due_date);
          const diff = due - new Date();
          return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000; // Next 7 days
        });
        if (dueSoon.length === 0) {
          toast.info("No tasks due in the next 7 days!");
        } else {
          const summary = dueSoon.slice(0, 5).map(t => 
            `${t.title} - Due: ${format(new Date(t.due_date), 'MMM d')}`
          ).join('\n');
          toast.success(`Due Soon:\n${summary}`);
        }
      }
    }
  ];

  return (
    <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 border-purple-200 dark:border-purple-800">
      <div 
        className="p-3 cursor-pointer hover:bg-white/50 dark:hover:bg-slate-900/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
              <Sparkles className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">AI Assistant</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {expanded ? 'Quick actions & insights' : 'Tap for smart suggestions'}
              </p>
            </div>
          </div>
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-3">
              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2">
                {quickActions.map((action, idx) => (
                  <Button
                    key={idx}
                    onClick={action.action}
                    size="sm"
                    variant="outline"
                    className="text-xs border-purple-200 hover:bg-purple-50 dark:border-purple-800 dark:hover:bg-purple-900/30"
                  >
                    {action.label}
                  </Button>
                ))}
              </div>

              {/* Insights Display */}
              {analyzing ? (
                <div className="bg-white dark:bg-slate-900 rounded-lg p-4 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-600 dark:text-slate-400">Analyzing your schedule...</p>
                </div>
              ) : insights ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-slate-900 rounded-lg p-4 space-y-3"
                >
                  <div>
                    <h5 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Summary</h5>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{insights.summary}</p>
                  </div>

                  {insights.quick_stats && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-purple-50 dark:bg-purple-900/20 rounded p-2">
                        <div className="flex items-center gap-1 mb-1">
                          <Calendar className="w-3 h-3 text-purple-600" />
                          <span className="text-xs text-slate-600 dark:text-slate-400">Events Today</span>
                        </div>
                        <p className="text-lg font-bold text-purple-700 dark:text-purple-400">
                          {insights.quick_stats.events_today}
                        </p>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-2">
                        <div className="flex items-center gap-1 mb-1">
                          <CheckCircle className="w-3 h-3 text-blue-600" />
                          <span className="text-xs text-slate-600 dark:text-slate-400">Tasks Due</span>
                        </div>
                        <p className="text-lg font-bold text-blue-700 dark:text-blue-400">
                          {insights.quick_stats.tasks_due_today}
                        </p>
                      </div>
                    </div>
                  )}

                  {insights.top_priorities?.length > 0 && (
                    <div>
                      <h5 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Top Priorities</h5>
                      <div className="space-y-1.5">
                        {insights.top_priorities.map((priority, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-sm">
                            <TrendingUp className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
                            <span className="text-slate-600 dark:text-slate-400">{priority}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {insights.recommendations?.length > 0 && (
                    <div>
                      <h5 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Recommendations</h5>
                      <div className="space-y-1.5">
                        {insights.recommendations.map((rec, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs">
                            <Sparkles className="w-3 h-3 text-purple-600 mt-0.5 flex-shrink-0" />
                            <span className="text-slate-600 dark:text-slate-400">{rec}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              ) : (
                <div className="bg-white dark:bg-slate-900 rounded-lg p-4 text-center">
                  <Sparkles className="w-8 h-8 text-purple-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                    Get AI-powered insights about your day
                  </p>
                  <Button
                    onClick={generateSmartInsights}
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700 text-xs"
                  >
                    Generate Insights
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}