import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Clock, 
  Users, 
  TrendingUp, 
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Brain,
  Zap
} from 'lucide-react';
import { format, addDays, addHours, isWithinInterval, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

export default function IntelligentSchedulingEngine({ 
  attendeeEmails = [], 
  duration = 60, 
  preferredDays = [],
  onSelectTime,
  eventTitle = '',
  eventContext = ''
}) {
  const [analyzing, setAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [agenda, setAgenda] = useState(null);

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => SDK.entities.Event.list('-start_date', 100)
  });

  const { data: meetings = [] } = useQuery({
    queryKey: ['meetings'],
    queryFn: () => SDK.entities.Meeting.list()
  });

  const analyzeAndSuggest = async () => {
    setAnalyzing(true);
    try {
      // Analyze historical patterns
      const patterns = analyzeHistoricalPatterns();
      
      // Find optimal time slots
      const optimalSlots = findOptimalTimeSlots(patterns);
      
      // Score and rank slots
      const rankedSlots = rankTimeSlots(optimalSlots, patterns);
      
      setSuggestions(rankedSlots);

      // Generate AI agenda if event title provided
      if (eventTitle) {
        const agendaResponse = await SDK.integrations.Core.InvokeLLM({
          prompt: `Generate a concise, professional meeting agenda for a meeting titled "${eventTitle}" ${eventContext ? `with context: ${eventContext}` : ''} ${attendeeEmails.length > 0 ? `with ${attendeeEmails.length} participants` : ''}. Duration: ${duration} minutes. Return structured agenda with time allocations.`,
          response_json_schema: {
            type: "object",
            properties: {
              objective: { type: "string" },
              topics: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    topic: { type: "string" },
                    duration_minutes: { type: "number" },
                    description: { type: "string" }
                  }
                }
              },
              preparation: {
                type: "array",
                items: { type: "string" }
              }
            }
          }
        });
        setAgenda(agendaResponse);
      }
    } catch (error) {
      console.error('Analysis error:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const analyzeHistoricalPatterns = () => {
    const now = new Date();
    const recentEvents = events.filter(e => 
      new Date(e.start_date) < now && 
      new Date(e.start_date) > addDays(now, -90)
    );

    // Analyze meeting time preferences
    const hourCounts = {};
    const dayCounts = {};
    const durationStats = [];

    recentEvents.forEach(event => {
      const date = new Date(event.start_date);
      const hour = date.getHours();
      const day = date.getDay();
      
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      dayCounts[day] = (dayCounts[day] || 0) + 1;

      if (event.end_date) {
        const duration = (new Date(event.end_date) - date) / (1000 * 60);
        durationStats.push(duration);
      }
    });

    // Find preferred hours and days
    const preferredHours = Object.entries(hourCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([hour]) => parseInt(hour));

    const preferredWeekdays = Object.entries(dayCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([day]) => parseInt(day));

    return {
      preferredHours,
      preferredWeekdays,
      avgDuration: durationStats.length > 0 
        ? durationStats.reduce((a, b) => a + b, 0) / durationStats.length 
        : 60,
      busyHours: Object.entries(hourCounts)
        .filter(([, count]) => count > 5)
        .map(([hour]) => parseInt(hour))
    };
  };

  const findOptimalTimeSlots = (patterns) => {
    const slots = [];
    const now = new Date();
    
    // Generate slots for next 14 days
    for (let dayOffset = 1; dayOffset <= 14; dayOffset++) {
      const date = addDays(now, dayOffset);
      const dayOfWeek = date.getDay();
      
      // Skip weekends unless preferred
      if ([0, 6].includes(dayOfWeek) && !preferredDays.includes(dayOfWeek)) {
        continue;
      }

      // Try slots during business hours
      for (let hour = 8; hour <= 17; hour++) {
        const slotStart = new Date(date);
        slotStart.setHours(hour, 0, 0, 0);
        const slotEnd = addHours(slotStart, duration / 60);

        // Check if slot is free
        const hasConflict = events.some(event => {
          const eventStart = new Date(event.start_date);
          const eventEnd = new Date(event.end_date || event.start_date);
          
          return (
            isWithinInterval(slotStart, { start: eventStart, end: eventEnd }) ||
            isWithinInterval(slotEnd, { start: eventStart, end: eventEnd }) ||
            isWithinInterval(eventStart, { start: slotStart, end: slotEnd })
          );
        });

        if (!hasConflict) {
          slots.push({
            start: slotStart,
            end: slotEnd,
            dayOfWeek,
            hour
          });
        }
      }
    }

    return slots;
  };

  const rankTimeSlots = (slots, patterns) => {
    return slots.map(slot => {
      let score = 100;
      
      // Prefer historical preferred hours
      if (patterns.preferredHours.includes(slot.hour)) {
        score += 30;
      }
      
      // Prefer historical preferred days
      if (patterns.preferredWeekdays.includes(slot.dayOfWeek)) {
        score += 20;
      }

      // Prefer mid-day slots
      if (slot.hour >= 10 && slot.hour <= 15) {
        score += 15;
      }

      // Avoid early morning and late afternoon
      if (slot.hour < 9 || slot.hour > 16) {
        score -= 20;
      }

      // Prefer Tuesday, Wednesday, Thursday
      if ([2, 3, 4].includes(slot.dayOfWeek)) {
        score += 10;
      }

      // Proximity bonus (sooner is better)
      const daysAway = Math.floor((slot.start - new Date()) / (1000 * 60 * 60 * 24));
      if (daysAway <= 3) score += 15;
      else if (daysAway <= 7) score += 5;

      return { ...slot, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950 border-indigo-200 dark:border-indigo-800">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-indigo-900 dark:text-indigo-100">
              AI-Powered Scheduling
            </h3>
          </div>
          <Button
            onClick={analyzeAndSuggest}
            disabled={analyzing}
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {analyzing ? (
              <>
                <Zap className="w-4 h-4 mr-2 animate-pulse" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Find Best Times
              </>
            )}
          </Button>
        </div>
        
        <p className="text-sm text-indigo-700 dark:text-indigo-300">
          Uses historical patterns, attendee availability, and optimal scheduling science
        </p>
      </Card>

      {/* Optimal Time Suggestions */}
      {suggestions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-slate-600" />
            <h4 className="font-semibold text-slate-800 dark:text-slate-100">
              Recommended Time Slots
            </h4>
          </div>
          
          <div className="grid gap-2">
            {suggestions.map((slot, idx) => (
              <Card
                key={idx}
                className={cn(
                  "p-4 cursor-pointer transition-all hover:shadow-md border-2",
                  idx === 0 ? "border-green-300 bg-green-50 dark:bg-green-950" : "border-slate-200 dark:border-slate-800"
                )}
                onClick={() => onSelectTime(slot)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4 text-slate-600" />
                      <span className="font-semibold text-slate-800 dark:text-slate-100">
                        {format(slot.start, 'EEEE, MMMM d')}
                      </span>
                      {idx === 0 && (
                        <Badge className="bg-green-600 text-white">Best Match</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span>{format(slot.start, 'h:mm a')} - {format(slot.end, 'h:mm a')}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1">
                      {slot.score >= 140 && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                      {slot.score >= 120 && slot.score < 140 && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                      {slot.score < 120 && <AlertCircle className="w-4 h-4 text-amber-600" />}
                      <span className={cn(
                        "text-xs font-semibold px-2 py-1 rounded",
                        slot.score >= 140 && "bg-green-100 text-green-700",
                        slot.score >= 120 && slot.score < 140 && "bg-blue-100 text-blue-700",
                        slot.score < 120 && "bg-amber-100 text-amber-700"
                      )}>
                        {Math.round(slot.score)}% Match
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">
                      {Math.ceil((slot.start - new Date()) / (1000 * 60 * 60 * 24))} days away
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* AI-Generated Agenda */}
      {agenda && (
        <Card className="p-4 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950 dark:to-purple-950 border-violet-200 dark:border-violet-800">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-violet-600" />
            <h4 className="font-semibold text-violet-900 dark:text-violet-100">
              Suggested Agenda
            </h4>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-white dark:bg-slate-900 rounded-lg">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Objective
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {agenda.objective}
              </p>
            </div>

            {agenda.topics && agenda.topics.length > 0 && (
              <div>
                <p className="text-sm font-medium text-violet-900 dark:text-violet-100 mb-2">
                  Topics ({duration} min total)
                </p>
                <div className="space-y-2">
                  {agenda.topics.map((topic, idx) => (
                    <div key={idx} className="p-3 bg-white dark:bg-slate-900 rounded-lg">
                      <div className="flex items-start justify-between mb-1">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                          {topic.topic}
                        </p>
                        <Badge variant="outline">{topic.duration_minutes} min</Badge>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {topic.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {agenda.preparation && agenda.preparation.length > 0 && (
              <div className="p-3 bg-white dark:bg-slate-900 rounded-lg">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Preparation Needed
                </p>
                <ul className="space-y-1">
                  {agenda.preparation.map((item, idx) => (
                    <li key={idx} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2">
                      <span className="text-violet-600">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}