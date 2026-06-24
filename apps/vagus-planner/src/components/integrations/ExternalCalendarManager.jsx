import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Calendar, RefreshCw, Trash2, Check, X, Link as LinkIcon, CheckSquare } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import GoogleCalendarSyncPanel from '@/components/calendar/GoogleCalendarSyncPanel';

export default function ExternalCalendarManager() {
  const queryClient = useQueryClient();
  const [syncingCalendar, setSyncingCalendar] = useState(null);

  const { data: settings } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => base44.entities.UserSettings.list()
  });

  const userSettings = settings?.[0];

  // Sync Google Calendar mutation
  const syncGoogleMutation = useMutation({
    mutationFn: async (calendarId = 'primary') => {
      const response = await base44.functions.invoke('syncGoogleCalendar', {
        calendarId
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success(`Synced ${data.syncedCount} events from Google Calendar`);
      setSyncingCalendar(null);
    },
    onError: () => {
      toast.error('Failed to sync Google Calendar');
      setSyncingCalendar(null);
    }
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (updates) => {
      if (!userSettings?.id) return;
      await base44.entities.UserSettings.update(userSettings.id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userSettings'] });
    }
  });

  // Disconnect calendar mutation
  const disconnectMutation = useMutation({
    mutationFn: async (calendarType) => {
      if (!userSettings?.id) return;
      await base44.entities.UserSettings.update(userSettings.id, {
        [`${calendarType}_calendar_connected`]: false,
        [`${calendarType}_calendar_sync_enabled`]: false
      });
      // Delete synced events from this calendar
      const events = await base44.entities.Event.filter({
        external_calendar_type: calendarType
      });
      for (const event of events) {
        await base44.entities.Event.delete(event.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userSettings', 'events'] });
      toast.success('Calendar disconnected');
    }
  });

  const handleConnectGoogle = async () => {
    try {
      // Step 1: Get access token via connector
      const response = await base44.functions.invoke('syncGoogleCalendar', {
        calendarId: 'primary'
      });

      // Step 2: Update settings to mark as connected
      if (userSettings?.id) {
        await base44.entities.UserSettings.update(userSettings.id, {
          google_calendar_connected: true,
          google_calendar_sync_enabled: true
        });
      }

      queryClient.invalidateQueries({ queryKey: ['userSettings'] });
      toast.success('Google Calendar connected and synced!');
    } catch (error) {
      toast.error('Failed to connect Google Calendar');
    }
  };

  const handleSyncGoogle = async () => {
    setSyncingCalendar('google');
    await syncGoogleMutation.mutateAsync('primary');
  };

  const handleToggleSync = async (calendarType) => {
    const isEnabled = userSettings?.[`${calendarType}_calendar_sync_enabled`];
    await updateSettingsMutation.mutateAsync({
      [`${calendarType}_calendar_sync_enabled`]: !isEnabled
    });
  };

  const handleDisconnect = async (calendarType) => {
    if (confirm(`Are you sure you want to disconnect ${calendarType.charAt(0).toUpperCase() + calendarType.slice(1)} Calendar? Synced events will be deleted.`)) {
      await disconnectMutation.mutateAsync(calendarType);
    }
  };

  return (
    <div className="space-y-4">
      {/* Live two-way sync panel */}
      <GoogleCalendarSyncPanel />

      <Card className="border-cyan-200/50 dark:border-cyan-800/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-cyan-600" />
            Connected Calendars
          </CardTitle>
          <CardDescription>Sync events from external calendars into Vagus Planner</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Google Calendar */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="flex-1">
              <h3 className="font-medium flex items-center gap-2">
                <span className="text-red-500">📅</span>
                Google Calendar
                {userSettings?.google_calendar_connected && (
                  <Badge className="bg-green-100 text-green-800 ml-2">Connected</Badge>
                )}
              </h3>
              {userSettings?.google_calendar_connected && (
                <p className="text-xs text-slate-500 mt-1">
                  Last synced: {userSettings?.google_calendar_last_sync ? new Date(userSettings.google_calendar_last_sync).toLocaleString() : 'Never'}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              {!userSettings?.google_calendar_connected ? (
                <Button
                  onClick={handleConnectGoogle}
                  size="sm"
                  className="bg-cyan-600 hover:bg-cyan-700"
                  disabled={syncGoogleMutation.isPending}
                >
                  <LinkIcon className="w-4 h-4 mr-1" />
                  {syncGoogleMutation.isPending ? 'Connecting...' : 'Connect'}
                </Button>
              ) : (
                <>
                  <Button
                    onClick={handleSyncGoogle}
                    size="sm"
                    variant="outline"
                    disabled={syncingCalendar === 'google'}
                  >
                    <RefreshCw className={`w-4 h-4 ${syncingCalendar === 'google' ? 'animate-spin' : ''}`} />
                  </Button>
                  <Button
                    onClick={() => handleToggleSync('google')}
                    size="sm"
                    variant={userSettings?.google_calendar_sync_enabled ? 'default' : 'outline'}
                  >
                    {userSettings?.google_calendar_sync_enabled ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    onClick={() => handleDisconnect('google')}
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Outlook Calendar (Coming Soon) */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700 opacity-50">
            <div className="flex-1">
              <h3 className="font-medium flex items-center gap-2">
                <span>📧</span>
                Outlook Calendar
                <Badge className="bg-slate-100 text-slate-700 ml-2">Coming Soon</Badge>
              </h3>
            </div>
            <Button size="sm" disabled className="text-slate-400">
              Connect
            </Button>
          </div>

          {/* Task → Google Calendar sync toggle */}
          {userSettings?.google_calendar_connected && (
            <div className="p-4 rounded-lg border border-[#29ABE2]/30 bg-[#29ABE2]/5 flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <CheckSquare className="w-5 h-5 text-[#29ABE2] mt-0.5 flex-shrink-0" />
                <div>
                  <Label htmlFor="task-gcal-sync" className="text-sm font-semibold text-slate-800 dark:text-slate-100 cursor-pointer">
                    Sync Tasks with Due Dates
                  </Label>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Automatically adds/updates tasks that have a due date as events in your Google Calendar. Changes in Google Calendar are also reflected here.
                  </p>
                </div>
              </div>
              <Switch
                id="task-gcal-sync"
                checked={!!userSettings?.task_gcal_sync_enabled}
                onCheckedChange={(checked) =>
                  updateSettingsMutation.mutate({ task_gcal_sync_enabled: checked })
                }
                disabled={updateSettingsMutation.isPending}
              />
            </div>
          )}

          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900 flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <p className="font-medium mb-1">Auto-Sync Enabled</p>
              <p>Events are automatically synced when you visit the calendar. Use the refresh button for manual sync.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}