import React, { useState, useEffect } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  Bell,
  BellOff,
  Calendar,
  Moon,
  Target,
  CheckSquare,
  Sparkles,
  Mail,
  Smartphone,
  Clock,
  Trash2,
  Eye,
  Settings as SettingsIcon,
  Brain,
  TrendingUp,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const NOTIFICATION_TYPES = [
  { value: 'event_reminder', label: 'Event Reminders', icon: Calendar, color: 'text-blue-500' },
  { value: 'prayer_time', label: 'Prayer Times', icon: Moon, color: 'text-amber-500' },
  { value: 'goal_nudge', label: 'Goal Nudges', icon: Target, color: 'text-purple-500' },
  { value: 'task_deadline', label: 'Task Deadlines', icon: CheckSquare, color: 'text-red-500' },
  { value: 'habit_reminder', label: 'Habit Reminders', icon: TrendingUp, color: 'text-green-500' },
  { value: 'ai_suggestion', label: 'AI Suggestions', icon: Brain, color: 'text-indigo-500' },
  { value: 'wellness_check', label: 'Wellness Checks', icon: Sparkles, color: 'text-pink-500' },
  { value: 'travel_alert', label: 'Travel Alerts', icon: Zap, color: 'text-orange-500' },
  { value: 'meeting_prep', label: 'Meeting Prep', icon: Calendar, color: 'text-cyan-500' }
];

const PRIORITY_CONFIG = {
  low: { color: 'bg-gray-100 text-gray-800', icon: '○' },
  medium: { color: 'bg-blue-100 text-blue-800', icon: '◐' },
  high: { color: 'bg-orange-100 text-orange-800', icon: '◉' },
  urgent: { color: 'bg-red-100 text-red-800', icon: '⚠' }
};

