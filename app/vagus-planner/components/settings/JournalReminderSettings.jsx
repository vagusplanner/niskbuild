import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Save, Bell, Mail, Clock, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

// Timezone offset helper — converts local HH:MM to UTC HH:MM string
function toUTCTime(localTime, tzOffsetMin) {
  const [h, m] = localTime.split(':').map(Number);
  const totalMin = h * 60 + m - tzOffsetMin;
  const utcMin = ((totalMin % 1440) + 1440) % 1440;
  return `${String(Math.floor(utcMin / 60)).padStart(2, '0')}:${String(utcMin % 60).padStart(2, '0')}`;
}

function toLocalTime(utcTime, tzOffsetMin) {
  const [h, m] = utcTime.split(':').map(Number);
  const totalMin = h * 60 + m + tzOffsetMin;
  const localMin = ((totalMin % 1440) + 1440) % 1440;
  return `${String(Math.floor(localMin / 60)).padStart(2, '0')}:${String(localMin % 60).padStart(2, '0')}`;
}

export default function JournalReminderSettings() {
  const qc = useQueryClient();
  const tzOffsetMin = -new Date().getTimezoneOffset(); // offset in minutes (positive = east of UTC)

  const { data: settingsList = [] } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => base44.entities.UserSettings.list(),
  });

  const settings = settingsList[0];

  const [enabled, setEnabled] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [localTime, setLocalTime] = useState('21:00');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setEnabled(settings.journal_reminder_enabled || false);
    setEmailEnabled(settings.journal_reminder_email || false);
    const utcTime = settings.journal_reminder_time_utc || '20:00';
    setLocalTime(toLocalTime(utcTime, tzOffsetMin));
    setDirty(false);
  }, [settings?.id]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (settings?.id) {
        return base44.entities.UserSettings.update(settings.id, data);
      }
      return base44.entities.UserSettings.create(data);
    },
    onSuccess: () => {
      qc.invalidateQueries(['userSettings']);
      toast.success('Journal reminder saved!');
      setDirty(false);
    },
  });

  const handleSave = () => {
    const utcTime = toUTCTime(localTime, tzOffsetMin);
    saveMutation.mutate({
      journal_reminder_enabled: enabled,
      journal_reminder_email: emailEnabled,
      journal_reminder_time_utc: utcTime,
    });
  };

  const mark = () => setDirty(true);

  return (
    <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1a5a9a] to-[#4ec9a0] flex items-center justify-center shadow-sm">
          <BookOpen className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-slate-800 text-sm">Daily Journal Reminder</h3>
          <p className="text-xs text-slate-500">Get nudged if you haven't journaled today</p>
        </div>
      </div>

      {/* Enable toggle */}
      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-[#1a5a9a]" />
          <Label className="text-sm font-medium text-slate-700 cursor-pointer">Enable Reminder</Label>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={v => { setEnabled(v); mark(); }}
        />
      </div>

      {enabled && (
        <>
          {/* Time picker */}
          <div className="flex items-center gap-3 p-3 bg-sky-50 rounded-xl border border-sky-100">
            <Clock className="w-4 h-4 text-[#1a5a9a] flex-shrink-0" />
            <div className="flex-1">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Reminder Time (your local time)</Label>
              <Input
                type="time"
                value={localTime}
                onChange={e => { setLocalTime(e.target.value); mark(); }}
                className="border-sky-200 text-sm h-9 w-36"
              />
            </div>
          </div>

          {/* Email toggle */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#4ec9a0]" />
              <div>
                <Label className="text-sm font-medium text-slate-700 cursor-pointer">Email Reminder</Label>
                <p className="text-xs text-slate-400">Also send an email if you haven't journaled</p>
              </div>
            </div>
            <Switch
              checked={emailEnabled}
              onCheckedChange={v => { setEmailEnabled(v); mark(); }}
            />
          </div>
        </>
      )}

      {dirty && (
        <Button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="w-full bg-gradient-to-r from-[#1a5a9a] to-[#4ec9a0] hover:opacity-90 text-white gap-2 font-semibold"
        >
          <Save className="w-4 h-4" />
          {saveMutation.isPending ? 'Saving…' : 'Save Reminder Settings'}
        </Button>
      )}
    </div>
  );
}