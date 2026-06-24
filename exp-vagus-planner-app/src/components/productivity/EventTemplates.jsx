import React, { useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Zap, Plus, Clock, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function EventTemplates({ onUseTemplate }) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedTime, setSelectedTime] = useState('09:00');

  const queryClient = useQueryClient();

  const { data: templates = [] } = useQuery({
    queryKey: ['event-templates'],
    queryFn: () => SDK.entities.EventTemplate.list('-usage_count')
  });

  const useTemplateMutation = useMutation({
    mutationFn: async ({ template, date, time }) => {
      const endTime = new Date(`2000-01-01T${time}`);
      endTime.setMinutes(endTime.getMinutes() + template.duration_minutes);
      
      const event = await SDK.entities.Event.create({
        title: template.title,
        description: template.description,
        date,
        start_time: time,
        end_time: `${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}`,
        category: template.category,
        location: template.location,
        reminder_minutes: template.reminder_minutes,
        color: template.color
      });

      await SDK.entities.EventTemplate.update(template.id, {
        usage_count: (template.usage_count || 0) + 1
      });

      return event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['event-templates'] });
      toast.success('Event created from template!');
      if (onUseTemplate) onUseTemplate();
    }
  });

  const handleUseTemplate = (template) => {
    useTemplateMutation.mutate({
      template,
      date: selectedDate,
      time: selectedTime
    });
  };

  const popularTemplates = [
    { icon: '☕', name: 'Coffee Meeting', duration: 30, category: 'social' },
    { icon: '💼', name: 'Client Call', duration: 60, category: 'work' },
    { icon: '🏃', name: 'Workout', duration: 45, category: 'health' },
    { icon: '📚', name: 'Study Session', duration: 90, category: 'learning' },
    { icon: '🍽️', name: 'Dinner', duration: 90, category: 'personal' },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-600" />
            Quick Templates
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 mb-4">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="flex-1"
          />
          <Input
            type="time"
            value={selectedTime}
            onChange={(e) => setSelectedTime(e.target.value)}
            className="w-32"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          {templates.slice(0, 6).map(template => (
            <Button
              key={template.id}
              variant="outline"
              className="h-auto flex-col items-start p-3 hover:bg-blue-50"
              onClick={() => handleUseTemplate(template)}
            >
              <div className="flex items-center gap-2 w-full">
                <span className="text-2xl">{template.icon || '📅'}</span>
                <div className="flex-1 text-left">
                  <p className="font-medium text-sm">{template.name}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {template.duration_minutes}min
                  </p>
                </div>
              </div>
              {template.usage_count > 0 && (
                <Badge variant="outline" className="text-xs mt-2">
                  Used {template.usage_count}x
                </Badge>
              )}
            </Button>
          ))}
        </div>

        {templates.length === 0 && (
          <div className="text-center p-8 bg-slate-50 rounded-lg">
            <Zap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-600">No templates yet</p>
            <p className="text-xs text-slate-400 mt-1">Create templates for events you schedule often</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}