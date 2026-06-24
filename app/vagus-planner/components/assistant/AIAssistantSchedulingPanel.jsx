import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, CheckSquare, Users, Target, Plus } from 'lucide-react';
import { useAIScheduling } from './AISchedulingBridge';
import { cn } from '@/lib/utils';

export default function AIAssistantSchedulingPanel({ 
  suggestions = [], 
  compact = false, 
  className 
}) {
  const { createEvent, createTask, createMeeting, createHabit } = useAIScheduling();

  if (!suggestions || suggestions.length === 0) return null;

  const handleSchedule = async (suggestion, type) => {
    const baseData = {
      title: suggestion.title || suggestion.action || suggestion.recommendation,
      description: suggestion.description || suggestion.details || suggestion.why || '',
      category: suggestion.category || 'personal'
    };

    switch (type) {
      case 'event':
        await createEvent({
          ...baseData,
          start_date: suggestion.start_date || suggestion.date || new Date().toISOString(),
          end_date: suggestion.end_date || suggestion.date || new Date().toISOString(),
          is_all_day: suggestion.is_all_day ?? false
        });
        break;
      
      case 'task':
        await createTask({
          ...baseData,
          due_date: suggestion.due_date || suggestion.date,
          priority: suggestion.priority || 'medium',
          status: 'todo'
        });
        break;
      
      case 'meeting':
        await createMeeting({
          title: baseData.title,
          description: baseData.description,
          duration_minutes: suggestion.duration_minutes || 30,
          organizer_email: suggestion.organizer_email,
          attendees: suggestion.attendees || []
        });
        break;
      
      case 'habit':
        await createHabit({
          name: baseData.title,
          description: baseData.description,
          frequency: suggestion.frequency || 'daily',
          category: baseData.category,
          target_count: suggestion.target_count || 1
        });
        break;
    }
  };

  return (
    <Card className={cn("border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-50", className)}>
      <CardContent className="pt-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-700 mb-3">
            Quick Actions:
          </p>
          {suggestions.map((suggestion, idx) => (
            <div
              key={idx}
              className="p-3 bg-white rounded-lg border border-slate-200 space-y-2"
            >
              <p className="text-sm font-medium text-slate-800">
                {suggestion.title || suggestion.action || suggestion.recommendation}
              </p>
              {(suggestion.description || suggestion.why) && (
                <p className="text-xs text-slate-600">
                  {suggestion.description || suggestion.why}
                </p>
              )}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSchedule(suggestion, 'event')}
                  className="h-7 text-xs"
                >
                  <Calendar className="w-3 h-3 mr-1" />
                  Event
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSchedule(suggestion, 'task')}
                  className="h-7 text-xs"
                >
                  <CheckSquare className="w-3 h-3 mr-1" />
                  Task
                </Button>
                {suggestion.attendees && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSchedule(suggestion, 'meeting')}
                    className="h-7 text-xs"
                  >
                    <Users className="w-3 h-3 mr-1" />
                    Meeting
                  </Button>
                )}
                {(suggestion.is_recurring || suggestion.frequency) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSchedule(suggestion, 'habit')}
                    className="h-7 text-xs"
                  >
                    <Target className="w-3 h-3 mr-1" />
                    Habit
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}