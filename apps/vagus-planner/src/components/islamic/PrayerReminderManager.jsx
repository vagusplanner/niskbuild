import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Bell, BellOff, Settings2, Sunrise, Sun, Sunset, Moon, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

const PRAYERS = [
  { name: 'Fajr',    emoji: '🌅', icon: Sunrise, color: 'from-indigo-400 to-purple-500',  desc: 'Dawn prayer' },
  { name: 'Dhuhr',   emoji: '☀️', icon: Sun,     color: 'from-amber-400 to-orange-500',   desc: 'Midday prayer' },
  { name: 'Asr',     emoji: '🌤️', icon: Sun,     color: 'from-orange-400 to-red-400',     desc: 'Afternoon prayer' },
  { name: 'Maghrib', emoji: '🌆', icon: Sunset,  color: 'from-rose-400 to-pink-600',      desc: 'Sunset prayer' },
  { name: 'Isha',    emoji: '🌙', icon: Moon,    color: 'from-violet-500 to-indigo-700',  desc: 'Night prayer' },
];

const REMINDER_OPTIONS = [
  { value: '0',  label: 'At prayer time' },
  { value: '5',  label: '5 min before' },
  { value: '10', label: '10 min before' },
  { value: '15', label: '15 min before' },
  { value: '20', label: '20 min before' },
  { value: '30', label: '30 min before' },
];

function fetchPrayerTimesFromAladhan(lat, lng, method = 2) {
  const today = new Date();
  const d = today.getDate();
  const m = today.getMonth() + 1;
  const y = today.getFullYear();
  return fetch(`https://api.aladhan.com/v1/timings/${d}-${m}-${y}?latitude=${lat}&longitude=${lng}&method=${method}`)
    .then(r => r.json())
    .then(j => j.data.timings);
}

