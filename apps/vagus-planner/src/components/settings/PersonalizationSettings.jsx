import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Palette, Bell, Brain, Volume2, Sparkles, Zap, MessageSquare, CheckCircle2 } from 'lucide-react';

const COLOR_PALETTES = [
  { name: 'Teal', primary: '#14B8A6', secondary: '#0D9488', accent: '#06B6D4' },
  { name: 'Blue', primary: '#3B82F6', secondary: '#2563EB', accent: '#60A5FA' },
  { name: 'Purple', primary: '#8B5CF6', secondary: '#7C3AED', accent: '#A78BFA' },
  { name: 'Rose', primary: '#F43F5E', secondary: '#E11D48', accent: '#FB7185' },
  { name: 'Amber', primary: '#F59E0B', secondary: '#D97706', accent: '#FBBF24' },
  { name: 'Emerald', primary: '#10B981', secondary: '#059669', accent: '#34D399' }
];

const NOTIFICATION_SOUNDS = [
  { value: 'default', label: 'Default' },
  { value: 'chime', label: 'Chime' },
  { value: 'bell', label: 'Bell' },
  { value: 'ding', label: 'Ding' },
  { value: 'none', label: 'Silent' }
];

const AI_AREAS = [
  'Prayer times & Islamic events',
  'Calendar scheduling',
  'Health & wellness',
  'Travel planning',
  'Productivity tips',
  'Islamic knowledge',
  'Financial planning',
  'Goal achievement'
];

