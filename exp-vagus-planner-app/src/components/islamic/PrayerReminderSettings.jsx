import React, { useState, useEffect, useRef } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, Volume2, VolumeX, Settings2, AlarmClock, Clock, Play, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  PRAYER_DISPLAY, fetchPrayerTimes, getNextPrayer,
  minutesUntil, formatCountdown, schedulePrayerReminders
} from './prayerEngine';

// Audio sources for each sound option
const SOUNDS = [
  { value: 'adhan_makkah',  label: 'Adhan – Makkah',   url: 'https://www.islamcan.com/audio/adhan/azan1.mp3' },
  { value: 'adhan_madinah', label: 'Adhan – Madinah',  url: 'https://www.islamcan.com/audio/adhan/azan4.mp3' },
  { value: 'adhan_fajr',    label: 'Adhan – Fajr (Makkah)', url: 'https://www.islamcan.com/audio/adhan/fajrazan.mp3' },
  { value: 'chime',         label: 'Soft Chime',        url: 'https://assets.mixkit.co/sfx/preview/mixkit-bell-notification-933.mp3' },
  { value: 'ding',          label: 'Simple Ding',       url: 'https://assets.mixkit.co/sfx/preview/mixkit-message-pop-alert-2354.mp3' },
  { value: 'none',          label: 'Silent (no sound)', url: null },
];

const REMINDER_TIMES = [
  { value: '0',  label: 'At prayer time' },
  { value: '5',  label: '5 minutes before' },
  { value: '10', label: '10 minutes before' },
  { value: '15', label: '15 minutes before' },
  { value: '20', label: '20 minutes before' },
  { value: '30', label: '30 minutes before' },
  { value: '45', label: '45 minutes before' },
  { value: '60', label: '1 hour before' },
];

const SNOOZE_OPTIONS = [
  { value: '5',  label: '5 min' },
  { value: '10', label: '10 min' },
  { value: '15', label: '15 min' },
  { value: '30', label: '30 min' },
];

const CONFIG_STORAGE_KEY = 'vagus_prayer_reminder_config_v2';

function loadConfig() {
  try { return JSON.parse(localStorage.getItem(CONFIG_STORAGE_KEY) || '{}'); } catch { return {}; }
}

function saveConfig(cfg) {
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(cfg));
}

function defaultPrayerConfig() {
  return { enabled: true, minutesBefore: '10', sound: 'adhan_makkah', snooze: '5' };
}

