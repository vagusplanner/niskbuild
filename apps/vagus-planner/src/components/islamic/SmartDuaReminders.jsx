import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Bell, Check, Moon, Sun, Home, Car } from 'lucide-react';
import { toast } from 'sonner';

export default function SmartDuaReminders() {
  const queryClient = useQueryClient();

  const { data: reminders = [] } = useQuery({
    queryKey: ['duaReminders'],
    queryFn: () => base44.entities.DuaReminder.filter({ is_active: true })
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DuaReminder.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['duaReminders'] });
    }
  });

  const markCompleted = (reminder) => {
    updateMutation.mutate({
      id: reminder.id,
      data: {
        last_shown: new Date().toISOString(),
        times_completed: (reminder.times_completed || 0) + 1
      }
    });
    toast.success('Dua completed! 🤲');
  };

  const getIcon = (type) => {
    const icons = {
      morning_adhkar: <Sun className="w-4 h-4 text-amber-600" />,
      evening_adhkar: <Moon className="w-4 h-4 text-indigo-600" />,
      before_travel: <Car className="w-4 h-4 text-blue-600" />,
      entering_home: <Home className="w-4 h-4 text-emerald-600" />,
      leaving_home: <Home className="w-4 h-4 text-teal-600" />
    };
    return icons[type] || <Bell className="w-4 h-4 text-slate-600" />;
  };

  // Filter relevant reminders based on time of day
  const now = new Date().getHours();
  const relevantReminders = reminders.filter(r => {
    if (r.dua_type === 'morning_adhkar') return now >= 5 && now < 12;
    if (r.dua_type === 'evening_adhkar') return now >= 15 && now < 20;
    return true;
  });

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-900">
          🤲 Smart Dua Reminders
        </CardTitle>
      </CardHeader>
      <CardContent>
        {relevantReminders.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-500">No dua reminders active right now</p>
          </div>
        ) : (
          <div className="space-y-3">
            {relevantReminders.slice(0, 3).map((reminder) => (
              <div
                key={reminder.id}
                className="p-4 bg-white rounded-lg border-2 border-blue-200"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-start gap-2">
                    {getIcon(reminder.dua_type)}
                    <div>
                      <Badge variant="outline" className="mb-2 text-xs">
                        {reminder.dua_type.replace(/_/g, ' ')}
                      </Badge>
                      {reminder.arabic_text && (
                        <p className="text-right text-lg font-arabic mb-2 text-blue-900">
                          {reminder.arabic_text}
                        </p>
                      )}
                      {reminder.transliteration && (
                        <p className="text-sm text-slate-600 italic mb-1">
                          {reminder.transliteration}
                        </p>
                      )}
                      <p className="text-sm text-slate-700">{reminder.translation}</p>
                      {reminder.times_completed > 0 && (
                        <p className="text-xs text-slate-500 mt-2">
                          Completed {reminder.times_completed} times
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => markCompleted(reminder)}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}