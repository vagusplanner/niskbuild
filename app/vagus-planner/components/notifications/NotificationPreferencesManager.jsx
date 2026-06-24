import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Clock, Volume2, Smartphone, Mail, CheckCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const NOTIFICATION_TYPES = [
  { id: 'event_reminder', label: 'Event Reminders', icon: Bell },
  { id: 'conflict_alert', label: 'Conflict Alerts', icon: AlertCircle },
  { id: 'meeting_invitation', label: 'Meeting Invitations', icon: Mail },
  { id: 'task_due', label: 'Task Due', icon: CheckCircle },
  { id: 'task_assigned', label: 'Task Assigned', icon: CheckCircle },
  { id: 'calendar_shared', label: 'Calendar Shared', icon: Mail },
  { id: 'goal_update', label: 'Goal Updates', icon: CheckCircle },
  { id: 'health_insight', label: 'Health Insights', icon: Smartphone },
  { id: 'prayer_time', label: 'Prayer Times', icon: Bell },
  { id: 'islamic_event', label: 'Islamic Events', icon: Bell },
  { id: 'travel_alert', label: 'Travel Alerts', icon: AlertCircle },
  { id: 'comment_mention', label: 'Mentions', icon: Mail }
];

const CHANNELS = [
  { id: 'in_app', label: 'In-App', icon: Bell },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'push', label: 'Push', icon: Smartphone }
];

const PRIORITY_COLORS = {
  low: 'bg-blue-100 text-blue-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800'
};

