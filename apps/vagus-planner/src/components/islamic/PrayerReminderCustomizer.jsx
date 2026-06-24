import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Bell, Save } from 'lucide-react';
import { toast } from 'sonner';

const PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

export default function PrayerReminderCustomizer() {
  const queryClient = useQueryClient();

  const { data: settings = [] } = useQuery({
    queryKey: ['prayer-reminder-settings'],
    queryFn: () => base44.entities.PrayerReminderSettings.list(),
    initialData: []
  });

  const createSettingMutation = useMutation({
    mutationFn: (data) => base44.entities.PrayerReminderSettings.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prayer-reminder-settings'] });
      toast.success('Reminder settings saved!');
    }
  });

  const updateSettingMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PrayerReminderSettings.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prayer-reminder-settings'] });
      toast.success('Reminder settings updated!');
    }
  });

  const getSetting = (prayerName) => {
    return settings.find(s => s.prayer_name === prayerName);
  };

  const handleToggle = (prayerName, enabled) => {
    const setting = getSetting(prayerName);
    
    if (setting) {
      updateSettingMutation.mutate({
        id: setting.id,
        data: { ...setting, reminder_enabled: enabled }
      });
    } else {
      createSettingMutation.mutate({
        prayer_name: prayerName,
        reminder_enabled: enabled,
        reminder_minutes_before: 10,
        notification_sound: 'default'
      });
    }
  };

  const handleMinutesChange = (prayerName, minutes) => {
    const setting = getSetting(prayerName);
    
    if (setting) {
      updateSettingMutation.mutate({
        id: setting.id,
        data: { ...setting, reminder_minutes_before: parseInt(minutes) }
      });
    } else {
      createSettingMutation.mutate({
        prayer_name: prayerName,
        reminder_enabled: true,
        reminder_minutes_before: parseInt(minutes),
        notification_sound: 'default'
      });
    }
  };

  return (
    <Card className="bg-gradient-to-br from-violet-50 to-purple-50 border-violet-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-violet-600" />
          Custom Prayer Reminders
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {PRAYERS.map(prayer => {
          const setting = getSetting(prayer);
          const enabled = setting?.reminder_enabled ?? true;
          const minutesBefore = setting?.reminder_minutes_before ?? 10;

          return (
            <div key={prayer} className="bg-white/60 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="font-semibold text-slate-800">{prayer}</Label>
                <Switch
                  checked={enabled}
                  onCheckedChange={(checked) => handleToggle(prayer, checked)}
                />
              </div>
              
              {enabled && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-slate-600">Minutes Before</Label>
                    <Select 
                      value={String(minutesBefore)} 
                      onValueChange={(v) => handleMinutesChange(prayer, v)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 minutes</SelectItem>
                        <SelectItem value="10">10 minutes</SelectItem>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="20">20 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
          <p className="text-xs text-blue-900">
            💡 Customize reminder timings for each prayer. Reminders respect your Do Not Disturb settings.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}