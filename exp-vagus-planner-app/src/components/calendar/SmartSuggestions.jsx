import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Loader2, Plus, X, Clock, Dumbbell, 
  Moon, Repeat, Calendar, ChevronRight, RefreshCw
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SDK } from '@/lib/custom-sdk.js';
import { format, addDays } from 'date-fns';
import { calculatePrayerTimes } from './PrayerTimes';

export default function SmartSuggestions({ events = [], settings = {}, onCreateEvent }) {
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dismissed, setDismissed] = useState([]);
  const [lastGenerated, setLastGenerated] = useState(null);

  useEffect(() => {
    // Auto-generate on first load if we have events
    if (events.length > 0 && !lastGenerated) {
      generateSuggestions();
    }
  }, [events.length]);

  const generateSuggestions = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const today = new Date();
      const prayerTimes = settings?.prayer_enabled !== false 
        ? calculatePrayerTimes(today, settings?.latitude, settings?.longitude)
        : null;

      // Analyze events
      const recentEvents = events.slice(0, 50);
      const categoryCount = {};
      const timePatterns = {};
      const recurringCandidates = {};

      recentEvents.forEach(e => {
        // Count categories
        categoryCount[e.category] = (categoryCount[e.category] || 0) + 1;
        
        // Track time patterns
        if (e.start_time) {
          const key = `${e.category}-${e.start_time.substring(0, 2)}`;
          timePatterns[key] = (timePatterns[key] || 0) + 1;
        }

        // Find recurring patterns (same title appearing multiple times)
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

      // Find free slots today
      const todayEvents = events.filter(e => e.date === format(today, 'yyyy-MM-dd'));
      const busyTimes = todayEvents.map(e => ({
        start: e.start_time,
        end: e.end_time
      })).filter(t => t.start);

      const result = await SDK.integrations.Core.InvokeLLM({
        prompt: `Analyze this user's calendar and suggest personalized activities.

TODAY: ${format(today, 'EEEE, MMMM d, yyyy')}

USER'S EVENT CATEGORIES (frequency):
${JSON.stringify(categoryCount)}

TIME PATTERNS (category-hour: count):
${JSON.stringify(timePatterns)}

POTENTIAL RECURRING EVENTS (appeared 2+ times):
${JSON.stringify(Object.values(recurringCandidates).filter(c => c.count >= 2))}

TODAY'S BUSY TIMES:
${JSON.stringify(busyTimes)}

PRAYER TIMES ENABLED: ${settings?.prayer_enabled !== false}
${prayerTimes ? `PRAYER TIMES: ${JSON.stringify(prayerTimes)}` : ''}

Generate 3-4 smart suggestions:

1. ACTIVITY SUGGESTIONS: Based on their category preferences and free time slots today
   - If they have many health events, suggest workout/wellness during free time
   - If many work events, suggest a break or personal time
   - Consider prayer times if enabled - suggest prayer reminders before prayer time

2. RECURRING EVENT SUGGESTIONS: If same event title appears 2+ times but isn't marked recurring, suggest making it recurring

3. UPCOMING SLOT SUGGESTIONS: Identify good times for commonly missed categories

4. PRAYER REMINDERS: If prayer is enabled and there's a long gap before next prayer, remind them

For each suggestion provide:
- type: "activity" | "recurring" | "prayer" | "break"
- title: Short suggestion title
- description: Why this is suggested
- action: What event to create (if applicable)
- priority: "high" | "medium" | "low"`,
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
        setSuggestions(result.suggestions.filter(s => !dismissed.includes(s.title)));
        setLastGenerated(new Date());
      }
    } catch (error) {
      console.error('Failed to generate suggestions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = (title) => {
    setDismissed(prev => [...prev, title]);
    setSuggestions(prev => prev.filter(s => s.title !== title));
  };

  const handleAccept = (suggestion) => {
    if (suggestion.action && onCreateEvent) {
      onCreateEvent(suggestion.action);
    }
    handleDismiss(suggestion.title);
  };

  const getIcon = (type) => {
    switch (type) {
      case 'activity': return Dumbbell;
      case 'recurring': return Repeat;
      case 'prayer': return Moon;
      case 'break': return Clock;
      default: return Calendar;
    }
  };

  const getColors = (type, priority) => {
    if (priority === 'high') {
      return 'from-rose-500 to-orange-500 text-white';
    }
    switch (type) {
      case 'activity': return 'from-emerald-50 to-teal-50 text-emerald-800 border-emerald-200';
      case 'recurring': return 'from-blue-50 to-indigo-50 text-blue-800 border-blue-200';
      case 'prayer': return 'from-violet-50 to-purple-50 text-violet-800 border-violet-200';
      case 'break': return 'from-amber-50 to-yellow-50 text-amber-800 border-amber-200';
      default: return 'from-slate-50 to-gray-50 text-slate-800 border-slate-200';
    }
  };

  if (suggestions.length === 0 && !isLoading) {
    return (
      <Card className="p-4 bg-gradient-to-br from-slate-50 to-white border-dashed">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-slate-400" />
            <span className="text-sm text-slate-500">AI suggestions</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={generateSuggestions}
            className="text-emerald-600"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Generate
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-white/80 backdrop-blur border-0 shadow-lg overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-500" />
          <h3 className="font-semibold text-slate-800">Smart Suggestions</h3>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={generateSuggestions}
          disabled={isLoading}
          className="h-8 text-slate-500"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </Button>
      </div>

      <AnimatePresence mode="popLayout">
        {isLoading && suggestions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-8 text-center"
          >
            <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Analyzing your calendar...</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {suggestions.map((suggestion, idx) => {
              const Icon = getIcon(suggestion.type);
              const colors = getColors(suggestion.type, suggestion.priority);
              
              return (
                <motion.div
                  key={suggestion.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`p-3 rounded-xl bg-gradient-to-r ${colors} border relative group`}
                >
                  <button
                    onClick={() => handleDismiss(suggestion.title)}
                    className="absolute top-2 right-2 p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-black/10 transition-all"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${suggestion.priority === 'high' ? 'bg-white/20' : 'bg-white shadow-sm'}`}>
                      <Icon className={`w-4 h-4 ${suggestion.priority === 'high' ? 'text-white' : ''}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{suggestion.title}</p>
                      <p className={`text-xs mt-0.5 ${suggestion.priority === 'high' ? 'text-white/80' : 'opacity-70'}`}>
                        {suggestion.description}
                      </p>
                      
                      {suggestion.action && (
                        <Button
                          size="sm"
                          onClick={() => handleAccept(suggestion)}
                          className={`mt-2 h-7 text-xs ${
                            suggestion.priority === 'high' 
                              ? 'bg-white text-rose-600 hover:bg-white/90' 
                              : 'bg-white shadow-sm hover:bg-slate-50'
                          }`}
                          variant={suggestion.priority === 'high' ? 'default' : 'outline'}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add to Calendar
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>
    </Card>
  );
}