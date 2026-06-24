import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Bell, Volume2, BookOpen, Eye, Save, Music } from 'lucide-react';
import { toast } from 'sonner';

const PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

const ADHAN_RECITERS = [
  { value: 'mishary', label: 'Mishary Rashid Alafasy' },
  { value: 'abdulbasit', label: 'Abdul Basit Abdul Samad' },
  { value: 'sudais', label: 'Abdul Rahman Al-Sudais' },
  { value: 'shuraim', label: 'Saud Al-Shuraim' },
  { value: 'minshawi', label: 'Mohamed Siddiq Al-Minshawi' },
  { value: 'husary', label: 'Mahmoud Khalil Al-Husary' },
];

const QURAN_RECITERS = [
  { value: 'mishary', label: 'Mishary Rashid Alafasy' },
  { value: 'abdulbasit_murattal', label: 'Abdul Basit (Murattal)' },
  { value: 'abdulbasit_mujawwad', label: 'Abdul Basit (Mujawwad)' },
  { value: 'sudais', label: 'Abdul Rahman Al-Sudais' },
  { value: 'husary', label: 'Mahmoud Khalil Al-Husary' },
  { value: 'minshawi', label: 'Mohamed Siddiq Al-Minshawi' },
  { value: 'ghamdi', label: 'Saad Al-Ghamdi' },
  { value: 'ajamy', label: 'Ahmad Al-Ajamy' },
];

const ALERT_SOUNDS = [
  { value: 'adhan', label: '🕌 Adhan (Full Call to Prayer)' },
  { value: 'adhan_short', label: '🕌 Adhan (Short)' },
  { value: 'chime', label: '🔔 Soft Chime' },
  { value: 'bell', label: '🔕 Bell' },
  { value: 'none', label: '🔇 Silent' },
];

const CONTENT_DISPLAY = [
  { key: 'show_arabic_text', label: 'Show Arabic Text', desc: 'Display Quran verses and duas in Arabic' },
  { key: 'show_transliteration', label: 'Show Transliteration', desc: 'Show phonetic pronunciation' },
  { key: 'show_translation', label: 'Show Translation', desc: 'Display English translation' },
  { key: 'show_hijri_dates', label: 'Show Hijri Dates', desc: 'Show Islamic calendar dates throughout the app' },
  { key: 'show_fasting_indicators', label: 'Show Fasting Indicators', desc: 'Mark fasting days on calendar' },
  { key: 'show_prayer_times_banner', label: 'Prayer Times Banner', desc: 'Show next prayer countdown in header' },
];

const DEFAULT_PRAYER_ALERTS = PRAYERS.reduce((acc, p) => ({
  ...acc,
  [p]: { enabled: true, sound: 'adhan', minutes_before: 5, duration_minutes: 3 }
}), {});

