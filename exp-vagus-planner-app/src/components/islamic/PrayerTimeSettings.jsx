import React, { useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Bell, Volume2, MapPin, Clock, Settings as SettingsIcon } from 'lucide-react';
import { toast } from 'sonner';

const CALCULATION_METHODS = [
  { value: 'MWL', label: 'Muslim World League' },
  { value: 'ISNA', label: 'Islamic Society of North America' },
  { value: 'Egypt', label: 'Egyptian General Authority' },
  { value: 'Makkah', label: 'Umm Al-Qura University, Makkah' },
  { value: 'Karachi', label: 'University of Islamic Sciences, Karachi' },
  { value: 'Tehran', label: 'Institute of Geophysics, Tehran' },
  { value: 'Jafari', label: 'Shia Ithna-Ashari, Leva Institute' }
];

const NOTIFICATION_SOUNDS = [
  { value: 'adhan', label: 'Adhan (Call to Prayer)' },
  { value: 'chime', label: 'Soft Chime' },
  { value: 'bell', label: 'Bell' },
  { value: 'none', label: 'Silent' }
];

export default function PrayerTimeSettings() {
  const queryClient = useQueryClient();
  const [customLocation, setCustomLocation] = useState('');

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => SDK.entities.UserSettings.list()
  });

  const userSettings = settings[0] || {};

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates) => {
      if (settings.length > 0) {
        return SDK.entities.UserSettings.update(settings[0].id, updates);
      } else {
        return SDK.entities.UserSettings.create(updates);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userSettings'] });
      toast.success('Prayer settings updated');
    }
  });

  const detectLocationMutation = useMutation({
    mutationFn: async () => {
      const response = await SDK.functions.invoke('detectUserLocation', {});
      return response.data;
    },
    onSuccess: (data) => {
      updateSettingsMutation.mutate({
        location_city: data.city,
        location_country: data.country,
        latitude: data.latitude,
        longitude: data.longitude,
        timezone: data.timezone
      });
    },
    onError: () => {
      toast.error('Failed to detect location. Please enter manually.');
    }
  });

  const handleUpdate = (key, value) => {
    updateSettingsMutation.mutate({ [key]: value });
  };

  if (isLoading) {
    return <div className="p-4 text-center text-slate-500">Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Location Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-teal-600" />
            <CardTitle>Location Settings</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-teal-50 rounded-lg">
            <p className="text-sm text-slate-700 mb-2">Current Location:</p>
            {userSettings.location_city ? (
              <p className="font-semibold text-teal-900">
                {userSettings.location_city}, {userSettings.location_country}
              </p>
            ) : (
              <p className="text-sm text-slate-500">No location set</p>
            )}
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Enter city name"
              value={customLocation}
              onChange={(e) => setCustomLocation(e.target.value)}
            />
            <Button
              onClick={() => detectLocationMutation.mutate()}
              disabled={detectLocationMutation.isPending}
            >
              Auto-Detect
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Calculation Method */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <SettingsIcon className="w-5 h-5 text-teal-600" />
            <CardTitle>Calculation Method</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Select
            value={userSettings.prayer_method || 'MWL'}
            onValueChange={(value) => handleUpdate('prayer_method', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CALCULATION_METHODS.map(method => (
                <SelectItem key={method.value} value={method.value}>
                  {method.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-500 mt-2">
            Different methods are used in different regions. Choose the one commonly used in your area.
          </p>
        </CardContent>
      </Card>

      {/* Prayer Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-teal-600" />
            <CardTitle>Prayer Notifications</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Enable Prayer Times</Label>
              <p className="text-xs text-slate-500">Show prayer times in calendar</p>
            </div>
            <Switch
              checked={userSettings.prayer_enabled !== false}
              onCheckedChange={(checked) => handleUpdate('prayer_enabled', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Play Adhan</Label>
              <p className="text-xs text-slate-500">Play call to prayer audio</p>
            </div>
            <Switch
              checked={userSettings.adhan_enabled !== false}
              onCheckedChange={(checked) => handleUpdate('adhan_enabled', checked)}
            />
          </div>

          <div className="space-y-2">
            <Label>Notification Sound</Label>
            <Select
              value={userSettings.notification_sound || 'default'}
              onValueChange={(value) => handleUpdate('notification_sound', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NOTIFICATION_SOUNDS.map(sound => (
                  <SelectItem key={sound.value} value={sound.value}>
                    {sound.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Notify Before Prayer (minutes)</Label>
            <Input
              type="number"
              min="0"
              max="60"
              value={userSettings.notify_before_minutes || 15}
              onChange={(e) => handleUpdate('notify_before_minutes', parseInt(e.target.value))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Do Not Disturb */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-teal-600" />
            <CardTitle>Do Not Disturb</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Enable DND Mode</Label>
              <p className="text-xs text-slate-500">Silence notifications during specific hours</p>
            </div>
            <Switch
              checked={userSettings.do_not_disturb || false}
              onCheckedChange={(checked) => handleUpdate('do_not_disturb', checked)}
            />
          </div>

          {userSettings.do_not_disturb && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={userSettings.dnd_start_time || '22:00'}
                  onChange={(e) => handleUpdate('dnd_start_time', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={userSettings.dnd_end_time || '06:00'}
                  onChange={(e) => handleUpdate('dnd_end_time', e.target.value)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}