export default function PrayerReminderSettings() {
  const [config, setConfig] = useState(loadConfig);
  const [editPrayer, setEditPrayer] = useState(null);
  const [notifPerm, setNotifPerm] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [prayerTimes, setPrayerTimes] = useState(null);
  const [snoozeActive, setSnoozeActive] = useState({}); // { prayerKey: snoozeUntilMs }
  const [previewLoading, setPreviewLoading] = useState(null);
  const audioRef = useRef(null);

  const { data: settingsList = [] } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => SDK.entities.UserSettings.list()
  });
  const s = settingsList[0] || {};

  // Fetch today's times
  useEffect(() => {
    const lat = s.latitude || 51.5074;
    const lng = s.longitude || -0.1278;
    const method = s.prayer_method || 'MWL';
    const asrMethod = s.asr_method || '0';
    const offsets = s.prayer_time_offsets || {};
    fetchPrayerTimes(new Date(), lat, lng, method, asrMethod, offsets)
      .then(setPrayerTimes);
  }, [s.latitude, s.longitude, s.prayer_method, s.asr_method, s.prayer_time_offsets]);

  // Schedule browser notifications whenever config or times change
  useEffect(() => {
    if (!prayerTimes) return;
    schedulePrayerReminders(prayerTimes, config);
  }, [prayerTimes, config]);

  const getConfig = (prayer) => ({ ...defaultPrayerConfig(), ...(config[prayer] || {}) });

  const updateConfig = (prayer, updates) => {
    const next = { ...config, [prayer]: { ...getConfig(prayer), ...updates } };
    setConfig(next);
    saveConfig(next);
  };

  const requestPermission = async () => {
    if (typeof Notification === 'undefined') {
      toast.error('Notifications not supported in this browser');
      return;
    }
    const p = await Notification.requestPermission();
    setNotifPerm(p);
    if (p === 'granted') toast.success('Reminders enabled!');
    else toast.error('Please allow notifications in your browser settings');
  };

  const previewSound = async (prayerKey) => {
    const cfg = getConfig(prayerKey);
    const soundObj = SOUNDS.find(s => s.value === cfg.sound);
    if (!soundObj?.url) { toast.info('Silent – no sound to preview'); return; }
    setPreviewLoading(prayerKey);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    const audio = new Audio(soundObj.url);
    audioRef.current = audio;
    audio.volume = 0.7;
    audio.play().catch(() => toast.error('Could not play audio'));
    audio.onended = () => setPreviewLoading(null);
    setTimeout(() => { audio.pause(); setPreviewLoading(null); }, 8000);
  };

  const handleSnooze = (prayer, minutes) => {
    const until = Date.now() + parseInt(minutes) * 60000;
    setSnoozeActive(prev => ({ ...prev, [prayer]: until }));
    toast.success(`${prayer} snoozed for ${minutes} minutes`);
    updateConfig(prayer, { snoozeUntil: until });
  };

  const nextPrayer = prayerTimes ? getNextPrayer(prayerTimes) : null;

  const editCfg = editPrayer ? getConfig(editPrayer) : null;
  const editPrayerObj = PRAYER_DISPLAY.find(p => p.key === editPrayer);

  return (
    <div className="space-y-4">
      {/* Permission banner */}
      {notifPerm !== 'granted' && (
        <Card className="border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20">
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Enable Prayer Reminders</p>
                <p className="text-xs text-amber-700 dark:text-amber-400">Receive browser notifications for each prayer</p>
              </div>
            </div>
            <Button onClick={requestPermission} size="sm" className="bg-amber-600 hover:bg-amber-700 text-white shrink-0">
              Enable
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="border-0 shadow-lg overflow-hidden">
        <CardHeader className="pb-3 bg-gradient-to-r from-teal-600 to-emerald-700 text-white">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base text-white">
              <Bell className="w-5 h-5" />
              Prayer Reminders
            </CardTitle>
            {notifPerm === 'granted' && (
              <Badge className="bg-white/20 text-white text-xs">Notifications Active</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-3 space-y-2">
          {PRAYER_DISPLAY.map((prayer, i) => {
            const cfg = getConfig(prayer.key);
            const time = prayerTimes?.[prayer.key];
            const mins = time ? minutesUntil(time) : null;
            const isNext = prayer.key === nextPrayer;
            const isSnoozed = snoozeActive[prayer.key] && snoozeActive[prayer.key] > Date.now();

            return (
              <motion.div
                key={prayer.key}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`rounded-xl border transition-all overflow-hidden ${
                  isNext
                    ? 'border-teal-300 dark:border-teal-700 bg-teal-50 dark:bg-teal-950/30'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-3 p-3">
                  <span className="text-xl shrink-0">{prayer.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-slate-800 dark:text-slate-100">{prayer.key}</p>
                      {isNext && <Badge className="bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300 text-[10px] px-1.5">Next</Badge>}
                      {isSnoozed && <Badge className="bg-amber-100 text-amber-700 text-[10px] px-1.5">Snoozed</Badge>}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {time || '—'}
                      {mins != null && isNext && ` · ${formatCountdown(mins)} away`}
                      {cfg.enabled && ` · ${cfg.minutesBefore === '0' ? 'at time' : `${cfg.minutesBefore}m alert`}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Switch
                      checked={cfg.enabled}
                      onCheckedChange={v => {
                        updateConfig(prayer.key, { enabled: v });
                        toast.success(`${prayer.key} reminder ${v ? 'on' : 'off'}`);
                      }}
                    />
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-teal-600"
                      onClick={() => setEditPrayer(prayer.key)}>
                      <Settings2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Snooze bar — only show for the next prayer when enabled */}
                {isNext && cfg.enabled && (
                  <div className="flex items-center gap-1.5 px-3 pb-2 pt-0">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-[11px] text-slate-400 mr-1">Snooze:</span>
                    {SNOOZE_OPTIONS.map(opt => (
                      <button key={opt.value}
                        onClick={() => handleSnooze(prayer.key, opt.value)}
                        className="text-[11px] px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-600 hover:bg-teal-50 dark:hover:bg-teal-950/30 hover:border-teal-300 text-slate-500 dark:text-slate-400 transition-colors">
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })}
        </CardContent>
      </Card>

      {/* Per-prayer settings dialog */}
      <Dialog open={!!editPrayer} onOpenChange={() => setEditPrayer(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-xl">{editPrayerObj?.emoji}</span>
              {editPrayer} Reminder Settings
            </DialogTitle>
          </DialogHeader>
          {editCfg && (
            <div className="space-y-4 mt-1">
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <Label>Enable reminder</Label>
                <Switch checked={editCfg.enabled}
                  onCheckedChange={v => updateConfig(editPrayer, { enabled: v })} />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Alert timing</Label>
                <Select value={editCfg.minutesBefore}
                  onValueChange={v => updateConfig(editPrayer, { minutesBefore: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REMINDER_TIMES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Alert sound</Label>
                <div className="flex gap-2">
                  <Select value={editCfg.sound}
                    onValueChange={v => updateConfig(editPrayer, { sound: v })}
                    className="flex-1">
                    <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SOUNDS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" onClick={() => previewSound(editPrayer)}
                    disabled={previewLoading === editPrayer} title="Preview sound">
                    {previewLoading === editPrayer
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Play className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Default snooze duration</Label>
                <Select value={editCfg.snooze}
                  onValueChange={v => updateConfig(editPrayer, { snooze: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SNOOZE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <Button className="w-full bg-teal-600 hover:bg-teal-700"
                onClick={() => { setEditPrayer(null); toast.success(`${editPrayer} settings saved`); }}>
                Done
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}