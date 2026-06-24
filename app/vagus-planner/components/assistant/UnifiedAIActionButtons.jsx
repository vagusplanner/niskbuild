import React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, CheckSquare, Users, Target, Plus } from 'lucide-react';
import { useAIScheduling } from './AISchedulingBridge';
import { toast } from 'sonner';

export default function UnifiedAIActionButtons({ suggestion, compact = false }) {
  const { createEvent, createTask, createMeeting, createHabit } = useAIScheduling();

  const handleCreateEvent = async () => {
    if (!suggestion) return;
    
    const eventData = {
      title: suggestion.title || suggestion.action || suggestion.recommendation,
      description: suggestion.description || suggestion.details || '',
      start_date: suggestion.start_date || suggestion.date || new Date().toISOString(),
      end_date: suggestion.end_date || suggestion.date || new Date().toISOString(),
      category: suggestion.category || 'personal',
      is_all_day: suggestion.is_all_day ?? false
    };
    
    await createEvent(eventData);
  };

  const handleCreateTask = async () => {
    if (!suggestion) return;
    
    const taskData = {
      title: suggestion.title || suggestion.action || suggestion.recommendation,
      description: suggestion.description || suggestion.details || '',
      due_date: suggestion.due_date || suggestion.date,
      priority: suggestion.priority || 'medium',
      category: suggestion.category || 'personal',
      status: 'todo'
    };
    
    await createTask(taskData);
  };

  const handleCreateMeeting = async () => {
    if (!suggestion) return;
    
    const meetingData = {
      title: suggestion.title || suggestion.action || suggestion.recommendation,
      description: suggestion.description || suggestion.details || '',
      duration_minutes: suggestion.duration_minutes || 30,
      organizer_email: suggestion.organizer_email,
      attendees: suggestion.attendees || []
    };
    
    await createMeeting(meetingData);
  };

  const handleCreateHabit = async () => {
    if (!suggestion) return;
    
    const habitData = {
      name: suggestion.title || suggestion.action || suggestion.recommendation,
      description: suggestion.description || suggestion.details || '',
      frequency: suggestion.frequency || 'daily',
      category: suggestion.category || 'other',
      target_count: suggestion.target_count || 1
    };
    
    await createHabit(habitData);
  };

  if (!suggestion) return null;

  return (
    <div className={compact ? "flex gap-1" : "flex flex-wrap gap-2"}>
      <Button
        size={compact ? "sm" : "default"}
        variant="outline"
        onClick={handleCreateEvent}
        className="gap-1"
      >
        <Calendar className="w-3 h-3" />
        {!compact && "Add Event"}
      </Button>
      <Button
        size={compact ? "sm" : "default"}
        variant="outline"
        onClick={handleCreateTask}
        className="gap-1"
      >
        <CheckSquare className="w-3 h-3" />
        {!compact && "Add Task"}
      </Button>
      {suggestion.attendees && (
        <Button
          size={compact ? "sm" : "default"}
          variant="outline"
          onClick={handleCreateMeeting}
          className="gap-1"
        >
          <Users className="w-3 h-3" />
          {!compact && "Meeting"}
        </Button>
      )}
      {suggestion.is_recurring || suggestion.frequency === 'daily' || suggestion.frequency === 'weekly' ? (
        <Button
          size={compact ? "sm" : "default"}
          variant="outline"
          onClick={handleCreateHabit}
          className="gap-1"
        >
          <Target className="w-3 h-3" />
          {!compact && "Add Habit"}
        </Button>
      ) : null}
    </div>
  );
}