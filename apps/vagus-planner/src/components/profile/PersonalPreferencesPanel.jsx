import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { motion } from 'framer-motion';
import { 
  Utensils, Moon, Globe, Clock, Save, CheckCircle2, 
  Loader2, ChevronDown, ChevronUp, Info, Sparkles, Calendar
} from 'lucide-react';
import PublicHolidaysSettings from '@/components/settings/PublicHolidaysSettings';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// All IANA timezones grouped for usability
const TIMEZONES = Intl.supportedValuesOf
  ? Intl.supportedValuesOf('timeZone')
  : [
      'UTC', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Istanbul',
      'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
      'America/Toronto', 'America/Sao_Paulo',
      'Asia/Dubai', 'Asia/Riyadh', 'Asia/Karachi', 'Asia/Kolkata', 'Asia/Dhaka',
      'Asia/Jakarta', 'Asia/Kuala_Lumpur', 'Asia/Singapore', 'Asia/Tokyo',
      'Africa/Cairo', 'Africa/Lagos', 'Africa/Nairobi',
      'Australia/Sydney', 'Pacific/Auckland'
    ];

const DIETARY_OPTIONS = [
  { id: 'halal',       label: 'Halal',        emoji: '🌙', desc: 'Islamically permissible food' },
  { id: 'vegetarian',  label: 'Vegetarian',    emoji: '🥦', desc: 'No meat or fish' },
  { id: 'vegan',       label: 'Vegan',         emoji: '🌱', desc: 'No animal products' },
  { id: 'gluten_free', label: 'Gluten-Free',   emoji: '🌾', desc: 'No gluten-containing grains' },
  { id: 'dairy_free',  label: 'Dairy-Free',    emoji: '🥛', desc: 'No dairy products' },
  { id: 'nut_free',    label: 'Nut-Free',      emoji: '🥜', desc: 'No nuts or nut products' },
];

const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