export default function PrayerReminderManager() {
  const [prayerTimes, setPrayerTimes] = useState(null);
  const [notifPermission, setNotifPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [editingPrayer, setEditingPrayer] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  // Per-prayer reminder config stored in localStorage
  const [reminderConfig, setReminderConfig] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('prayer_reminders') || '{}');
    } catch { return {}; }
  });

  const { data: userSettings = [] } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => base44.entities.UserSettings.list()
  });
  const settings = userSettings[0];

  const saveConfig = (newConfig) => {
    setReminderConfig(newConfig);
    localStorage.setItem('prayer_reminders', JSON.stringify(newConfig));
  };

  const getConfig = (prayer) => ({
    enabled: true,
    minutesBefore: '10',
    sound: true,
    ...reminderConfig[prayer],
  });

  useEffect(() => {
    const lat = settings?.latitude || 51.5074;
    const lng = settings?.longitude || -0.1278;
    const methodMap = { MWL: 3, ISNA: 2, Egypt: 5, Makkah: 4, Karachi: 1, Tehran: 7, Jafari: 0 };
    const method = methodMap[settings?.prayer_method] || 3;

    fetchPrayerTimesFromAladhan(lat, lng, method)
      .then(timings => {
        setPrayerTimes({
          Fajr: timings.Fajr,
          Dhuhr: timings.Dhuhr,
          Asr: timings.Asr,
          Maghrib: timings.Maghrib,
          Isha: timings.Isha,
        });
      })
      .catch(() => {});
  }, [settings]);

  // Schedule browser notifications for today's prayers
  useEffect(() => {
    if (!prayerTimes || notifPermission !== 'granted') return;

    const timeouts = [];
    const now = new Date();

    PRAYERS.forEach(({ name }) => {
      const cfg = getConfig(name);
      if (!cfg.enabled || !prayerTimes[name]) return;

      const [h, m] = prayerTimes[name].split(':').map(Number);
      const prayerDate = new Date();
      prayerDate.setHours(h, m, 0, 0);
      const reminderDate = new Date(prayerDate.getTime() - parseInt(cfg.minutesBefore) * 60000);

      const msUntil = reminderDate.getTime() - now.getTime();
      if (msUntil > 0 && msUntil < 24 * 60 * 60 * 1000) {
        const t = setTimeout(() => {
          new Notification(`🕌 ${name} Prayer`, {
            body: parseInt(cfg.minutesBefore) === 0
              ? `It's time for ${name} prayer`
              : `${name} prayer in ${cfg.minutesBefore} minutes (${prayerTimes[name]})`,
            icon: '/favicon.ico',
            tag: `prayer-${name}`,
          });
        }, msUntil);
        timeouts.push(t);
      }
    });

    return () => timeouts.forEach(clearTimeout);
  }, [prayerTimes, notifPermission, reminderConfig]);

  const requestPermission = async () => {
    if (typeof Notification === 'undefined') {
      toast.error('Notifications not supported in this browser');
      return;
    }
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
    if (perm === 'granted') {
      toast.success('Prayer reminders enabled!');
    } else {
      toast.error('Please allow notifications to receive prayer reminders');
    }
  };

  const getNextPrayer = () => {
    if (!prayerTimes) return null;
    const now = new Date();
    const cur = now.getHours() * 60 + now.getMinutes();
    for (const p of PRAYERS) {
      if (!prayerTimes[p.name]) continue;
      const [h, m] = prayerTimes[p.name].split(':').map(Number);
      if (h * 60 + m > cur) return p.name;
    }
    return 'Fajr';
  };

  const nextPrayer = getNextPrayer();

  return (
    <div className="space-y-4">
      {/* Notification Permission Banner */}
      {notifPermission !== 'granted' && (
        <Card className="border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-amber-600" />
              <div>
                <p className="font-semibold text-amber-900 dark:text-amber-200 text-sm">Enable Prayer Reminders</p>
                <p className="text-xs text-amber-700 dark:text-amber-400">Get browser notifications for each prayer time</p>
              </div>
            </div>
            <Button onClick={requestPermission} size="sm" className="bg-amber-600 hover:bg-amber-700 text-white shrink-0">
              Enable
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="w-5 h-5 text-teal-600" />
              Prayer Reminders
              {notifPermission === 'granted' && (
                <Badge className="bg-green-100 text-green-700 text-xs">Active</Badge>
              )}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)}>
              <Settings2 className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          {PRAYERS.map((prayer, idx) => {
            const cfg = getConfig(prayer.name);
            const time = prayerTimes?.[prayer.name];
            const isNext = prayer.name === nextPrayer;

            return (
              <motion.div
                key={prayer.name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06 }}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                  isNext
                    ? `bg-gradient-to-r ${prayer.color} text-white border-transparent shadow-md`
                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-lg">{prayer.emoji}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`font-semibold text-sm ${isNext ? 'text-white' : 'text-slate-800 dark:text-slate-100'}`}>
                        {prayer.name}
                      </p>
                      {isNext && <Badge className="bg-white/25 text-white text-[10px] px-1.5 py-0">Next</Badge>}
                    </div>
                    <p className={`text-xs ${isNext ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
                      {time || '—'}
                      {cfg.enabled && cfg.minutesBefore !== '0' && ` · ${cfg.minutesBefore}m alert`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch
                    checked={cfg.enabled}
                    onCheckedChange={(val) => {
                      const next = { ...reminderConfig, [prayer.name]: { ...getConfig(prayer.name), enabled: val } };
                      saveConfig(next);
                      toast.success(`${prayer.name} reminder ${val ? 'enabled' : 'disabled'}`);
                    }}
                    className={isNext ? 'data-[state=checked]:bg-white/40' : ''}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-7 w-7 ${isNext ? 'text-white hover:bg-white/20' : 'text-slate-500'}`}
                    onClick={() => setEditingPrayer(prayer.name)}
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </CardContent>
      </Card>

      {/* Per-prayer settings dialog */}
      <Dialog open={!!editingPrayer} onOpenChange={() => setEditingPrayer(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {PRAYERS.find(p => p.name === editingPrayer)?.emoji} {editingPrayer} Reminder Settings
            </DialogTitle>
          </DialogHeader>
          {editingPrayer && (() => {
            const cfg = getConfig(editingPrayer);
            return (
              <div className="space-y-4 mt-2">
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <Label className="font-medium">Enable reminder</Label>
                  <Switch
                    checked={cfg.enabled}
                    onCheckedChange={(val) => saveConfig({ ...reminderConfig, [editingPrayer]: { ...cfg, enabled: val } })}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Alert timing</Label>
                  <Select
                    value={cfg.minutesBefore}
                    onValueChange={(val) => saveConfig({ ...reminderConfig, [editingPrayer]: { ...cfg, minutesBefore: val } })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REMINDER_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <Label className="font-medium">Sound notification</Label>
                  <Switch
                    checked={cfg.sound}
                    onCheckedChange={(val) => saveConfig({ ...reminderConfig, [editingPrayer]: { ...cfg, sound: val } })}
                  />
                </div>

                <Button
                  className="w-full bg-teal-600 hover:bg-teal-700"
                  onClick={() => {
                    setEditingPrayer(null);
                    toast.success(`${editingPrayer} reminder saved`);
                  }}
                >
                  Save
                </Button>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}