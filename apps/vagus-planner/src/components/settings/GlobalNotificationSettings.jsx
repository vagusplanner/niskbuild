import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bell, BellOff, Mail, Moon, Volume2, Calendar, Target, Plane, Star,
  Activity, Clock, Info, Vibrate
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function GlobalNotificationSettings({ formData, onChange }) {
  const masterOff = !formData.notifications_enabled;

  return (
    <div className="space-y-6">
      {/* Master Toggle */}
      <Card className="bg-white/80 backdrop-blur border-0 shadow-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            Global Notification Settings
          </CardTitle>
          <CardDescription>Control all in-app notification behaviour from one place</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {/* All In-App Notifications */}
          <div className={`flex items-center justify-between p-4 rounded-xl border-2 transition-colors ${masterOff ? 'border-slate-200 bg-slate-50' : 'border-blue-200 bg-blue-50/50'}`}>
            <div className="flex items-center gap-3">
              {masterOff
                ? <BellOff className="w-5 h-5 text-slate-400" />
                : <Bell className="w-5 h-5 text-blue-600" />
              }
              <div>
                <Label className="text-base font-semibold">In-App Notifications</Label>
                <p className="text-sm text-slate-500">Master switch — disabling this silences all notifications</p>
              </div>
            </div>
            <Switch
              checked={formData.notifications_enabled}
              onCheckedChange={(v) => onChange('notifications_enabled', v)}
            />
          </div>

          {/* Email Notifications */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-blue-600" />
              <div>
                <Label className="text-base">Email Notifications</Label>
                <p className="text-sm text-slate-500">Receive important updates via email</p>
              </div>
            </div>
            <Switch
              checked={formData.email_notifications}
              onCheckedChange={(v) => onChange('email_notifications', v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Default Reminder Time */}
      <Card className="bg-white/80 backdrop-blur border-0 shadow-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-teal-50 to-cyan-50 border-b">
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-teal-600" />
            Default Reminder Time
          </CardTitle>
          <CardDescription>Applied automatically to all new events you create</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <Label>Remind me before each event</Label>
            <Select
              value={String(formData.notify_before_minutes || 30)}
              onValueChange={(v) => onChange('notify_before_minutes', parseInt(v))}
              disabled={masterOff}
            >
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 minutes before</SelectItem>
                <SelectItem value="15">15 minutes before</SelectItem>
                <SelectItem value="30">30 minutes before</SelectItem>
                <SelectItem value="60">1 hour before</SelectItem>
                <SelectItem value="120">2 hours before</SelectItem>
                <SelectItem value="1440">1 day before</SelectItem>
                <SelectItem value="2880">2 days before</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-400">You can still override this on individual events.</p>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div>
              <Label className="text-sm font-medium">Multiple Reminders Per Event</Label>
              <p className="text-xs text-slate-500 mt-0.5">Allow stacking several reminders on one event</p>
            </div>
            <Switch
              checked={formData.multiple_reminders_enabled}
              onCheckedChange={(v) => onChange('multiple_reminders_enabled', v)}
              disabled={masterOff}
            />
          </div>
        </CardContent>
      </Card>

      {/* Sound & Vibration */}
      <Card className="bg-white/80 backdrop-blur border-0 shadow-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-purple-600" />
            Sound & Vibration
          </CardTitle>
          <CardDescription>Control audio and haptic feedback for notifications</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <Label>Notification Sound</Label>
            <Select
              value={formData.notification_sound || 'default'}
              onValueChange={(v) => onChange('notification_sound', v)}
              disabled={masterOff}
            >
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">🔔 Default</SelectItem>
                <SelectItem value="chime">🎵 Chime</SelectItem>
                <SelectItem value="bell">🔔 Bell</SelectItem>
                <SelectItem value="ding">🔊 Ding</SelectItem>
                <SelectItem value="none">🔇 Silent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Do Not Disturb */}
      <Card className="bg-white/80 backdrop-blur border-0 shadow-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-slate-50 border-b">
          <CardTitle className="flex items-center gap-2">
            <Moon className="w-5 h-5 text-indigo-600" />
            Do Not Disturb
          </CardTitle>
          <CardDescription>Silence all notifications during specific hours</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div>
              <Label className="text-sm font-medium">Enable Do Not Disturb</Label>
              <p className="text-xs text-slate-500 mt-0.5">Mute all notifications between set hours</p>
            </div>
            <Switch
              checked={formData.do_not_disturb}
              onCheckedChange={(v) => onChange('do_not_disturb', v)}
            />
          </div>

          {formData.do_not_disturb && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-indigo-300"
            >
              <div className="space-y-1">
                <Label className="text-xs">Start Time</Label>
                <Input
                  type="time"
                  value={formData.dnd_start_time || '22:00'}
                  onChange={(e) => onChange('dnd_start_time', e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">End Time</Label>
                <Input
                  type="time"
                  value={formData.dnd_end_time || '08:00'}
                  onChange={(e) => onChange('dnd_end_time', e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="col-span-2 p-3 bg-indigo-50 rounded-lg text-xs text-indigo-700">
                📵 Notifications silenced from <strong>{formData.dnd_start_time || '22:00'}</strong> to <strong>{formData.dnd_end_time || '08:00'}</strong>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Category Toggles */}
      <Card className="bg-white/80 backdrop-blur border-0 shadow-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-teal-50 to-emerald-50 border-b">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-600" />
            Notification Categories
          </CardTitle>
          <CardDescription>Choose which types of events trigger notifications</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-3">
          {[
            { key: 'meeting_notifications', label: 'Meeting Invites & Updates', icon: Calendar, color: 'blue' },
            { key: 'task_due_reminders', label: 'Task Due Date Reminders', icon: Target, color: 'purple' },
            { key: 'overdue_task_alerts', label: 'Overdue Task Alerts', icon: Activity, color: 'red' },
            { key: 'travel_notifications', label: 'Travel Alerts', icon: Plane, color: 'amber' },
            { key: 'islamic_notifications', label: 'Islamic Events & Prayer Times', icon: Star, color: 'emerald' },
            { key: 'allday_event_reminders', label: 'All-Day Event Reminders', icon: Clock, color: 'teal' },
          ].map(({ key, label, icon: Icon, color }) => (
            <div key={key} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-${color}-100`}>
                  <Icon className={`w-4 h-4 text-${color}-600`} />
                </div>
                <Label className="text-sm font-medium cursor-pointer">{label}</Label>
              </div>
              <Switch
                checked={formData[key] !== false}
                onCheckedChange={(v) => onChange(key, v)}
                disabled={masterOff}
              />
            </div>
          ))}

          {/* All-day event time sub-option */}
          {formData.allday_event_reminders && !masterOff && (
            <div className="pl-12 space-y-1">
              <Label className="text-xs text-slate-500">Notify at time</Label>
              <Input
                type="time"
                value={formData.allday_reminder_time || '09:00'}
                onChange={(e) => onChange('allday_reminder_time', e.target.value)}
                className="h-9 w-32"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Browser permission note */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
        <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700">
          <strong>Browser permissions required.</strong> To receive notifications, make sure you've allowed them in your browser settings.
        </p>
      </div>
    </div>
  );
}