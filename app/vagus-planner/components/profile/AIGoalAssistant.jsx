import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Sparkles, Loader2, CheckSquare, Calendar, Plus, Target, 
  BookOpen, Users, Link as LinkIcon, Award, ExternalLink
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { format, addDays, addWeeks } from 'date-fns';

export default function AIGoalAssistant({ isOpen, onClose, goal, onUpdateGoal }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [isCreatingEvents, setIsCreatingEvents] = useState(false);

  useEffect(() => {
    if (isOpen && goal && !analysis) {
      analyzeGoal();
    }
  }, [isOpen, goal]);

  const analyzeGoal = async () => {
    if (!goal) return;

    setIsAnalyzing(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `I have a goal I want to achieve. Please provide a comprehensive analysis and action plan.

Goal Title: ${goal.title}
Description: ${goal.description || 'Not provided'}
Category: ${goal.category}
Target Date: ${goal.target_date ? format(new Date(goal.target_date), 'MMMM d, yyyy') : 'Not set'}
Priority: ${goal.priority}
Current Status: ${goal.status}

Please provide:

1. SMART CRITERIA ANALYSIS: Evaluate this goal against SMART criteria and provide recommendations:
   - Specific: Is it clear and well-defined? How can it be more specific?
   - Measurable: How can progress be measured? What metrics to track?
   - Achievable: Is it realistic given typical constraints?
   - Relevant: Why does it matter?
   - Time-bound: Is the timeline appropriate?

2. A motivational summary explaining why this goal is valuable

3. 5-8 specific, actionable steps to achieve this goal (ordered by priority)

4. Realistic timeline for each step (e.g., "Week 1", "Day 3", "Month 1")

5. Potential obstacles and how to overcome them

6. LEARNING RESOURCES: Suggest 3-5 specific resources:
   - Books, online courses, or tutorials
   - Websites, blogs, or YouTube channels
   - Tools or apps that can help
   Include actual names of resources when possible

7. CONNECTIONS & COMMUNITIES: Suggest where to find people with similar goals:
   - Online communities (Reddit, Discord, forums)
   - Professional networks or meetup groups
   - Mentorship opportunities
   - Specific hashtags or social media groups

8. Suggested calendar events/tasks to support this goal

Make everything concrete, actionable, and tailored to the goal's category.`,
        response_json_schema: {
          type: "object",
          properties: {
            smart_analysis: {
              type: "object",
              properties: {
                specific: { type: "string" },
                measurable: { type: "string" },
                achievable: { type: "string" },
                relevant: { type: "string" },
                time_bound: { type: "string" },
                overall_score: { type: "number" }
              }
            },
            motivation: { type: "string" },
            action_steps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  timeline: { type: "string" },
                  priority: { type: "string" },
                  completed: { type: "boolean" }
                }
              }
            },
            obstacles: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  obstacle: { type: "string" },
                  solution: { type: "string" }
                }
              }
            },
            learning_resources: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  name: { type: "string" },
                  description: { type: "string" },
                  url: { type: "string" }
                }
              }
            },
            connections: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  platform: { type: "string" },
                  name: { type: "string" },
                  description: { type: "string" }
                }
              }
            },
            suggested_events: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  when: { type: "string" },
                  duration_minutes: { type: "number" }
                }
              }
            }
          }
        }
      });

      setAnalysis(result);
      toast.success('Goal analysis complete!');
    } catch (error) {
      toast.error('Failed to analyze goal');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveActionSteps = () => {
    if (!analysis?.action_steps) return;

    const steps = analysis.action_steps.map(step => ({
      title: step.title,
      completed: false,
      due_date: step.timeline
    }));

    onUpdateGoal({ action_steps: steps });
    toast.success('Action steps saved to goal!');
  };

  const createCalendarEvents = async () => {
    if (!analysis?.suggested_events) return;

    setIsCreatingEvents(true);
    try {
      const baseDate = goal.target_date ? new Date(goal.target_date) : new Date();
      
      for (const event of analysis.suggested_events) {
        let eventDate = new Date();
        
        // Parse "when" to determine date
        if (event.when.toLowerCase().includes('today')) {
          eventDate = new Date();
        } else if (event.when.toLowerCase().includes('tomorrow')) {
          eventDate = addDays(new Date(), 1);
        } else if (event.when.toLowerCase().includes('week')) {
          const weeks = parseInt(event.when) || 1;
          eventDate = addWeeks(new Date(), weeks);
        } else if (event.when.toLowerCase().includes('day')) {
          const days = parseInt(event.when) || 1;
          eventDate = addDays(new Date(), days);
        }

        await base44.entities.Event.create({
          title: event.title,
          description: `${event.description}\n\nRelated to goal: ${goal.title}`,
          date: format(eventDate, 'yyyy-MM-dd'),
          start_time: '09:00',
          end_time: format(addDays(new Date().setHours(9, 0), 0).setMinutes(event.duration_minutes || 60), 'HH:mm'),
          category: goal.category === 'professional' ? 'work' : goal.category === 'learning' ? 'personal' : goal.category,
          is_all_day: false,
          notes: `Goal-related task: ${goal.title}`
        });
      }

      toast.success(`${analysis.suggested_events.length} events added to calendar!`);
      onClose();
    } catch (error) {
      toast.error('Failed to create calendar events');
    } finally {
      setIsCreatingEvents(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-x-4 top-[5%] bottom-[5%] md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-2xl md:max-h-[85vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl z-[200] overflow-hidden flex flex-col"
          >
            <div className="p-6 border-b bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Sparkles className="w-6 h-6" />
                    AI Goal Assistant
                  </h2>
                  {goal && (
                    <p className="text-indigo-100 text-sm mt-1">{goal.title}</p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-white/20 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-6 space-y-6">
              {isAnalyzing ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mb-4" />
                  <p className="text-slate-600">Analyzing your goal...</p>
                  <p className="text-sm text-slate-500 mt-1">This may take a few seconds</p>
                </div>
              ) : analysis ? (
                <>
                  {/* SMART Criteria Analysis */}
                  {analysis.smart_analysis && (
                    <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-emerald-900 flex items-center gap-2">
                          <Award className="w-5 h-5" />
                          SMART Goal Analysis
                        </h3>
                        <Badge variant="outline" className="bg-white">
                          Score: {analysis.smart_analysis.overall_score}/10
                        </Badge>
                      </div>
                      <div className="space-y-2 text-sm">
                        {analysis.smart_analysis.specific && (
                          <div className="flex gap-2">
                            <span className="font-medium text-emerald-800 min-w-[100px]">Specific:</span>
                            <span className="text-slate-700">{analysis.smart_analysis.specific}</span>
                          </div>
                        )}
                        {analysis.smart_analysis.measurable && (
                          <div className="flex gap-2">
                            <span className="font-medium text-emerald-800 min-w-[100px]">Measurable:</span>
                            <span className="text-slate-700">{analysis.smart_analysis.measurable}</span>
                          </div>
                        )}
                        {analysis.smart_analysis.achievable && (
                          <div className="flex gap-2">
                            <span className="font-medium text-emerald-800 min-w-[100px]">Achievable:</span>
                            <span className="text-slate-700">{analysis.smart_analysis.achievable}</span>
                          </div>
                        )}
                        {analysis.smart_analysis.relevant && (
                          <div className="flex gap-2">
                            <span className="font-medium text-emerald-800 min-w-[100px]">Relevant:</span>
                            <span className="text-slate-700">{analysis.smart_analysis.relevant}</span>
                          </div>
                        )}
                        {analysis.smart_analysis.time_bound && (
                          <div className="flex gap-2">
                            <span className="font-medium text-emerald-800 min-w-[100px]">Time-bound:</span>
                            <span className="text-slate-700">{analysis.smart_analysis.time_bound}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Motivation */}
                  {analysis.motivation && (
                    <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
                      <h3 className="font-semibold text-indigo-900 mb-2">Why This Matters</h3>
                      <p className="text-sm text-slate-700 leading-relaxed">{analysis.motivation}</p>
                    </div>
                  )}

                  {/* Action Steps */}
                  {analysis.action_steps && analysis.action_steps.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                          <Target className="w-5 h-5 text-indigo-600" />
                          Action Steps
                        </h3>
                        <Button
                          size="sm"
                          onClick={saveActionSteps}
                          className="bg-indigo-600 hover:bg-indigo-700"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Save to Goal
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {analysis.action_steps.map((step, idx) => (
                          <div key={idx} className="p-4 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 transition-colors">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-semibold">
                                {idx + 1}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-medium text-slate-800 mb-1">{step.title}</h4>
                                <p className="text-sm text-slate-600 mb-2">{step.description}</p>
                                <div className="flex gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {step.timeline}
                                  </Badge>
                                  {step.priority && (
                                    <Badge variant="outline" className="text-xs">
                                      {step.priority}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Obstacles */}
                  {analysis.obstacles && analysis.obstacles.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-slate-800 mb-3">Potential Challenges</h3>
                      <div className="space-y-3">
                        {analysis.obstacles.map((item, idx) => (
                          <div key={idx} className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                            <p className="text-sm font-medium text-amber-900 mb-1">⚠️ {item.obstacle}</p>
                            <p className="text-sm text-slate-600">💡 {item.solution}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Learning Resources */}
                  {analysis.learning_resources && analysis.learning_resources.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-3">
                        <BookOpen className="w-5 h-5 text-blue-600" />
                        Recommended Resources
                      </h3>
                      <div className="space-y-2">
                        {analysis.learning_resources.map((resource, idx) => (
                          <div key={idx} className="p-3 bg-blue-50 border border-blue-200 rounded-xl hover:shadow-sm transition-shadow">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium text-blue-900 text-sm">{resource.name}</h4>
                                  <Badge variant="outline" className="text-xs bg-white">
                                    {resource.type}
                                  </Badge>
                                </div>
                                <p className="text-xs text-slate-600">{resource.description}</p>
                              </div>
                              {resource.url && (
                                <a 
                                  href={resource.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex-shrink-0 p-1 hover:bg-blue-100 rounded"
                                >
                                  <ExternalLink className="w-4 h-4 text-blue-600" />
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Connections & Communities */}
                  {analysis.connections && analysis.connections.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-3">
                        <Users className="w-5 h-5 text-purple-600" />
                        Connect with Others
                      </h3>
                      <div className="space-y-2">
                        {analysis.connections.map((connection, idx) => (
                          <div key={idx} className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs bg-white">
                                {connection.platform}
                              </Badge>
                              <h4 className="font-medium text-purple-900 text-sm">{connection.name}</h4>
                            </div>
                            <p className="text-xs text-slate-600">{connection.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggested Events */}
                  {analysis.suggested_events && analysis.suggested_events.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-emerald-600" />
                          Suggested Calendar Events
                        </h3>
                      </div>
                      <div className="space-y-2">
                        {analysis.suggested_events.map((event, idx) => (
                          <div key={idx} className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                            <h4 className="font-medium text-emerald-900 text-sm mb-1">{event.title}</h4>
                            <p className="text-xs text-slate-600 mb-1">{event.description}</p>
                            <Badge variant="outline" className="text-xs bg-white">
                              {event.when} • {event.duration_minutes} min
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>

            {!isAnalyzing && analysis && (
              <div className="p-6 border-t bg-slate-50 flex gap-3">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                >
                  Close
                </Button>
                {analysis.suggested_events && analysis.suggested_events.length > 0 && (
                  <Button
                    onClick={createCalendarEvents}
                    disabled={isCreatingEvents}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  >
                    {isCreatingEvents ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Calendar className="w-4 h-4 mr-2" />
                        Add to Calendar
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}