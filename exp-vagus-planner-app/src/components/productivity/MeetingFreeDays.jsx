import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export default function MeetingFreeDays() {
  const [selectedDays, setSelectedDays] = useState(['Wednesday']);
  const [saving, setSaving] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => SDK.entities.UserSettings.list()
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => SDK.entities.Event.list()
  });

  useEffect(() => {
    if (settings?.length > 0 && settings[0].meeting_free_days) {
      setSelectedDays(settings[0].meeting_free_days);
    }
  }, [settings]);

  const violatingMeetings = React.useMemo(() => {
    return events.filter(event => {
      if (!['work', 'social'].includes(event.category)) return false;
      const dayOfWeek = new Date(event.start_date).getDay();
      const dayName = DAYS[dayOfWeek - 1];
      return selectedDays.includes(dayName);
    });
  }, [events, selectedDays]);

  const handleToggleDay = (day) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (settings?.length > 0) {
        await SDK.entities.UserSettings.update(settings[0].id, {
          meeting_free_days: selectedDays
        });
      }
      toast.success('Meeting-free days saved');
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Card className="bg-gradient-to-br from-emerald-50 dark:from-emerald-950 to-teal-50 dark:to-teal-950 border-emerald-200 dark:border-emerald-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Meeting-Free Days
          </CardTitle>
          <CardDescription>Automatically protect these days from being booked with meetings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-5 gap-2">
            {DAYS.map(day => (
              <motion.button
                key={day}
                whileHover={{ scale: 1.05 }}
                onClick={() => handleToggleDay(day)}
                className={`py-3 px-2 rounded-lg font-medium text-sm transition-colors ${
                  selectedDays.includes(day)
                    ? 'bg-emerald-600 dark:bg-emerald-500 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-emerald-200 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-slate-700'
                }`}
              >
                {day.slice(0, 3)}
              </motion.button>
            ))}
          </div>

          {violatingMeetings.length > 0 && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-700">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                    {violatingMeetings.length} meeting{violatingMeetings.length !== 1 ? 's' : ''} on protected days
                  </p>
                  <div className="mt-1 space-y-1">
                    {violatingMeetings.slice(0, 3).map((m, idx) => (
                      <p key={idx} className="text-xs text-amber-700 dark:text-amber-300">
                        • {m.title}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? 'Saving...' : 'Save Protected Days'}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}