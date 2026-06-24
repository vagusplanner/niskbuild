import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Mail, Smartphone, Moon, Calendar, Target, Heart, TrendingUp, CheckCircle2, Loader2, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const PREFS = [
  { key: 'notify_prayer',    label: 'Prayer Times',       desc: 'Adhan alerts at each prayer time',    icon: Moon,     emoji: '🕌' },
  { key: 'notify_events',    label: 'Calendar Events',    desc: 'Reminders before your events',        icon: Calendar, emoji: '📅' },
  { key: 'notify_tasks',     label: 'Task Deadlines',     desc: 'Alerts when tasks are due',           icon: Target,   emoji: '✅' },
  { key: 'notify_health',    label: 'Wellness Nudges',    desc: 'Sleep, mood & health check-ins',      icon: Heart,    emoji: '❤️' },
  { key: 'notify_finance',   label: 'Budget Alerts',      desc: 'When you approach spending limits',   icon: TrendingUp, emoji: '💰' },
  { key: 'notify_weekly',    label: 'Weekly Digest',      desc: 'Email summary every Monday morning',  icon: Mail,     emoji: '📊' },
];

function Toggle({ on, onChange }) {
  return (
    <button onClick={onChange}
      className={cn('relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
        on ? 'bg-teal-500' : 'bg-slate-200 dark:bg-slate-700')}>
      <span className={cn('pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
        on ? 'translate-x-5' : 'translate-x-0')} />
    </button>
  );
}

export default function NotificationPreferencesPanel({ settingsData: settingsDataProp }) {
  const queryClient = useQueryClient();
  const [pushPerm, setPushPerm] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'default');

  const { data: settingsQueryData = [], isLoading } = useQuery({
    queryKey: ['userSettings'],
    queryFn: async () => {
      try {
        const list = await base44.entities.UserSettings.list();
        return list ?? [];
      } catch (error) {
        console.error('Error fetching settings:', error);
        return [];
      }
    },
    enabled: settingsDataProp === undefined,
  });

  const settingsList = settingsDataProp ?? settingsQueryData ?? [];
  const s = settingsList?.[0] ?? { theme: 'light', notifications: true };

  const updateMutation = useMutation({
    mutationFn: async (patch) => {
      if (s.id) return base44.entities.UserSettings.update(s.id, patch);
      return base44.entities.UserSettings.create(patch);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['userSettings']);
      toast.success('Preferences saved');
    },
  });

  const toggle = (key) => {
    const current = s[key] !== false; // default true
    updateMutation.mutate({ [key]: !current });
  };

  const requestPush = async () => {
    if (!('Notification' in window)) {
      toast.error('Push notifications are not supported in this browser.');
      return;
    }
    const perm = await Notification.requestPermission();
    setPushPerm(perm);
    if (perm === 'granted') {
      toast.success('🔔 Push notifications enabled!');
    } else {
      toast.error('Please allow notifications in your browser/device settings.');
    }
  };

  if (isLoading && settingsDataProp === undefined) return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="w-5 h-5 animate-spin text-teal-500" />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Push notification grant banner */}
      {pushPerm !== 'granted' && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-xl">
              <Smartphone className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-800 dark:text-amber-200">Enable Push Notifications</p>
              <p className="text-xs text-amber-600/80 dark:text-amber-400/70">Required for prayer times, events & reminders on this device</p>
            </div>
          </div>
          <Button size="sm" onClick={requestPush}
            className="bg-amber-500 hover:bg-amber-600 text-white font-bold flex-shrink-0">
            Enable
          </Button>
        </motion.div>
      )}

      {pushPerm === 'granted' && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Push notifications are active on this device</p>
        </div>
      )}

      {/* Channel toggles */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-50 dark:border-slate-700/60">
          <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Notification Channels</p>
        </div>
        <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <Smartphone className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Push / In-App</p>
                <p className="text-xs text-slate-400">Real-time alerts on this device</p>
              </div>
            </div>
            <Toggle on={s.notifications_enabled !== false} onChange={() => toggle('notifications_enabled')} />
          </div>
          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                <Mail className="w-4 h-4 text-purple-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Email Notifications</p>
                <p className="text-xs text-slate-400">Reminders & digests via email</p>
              </div>
            </div>
            <Toggle on={s.email_notifications !== false} onChange={() => toggle('email_notifications')} />
          </div>
        </div>
      </div>

      {/* Per-feature toggles */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-50 dark:border-slate-700/60">
          <p className="text-xs font-black text-slate-500 uppercase tracking-widest">What to Notify Me About</p>
        </div>
        <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
          {PREFS.map(({ key, label, desc, icon: Icon, emoji }) => (
            <div key={key} className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                <span className="text-xl">{emoji}</span>
                <div>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{label}</p>
                  <p className="text-xs text-slate-400">{desc}</p>
                </div>
              </div>
              <Toggle on={s[key] !== false} onChange={() => toggle(key)} />
            </div>
          ))}
        </div>
      </div>

      {/* Quiet hours */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-50 dark:border-slate-700/60">
          <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Quiet Hours (Do Not Disturb)</p>
        </div>
        <div className="px-4 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BellOff className="w-4 h-4 text-slate-400" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Enable Quiet Hours</p>
            </div>
            <Toggle on={s.do_not_disturb === true} onChange={() => toggle('do_not_disturb')} />
          </div>
          {s.do_not_disturb && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-xs text-slate-400 mb-1 block">From</label>
                <input type="time" defaultValue={s.dnd_start_time || '22:00'}
                  onChange={e => updateMutation.mutate({ dnd_start_time: e.target.value })}
                  className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300" />
              </div>
              <div className="flex-1">
                <label className="text-xs text-slate-400 mb-1 block">Until</label>
                <input type="time" defaultValue={s.dnd_end_time || '07:00'}
                  onChange={e => updateMutation.mutate({ dnd_end_time: e.target.value })}
                  className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300" />
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {updateMutation.isPending && (
        <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
          <Loader2 className="w-3 h-3 animate-spin" /> Saving…
        </div>
      )}
    </div>
  );
}