export default function IntelligentNotificationManager() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('inbox');

  const { data: notifications = [] } = useQuery({
    queryKey: ['smartNotifications'],
    queryFn: () => SDK.entities.SmartNotification.list('-scheduled_time', 50)
  });

  const { data: preferences = [] } = useQuery({
    queryKey: ['notificationPreferences'],
    queryFn: () => SDK.entities.NotificationPreference.list()
  });

  const updatePreferenceMutation = useMutation({
    mutationFn: ({ id, data }) => 
      id ? SDK.entities.NotificationPreference.update(id, data) 
         : SDK.entities.NotificationPreference.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['notificationPreferences']);
      toast.success('Preferences updated');
    }
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id) => SDK.entities.SmartNotification.update(id, { status: 'read' }),
    onSuccess: () => {
      queryClient.invalidateQueries(['smartNotifications']);
    }
  });

  const dismissMutation = useMutation({
    mutationFn: (id) => SDK.entities.SmartNotification.update(id, { status: 'dismissed' }),
    onSuccess: () => {
      queryClient.invalidateQueries(['smartNotifications']);
      toast.success('Notification dismissed');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => SDK.entities.SmartNotification.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['smartNotifications']);
      toast.success('Notification deleted');
    }
  });

  const handleToggleNotificationType = (type, currentEnabled) => {
    const pref = preferences.find(p => p.notification_type === type);
    const data = { notification_type: type, enabled: !currentEnabled };
    
    updatePreferenceMutation.mutate({ 
      id: pref?.id, 
      data: pref ? { enabled: !currentEnabled } : data 
    });
  };

  const handleUpdatePreference = (type, field, value) => {
    const pref = preferences.find(p => p.notification_type === type);
    const data = { notification_type: type, [field]: value };
    
    updatePreferenceMutation.mutate({ 
      id: pref?.id, 
      data: pref ? { [field]: value } : data 
    });
  };

  const getPreference = (type) => {
    return preferences.find(p => p.notification_type === type) || { enabled: true };
  };

  const pendingNotifications = notifications.filter(n => n.status === 'pending' || n.status === 'sent');
  const readNotifications = notifications.filter(n => n.status === 'read' || n.status === 'dismissed');

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Bell className="w-8 h-8 text-primary" />
            Smart Notifications
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-powered contextual reminders tailored to your schedule
          </p>
        </div>
        <Button
          onClick={async () => {
            const response = await SDK.functions.invoke('generateAINotifications', {});
            toast.success('AI notifications generated!');
            queryClient.invalidateQueries(['smartNotifications']);
          }}
          className="gap-2"
        >
          <Brain className="w-4 h-4" />
          Generate AI Suggestions
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="inbox">
            <Bell className="w-4 h-4 mr-2" />
            Inbox ({pendingNotifications.length})
          </TabsTrigger>
          <TabsTrigger value="history">
            <Eye className="w-4 h-4 mr-2" />
            History
          </TabsTrigger>
          <TabsTrigger value="settings">
            <SettingsIcon className="w-4 h-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="space-y-4">
          {pendingNotifications.length > 0 ? (
            <div className="space-y-3">
              {pendingNotifications.map((notification) => {
                const typeConfig = NOTIFICATION_TYPES.find(t => t.value === notification.type);
                const Icon = typeConfig?.icon || Bell;
                const priorityConfig = PRIORITY_CONFIG[notification.priority];

                return (
                  <Card key={notification.id} className="hover:shadow-md transition-all">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5", typeConfig?.color)}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className="font-semibold">{notification.title}</h4>
                            <Badge className={priorityConfig.color}>
                              {priorityConfig.icon} {notification.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {format(new Date(notification.scheduled_time), 'MMM d, h:mm a')}
                            </span>
                            {notification.ai_generated && (
                              <span className="flex items-center gap-1 text-indigo-600">
                                <Brain className="w-3 h-3" />
                                AI Generated
                              </span>
                            )}
                          </div>

                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => markAsReadMutation.mutate(notification.id)}
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              Mark Read
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => dismissMutation.mutate(notification.id)}
                            >
                              Dismiss
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-500"
                              onClick={() => deleteMutation.mutate(notification.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <Bell className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
                <p className="text-muted-foreground">No pending notifications at the moment</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-3">
          {readNotifications.length > 0 ? (
            readNotifications.map((notification) => {
              const typeConfig = NOTIFICATION_TYPES.find(t => t.value === notification.type);
              const Icon = typeConfig?.icon || Bell;

              return (
                <Card key={notification.id} className="opacity-60">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <Icon className={cn("w-5 h-5", typeConfig?.color)} />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm">{notification.title}</h4>
                        <p className="text-xs text-muted-foreground">{notification.message}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span>{format(new Date(notification.sent_at || notification.scheduled_time), 'MMM d, h:mm a')}</span>
                          <Badge variant="outline" className="text-xs">{notification.status}</Badge>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500"
                        onClick={() => deleteMutation.mutate(notification.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <p className="text-muted-foreground">No notification history</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {NOTIFICATION_TYPES.map((type) => {
                const pref = getPreference(type.value);
                const Icon = type.icon;

                return (
                  <div key={type.value} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Icon className={cn("w-5 h-5", type.color)} />
                        <div>
                          <Label className="font-semibold">{type.label}</Label>
                          <p className="text-xs text-muted-foreground">
                            {type.value === 'prayer_time' && 'Notifications for prayer times'}
                            {type.value === 'event_reminder' && 'Reminders for upcoming events'}
                            {type.value === 'goal_nudge' && 'Motivational nudges for your goals'}
                            {type.value === 'task_deadline' && 'Alerts for task deadlines'}
                            {type.value === 'ai_suggestion' && 'AI-powered recommendations'}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={pref.enabled !== false}
                        onCheckedChange={() => handleToggleNotificationType(type.value, pref.enabled !== false)}
                      />
                    </div>

                    {pref.enabled !== false && (
                      <div className="ml-8 space-y-3 pt-2 border-t">
                        <div>
                          <Label className="text-xs text-muted-foreground mb-2 block">Delivery Channels</Label>
                          <div className="flex gap-2">
                            {[
                              { value: 'in_app', icon: Bell, label: 'In-App' },
                              { value: 'email', icon: Mail, label: 'Email' },
                              { value: 'push', icon: Smartphone, label: 'Push' }
                            ].map(channel => (
                              <Button
                                key={channel.value}
                                size="sm"
                                variant={pref.delivery_channels?.includes(channel.value) ? "default" : "outline"}
                                onClick={() => {
                                  const channels = pref.delivery_channels || ['in_app'];
                                  const updated = channels.includes(channel.value)
                                    ? channels.filter(c => c !== channel.value)
                                    : [...channels, channel.value];
                                  handleUpdatePreference(type.value, 'delivery_channels', updated);
                                }}
                              >
                                <channel.icon className="w-3 h-3 mr-1" />
                                {channel.label}
                              </Button>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs text-muted-foreground mb-2 block">Frequency</Label>
                            <Select
                              value={pref.frequency || 'real_time'}
                              onValueChange={(value) => handleUpdatePreference(type.value, 'frequency', value)}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="real_time">Real-time</SelectItem>
                                <SelectItem value="hourly_digest">Hourly Digest</SelectItem>
                                <SelectItem value="daily_digest">Daily Digest</SelectItem>
                                <SelectItem value="weekly_digest">Weekly Digest</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="text-xs text-muted-foreground mb-2 block">Advance Notice</Label>
                            <Select
                              value={String(pref.advance_notice_minutes || 30)}
                              onValueChange={(value) => handleUpdatePreference(type.value, 'advance_notice_minutes', Number(value))}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="5">5 minutes</SelectItem>
                                <SelectItem value="15">15 minutes</SelectItem>
                                <SelectItem value="30">30 minutes</SelectItem>
                                <SelectItem value="60">1 hour</SelectItem>
                                <SelectItem value="120">2 hours</SelectItem>
                                <SelectItem value="1440">1 day</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <Label className="text-xs">AI Personalization</Label>
                          <Switch
                            checked={pref.ai_personalization !== false}
                            onCheckedChange={(checked) => handleUpdatePreference(type.value, 'ai_personalization', checked)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="border-t pt-6">
                <h3 className="font-semibold mb-4">Quiet Hours</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Enable Do Not Disturb</Label>
                    <Switch />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">Start Time</Label>
                      <Input type="time" defaultValue="22:00" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">End Time</Label>
                      <Input type="time" defaultValue="08:00" />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}