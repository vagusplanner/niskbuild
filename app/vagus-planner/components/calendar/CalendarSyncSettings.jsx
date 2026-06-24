import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function CalendarSyncSettings() {
  const [settings, setSettings] = useState({
    auto_sync_enabled: true,
    sync_frequency: 'hourly',
    sync_description: true,
    sync_location: true,
    import_external_events: true
  });

  const handleSave = async () => {
    try {
      const userSettings = await base44.auth.updateMe({
        calendar_sync_settings: settings
      });
      toast.success('Calendar sync settings saved!');
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📅 Calendar Sync Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Auto Sync */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="font-medium">Auto Sync</Label>
            <p className="text-sm text-slate-600">Automatically sync external calendars</p>
          </div>
          <Switch
            checked={settings.auto_sync_enabled}
            onCheckedChange={(checked) => setSettings({ ...settings, auto_sync_enabled: checked })}
          />
        </div>

        {/* Sync Frequency */}
        {settings.auto_sync_enabled && (
          <div className="space-y-2">
            <Label>Sync Frequency</Label>
            <Select value={settings.sync_frequency} onValueChange={(value) => setSettings({ ...settings, sync_frequency: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="realtime">Real-time</SelectItem>
                <SelectItem value="5min">Every 5 minutes</SelectItem>
                <SelectItem value="15min">Every 15 minutes</SelectItem>
                <SelectItem value="hourly">Every hour</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Sync Descriptions */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="font-medium">Sync Descriptions</Label>
            <p className="text-sm text-slate-600">Include event descriptions</p>
          </div>
          <Switch
            checked={settings.sync_description}
            onCheckedChange={(checked) => setSettings({ ...settings, sync_description: checked })}
          />
        </div>

        {/* Sync Location */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="font-medium">Sync Locations</Label>
            <p className="text-sm text-slate-600">Include event locations</p>
          </div>
          <Switch
            checked={settings.sync_location}
            onCheckedChange={(checked) => setSettings({ ...settings, sync_location: checked })}
          />
        </div>

        {/* Import External Events */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="font-medium">Import External Events</Label>
            <p className="text-sm text-slate-600">Show external calendar events in app</p>
          </div>
          <Switch
            checked={settings.import_external_events}
            onCheckedChange={(checked) => setSettings({ ...settings, import_external_events: checked })}
          />
        </div>

        {/* Info Box */}
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 flex gap-2">
          <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700">
            Your Google Calendar is connected and ready to sync. Changes made in the app will be reflected in Google Calendar.
          </p>
        </div>

        <Button onClick={handleSave} className="w-full bg-blue-600 hover:bg-blue-700">
          Save Settings
        </Button>
      </CardContent>
    </Card>
  );
}