export default function IslamicAdvancedSettings() {
  const queryClient = useQueryClient();

  const { data: settingsArr = [] } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => SDK.entities.UserSettings.list()
  });
  const settings = settingsArr[0] || {};

  // Local state merged from saved settings
  const [prayerAlerts, setPrayerAlerts] = useState(
    () => settings.prayer_alert_config || DEFAULT_PRAYER_ALERTS
  );
  const [adhanReciter, setAdhanReciter] = useState(settings.adhan_reciter || 'mishary');
  const [quranReciter, setQuranReciter] = useState(settings.quran_reciter || 'mishary');
  const [display, setDisplay] = useState({
    show_arabic_text: settings.show_arabic_text ?? true,
    show_transliteration: settings.show_transliteration ?? true,
    show_translation: settings.show_translation ?? true,
    show_hijri_dates: settings.show_hijri_dates ?? true,
    show_fasting_indicators: settings.show_fasting_indicators ?? true,
    show_prayer_times_banner: settings.show_prayer_times_banner ?? true,
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (settings?.id) return SDK.entities.UserSettings.update(settings.id, data);
      return SDK.entities.UserSettings.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userSettings'] });
      toast.success('Islamic settings saved');
    }
  });

  const handleSave = () => {
    saveMutation.mutate({
      prayer_alert_config: prayerAlerts,
      adhan_reciter: adhanReciter,
      quran_reciter: quranReciter,
      ...display
    });
  };

  const updatePrayer = (prayer, field, value) => {
    setPrayerAlerts(prev => ({
      ...prev,
      [prayer]: { ...prev[prayer], [field]: value }
    }));
  };

  return (
    <div className="space-y-6">
      {/* Per-Prayer Alert Customization */}
      <Card className="bg-white/80 backdrop-blur border-0 shadow-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b">
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-emerald-600" />
            Prayer Alert Customization
          </CardTitle>
          <CardDescription>Configure alerts individually for each prayer</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {PRAYERS.map(prayer => {
            const cfg = prayerAlerts[prayer] || { enabled: true, sound: 'adhan', minutes_before: 5, duration_minutes: 3 };
            return (
              <div key={prayer} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-slate-800 w-16">{prayer}</span>
                    {cfg.enabled && (
                      <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                        {cfg.minutes_before}m before
                      </Badge>
                    )}
                  </div>
                  <Switch
                    checked={cfg.enabled}
                    onCheckedChange={(v) => updatePrayer(prayer, 'enabled', v)}
                  />
                </div>
                {cfg.enabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-500">Sound</Label>
                      <Select value={cfg.sound} onValueChange={(v) => updatePrayer(prayer, 'sound', v)}>
                        <SelectTrigger className="h-8 text-xs bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ALERT_SOUNDS.map(s => (
                            <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-500">Remind {cfg.minutes_before} min before</Label>
                      <Slider
                        min={0} max={30} step={1}
                        value={[cfg.minutes_before]}
                        onValueChange={([v]) => updatePrayer(prayer, 'minutes_before', v)}
                        className="mt-2"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-500">Duration {cfg.duration_minutes} min</Label>
                      <Slider
                        min={1} max={15} step={1}
                        value={[cfg.duration_minutes]}
                        onValueChange={([v]) => updatePrayer(prayer, 'duration_minutes', v)}
                        className="mt-2"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Reciter Selection */}
      <Card className="bg-white/80 backdrop-blur border-0 shadow-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b">
          <CardTitle className="flex items-center gap-2">
            <Music className="w-5 h-5 text-emerald-600" />
            Recitation Preferences
          </CardTitle>
          <CardDescription>Choose your preferred reciters for Adhan and Quran</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <Label>Adhan Reciter</Label>
            <Select value={adhanReciter} onValueChange={setAdhanReciter}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ADHAN_RECITERS.map(r => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Quran Reciter</Label>
            <Select value={quranReciter} onValueChange={setQuranReciter}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QURAN_RECITERS.map(r => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Islamic Content Display */}
      <Card className="bg-white/80 backdrop-blur border-0 shadow-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b">
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-emerald-600" />
            Content Display Preferences
          </CardTitle>
          <CardDescription>Customize how Islamic content is shown throughout the app</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {CONTENT_DISPLAY.map(item => (
            <div key={item.key} className="flex items-center justify-between py-1">
              <div>
                <Label className="text-sm font-medium">{item.label}</Label>
                <p className="text-xs text-slate-500">{item.desc}</p>
              </div>
              <Switch
                checked={display[item.key] ?? true}
                onCheckedChange={(v) => setDisplay(prev => ({ ...prev, [item.key]: v }))}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Button
        onClick={handleSave}
        disabled={saveMutation.isPending}
        className="w-full h-11 bg-emerald-600 hover:bg-emerald-700"
      >
        <Save className="w-4 h-4 mr-2" />
        {saveMutation.isPending ? 'Saving...' : 'Save Islamic Settings'}
      </Button>
    </div>
  );
}