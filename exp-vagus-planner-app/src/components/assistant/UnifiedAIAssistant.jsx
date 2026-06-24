import React, { useState, useEffect } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { 
  Sparkles, Loader2, RefreshCw, Calendar, AlertTriangle, 
  TrendingUp, Clock, CheckCircle, Zap, X, Send,
  Lightbulb, ArrowRight, Dumbbell, Moon, Repeat, Plus
} from 'lucide-react';
import { format, addDays, isToday, isTomorrow, parseISO } from 'date-fns';
import { toast } from 'sonner';
import ProactiveSuggestionsPanel from './ProactiveSuggestionsPanel';
import WeeklySummaryCard from './WeeklySummaryCard';

export default function UnifiedAIAssistant({ events = [], tasks = [], settings = {}, onCreateEvent, onApplySuggestion }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dismissedInsights, setDismissedInsights] = useState([]);
  const [chatMode, setChatMode] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [quickSuggestions, setQuickSuggestions] = useState([]);
  const [loadingQuick, setLoadingQuick] = useState(false);
  const [energyLogs, setEnergyLogs] = useState([]);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => SDK.auth.me()
  });

  const { data: userSettings = [] } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => SDK.entities.UserSettings.list()
  });

  const currentSettings = userSettings[0] || {};

  const generateQuickSuggestions = async () => {
    setLoadingQuick(true);
    try {
      const today = new Date();
      const recentEvents = events.slice(0, 50);
      const categoryCount = {};
      const timePatterns = {};
      const recurringCandidates = {};

      recentEvents.forEach(e => {
        categoryCount[e.category] = (categoryCount[e.category] || 0) + 1;
        if (e.start_time) {
          const key = `${e.category}-${e.start_time.substring(0, 2)}`;
          timePatterns[key] = (timePatterns[key] || 0) + 1;
        }
        if (!e.is_recurring) {
          const titleKey = e.title?.toLowerCase().trim();
          if (titleKey) {
            if (!recurringCandidates[titleKey]) {
              recurringCandidates[titleKey] = { count: 0, category: e.category, title: e.title };
            }
            recurringCandidates[titleKey].count++;
          }
        }
      });

      const todayEvents = events.filter(e => e.date === format(today, 'yyyy-MM-dd'));
      const busyTimes = todayEvents.map(e => ({ start: e.start_time, end: e.end_time })).filter(t => t.start);

      const result = await SDK.integrations.Core.InvokeLLM({
        prompt: `Analyze calendar and suggest 3-4 quick personalized activities for TODAY.

TODAY: ${format(today, 'EEEE, MMMM d, yyyy')}
USER EVENT CATEGORIES: ${JSON.stringify(categoryCount)}
TIME PATTERNS: ${JSON.stringify(timePatterns)}
POTENTIAL RECURRING: ${JSON.stringify(Object.values(recurringCandidates).filter(c => c.count >= 2))}
TODAY'S BUSY TIMES: ${JSON.stringify(busyTimes)}

Generate smart suggestions:
1. Activity suggestions based on preferences and free time
2. Recurring event suggestions if same title appears 2+ times
3. Break/wellness reminders if overworked
4. Prayer reminders if enabled: ${settings?.prayer_enabled !== false}

For each: type ("activity"|"recurring"|"prayer"|"break"), title, description, action (event to create), priority.`,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  title: { type: "string" },
                  description: { type: "string" },
                  priority: { type: "string" },
                  action: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      category: { type: "string" },
                      date: { type: "string" },
                      start_time: { type: "string" },
                      end_time: { type: "string" },
                      is_recurring: { type: "boolean" },
                      recurrence_type: { type: "string" }
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (result.suggestions) {
        setQuickSuggestions(result.suggestions);
      }
    } catch (error) {
      console.error('Failed to generate quick suggestions');
    } finally {
      setLoadingQuick(false);
    }
  };

  const analyzeSchedule = async () => {
    setLoading(true);
    try {
      const upcomingEvents = events.filter(e => new Date(e.date) >= new Date());
      const urgentTasks = tasks.filter(t => t.status !== 'completed' && t.priority === 'urgent');

      const result = await SDK.integrations.Core.InvokeLLM({
        prompt: `You are an intelligent calendar assistant. Analyze the user's schedule and provide actionable insights.

USER CONTEXT:
- Name: ${user?.full_name || 'User'}
- Work Style: ${currentSettings.work_style || 'flexible'}
- Focus Areas: ${currentSettings.focus_areas?.join(', ') || 'Not specified'}
- Preferred Calendar View: ${currentSettings.default_calendar_view || 'month'}

UPCOMING EVENTS (Next 14 days):
${upcomingEvents.slice(0, 30).map(e => 
  `${e.date} ${e.start_time || ''}: ${e.title} (${e.category})`
).join('\n')}

URGENT TASKS:
${urgentTasks.map(t => 
  `${t.title} (Priority: ${t.priority}, Due: ${t.due_date || 'No deadline'})`
).join('\n')}

Provide comprehensive insights:

1. OVERVIEW: Brief summary of upcoming week workload
2. CONFLICTS: Any scheduling issues or overlaps
3. PROACTIVE SUGGESTIONS: Specific rescheduling or optimization recommendations
4. TASK SCHEDULING: When to schedule urgent tasks based on free time
5. RECOMMENDATIONS: Personalized productivity tips based on their work style
6. BUSY PERIODS: Identify peak busy times
7. FREE TIME: Best times for focused work or breaks

Be specific, actionable, and concise.`,
        response_json_schema: {
          type: "object",
          properties: {
            overview: {
              type: "object",
              properties: {
                summary: { type: "string" },
                workload_status: { type: "string", enum: ["light", "moderate", "busy", "overloaded"] },
                total_events: { type: "number" },
                priority_items: { type: "array", items: { type: "string" } }
              }
            },
            conflicts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  description: { type: "string" },
                  affected_events: { type: "array", items: { type: "string" } },
                  severity: { type: "string", enum: ["low", "medium", "high"] }
                }
              }
            },
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  action_type: { type: "string" },
                  priority: { type: "string" },
                  event_data: { type: "object" }
                }
              }
            },
            task_scheduling: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  task: { type: "string" },
                  suggested_slot: { type: "string" },
                  reason: { type: "string" }
                }
              }
            },
            recommendations: {
              type: "array",
              items: { type: "string" }
            },
            busy_periods: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  date: { type: "string" },
                  description: { type: "string" }
                }
              }
            },
            free_time: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  date: { type: "string" },
                  time_slot: { type: "string" },
                  duration: { type: "string" }
                }
              }
            }
          }
        }
      });

      setInsights(result);
    } catch (error) {
      console.error('Failed to analyze schedule:', error);
      toast.error('Failed to analyze schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleAskAI = async () => {
    if (!chatInput.trim()) return;

    const userMessage = chatInput;
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      const result = await SDK.integrations.Core.InvokeLLM({
        prompt: `You are a helpful calendar assistant. Answer the user's question about their schedule.

USER QUESTION: ${userMessage}

UPCOMING EVENTS: ${events.slice(0, 20).map(e => `${e.date}: ${e.title}`).join(', ')}
TASKS: ${tasks.slice(0, 10).map(t => `${t.title} (${t.status})`).join(', ')}

Provide a helpful, concise response.`
      });

      setChatHistory(prev => [...prev, { role: 'assistant', content: result }]);
    } catch (error) {
      toast.error('Failed to get AI response');
    }
  };

  useEffect(() => {
    if (events.length > 0) {
      analyzeSchedule();
      generateQuickSuggestions();
      loadEnergyData();
    }
  }, []);

  const loadEnergyData = async () => {
    try {
      const logs = await SDK.entities.EnergyLog.list('-date', 30);
      setEnergyLogs(logs);
    } catch (error) {
      console.error('Failed to load energy logs');
    }
  };

  const getWorkloadColor = (status) => {
    switch (status) {
      case 'light': return 'bg-green-100 text-green-700';
      case 'moderate': return 'bg-blue-100 text-blue-700';
      case 'busy': return 'bg-amber-100 text-amber-700';
      case 'overloaded': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'border-red-200 bg-red-50';
      case 'medium': return 'border-amber-200 bg-amber-50';
      case 'low': return 'border-blue-200 bg-blue-50';
      default: return 'border-slate-200 bg-slate-50';
    }
  };

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200 overflow-hidden">
      <div className="p-5 border-b bg-gradient-to-r from-purple-100/50 to-blue-100/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-xl shadow-sm">
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">AI Calendar Assistant</h3>
              <p className="text-xs text-slate-600">Smart insights & suggestions</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setChatMode(!chatMode)}
              size="sm"
              variant={chatMode ? "default" : "outline"}
              className={chatMode ? "bg-purple-600 hover:bg-purple-700" : "border-purple-200"}
            >
              <Send className="w-4 h-4" />
            </Button>
            <Button
              onClick={analyzeSchedule}
              disabled={loading}
              size="sm"
              variant="outline"
              className="border-purple-200 text-purple-700 hover:bg-purple-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {chatMode ? (
          <motion.div
            key="chat"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-5 space-y-3"
          >
            <div className="max-h-64 overflow-y-auto space-y-2">
              {chatHistory.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-purple-100 text-purple-900 ml-8'
                      : 'bg-white text-slate-700 mr-8'
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAskAI()}
                placeholder="Ask about your schedule..."
                className="flex-1"
              />
              <Button onClick={handleAskAI} size="icon" className="bg-purple-600 hover:bg-purple-700">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="insights"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {loading ? (
              <div className="p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-3" />
                <p className="text-sm text-slate-600">Analyzing your schedule...</p>
              </div>
            ) : insights ? (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full grid grid-cols-5 bg-purple-100/50 h-11 p-1">
                  <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                  <TabsTrigger value="week" className="text-xs">Week</TabsTrigger>
                  <TabsTrigger value="proactive" className="text-xs">Smart</TabsTrigger>
                  <TabsTrigger value="quick" className="text-xs">Quick</TabsTrigger>
                  <TabsTrigger value="suggestions" className="text-xs">More</TabsTrigger>
                </TabsList>

                <TabsContent value="week" className="p-5">
                  <WeeklySummaryCard />
                </TabsContent>

                <TabsContent value="proactive" className="p-5">
                  <ProactiveSuggestionsPanel 
                    events={events}
                    tasks={tasks}
                    energyLogs={energyLogs}
                    onAction={onApplySuggestion}
                  />
                </TabsContent>

                <TabsContent value="quick" className="p-5 space-y-3">
                  {loadingQuick ? (
                    <div className="text-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-2" />
                      <p className="text-sm text-slate-600">Generating suggestions...</p>
                    </div>
                  ) : quickSuggestions.length > 0 ? (
                    quickSuggestions.map((suggestion, idx) => {
                      const Icon = suggestion.type === 'activity' ? Dumbbell : 
                                   suggestion.type === 'prayer' ? Moon :
                                   suggestion.type === 'recurring' ? Repeat : Clock;
                      const isPriority = suggestion.priority === 'high';
                      
                      return (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className={`p-4 rounded-xl border ${
                            isPriority ? 'bg-gradient-to-r from-rose-50 to-orange-50 border-rose-200' : 'bg-white border-purple-100'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${isPriority ? 'bg-white shadow-sm' : 'bg-purple-50'}`}>
                              <Icon className={`w-4 h-4 ${isPriority ? 'text-rose-600' : 'text-purple-600'}`} />
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-sm text-slate-800 mb-1">{suggestion.title}</p>
                              <p className="text-xs text-slate-600 mb-2">{suggestion.description}</p>
                              {suggestion.action && (
                                <Button
                                  onClick={() => {
                                    onCreateEvent && onCreateEvent(suggestion.action);
                                    setQuickSuggestions(prev => prev.filter((_, i) => i !== idx));
                                  }}
                                  size="sm"
                                  className={isPriority ? "bg-rose-600 hover:bg-rose-700" : "bg-purple-600 hover:bg-purple-700"}
                                >
                                  <Plus className="w-3 h-3 mr-1" />
                                  Add to Calendar
                                </Button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8">
                      <Sparkles className="w-12 h-12 text-purple-300 mx-auto mb-3" />
                      <p className="text-slate-600 mb-3">No quick suggestions right now</p>
                      <Button onClick={generateQuickSuggestions} size="sm" className="bg-purple-600 hover:bg-purple-700">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                      </Button>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="overview" className="p-5 space-y-4">
                  {insights.overview && (
                    <>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="w-5 h-5 text-purple-600" />
                          <h4 className="font-semibold text-slate-800">Week Overview</h4>
                        </div>
                        <p className="text-sm text-slate-600 mb-3">{insights.overview.summary}</p>
                        <Badge className={getWorkloadColor(insights.overview.workload_status)}>
                          {insights.overview.workload_status} workload • {insights.overview.total_events} events
                        </Badge>
                      </div>

                      {insights.overview.priority_items?.length > 0 && (
                        <div>
                          <h5 className="text-sm font-semibold text-slate-700 mb-2">Priority Items</h5>
                          <div className="space-y-1.5">
                            {insights.overview.priority_items.map((item, idx) => (
                              <div key={idx} className="flex items-start gap-2 text-sm">
                                <Zap className="w-4 h-4 text-amber-600 mt-0.5" />
                                <span className="text-slate-600">{item}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {insights.conflicts?.length > 0 && (
                        <div>
                          <h5 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                            Conflicts Detected
                          </h5>
                          <div className="space-y-2">
                            {insights.conflicts.map((conflict, idx) => (
                              <div
                                key={idx}
                                className={`p-3 rounded-lg border ${getSeverityColor(conflict.severity)}`}
                              >
                                <p className="text-sm font-medium text-slate-800">{conflict.type}</p>
                                <p className="text-xs text-slate-600 mt-1">{conflict.description}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </TabsContent>

                <TabsContent value="more" className="p-5 space-y-3">
                  {insights.suggestions?.length > 0 ? (
                    insights.suggestions.map((suggestion, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="p-4 bg-white rounded-lg border border-purple-100"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Lightbulb className="w-4 h-4 text-purple-600" />
                              <h5 className="font-semibold text-slate-800 text-sm">{suggestion.title}</h5>
                            </div>
                            <p className="text-xs text-slate-600">{suggestion.description}</p>
                          </div>
                          {suggestion.event_data && (
                            <Button
                              onClick={() => onCreateEvent && onCreateEvent(suggestion.event_data)}
                              size="sm"
                              className="bg-purple-600 hover:bg-purple-700"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Apply
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500 text-center py-8">Check the Smart tab for proactive suggestions</p>
                  )}

                  {insights.task_scheduling?.length > 0 && (
                    <div className="mt-4">
                      <h5 className="text-sm font-semibold text-slate-700 mb-2">Task Scheduling</h5>
                      <div className="space-y-2">
                        {insights.task_scheduling.map((ts, idx) => (
                          <div key={idx} className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                            <p className="text-sm font-medium text-slate-800">{ts.task}</p>
                            <p className="text-xs text-blue-700 mt-1">
                              <Clock className="w-3 h-3 inline mr-1" />
                              {ts.suggested_slot}
                            </p>
                            <p className="text-xs text-slate-600 mt-1">{ts.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="suggestions" className="p-5 space-y-4">
                  {insights.busy_periods?.length > 0 && (
                    <div>
                      <h5 className="text-sm font-semibold text-slate-700 mb-2">Busy Periods</h5>
                      <div className="space-y-1.5">
                        {insights.busy_periods.map((period, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-slate-800">{period.date}</p>
                              <p className="text-xs text-slate-600">{period.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {insights.free_time?.length > 0 && (
                    <div>
                      <h5 className="text-sm font-semibold text-slate-700 mb-2">Available Time</h5>
                      <div className="space-y-1.5">
                        {insights.free_time.map((slot, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-slate-800">{slot.date} - {slot.time_slot}</p>
                              <p className="text-xs text-slate-600">{slot.duration} available</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {insights.recommendations?.length > 0 && (
                    <div>
                      <h5 className="text-sm font-semibold text-slate-700 mb-2">Recommendations</h5>
                      <div className="space-y-2">
                        {insights.recommendations.map((rec, idx) => (
                          <div key={idx} className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                            <p className="text-sm text-slate-700">{rec}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            ) : (
              <div className="p-12 text-center">
                <Sparkles className="w-12 h-12 text-purple-300 mx-auto mb-3" />
                <p className="text-slate-600 mb-4">Get AI-powered insights about your schedule</p>
                <Button onClick={analyzeSchedule} className="bg-purple-600 hover:bg-purple-700">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Analyze Schedule
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}