export default function PersonalPreferencesPanel({ settingsData: settingsDataProp }) {
  const queryClient = useQueryClient();
  const [showPrayerAdvanced, setShowPrayerAdvanced] = useState(false);

  const { data: settingsQueryData = [] } = useQuery({
    queryKey: ['userSettings'],
    queryFn: async () => {
      try {
        const list = await base44.entities.UserSettings.list();
        return list ?? [];
      } catch (error) {
        console.error('Error fetching settings:', error);
        return [];
      }
    },
    enabled: settingsDataProp === undefined,
  });

  const settingsList = settingsDataProp ?? settingsQueryData ?? [];
  const settings = settingsList?.[0] ?? null;

  const [form, setForm] = useState({
    dietary_preferences: [],
    dietary_notes: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    use_manual_prayer_times: false,
    prayer_time_overrides: { fajr: '', dhuhr: '', asr: '', maghrib: '', isha: '' },
    prayer_time_offsets:   { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
    islamic_mode: false,
    public_holidays_enabled: false,
    public_holidays_country: 'GB',
  });

  useEffect(() => {
    if (settings) {
      setForm({
        dietary_preferences:      settings.dietary_preferences      || [],
        dietary_notes:            settings.dietary_notes            || '',
        timezone:                 settings.timezone                 || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        use_manual_prayer_times:  settings.use_manual_prayer_times  ?? false,
        prayer_time_overrides:    settings.prayer_time_overrides    || { fajr: '', dhuhr: '', asr: '', maghrib: '', isha: '' },
        prayer_time_offsets:      settings.prayer_time_offsets      || { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
        islamic_mode:             settings.islamic_mode             ?? false,
        public_holidays_enabled:  settings.public_holidays_enabled  ?? false,
        public_holidays_country:  settings.public_holidays_country  || 'GB',
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (settings?.id) {
        return base44.entities.UserSettings.update(settings.id, data);
      }
      return base44.entities.UserSettings.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userSettings'] });
      toast.success('Preferences saved! Reloading to apply changes…');
      setTimeout(() => window.location.reload(), 800);
    }
  });

  const handleIslamicModeChange = (value) => {
    const edition = value ? 'islamic' : 'standard';
    const updated = { ...form, islamic_mode: value, edition };
    setForm(updated);
    try { localStorage.setItem('vagus_islamic_mode', value ? '1' : '0'); localStorage.setItem('vagus_edition', edition); } catch (e) {}
    const existingPrefs =
      settings?.preferences && typeof settings.preferences === 'object' ? settings.preferences : {};
    const payload = {
      islamic_mode: value,
      edition,
      preferences: { ...existingPrefs, edition },
    };
    const save = settings?.id
      ? base44.entities.UserSettings.update(settings.id, payload)
      : base44.entities.UserSettings.create(payload);
    save.then(() => {
      queryClient.invalidateQueries({ queryKey: ['userSettings'] });
      toast.success(`${value ? 'Islamic' : 'Standard'} edition enabled! Reloading…`);
      setTimeout(() => window.location.reload(), 800);
    }).catch((error) => {
      console.error('Error saving edition preference:', error);
      toast.error('Failed to save edition preference');
      setForm((prev) => ({ ...prev, islamic_mode: !value }));
      try { localStorage.setItem('vagus_islamic_mode', !value ? '1' : '0'); } catch (e) {}
    });
  };

  const toggleDiet = (id) => {
    setForm(prev => ({
      ...prev,
      dietary_preferences: prev.dietary_preferences.includes(id)
        ? prev.dietary_preferences.filter(d => d !== id)
        : [...prev.dietary_preferences, id]
    }));
  };

  const handleSave = () => saveMutation.mutate(form);

  return (
    <div className="space-y-6">

      {/* ── Edition Toggle ── */}
      <Card className="border-0 shadow-sm bg-white dark:bg-slate-900">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            App Edition
          </CardTitle>
          <CardDescription>
            Switch between Standard and Islamic edition. This changes the Islam tab, subscription plans, and Islamic features visibility.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: false, icon: Calendar, label: 'Standard', desc: 'Calendar, Health, Travel & AI', gradient: 'from-teal-500 to-cyan-500' },
              { value: true,  icon: Moon,     label: 'Islamic',  desc: '+ Prayer, Quran, Hajj & more', gradient: 'from-indigo-600 to-purple-600' },
            ].map(opt => {
              const Icon = opt.icon;
              const active = form.islamic_mode === opt.value;
              return (
                <button
                 key={String(opt.value)}
                 onClick={() => { if (form.islamic_mode !== opt.value) handleIslamicModeChange(opt.value); }}
                  className={cn(
                    'flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all',
                    active ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/30' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  )}
                >
                  <div className={`w-9 h-9 bg-gradient-to-br ${opt.gradient} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className={cn('text-sm font-semibold', active ? 'text-teal-700 dark:text-teal-300' : 'text-slate-700 dark:text-slate-300')}>{opt.label}</p>
                    <p className="text-xs text-slate-400">{opt.desc}</p>
                  </div>
                  {active && <CheckCircle2 className="w-4 h-4 text-teal-500 ml-auto flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Dietary Preferences ── */}
      <Card className="border-0 shadow-sm bg-white dark:bg-slate-900">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/40 flex items-center justify-center">
              <Utensils className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </div>
            Dietary Preferences
          </CardTitle>
          <CardDescription>
            Applied to meal plans, recipe suggestions and food event timing throughout the app.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {DIETARY_OPTIONS.map(opt => {
              const active = form.dietary_preferences.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  onClick={() => toggleDiet(opt.id)}
                  className={cn(
                    'flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all',
                    active
                      ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/30 dark:border-teal-500'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  )}
                >
                  <span className="text-lg leading-none">{opt.emoji}</span>
                  <div className="min-w-0">
                    <p className={cn('text-sm font-medium', active ? 'text-teal-700 dark:text-teal-300' : 'text-slate-700 dark:text-slate-300')}>
                      {opt.label}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">{opt.desc}</p>
                  </div>
                  {active && <CheckCircle2 className="w-4 h-4 text-teal-500 ml-auto flex-shrink-0" />}
                </button>
              );
            })}
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm text-slate-600 dark:text-slate-400">Additional notes / allergies</Label>
            <Textarea
              placeholder="e.g. severe peanut allergy, prefer organic produce…"
              value={form.dietary_notes}
              onChange={e => setForm(p => ({ ...p, dietary_notes: e.target.value }))}
              className="resize-none h-20 text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Timezone ── */}
      <Card className="border-0 shadow-sm bg-white dark:bg-slate-900">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center">
              <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            Timezone
          </CardTitle>
          <CardDescription>
            Used for event scheduling, prayer time calculation, and all time-based features.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            <Label className="text-sm">Your timezone</Label>
            <Select value={form.timezone} onValueChange={v => setForm(p => ({ ...p, timezone: v }))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {TIMEZONES.map(tz => (
                  <SelectItem key={tz} value={tz}>{tz.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
              <Info className="w-3 h-3" />
              Detected: <span className="font-medium">{Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── Prayer Times — Islamic mode only ── */}
      {form.islamic_mode && <Card className="border-0 shadow-sm bg-white dark:bg-slate-900">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
              <Moon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            Prayer Time Preferences
          </CardTitle>
          <CardDescription>
            Override auto-detected times or add per-prayer offsets if your local mosque differs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Use manual prayer times</p>
              <p className="text-xs text-slate-400">Enter your own fixed times instead of auto-calculated ones</p>
            </div>
            <Switch
              checked={form.use_manual_prayer_times}
              onCheckedChange={v => setForm(p => ({ ...p, use_manual_prayer_times: v }))}
              className="data-[state=checked]:bg-emerald-600"
            />
          </div>

          {form.use_manual_prayer_times ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {PRAYERS.map(prayer => (
                <div key={prayer} className="space-y-1">
                  <Label className="text-xs capitalize text-slate-500">{prayer}</Label>
                  <Input
                    type="time"
                    value={form.prayer_time_overrides[prayer] || ''}
                    onChange={e => setForm(p => ({
                      ...p,
                      prayer_time_overrides: { ...p.prayer_time_overrides, [prayer]: e.target.value }
                    }))}
                    className="h-9 text-sm"
                  />
                </div>
              ))}
            </div>
          ) : (
            <>
              <button
                onClick={() => setShowPrayerAdvanced(p => !p)}
                className="flex items-center gap-1.5 text-sm text-teal-600 dark:text-teal-400 font-medium"
              >
                {showPrayerAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                Fine-tune offsets (minutes ± auto-detected)
              </button>

              {showPrayerAdvanced && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="grid grid-cols-2 sm:grid-cols-3 gap-3"
                >
                  {PRAYERS.map(prayer => (
                    <div key={prayer} className="space-y-1">
                      <Label className="text-xs capitalize text-slate-500">{prayer} offset (min)</Label>
                      <Input
                        type="number"
                        min="-60"
                        max="60"
                        value={form.prayer_time_offsets[prayer] ?? 0}
                        onChange={e => setForm(p => ({
                          ...p,
                          prayer_time_offsets: { ...p.prayer_time_offsets, [prayer]: Number(e.target.value) }
                        }))}
                        className="h-9 text-sm"
                      />
                    </div>
                  ))}
                  <p className="col-span-full text-xs text-slate-400 flex items-center gap-1">
                    <Info className="w-3 h-3 flex-shrink-0" />
                    Positive = later, negative = earlier than auto-calculated time.
                  </p>
                </motion.div>
              )}
            </>
          )}
        </CardContent>
      </Card>}

      {/* ── Public Holidays ── */}
      <PublicHolidaysSettings
        value={form}
        onChange={(updated) => setForm(updated)}
      />

      {/* ── Save ── */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="bg-teal-600 hover:bg-teal-700 text-white min-w-[140px]"
        >
          {saveMutation.isPending ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</>
          ) : (
            <><Save className="w-4 h-4 mr-2" /> Save Preferences</>
          )}
        </Button>
      </div>
    </div>
  );
}