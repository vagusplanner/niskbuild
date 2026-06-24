import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  Shuffle, 
  CheckCircle2, 
  Calendar,
  Clock,
  Zap,
  ArrowRight,
  X
} from 'lucide-react';
import { format, isWithinInterval, addMinutes, addHours, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

export default function AutoRescheduleEngine({ 
  conflictingEvents = [], 
  newEvent, 
  onReschedule,
  onCancel 
}) {
  const [analyzing, setAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  const analyzeAndSuggest = async () => {
    setAnalyzing(true);
    try {
      const rescheduleOptions = await findRescheduleOptions();
      setSuggestions(rescheduleOptions);
    } catch (error) {
      console.error('Rescheduling analysis error:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const findRescheduleOptions = async () => {
    const options = [];

    for (const conflict of conflictingEvents) {
      // Get all events to check for other conflicts
      const allEvents = await base44.entities.Event.list();
      
      // Priority-based rescheduling
      const newEventPriority = newEvent.priority || 'medium';
      const conflictPriority = conflict.priority || 'medium';
      
      const priorityScore = {
        urgent: 4,
        high: 3,
        medium: 2,
        low: 1
      };

      // If new event has higher priority, suggest moving the conflicting one
      if (priorityScore[newEventPriority] > priorityScore[conflictPriority]) {
        const alternateSlots = findAlternateSlots(conflict, allEvents);
        
        alternateSlots.forEach(slot => {
          options.push({
            type: 'move_existing',
            eventToMove: conflict,
            suggestedTime: slot,
            reason: `Higher priority: ${newEvent.title}`,
            confidence: 85
          });
        });
      }

      // Suggest adjusting duration if there's partial overlap
      const newStart = new Date(newEvent.start_date);
      const newEnd = new Date(newEvent.end_date);
      const conflictStart = new Date(conflict.start_date);
      const conflictEnd = new Date(conflict.end_date);

      // Suggest moving new event slightly
      const alternateTimesForNew = findAlternateSlots(newEvent, allEvents);
      alternateTimesForNew.slice(0, 3).forEach(slot => {
        options.push({
          type: 'adjust_new',
          eventToMove: newEvent,
          suggestedTime: slot,
          reason: 'Minimize disruption to existing schedule',
          confidence: 70
        });
      });
    }

    // Sort by confidence
    return options.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
  };

  const findAlternateSlots = (event, allEvents) => {
    const slots = [];
    const eventDuration = (new Date(event.end_date) - new Date(event.start_date)) / (1000 * 60);
    const originalStart = new Date(event.start_date);
    
    // Try slots before and after
    const attempts = [
      { offset: -eventDuration - 30, label: 'Before' },
      { offset: eventDuration + 30, label: 'After' },
      { offset: -120, label: '2h before' },
      { offset: 120, label: '2h after' },
      { offset: 24 * 60, label: 'Next day same time' },
      { offset: -24 * 60, label: 'Previous day same time' }
    ];

    attempts.forEach(({ offset, label }) => {
      const newStart = addMinutes(originalStart, offset);
      const newEnd = addMinutes(newStart, eventDuration);

      // Check if this slot is free
      const hasConflict = allEvents.some(e => {
        if (e.id === event.id) return false;
        
        const eStart = new Date(e.start_date);
        const eEnd = new Date(e.end_date || e.start_date);
        
        return (
          isWithinInterval(newStart, { start: eStart, end: eEnd }) ||
          isWithinInterval(newEnd, { start: eStart, end: eEnd }) ||
          isWithinInterval(eStart, { start: newStart, end: newEnd })
        );
      });

      if (!hasConflict) {
        slots.push({
          start: newStart,
          end: newEnd,
          label,
          score: offset === eventDuration + 30 ? 100 : offset === -eventDuration - 30 ? 95 : 80
        });
      }
    });

    return slots.sort((a, b) => b.score - a.score);
  };

  const handleAcceptSuggestion = async (suggestion) => {
    const eventToUpdate = suggestion.type === 'move_existing' 
      ? suggestion.eventToMove 
      : newEvent;

    await onReschedule({
      eventId: eventToUpdate.id,
      newStartDate: suggestion.suggestedTime.start,
      newEndDate: suggestion.suggestedTime.end,
      type: suggestion.type
    });
  };

  return (
    <Card className="p-6 border-2 border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h3 className="font-bold text-amber-900 dark:text-amber-100">
              Scheduling Conflict Detected
            </h3>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {conflictingEvents.length} event(s) conflict with your new event
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onCancel}
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Conflicting Events */}
      <div className="mb-4 space-y-2">
        {conflictingEvents.map(event => (
          <div key={event.id} className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800 dark:text-slate-100">
                  {event.title}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {format(new Date(event.start_date), 'MMM d, h:mm a')} - {format(new Date(event.end_date), 'h:mm a')}
                </p>
              </div>
              <Badge variant="outline">{event.priority || 'medium'}</Badge>
            </div>
          </div>
        ))}
      </div>

      {/* Auto-Reschedule Button */}
      <Button
        onClick={analyzeAndSuggest}
        disabled={analyzing}
        className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 mb-4"
      >
        {analyzing ? (
          <>
            <Zap className="w-4 h-4 mr-2 animate-pulse" />
            Analyzing Best Options...
          </>
        ) : (
          <>
            <Shuffle className="w-4 h-4 mr-2" />
            Auto-Reschedule
          </>
        )}
      </Button>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-amber-900 dark:text-amber-100 text-sm">
            Smart Rescheduling Options
          </h4>
          
          {suggestions.map((suggestion, idx) => (
            <Card key={idx} className="p-4 bg-white dark:bg-slate-900 border-2 border-amber-100 dark:border-amber-900 hover:border-amber-300 dark:hover:border-amber-700 transition-colors">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={cn(
                        suggestion.confidence >= 80 ? "bg-green-600" : "bg-blue-600"
                      )}>
                        {suggestion.confidence}% Confidence
                      </Badge>
                      <span className="text-xs text-slate-600 dark:text-slate-400">
                        {suggestion.reason}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {suggestion.eventToMove.title}
                      </span>
                      <ArrowRight className="w-4 h-4 text-amber-600" />
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        <span className="text-slate-600 dark:text-slate-400">
                          {format(suggestion.suggestedTime.start, 'MMM d')}
                        </span>
                        <Clock className="w-3 h-3 text-slate-500 ml-2" />
                        <span className="text-slate-600 dark:text-slate-400">
                          {format(suggestion.suggestedTime.start, 'h:mm a')}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => handleAcceptSuggestion(suggestion)}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Apply
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Card>
  );
}