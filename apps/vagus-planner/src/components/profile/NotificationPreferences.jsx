import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Bell, Mail, Volume2, Clock, Moon, MessageSquare, Calendar, Target, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

export default function NotificationPreferences({ settings, onUpdate }) {
  const handleToggle = (key, value) => {
    onUpdate({ [key]: value });
  };

  const notificationTypes = [
    { key: 'notifications_enabled', label: 'Push Notifications', description: 'Receive in-app notifications', icon: Bell, color: 'teal' },
    { key: 'email_notifications', label: 'Email Notifications', description: 'Receive notifications via email', icon: Mail, color: 'blue' },
    { key: 'meeting_notifications', label: 'Meeting Alerts', description: 'Get notified about meetings', icon: Calendar, color: 'purple' },
    { key: 'task_due_reminders', label: 'Task Reminders', description: 'Notify when tasks are due', icon: Target, color: 'amber' },
    { key: 'overdue_task_alerts', label: 'Overdue Task Alerts', description: 'Daily reminders for overdue tasks', icon: Activity, color: 'red' },
    { key: 'travel_notifications', label: 'Travel Alerts', description: 'Get travel updates and reminders', icon: Activity, color: 'emerald' },
    { key: 'islamic_notifications', label: 'Islamic Events', description: 'Prayer times and Islamic dates', icon: Activity, color: 'indigo' }
  ];

  return (
    <div className="space-y-6">
      {/* General Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-teal-600" />
            Notification Types
          </CardTitle>
          <CardDescription>
            Choose which types of notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {notificationTypes.map((type, index) => {
            const Icon = type.icon;
            return (
              <motion.div
                key={type.key}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-${type.color}-100`}>
                    <Icon className={`w-5 h-5 text-${type.color}-600`} />
                  </div>
                  <div>
                    <Label className="text-base cursor-pointer">{type.label}</Label>
                    <p className="text-sm text-slate-500">{type.description}</p>
                  </div>
                </div>
                <Switch
                  checked={settings?.[type.key] !== false}
                  onCheckedChange={(val) => handleToggle(type.key, val)}
                />
              </motion.div>
            );
          })}
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-purple-600" />
            Sound & Timing
          </CardTitle>
          <CardDescription>
            Customize notification sounds and timing preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Notification Sound</Label>
            <Select
              value={settings?.notification_sound || 'default'}
              onValueChange={(val) => handleToggle('notification_sound', val)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">🔔 Default</SelectItem>
                <SelectItem value="chime">🎵 Chime</SelectItem>
                <SelectItem value="bell">🔔 Bell</SelectItem>
                <SelectItem value="ding">🔊 Ding</SelectItem>
                <SelectItem value="none">🔇 None (Silent)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Event Reminder Time</Label>
            <Select
              value={String(settings?.notify_before_minutes || '15')}
              onValueChange={(val) => handleToggle('notify_before_minutes', Number(val))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 minutes before</SelectItem>
                <SelectItem value="10">10 minutes before</SelectItem>
                <SelectItem value="15">15 minutes before</SelectItem>
                <SelectItem value="30">30 minutes before</SelectItem>
                <SelectItem value="60">1 hour before</SelectItem>
                <SelectItem value="120">2 hours before</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Task Reminder Timing</Label>
            <Select
              value={String(settings?.task_reminder_hours || '24')}
              onValueChange={(val) => handleToggle('task_reminder_hours', Number(val))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 hour before</SelectItem>
                <SelectItem value="6">6 hours before</SelectItem>
                <SelectItem value="12">12 hours before</SelectItem>
                <SelectItem value="24">1 day before</SelectItem>
                <SelectItem value="48">2 days before</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div>
              <Label className="text-base">Multiple Reminders</Label>
              <p className="text-sm text-slate-500">Allow multiple reminders per event</p>
            </div>
            <Switch
              checked={settings?.multiple_reminders_enabled !== false}
              onCheckedChange={(val) => handleToggle('multiple_reminders_enabled', val)}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div>
              <Label className="text-base">All-Day Event Reminders</Label>
              <p className="text-sm text-slate-500">Get notified for all-day events</p>
            </div>
            <Switch
              checked={settings?.allday_event_reminders !== false}
              onCheckedChange={(val) => handleToggle('allday_event_reminders', val)}
            />
          </div>

          {settings?.allday_event_reminders !== false && (
            <div className="space-y-2 pl-4 border-l-2 border-teal-200">
              <Label>All-Day Event Notification Time</Label>
              <Input
                type="time"
                value={settings?.allday_reminder_time || '09:00'}
                onChange={(e) => handleToggle('allday_reminder_time', e.target.value)}
              />
            </div>
          )}

          {settings?.overdue_task_alerts !== false && (
            <div className="space-y-2 pl-4 border-l-2 border-red-200">
              <Label>Overdue Alert Time</Label>
              <Input
                type="time"
                value={settings?.overdue_alert_time || '09:00'}
                onChange={(e) => handleToggle('overdue_alert_time', e.target.value)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Do Not Disturb */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon className="w-5 h-5 text-indigo-600" />
            Do Not Disturb
          </CardTitle>
          <CardDescription>
            Silence notifications during specific hours
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div>
              <Label className="text-base">Enable Do Not Disturb</Label>
              <p className="text-sm text-slate-500">Mute notifications during set hours</p>
            </div>
            <Switch
              checked={settings?.do_not_disturb || false}
              onCheckedChange={(val) => handleToggle('do_not_disturb', val)}
            />
          </div>

          {settings?.do_not_disturb && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-3 pl-4 border-l-2 border-indigo-200"
            >
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={settings?.dnd_start_time || '22:00'}
                  onChange={(e) => handleToggle('dnd_start_time', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={settings?.dnd_end_time || '07:00'}
                  onChange={(e) => handleToggle('dnd_end_time', e.target.value)}
                />
              </div>
              <div className="p-3 bg-indigo-50 rounded-lg">
                <p className="text-xs text-indigo-700">
                  📵 Notifications will be silenced from{' '}
                  <strong>{settings?.dnd_start_time || '22:00'}</strong> to{' '}
                  <strong>{settings?.dnd_end_time || '07:00'}</strong>
                </p>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}