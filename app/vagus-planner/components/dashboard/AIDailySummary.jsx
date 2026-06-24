import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Calendar, CheckSquare, Heart, Moon, Plane, TrendingUp } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';

export default function AIDailySummary() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: todayEvents = [] } = useQuery({
    queryKey: ['today-events'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      return base44.entities.Event.filter({
        start_date: { $gte: `${today}T00:00:00Z`, $lte: `${today}T23:59:59Z` }
      });
    }
  });

  const { data: upcomingEvents = [] } = useQuery({
    queryKey: ['upcoming-events'],
    queryFn: async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      return base44.entities.Event.filter({
        start_date: { 
          $gte: tomorrow.toISOString(), 
          $lte: nextWeek.toISOString() 
        }
      }, '-start_date', 5);
    }
  });

  const { data: priorityTasks = [] } = useQuery({
    queryKey: ['priority-tasks'],
    queryFn: () => base44.entities.Task.filter({ 
      status: { $in: ['todo', 'in_progress'] },
      priority: { $in: ['high', 'urgent'] }
    }, '-priority', 5)
  });

  const { data: recentSleep = [] } = useQuery({
    queryKey: ['recent-sleep'],
    queryFn: () => base44.entities.Sleep.list('-date', 7)
  });

  const { data: recentMood = [] } = useQuery({
    queryKey: ['recent-mood'],
    queryFn: () => base44.entities.Mood.list('-date', 7)
  });

  const { data: activeTrips = [] } = useQuery({
    queryKey: ['active-trips-summary'],
    queryFn: async () => {
      const all = await base44.entities.Holiday.list();
      return all.filter(h => h.status === 'booked' || h.status === 'in_progress');
    }
  });

  const { data: settings = [] } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => base44.entities.UserSettings.list()
  });

  const generateSummary = async () => {
    setLoading(true);
    try {
      const avgSleep = recentSleep.length > 0 
        ? recentSleep.reduce((sum, s) => sum + (s.hours || 0), 0) / recentSleep.length 
        : 0;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate a personalized daily summary for ${user?.full_name || 'the user'}:

TODAY'S SCHEDULE:
${todayEvents.length > 0 ? todayEvents.map(e => `- ${e.title} at ${format(new Date(e.start_date), 'h:mm a')}`).join('\n') : '- No events scheduled'}

UPCOMING (Next 7 days):
${upcomingEvents.length > 0 ? upcomingEvents.map(e => `- ${e.title} on ${format(new Date(e.start_date), 'MMM d')}`).join('\n') : '- Nothing scheduled'}

TOP PRIORITY TASKS:
${priorityTasks.length > 0 ? priorityTasks.map(t => `- ${t.title} (${t.priority})`).join('\n') : '- No urgent tasks'}

HEALTH SNAPSHOT:
- Average sleep (7 days): ${avgSleep.toFixed(1)} hours
- Recent moods: ${recentMood.map(m => m.mood).join(', ') || 'Not tracked'}

ISLAMIC:
- Prayer times enabled: ${settings[0]?.prayer_enabled !== false ? 'Yes' : 'No'}
- Show fasting indicators: ${settings[0]?.show_fasting_indicators ? 'Yes' : 'No'}

TRAVEL:
${activeTrips.length > 0 ? activeTrips.map(t => `- ${t.destination} (${t.start_date})`).join('\n') : '- No active trips'}

Provide:
1. A warm greeting with key highlight of the day
2. Brief calendar overview with time management tip
3. Task focus recommendation
4. Health insight based on sleep/mood patterns
5. Islamic reminder (if enabled)
6. Travel alert (if applicable)
7. One actionable suggestion for today

Keep it concise, friendly, and actionable.`,
        response_json_schema: {
          type: "object",
          properties: {
            greeting: { type: "string" },
            calendar_overview: { type: "string" },
            task_focus: { type: "string" },
            health_insight: { type: "string" },
            islamic_reminder: { type: "string" },
            travel_alert: { type: "string" },
            action_suggestion: { type: "string" }
          }
        }
      });

      setSummary(response);
    } catch (error) {
      console.error('Failed to generate summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const sections = summary ? [
    { icon: Sparkles, title: "Today's Highlight", content: summary.greeting, color: "text-purple-600" },
    { icon: Calendar, title: "Calendar", content: summary.calendar_overview, color: "text-teal-600" },
    { icon: CheckSquare, title: "Task Focus", content: summary.task_focus, color: "text-amber-600" },
    { icon: Heart, title: "Health", content: summary.health_insight, color: "text-red-600" },
    ...(settings[0]?.prayer_enabled !== false && summary.islamic_reminder ? [
      { icon: Moon, title: "Islamic", content: summary.islamic_reminder, color: "text-indigo-600" }
    ] : []),
    ...(activeTrips.length > 0 && summary.travel_alert ? [
      { icon: Plane, title: "Travel", content: summary.travel_alert, color: "text-cyan-600" }
    ] : []),
    { icon: TrendingUp, title: "Action", content: summary.action_suggestion, color: "text-green-600" }
  ] : [];

  return (
    <Card className="bg-gradient-to-br from-purple-50 via-blue-50 to-teal-50 dark:from-purple-950/30 dark:via-blue-950/30 dark:to-teal-950/30 border-purple-200 dark:border-purple-800 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI Daily Summary
          </CardTitle>
          <Button 
            onClick={generateSummary} 
            disabled={loading}
            size="sm"
            className="bg-purple-600 hover:bg-purple-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate
              </>
            )}
          </Button>
        </div>
        {!summary && (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Get your personalized daily digest with insights across all areas
          </p>
        )}
      </CardHeader>
      
      {summary && (
        <CardContent className="space-y-3">
          {sections.map((section, index) => (
            <div key={index} className="p-3 bg-white/60 dark:bg-slate-800/60 rounded-lg">
              <div className="flex items-start gap-3">
                <section.icon className={`w-5 h-5 ${section.color} mt-0.5 flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200 mb-1">
                    {section.title}
                  </h4>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {section.content}
                  </p>
                </div>
              </div>
            </div>
          ))}
          
          <div className="pt-2 text-center">
            <Badge variant="outline" className="text-xs">
              Generated at {format(new Date(), 'h:mm a')}
            </Badge>
          </div>
        </CardContent>
      )}
    </Card>
  );
}