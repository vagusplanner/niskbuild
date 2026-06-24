import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, AlertTriangle, CheckCircle, Clock, Calendar,
  TrendingUp, Zap, X, ChevronRight, Loader2
} from 'lucide-react';
import { format, addDays, isWithinInterval, parseISO } from 'date-fns';
import { toast } from 'sonner';

export default function ProactiveAIScheduler() {
  const [insights, setInsights] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [dismissed, setDismissed] = useState([]);
  const queryClient = useQueryClient();

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list('-created_date', 100),
    retry: 1,
    staleTime: 30000
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-updated_date', 100),
    retry: 1,
    staleTime: 30000
  });

  const { data: settings = [] } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => base44.entities.UserSettings.list(),
    retry: 1,
    staleTime: 60000
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    retry: 1,
    staleTime: 60000
  });

  const analyzeSchedule = async () => {
    if (!user || events.length === 0) {
      setInsights(null);
      return;
    }
    
    setAnalyzing(true);
    try {
      const today = new Date();
      const nextWeek = addDays(today, 7);
      
      const upcomingEvents = events.filter(e => {
        const eventDate = new Date(e.date);
        return eventDate >= today && eventDate <= nextWeek;
      });

      const urgentTasks = tasks.filter(t => 
        t.status !== 'completed' && 
        (t.priority === 'urgent' || t.priority === 'high')
      );

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a proactive AI scheduling assistant. Analyze this user's schedule and provide intelligent insights and actionable suggestions.

USER PROFILE:
- Email: ${user.email}
- Preferences: ${JSON.stringify(settings[0] || {}, null, 2)}

UPCOMING EVENTS (Next 7 Days):
${JSON.stringify(upcomingEvents.map(e => ({
  id: e.id,
  title: e.title,
  date: e.date,
  start_time: e.start_time,
  end_time: e.end_time,
  category: e.category,
  location: e.location
})), null, 2)}

URGENT/HIGH PRIORITY TASKS:
${JSON.stringify(urgentTasks.map(t => ({
  id: t.id,
  title: t.title,
  due_date: t.due_date,
  priority: t.priority,
  estimated_minutes: t.estimated_minutes
})), null, 2)}

Analyze and provide:

1. **CONFLICTS**: Identify scheduling conflicts (overlapping events, back-to-back meetings without breaks, prayer time conflicts)
2. **BUSY PERIODS**: Predict periods where the user will be overwhelmed (too many events in one day, insufficient time for tasks)
3. **RESCHEDULING SUGGESTIONS**: Suggest specific events to reschedule with reasoning and proposed new times
4. **TASK PRIORITIZATION**: Recommend which tasks to focus on based on deadlines and schedule gaps
5. **PROACTIVE ACTIONS**: Suggest automation opportunities (recurring patterns, meeting prep time needed)
6. **PERSONALIZED SUGGESTIONS**: Based on their interests and past behavior, suggest new events or activities for free time
7. **WORKLOAD BALANCE**: Assess if they're overcommitted and need to delegate/cancel

Be specific with dates, times, and event IDs. Think like a personal executive assistant who knows the user's patterns.`,
        response_json_schema: {
          type: "object",
          properties: {
            conflicts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  severity: { type: "string", enum: ["high", "medium", "low"] },
                  description: { type: "string" },
                  affected_events: { type: "array", items: { type: "string" } },
                  suggested_action: { type: "string" }
                }
              }
            },
            busy_periods: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  date: { type: "string" },
                  reason: { type: "string" },
                  recommendation: { type: "string" }
                }
              }
            },
            rescheduling_suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  event_id: { type: "string" },
                  event_title: { type: "string" },
                  reason: { type: "string" },
                  proposed_date: { type: "string" },
                  proposed_time: { type: "string" },
                  confidence: { type: "number" }
                }
              }
            },
            task_priorities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  task_id: { type: "string" },
                  task_title: { type: "string" },
                  priority_level: { type: "string" },
                  reasoning: { type: "string" },
                  suggested_time_slot: { type: "string" }
                }
              }
            },
            personalized_suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  title: { type: "string" },
                  description: { type: "string" },
                  suggested_date: { type: "string" },
                  category: { type: "string" }
                }
              }
            },
            automation_opportunities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  pattern: { type: "string" },
                  suggestion: { type: "string" },
                  impact: { type: "string" }
                }
              }
            },
            overall_assessment: {
              type: "object",
              properties: {
                workload_level: { type: "string", enum: ["light", "balanced", "busy", "overloaded"] },
                summary: { type: "string" },
                key_recommendation: { type: "string" }
              }
            }
          }
        }
      });

      setInsights(result);
    } catch (error) {
      console.error('Failed to analyze schedule:', error);
      setInsights(null);
      // Don't show error toast on initial load
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    // Only auto-analyze if we have enough data and haven't analyzed yet
    if (events.length >= 3 && user && !insights && !analyzing) {
      // Delay initial analysis to avoid blocking render
      const timer = setTimeout(() => {
        analyzeSchedule();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [events.length, user]);

  const handleDismiss = (type, index) => {
    setDismissed([...dismissed, `${type}-${index}`]);
  };

  const isDismissed = (type, index) => {
    return dismissed.includes(`${type}-${index}`);
  };

  const applyReschedule = async (suggestion) => {
    try {
      const event = events.find(e => e.id === suggestion.event_id);
      if (!event) {
        toast.error('Event not found');
        return;
      }

      await base44.entities.Event.update(suggestion.event_id, {
        ...event,
        date: suggestion.proposed_date,
        start_time: suggestion.proposed_time
      });
      
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event rescheduled successfully!');
      handleDismiss('reschedule', insights.rescheduling_suggestions.indexOf(suggestion));
    } catch (error) {
      console.error('Reschedule error:', error);
      toast.error('Failed to reschedule event');
    }
  };

  const createSuggestedEvent = async (suggestion) => {
    try {
      await base44.entities.Event.create({
        title: suggestion.title,
        description: suggestion.description,
        date: suggestion.suggested_date,
        category: suggestion.category || 'personal'
      });
      
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event created!');
      handleDismiss('suggestion', insights.personalized_suggestions.indexOf(suggestion));
    } catch (error) {
      console.error('Create event error:', error);
      toast.error('Failed to create event');
    }
  };

  if (!insights && !analyzing) return null;

  const getSeverityColor = (severity) => {
    const colors = {
      high: 'bg-red-100 border-red-300 text-red-800',
      medium: 'bg-amber-100 border-amber-300 text-amber-800',
      low: 'bg-blue-100 border-blue-300 text-blue-800'
    };
    return colors[severity] || colors.medium;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <Card className="p-5 bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Proactive AI Insights</h3>
              <p className="text-xs text-slate-500">Smart schedule analysis</p>
            </div>
          </div>
          <Button
            onClick={analyzeSchedule}
            disabled={analyzing}
            size="sm"
            variant="outline"
            className="border-teal-300 text-teal-700 hover:bg-teal-100"
          >
            {analyzing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
          </Button>
        </div>

        {analyzing && !insights && (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-2" />
            <p className="text-sm text-slate-600">Analyzing your schedule...</p>
          </div>
        )}

        {insights && (
          <div className="space-y-4">
            {/* Overall Assessment */}
            {insights.overall_assessment && (
              <div className="p-4 bg-white/80 rounded-xl border border-teal-200">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-teal-600" />
                  <span className="font-semibold text-slate-800">Overall Status</span>
                  <Badge className={`ml-auto ${
                    insights.overall_assessment.workload_level === 'overloaded' ? 'bg-red-100 text-red-700' :
                    insights.overall_assessment.workload_level === 'busy' ? 'bg-amber-100 text-amber-700' :
                    'bg-teal-100 text-teal-700'
                  }`}>
                    {insights.overall_assessment.workload_level}
                  </Badge>
                </div>
                <p className="text-sm text-slate-700 mb-2">{insights.overall_assessment.summary}</p>
                {insights.overall_assessment.key_recommendation && (
                  <p className="text-sm text-teal-700 font-medium">
                    💡 {insights.overall_assessment.key_recommendation}
                  </p>
                )}
              </div>
            )}

            {/* Conflicts */}
            {insights.conflicts?.filter((_, idx) => !isDismissed('conflict', idx)).length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  Detected Conflicts
                </h4>
                {insights.conflicts.filter((_, idx) => !isDismissed('conflict', idx)).map((conflict, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`p-3 rounded-lg border ${getSeverityColor(conflict.severity)}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium mb-1">{conflict.description}</p>
                        <p className="text-xs opacity-80">{conflict.suggested_action}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleDismiss('conflict', idx)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Rescheduling Suggestions */}
            {insights.rescheduling_suggestions?.filter((_, idx) => !isDismissed('reschedule', idx)).length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-cyan-600" />
                  Rescheduling Suggestions
                </h4>
                {insights.rescheduling_suggestions.filter((_, idx) => !isDismissed('reschedule', idx)).map((suggestion, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-3 bg-white/80 rounded-lg border border-cyan-200"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-800">{suggestion.event_title}</p>
                        <p className="text-xs text-slate-600 mt-1">{suggestion.reason}</p>
                      </div>
                      <Badge className="bg-cyan-100 text-cyan-700">
                        {Math.round(suggestion.confidence * 100)}% match
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Button
                        onClick={() => applyReschedule(suggestion)}
                        size="sm"
                        className="flex-1 bg-teal-600 hover:bg-teal-700 h-8"
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Reschedule to {format(parseISO(suggestion.proposed_date), 'MMM d')} at {suggestion.proposed_time}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDismiss('reschedule', idx)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Task Prioritization */}
            {insights.task_priorities?.filter((_, idx) => !isDismissed('task', idx)).slice(0, 3).length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-teal-600" />
                  Suggested Task Focus
                </h4>
                {insights.task_priorities.filter((_, idx) => !isDismissed('task', idx)).slice(0, 3).map((task, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-3 bg-white/80 rounded-lg border border-teal-200"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-800">{task.task_title}</p>
                        <p className="text-xs text-slate-600 mt-1">{task.reasoning}</p>
                        {task.suggested_time_slot && (
                          <p className="text-xs text-teal-600 mt-1 font-medium">
                            ⏰ {task.suggested_time_slot}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleDismiss('task', idx)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Personalized Suggestions */}
            {insights.personalized_suggestions?.filter((_, idx) => !isDismissed('suggestion', idx)).slice(0, 2).length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  Personalized Suggestions
                </h4>
                {insights.personalized_suggestions.filter((_, idx) => !isDismissed('suggestion', idx)).slice(0, 2).map((suggestion, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-800">{suggestion.title}</p>
                        <p className="text-xs text-slate-600 mt-1">{suggestion.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Button
                        onClick={() => createSuggestedEvent(suggestion)}
                        size="sm"
                        className="flex-1 bg-purple-600 hover:bg-purple-700 h-8"
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Add to Calendar
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDismiss('suggestion', idx)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Automation Opportunities */}
            {insights.automation_opportunities?.filter((_, idx) => !isDismissed('automation', idx)).length > 0 && (
              <div className="p-4 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl border border-teal-200">
                <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4 text-teal-600" />
                  Automation Opportunities
                </h4>
                <div className="space-y-2">
                  {insights.automation_opportunities.filter((_, idx) => !isDismissed('automation', idx)).map((auto, idx) => (
                    <div key={idx} className="text-sm">
                      <p className="text-slate-700 font-medium">{auto.pattern}</p>
                      <p className="text-xs text-slate-600">{auto.suggestion}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </motion.div>
  );
}