export default function PersonalizationSettings() {
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => base44.entities.UserSettings.list()
  });

  const userSettings = (settings && settings.length > 0) ? settings[0] : {};
  const [selectedPalette, setSelectedPalette] = useState(userSettings.color_palette || 'Teal');
  const [aiVerbosity, setAiVerbosity] = useState(userSettings.ai_verbosity || 50);
  const [aiProactivity, setAiProactivity] = useState(userSettings.ai_proactivity_level || 50);
  const [selectedAreas, setSelectedAreas] = useState(userSettings.ai_interest_areas || []);

  const updateMutation = useMutation({
    mutationFn: (data) => {
      if (userSettings.id) {
        return base44.entities.UserSettings.update(userSettings.id, data);
      }
      return base44.entities.UserSettings.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userSettings'] });
      toast.success('Settings saved');
    }
  });

  const handleSave = (data) => {
    updateMutation.mutate(data);
  };

  const toggleArea = (area) => {
    const newAreas = selectedAreas.includes(area)
      ? selectedAreas.filter(a => a !== area)
      : [...selectedAreas, area];
    setSelectedAreas(newAreas);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          Personalization
        </CardTitle>
        <CardDescription>
          Customize the app's appearance, notifications, and AI assistant behavior
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="appearance" className="space-y-6">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              <span className="hidden sm:inline">Appearance</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              <span className="hidden sm:inline">AI Assistant</span>
            </TabsTrigger>
          </TabsList>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-6">
            {/* Theme Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Theme Mode</Label>
              <div className="flex gap-3">
                <button
                  onClick={() => handleSave({ theme: 'light' })}
                  className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                    userSettings.theme === 'light' || !userSettings.theme
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-center">
                    <div className="w-12 h-12 bg-white rounded-lg shadow-md mx-auto mb-2" />
                    <p className="font-medium text-sm">Light</p>
                  </div>
                </button>
                <button
                  onClick={() => handleSave({ theme: 'dark' })}
                  className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                    userSettings.theme === 'dark'
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-center">
                    <div className="w-12 h-12 bg-slate-800 rounded-lg shadow-md mx-auto mb-2" />
                    <p className="font-medium text-sm">Dark</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Color Palette */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Color Palette</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {COLOR_PALETTES.map((palette) => (
                  <button
                    key={palette.name}
                    onClick={() => {
                      setSelectedPalette(palette.name);
                      handleSave({ color_palette: palette.name });
                    }}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      selectedPalette === palette.name
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full" style={{ backgroundColor: palette.primary }} />
                      <div className="w-6 h-6 rounded-full" style={{ backgroundColor: palette.secondary }} />
                      <div className="w-6 h-6 rounded-full" style={{ backgroundColor: palette.accent }} />
                    </div>
                    <p className="font-medium text-sm text-left">{palette.name}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Font Size</Label>
              <div className="flex gap-2">
                {['Small', 'Medium', 'Large'].map((size) => (
                  <Button
                    key={size}
                    variant={userSettings.font_size === size.toLowerCase() ? 'default' : 'outline'}
                    onClick={() => handleSave({ font_size: size.toLowerCase() })}
                    className="flex-1"
                  >
                    {size}
                  </Button>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            {/* Notification Types */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Notification Types</Label>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">Push Notifications</p>
                    <p className="text-xs text-slate-500">Receive notifications on this device</p>
                  </div>
                  <Switch
                    checked={userSettings.notifications_enabled !== false}
                    onCheckedChange={(checked) => handleSave({ notifications_enabled: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">Email Notifications</p>
                    <p className="text-xs text-slate-500">Receive important updates via email</p>
                  </div>
                  <Switch
                    checked={userSettings.email_notifications !== false}
                    onCheckedChange={(checked) => handleSave({ email_notifications: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">Prayer Notifications</p>
                    <p className="text-xs text-slate-500">Alerts for prayer times</p>
                  </div>
                  <Switch
                    checked={userSettings.islamic_notifications !== false}
                    onCheckedChange={(checked) => handleSave({ islamic_notifications: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">Meeting Reminders</p>
                    <p className="text-xs text-slate-500">Alerts for upcoming meetings</p>
                  </div>
                  <Switch
                    checked={userSettings.meeting_notifications !== false}
                    onCheckedChange={(checked) => handleSave({ meeting_notifications: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">Travel Alerts</p>
                    <p className="text-xs text-slate-500">Updates about your trips</p>
                  </div>
                  <Switch
                    checked={userSettings.travel_notifications !== false}
                    onCheckedChange={(checked) => handleSave({ travel_notifications: checked })}
                  />
                </div>
              </div>
            </div>

            {/* Notification Sound */}
            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Volume2 className="w-4 h-4" />
                Notification Sound
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {NOTIFICATION_SOUNDS.map((sound) => (
                  <Button
                    key={sound.value}
                    variant={userSettings.notification_sound === sound.value ? 'default' : 'outline'}
                    onClick={() => handleSave({ notification_sound: sound.value })}
                  >
                    {sound.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Default Reminder Time */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Default Reminder Time</Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[userSettings.notify_before_minutes || 15]}
                  onValueChange={(value) => handleSave({ notify_before_minutes: value[0] })}
                  min={5}
                  max={120}
                  step={5}
                  className="flex-1"
                />
                <Badge variant="outline" className="w-16 justify-center">
                  {userSettings.notify_before_minutes || 15}m
                </Badge>
              </div>
            </div>

            {/* Do Not Disturb */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Do Not Disturb</Label>
                <Switch
                  checked={userSettings.do_not_disturb || false}
                  onCheckedChange={(checked) => handleSave({ do_not_disturb: checked })}
                />
              </div>
              {userSettings.do_not_disturb && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm text-slate-600">Start Time</Label>
                    <input
                      type="time"
                      value={userSettings.dnd_start_time || '22:00'}
                      onChange={(e) => handleSave({ dnd_start_time: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-slate-600">End Time</Label>
                    <input
                      type="time"
                      value={userSettings.dnd_end_time || '07:00'}
                      onChange={(e) => handleSave({ dnd_end_time: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg mt-1"
                    />
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* AI Assistant Tab */}
          <TabsContent value="ai" className="space-y-6">
            {/* AI Response Style */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Response Tone</Label>
              <div className="grid grid-cols-2 gap-2">
                {['Professional', 'Friendly', 'Casual', 'Formal'].map((tone) => (
                  <Button
                    key={tone}
                    variant={userSettings.ai_response_tone === tone.toLowerCase() ? 'default' : 'outline'}
                    onClick={() => handleSave({ ai_response_tone: tone.toLowerCase() })}
                  >
                    {tone}
                  </Button>
                ))}
              </div>
            </div>

            {/* AI Response Length */}
            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Response Length
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {['Brief', 'Medium', 'Detailed'].map((length) => (
                  <Button
                    key={length}
                    variant={userSettings.ai_response_length === length.toLowerCase() ? 'default' : 'outline'}
                    onClick={() => handleSave({ ai_response_length: length.toLowerCase() })}
                  >
                    {length}
                  </Button>
                ))}
              </div>
            </div>

            {/* AI Verbosity Slider */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Explanation Detail Level</Label>
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Concise</span>
                  <span>Verbose</span>
                </div>
                <Slider
                  value={[aiVerbosity]}
                  onValueChange={(value) => {
                    setAiVerbosity(value[0]);
                    handleSave({ ai_verbosity: value[0] });
                  }}
                  min={0}
                  max={100}
                  step={10}
                  className="flex-1"
                />
              </div>
            </div>

            {/* AI Proactivity Level */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Proactive Suggestions
                </Label>
                <Switch
                  checked={userSettings.ai_proactive_suggestions !== false}
                  onCheckedChange={(checked) => handleSave({ ai_proactive_suggestions: checked })}
                />
              </div>
              {userSettings.ai_proactive_suggestions !== false && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Minimal</span>
                    <span>Frequent</span>
                  </div>
                  <Slider
                    value={[aiProactivity]}
                    onValueChange={(value) => {
                      setAiProactivity(value[0]);
                      handleSave({ ai_proactivity_level: value[0] });
                    }}
                    min={0}
                    max={100}
                    step={10}
                    className="flex-1"
                  />
                </div>
              )}
            </div>

            {/* Areas of Interest */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Knowledge Snippet Areas</Label>
              <p className="text-sm text-slate-500">
                Select topics you'd like to receive insights about
              </p>
              <div className="grid gap-2">
                {AI_AREAS.map((area) => (
                  <div
                    key={area}
                    onClick={() => toggleArea(area)}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedAreas.includes(area)
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{area}</span>
                      {selectedAreas.includes(area) && (
                        <CheckCircle2 className="w-5 h-5 text-teal-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <Button
                onClick={() => handleSave({ ai_interest_areas: selectedAreas })}
                className="w-full bg-teal-600 hover:bg-teal-700"
              >
                Save Interest Areas
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}