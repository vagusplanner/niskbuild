import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Mail, CheckCircle, Loader2, Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function WeeklyEmailDigest() {
  const [sending, setSending] = useState(false);

  const { data: settingsList = [], refetch } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => base44.entities.UserSettings.list(),
  });
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const settings = settingsList[0];
  const digestEnabled = settings?.journal_reminder_enabled ?? false; // reuse field

  const toggleMutation = useMutation({
    mutationFn: async (enabled) => {
      if (settings?.id) {
        return base44.entities.UserSettings.update(settings.id, { journal_reminder_enabled: enabled });
      }
      return base44.entities.UserSettings.create({ journal_reminder_enabled: enabled });
    },
    onSuccess: () => {
      refetch();
      toast.success(digestEnabled ? 'Weekly digest disabled' : 'Weekly digest enabled — you\'ll get a summary every Monday');
    },
  });

  const sendNow = async () => {
    if (!user?.email) return;
    setSending(true);
    try {
      await base44.functions.invoke('generateWeeklyDigest', { email: user.email });
      toast.success('Weekly digest sent to your email!');
    } catch (e) {
      toast.error('Could not send digest right now');
    }
    setSending(false);
  };

  return (
    <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40">
          <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="font-bold text-slate-800 dark:text-slate-100">Weekly Email Digest</h3>
          <p className="text-xs text-slate-500">Get a Monday summary of your week ahead</p>
        </div>
        <div className="ml-auto">
          <button onClick={() => toggleMutation.mutate(!digestEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${digestEnabled ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${digestEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {[
          'Upcoming events & meetings for the week',
          'Top 3 tasks due this week',
          'Progress on your active goals',
          'Spending summary from last week',
          'Habit streak status',
        ].map(item => (
          <div key={item} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <CheckCircle className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
            {item}
          </div>
        ))}
      </div>

      <Button variant="outline" size="sm" onClick={sendNow} disabled={sending} className="w-full text-xs">
        {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Mail className="w-3.5 h-3.5 mr-1.5" />}
        {sending ? 'Sending…' : 'Send Me This Week\'s Digest Now'}
      </Button>
    </div>
  );
}