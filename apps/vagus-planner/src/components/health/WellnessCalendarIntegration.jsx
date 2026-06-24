import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Plus, CheckCircle2, Clock, Utensils, Dumbbell, Moon } from 'lucide-react';
import { toast } from 'sonner';
import { addDays, format } from 'date-fns';

export default function WellnessCalendarIntegration({ weeklyPlan, onScheduled }) {
  const [scheduling, setScheduling] = useState(false);
  const queryClient = useQueryClient();

  const createEventsMutation = useMutation({
    mutationFn: async (events) => {
      return await base44.entities.Event.bulkCreate(events);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Wellness activities scheduled to your calendar!');
      onScheduled?.();
    }
  });

  const scheduleToCalendar = async () => {
    if (!weeklyPlan || weeklyPlan.length === 0) {
      toast.error('No wellness plan available');
      return;
    }

    setScheduling(true);
    try {
      const events = [];
      const today = new Date();

      weeklyPlan.forEach((day, index) => {
        const date = addDays(today, index);
        const dateStr = format(date, 'yyyy-MM-dd');

        // Morning routine
        if (day.morning) {
          events.push({
            title: `🌅 ${day.focus} - Morning`,
            description: day.morning,
            start_date: `${dateStr}T07:00:00`,
            end_date: `${dateStr}T08:00:00`,
            category: 'health',
            color: '#10b981',
            is_all_day: false
          });
        }

        // Afternoon activity
        if (day.afternoon) {
          events.push({
            title: `💪 ${day.focus} - Afternoon`,
            description: day.afternoon,
            start_date: `${dateStr}T14:00:00`,
            end_date: `${dateStr}T15:00:00`,
            category: 'health',
            color: '#3b82f6',
            is_all_day: false
          });
        }

        // Evening routine
        if (day.evening) {
          events.push({
            title: `🌙 ${day.focus} - Evening`,
            description: day.evening,
            start_date: `${dateStr}T20:00:00`,
            end_date: `${dateStr}T21:00:00`,
            category: 'health',
            color: '#8b5cf6',
            is_all_day: false
          });
        }
      });

      await createEventsMutation.mutateAsync(events);
    } catch (error) {
      toast.error('Failed to schedule wellness activities');
      console.error(error);
    } finally {
      setScheduling(false);
    }
  };

  if (!weeklyPlan || weeklyPlan.length === 0) return null;

  return (
    <Card className="border-teal-200 bg-gradient-to-br from-teal-50 to-emerald-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="w-5 h-5 text-teal-600" />
          Schedule to Calendar
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-700 mb-4">
          Add your personalized wellness activities to your calendar for the next 7 days
        </p>
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <CheckCircle2 className="w-3 h-3 text-green-600" />
            {weeklyPlan.length} days of wellness activities
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Clock className="w-3 h-3 text-blue-600" />
            Morning, afternoon, and evening routines
          </div>
        </div>
        <Button
          onClick={scheduleToCalendar}
          disabled={scheduling}
          className="w-full bg-teal-600 hover:bg-teal-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          {scheduling ? 'Scheduling...' : 'Add to Calendar'}
        </Button>
      </CardContent>
    </Card>
  );
}