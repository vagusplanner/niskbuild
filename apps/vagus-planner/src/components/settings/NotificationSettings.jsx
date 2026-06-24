import React from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Bell, Mail, Clock, Calendar, Target, Plane, Star, Info } from 'lucide-react';

export default function NotificationSettings({ settings, onUpdate }) {
  return (
    <div className="space-y-6">
      {/* Master Controls */}
      <Card className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Bell className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Master Notifications</h3>
            <p className="text-xs text-slate-500">Control all notification channels</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-lg">
            <div className="flex items-center gap-3">
              <Bell className="w-4 h-4 text-blue-600" />
              <div>
                <Label className="font-medium">Push Notifications</Label>
                <p className="text-xs text-slate-500">In-app alerts and banners</p>
              </div>
            </div>
            <Switch
              checked={settings.notifications_enabled}
              onCheckedChange={(checked) => onUpdate('notifications_enabled', checked)}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-lg">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-blue-600" />
              <div>
                <Label className="font-medium">Email Notifications</Label>
                <p className="text-xs text-slate-500">Receive important updates via email</p>
              </div>
            </div>
            <Switch
              checked={settings.email_notifications}
              onCheckedChange={(checked) => onUpdate('email_notifications', checked)}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
              <div>
                <Label className="font-medium">Do Not Disturb</Label>
                <p className="text-xs text-slate-500">Pause all notifications</p>
              </div>
            </div>
            <Switch
              checked={settings.do_not_disturb}
              onCheckedChange={(checked) => onUpdate('do_not_disturb', checked)}
            />
          </div>

          {settings.do_not_disturb && (
            <div className="grid grid-cols-2 gap-3 pl-7">
              <div>
                <Label className="text-xs">Start Time</Label>
                <Input
                  type="time"
                  value={settings.dnd_start_time || '22:00'}
                  onChange={(e) => onUpdate('dnd_start_time', e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">End Time</Label>
                <Input
                  type="time"
                  value={settings.dnd_end_time || '08:00'}
                  onChange={(e) => onUpdate('dnd_end_time', e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Event Notifications */}
      <Card className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <Calendar className="w-5 h-5 text-teal-600" />
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">Event Reminders</h3>
        </div>

        <div className="space-y-3">
          <div>
            <Label>Default Reminder Time</Label>
            <Select
              value={String(settings.notify_before_minutes || 30)}
              onValueChange={(value) => onUpdate('notify_before_minutes', parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 minutes before</SelectItem>
                <SelectItem value="15">15 minutes before</SelectItem>
                <SelectItem value="30">30 minutes before</SelectItem>
                <SelectItem value="60">1 hour before</SelectItem>
                <SelectItem value="120">2 hours before</SelectItem>
                <SelectItem value="1440">1 day before</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
            <div>
              <Label>All-Day Event Reminders</Label>
              <p className="text-xs text-slate-500">Get notified for all-day events</p>
            </div>
            <Switch
              checked={settings.allday_event_reminders}
              onCheckedChange={(checked) => onUpdate('allday_event_reminders', checked)}
            />
          </div>

          {settings.allday_event_reminders && (
            <div className="pl-4">
              <Label className="text-xs">Reminder Time</Label>
              <Input
                type="time"
                value={settings.allday_reminder_time || '09:00'}
                onChange={(e) => onUpdate('allday_reminder_time', e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          )}

          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
            <div>
              <Label>Multiple Reminders</Label>
              <p className="text-xs text-slate-500">Allow multiple reminders per event</p>
            </div>
            <Switch
              checked={settings.multiple_reminders_enabled}
              onCheckedChange={(checked) => onUpdate('multiple_reminders_enabled', checked)}
            />
          </div>
        </div>
      </Card>

      {/* Task Notifications */}
      <Card className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <Target className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">Task Deadlines</h3>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
            <div>
              <Label>Due Date Reminders</Label>
              <p className="text-xs text-slate-500">Notify when tasks are due</p>
            </div>
            <Switch
              checked={settings.task_due_reminders}
              onCheckedChange={(checked) => onUpdate('task_due_reminders', checked)}
            />
          </div>

          {settings.task_due_reminders && (
            <div>
              <Label>Remind Before</Label>
              <Select
                value={String(settings.task_reminder_hours || 24)}
                onValueChange={(value) => onUpdate('task_reminder_hours', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 hour before</SelectItem>
                  <SelectItem value="3">3 hours before</SelectItem>
                  <SelectItem value="6">6 hours before</SelectItem>
                  <SelectItem value="12">12 hours before</SelectItem>
                  <SelectItem value="24">1 day before</SelectItem>
                  <SelectItem value="48">2 days before</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
            <div>
              <Label>Overdue Task Alerts</Label>
              <p className="text-xs text-slate-500">Daily digest of overdue tasks</p>
            </div>
            <Switch
              checked={settings.overdue_task_alerts}
              onCheckedChange={(checked) => onUpdate('overdue_task_alerts', checked)}
            />
          </div>

          {settings.overdue_task_alerts && (
            <div>
              <Label>Alert Time</Label>
              <Input
                type="time"
                value={settings.overdue_alert_time || '09:00'}
                onChange={(e) => onUpdate('overdue_alert_time', e.target.value)}
                className="h-9"
              />
            </div>
          )}
        </div>
      </Card>

      {/* Category-Specific Notifications */}
      <Card className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <Info className="w-5 h-5 text-amber-600" />
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">Category Notifications</h3>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <Label>Meeting Invites</Label>
            </div>
            <Switch
              checked={settings.meeting_notifications}
              onCheckedChange={(checked) => onUpdate('meeting_notifications', checked)}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
            <div className="flex items-center gap-2">
              <Plane className="w-4 h-4 text-amber-600" />
              <Label>Travel Alerts</Label>
            </div>
            <Switch
              checked={settings.travel_notifications}
              onCheckedChange={(checked) => onUpdate('travel_notifications', checked)}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-purple-600" />
              <Label>Islamic Events</Label>
            </div>
            <Switch
              checked={settings.islamic_notifications}
              onCheckedChange={(checked) => onUpdate('islamic_notifications', checked)}
            />
          </div>
        </div>
      </Card>

      {/* AI & Smart Features */}
      <Card className="p-5 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200 dark:border-purple-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg">
            <Star className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">AI Suggestions</h3>
            <p className="text-xs text-slate-500">Smart recommendations and insights</p>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-lg">
          <div>
            <Label>Proactive Suggestions</Label>
            <p className="text-xs text-slate-500">AI-powered recommendations</p>
          </div>
          <Switch
            checked={settings.ai_proactive_suggestions}
            onCheckedChange={(checked) => onUpdate('ai_proactive_suggestions', checked)}
          />
        </div>
      </Card>

      {/* Notification Sound */}
      <Card className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="w-5 h-5 text-slate-600" />
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">Sound & Appearance</h3>
        </div>

        <div>
          <Label>Notification Sound</Label>
          <Select
            value={settings.notification_sound || 'default'}
            onValueChange={(value) => onUpdate('notification_sound', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="chime">Chime</SelectItem>
              <SelectItem value="bell">Bell</SelectItem>
              <SelectItem value="ding">Ding</SelectItem>
              <SelectItem value="none">Silent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900 dark:text-blue-200">
          <p className="font-medium mb-1">Browser Permissions Required</p>
          <p className="text-xs text-blue-700 dark:text-blue-300">
            To receive push notifications, please allow notifications in your browser settings.
          </p>
        </div>
      </div>
    </div>
  );
}