export default function NotificationPreferencesManager() {
  const queryClient = useQueryClient();
  const [activeType, setActiveType] = useState('event_reminder');
  const [filterType, setFilterType] = useState('all');

  const { data: preferences = [], isLoading } = useQuery({
    queryKey: ['notificationPreferences'],
    queryFn: () => base44.entities.NotificationPreference.list()
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const { id, ...updateData } = data;
      return await base44.entities.NotificationPreference.update(id, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationPreferences'] });
      toast.success('Preference updated');
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.NotificationPreference.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationPreferences'] });
      toast.success('Preference created');
    }
  });

  const activePreference = useMemo(() => {
    return preferences.find(p => p.notification_type === activeType) || {
      notification_type: activeType,
      enabled: true,
      priority: 'medium',
      advance_notice_minutes: 30,
      channels: CHANNELS.map(c => ({ channel: c.id, enabled: true }))
    };
  }, [preferences, activeType]);

  const handleToggleNotification = async (enabled) => {
    if (activePreference.id) {
      updateMutation.mutate({ id: activePreference.id, enabled });
    } else {
      createMutation.mutate({ ...activePreference, enabled });
    }
  };

  const handleChannelToggle = async (channelId, enabled) => {
    const updatedChannels = (activePreference.channels || []).map(c =>
      c.channel === channelId ? { ...c, enabled } : c
    );

    if (activePreference.id) {
      updateMutation.mutate({ id: activePreference.id, channels: updatedChannels });
    } else {
      createMutation.mutate({ ...activePreference, channels: updatedChannels });
    }
  };

  const handlePriorityChange = async (priority) => {
    if (activePreference.id) {
      updateMutation.mutate({ id: activePreference.id, priority });
    } else {
      createMutation.mutate({ ...activePreference, priority });
    }
  };

  const handleAdvanceNoticeChange = async (minutes) => {
    if (activePreference.id) {
      updateMutation.mutate({ id: activePreference.id, advance_notice_minutes: minutes });
    } else {
      createMutation.mutate({ ...activePreference, advance_notice_minutes: minutes });
    }
  };

  const filteredTypes = NOTIFICATION_TYPES.filter(type => {
    if (filterType === 'disabled') {
      const pref = preferences.find(p => p.notification_type === type.id);
      return pref && !pref.enabled;
    }
    if (filterType === 'critical') {
      const pref = preferences.find(p => p.notification_type === type.id);
      return pref && pref.priority === 'critical';
    }
    return true;
  });

  if (isLoading) return <div className="text-center py-8">Loading preferences...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-teal-600" />
            Notification Preferences
          </CardTitle>
          <CardDescription>Customize how and when you receive notifications</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Notification Types List */}
        <div className="lg:col-span-1">
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle className="text-sm">Notification Types</CardTitle>
              <div className="mt-3">
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="disabled">Disabled Only</SelectItem>
                    <SelectItem value="critical">Critical Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <AnimatePresence>
                {filteredTypes.map((type) => {
                  const pref = preferences.find(p => p.notification_type === type.id);
                  const isActive = activeType === type.id;

                  return (
                    <motion.button
                      key={type.id}
                      onClick={() => setActiveType(type.id)}
                      layout
                      className={`w-full text-left p-3 rounded-lg transition-all ${
                        isActive
                          ? 'bg-teal-100 dark:bg-teal-900 border-2 border-teal-600'
                          : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <type.icon className={`w-4 h-4 ${isActive ? 'text-teal-600' : 'text-slate-400'}`} />
                        <span className={`text-sm font-medium ${isActive ? 'text-teal-900 dark:text-teal-100' : ''}`}>
                          {type.label}
                        </span>
                        {pref && !pref.enabled && (
                          <Badge variant="outline" className="ml-auto text-xs">Off</Badge>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </CardContent>
          </Card>
        </div>

        {/* Preference Details */}
        <div className="lg:col-span-2">
          <motion.div
            key={activeType}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>
                  {NOTIFICATION_TYPES.find(t => t.id === activeType)?.label}
                </CardTitle>
                <CardDescription>Configure this notification type</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Enable/Disable */}
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div>
                    <p className="font-medium">Enable Notifications</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Turn this notification type on/off</p>
                  </div>
                  <Switch
                    checked={activePreference.enabled ?? true}
                    onCheckedChange={handleToggleNotification}
                    disabled={updateMutation.isPending || createMutation.isPending}
                  />
                </div>

                {activePreference.enabled !== false && (
                  <>
                    {/* Priority */}
                    <div>
                      <label className="block text-sm font-medium mb-3">Priority Level</label>
                      <Select
                        value={activePreference.priority || 'medium'}
                        onValueChange={handlePriorityChange}
                        disabled={updateMutation.isPending || createMutation.isPending}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {['low', 'medium', 'high', 'critical'].map(level => (
                            <SelectItem key={level} value={level}>
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${PRIORITY_COLORS[level].split(' ')[0]}`} />
                                {level.charAt(0).toUpperCase() + level.slice(1)}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="mt-2 inline-block">
                        <Badge className={PRIORITY_COLORS[activePreference.priority || 'medium']}>
                          {activePreference.priority || 'medium'}
                        </Badge>
                      </div>
                    </div>

                    {/* Advance Notice */}
                    <div>
                      <label className="block text-sm font-medium mb-3 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Advance Notice
                      </label>
                      <Select
                        value={(activePreference.advance_notice_minutes || 30).toString()}
                        onValueChange={(val) => handleAdvanceNoticeChange(parseInt(val))}
                        disabled={updateMutation.isPending || createMutation.isPending}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[5, 10, 15, 30, 60, 120].map(minutes => (
                            <SelectItem key={minutes} value={minutes.toString()}>
                              {minutes} minutes before
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Channels */}
                    <div>
                      <label className="block text-sm font-medium mb-3">Notification Channels</label>
                      <div className="space-y-2">
                        {CHANNELS.map(channel => {
                          const channelPref = (activePreference.channels || []).find(c => c.channel === channel.id);
                          return (
                            <div
                              key={channel.id}
                              className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <channel.icon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                                <span className="font-medium">{channel.label}</span>
                              </div>
                              <Switch
                                checked={channelPref?.enabled ?? true}
                                onCheckedChange={(checked) => handleChannelToggle(channel.id, checked)}
                                disabled={updateMutation.isPending || createMutation.isPending}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Sound and Vibration */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Volume2 className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                          <span className="text-sm font-medium">Sound</span>
                        </div>
                        <Switch
                          checked={activePreference.include_sound ?? true}
                          onCheckedChange={(checked) => {
                            if (activePreference.id) {
                              updateMutation.mutate({ id: activePreference.id, include_sound: checked });
                            }
                          }}
                          disabled={updateMutation.isPending || createMutation.isPending}
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Smartphone className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                          <span className="text-sm font-medium">Vibration</span>
                        </div>
                        <Switch
                          checked={activePreference.include_vibration ?? true}
                          onCheckedChange={(checked) => {
                            if (activePreference.id) {
                              updateMutation.mutate({ id: activePreference.id, include_vibration: checked });
                            }
                          }}
                          disabled={updateMutation.isPending || createMutation.isPending}
                        />
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}