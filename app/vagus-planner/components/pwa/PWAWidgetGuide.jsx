import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Smartphone, Monitor, Bell, Clock, Share, Plus, Star,
  CheckCircle2, ChevronDown, ChevronUp, Info, Zap, Lock, LayoutGrid
} from 'lucide-react';

const PLATFORM = (() => {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
})();

const isStandalone = window.matchMedia('(display-mode: standalone)').matches
  || window.navigator.standalone;

const FEATURES = [
  {
    icon: LayoutGrid,
    title: 'Home Screen Widget',
    desc: 'Show today\'s prayer times and next event directly on your home screen without opening the app.',
    platforms: ['ios', 'android'],
    color: 'text-teal-600',
    bg: 'bg-teal-50 dark:bg-teal-950/40',
    steps: {
      ios: [
        'Install Vagus Planner as a PWA first (tap Share → Add to Home Screen)',
        'Long-press on your home screen → tap the "+" (Edit) button',
        'Search for "Vagus" in the widget gallery',
        'Choose your widget size and tap "Add Widget"',
      ],
      android: [
        'Install Vagus Planner as a PWA (tap the browser menu → "Add to Home Screen")',
        'Long-press on your home screen → tap "Widgets"',
        'Find "Vagus Planner" in the widget list',
        'Drag and drop the widget to your desired position',
      ],
    },
    note: 'Native widgets require the app to be installed as a PWA. Once installed, widgets update automatically.',
  },
  {
    icon: Lock,
    title: 'Lock Screen Info',
    desc: 'See next prayer time, upcoming event, or daily reminder on your phone\'s lock screen.',
    platforms: ['ios', 'android'],
    color: 'text-violet-600',
    bg: 'bg-violet-50 dark:bg-violet-950/40',
    steps: {
      ios: [
        'Install the app as PWA (Safari → Share → Add to Home Screen)',
        'Go to iOS Settings → Focus / Notifications → Vagus Planner',
        'Enable "Allow Notifications" so lock screen alerts appear',
        'On iOS 16+: long-press the lock screen → Customise → Add widget → Vagus Planner',
      ],
      android: [
        'Install the app as PWA or enable notifications in browser settings',
        'Go to Android Settings → Notifications → Vagus Planner',
        'Enable "On lock screen" and choose "Show content"',
        'Prayer reminders and event alerts will show on your lock screen',
      ],
    },
    note: 'Prayer time notifications are already set up in the app — just enable lock screen display in system settings.',
  },
  {
    icon: Bell,
    title: 'Push Notifications',
    desc: 'Receive prayer reminders, event alerts and daily Hadith directly as system notifications.',
    platforms: ['ios', 'android', 'desktop'],
    color: 'text-amber-600',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    steps: {
      ios: [
        'Install as PWA first (required for iOS push notifications)',
        'Open the app → Settings → Notifications → tap "Enable Notifications"',
        'Allow when iOS prompts for permission',
        'Customise prayer reminders in Islamic Hub → Prayer → Reminder Settings',
      ],
      android: [
        'Tap the notification bell icon in the top bar',
        'Click "Enable Push Notifications" and allow when prompted',
        'Or go to Settings → Notifications to customise categories',
        'Prayer, event, and Hadith notifications are all independently controllable',
      ],
      desktop: [
        'Click the notification bell in the top navigation bar',
        'Click "Enable Push Notifications" in the panel',
        'Allow notifications when the browser prompts',
        'Customise which events and prayers trigger alerts',
      ],
    },
    note: null,
  },
  {
    icon: Star,
    title: 'Add to Home Screen (PWA)',
    desc: 'Install Vagus Planner as a full-screen app on your device — no app store needed.',
    platforms: ['ios', 'android'],
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    steps: {
      ios: [
        'Open Vagus Planner in Safari (not Chrome)',
        'Tap the Share button (square with arrow) at the bottom',
        'Scroll down and tap "Add to Home Screen"',
        'Give it a name and tap "Add" — done!',
      ],
      android: [
        'Open Vagus Planner in Chrome',
        'Tap the three-dot menu (⋮) in the top right',
        'Tap "Add to Home screen" or "Install app"',
        'Confirm — the app icon will appear on your home screen',
      ],
    },
    note: 'Installing as a PWA enables full-screen experience, faster loading, and offline access to recent data.',
  },
];

function FeatureCard({ feature }) {
  const [open, setOpen] = useState(false);
  const Icon = feature.icon;
  const steps = feature.steps?.[PLATFORM] || feature.steps?.android || [];

  const showForPlatform = feature.platforms.includes(PLATFORM) || feature.platforms.includes('desktop');

  if (!showForPlatform) return null;

  return (
    <Card className="overflow-hidden border-slate-200 dark:border-slate-800">
      <CardContent className="p-0">
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        >
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-xl ${feature.bg} flex-shrink-0`}>
              <Icon className={`w-5 h-5 ${feature.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">{feature.title}</p>
                <div className="flex gap-1">
                  {feature.platforms.map(p => (
                    <Badge key={p} variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                      {p === 'ios' ? '🍎 iOS' : p === 'android' ? '🤖 Android' : '🖥 Desktop'}
                    </Badge>
                  ))}
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{feature.desc}</p>
            </div>
            {open ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" />}
          </div>
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {PLATFORM === 'ios' ? '🍎 iOS Steps' : PLATFORM === 'android' ? '🤖 Android Steps' : '🖥 Desktop Steps'}
                </p>
                <ol className="space-y-2">
                  {steps.map((step, i) => (
                    <li key={i} className="flex gap-3 text-sm text-slate-700 dark:text-slate-300">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 text-xs font-bold flex items-center justify-center mt-0.5">
                        {i + 1}
                      </span>
                      <span className="leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
                {feature.note && (
                  <div className="flex gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs text-slate-500 dark:text-slate-400">
                    <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{feature.note}</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

export default function PWAWidgetGuide() {
  const [notifStatus, setNotifStatus] = useState('default');

  useEffect(() => {
    if ('Notification' in window) setNotifStatus(Notification.permission);
  }, []);

  const requestNotifications = async () => {
    if (!('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    setNotifStatus(permission);
    if (permission === 'granted') {
      new Notification('Vagus Planner', {
        body: 'Notifications enabled! You\'ll receive prayer times and event reminders.',
        icon: '/icon-192.png',
      });
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-600 via-emerald-600 to-teal-700 p-5 shadow-lg text-white">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Smartphone className="w-5 h-5 text-teal-200" />
            <span className="text-xs font-bold text-teal-200 uppercase tracking-widest">Mobile Experience</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">Widgets & Home Screen</h2>
          <p className="text-sm text-teal-100 mt-1">Access Vagus Planner info without opening the app</p>
        </div>
      </div>

      {/* Quick status */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
          <div className={`text-2xl mb-1`}>{isStandalone ? '✅' : '📱'}</div>
          <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{isStandalone ? 'Installed as App' : 'Running in Browser'}</p>
          <p className="text-[10px] text-slate-400">{isStandalone ? 'Full PWA experience' : 'Install for best experience'}</p>
        </div>
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
          <div className="text-2xl mb-1">{notifStatus === 'granted' ? '🔔' : '🔕'}</div>
          <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
            {notifStatus === 'granted' ? 'Notifications On' : notifStatus === 'denied' ? 'Blocked' : 'Not Enabled'}
          </p>
          <p className="text-[10px] text-slate-400">{notifStatus === 'granted' ? 'Receiving alerts' : 'Enable for reminders'}</p>
        </div>
      </div>

      {/* Enable notifications CTA */}
      {notifStatus !== 'granted' && notifStatus !== 'denied' && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-amber-900 dark:text-amber-100">Enable Push Notifications</p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">Get prayer reminders & event alerts</p>
          </div>
          <Button onClick={requestNotifications} className="bg-amber-600 hover:bg-amber-700 text-white flex-shrink-0 h-9">
            <Bell className="w-4 h-4 mr-2" />
            Enable
          </Button>
        </div>
      )}

      {notifStatus === 'denied' && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800">
          <p className="text-sm font-bold text-red-800 dark:text-red-200">Notifications Blocked</p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
            Go to your browser/system settings → find Vagus Planner → allow notifications.
          </p>
        </div>
      )}

      {/* Feature cards */}
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">What you can set up</p>
        <div className="space-y-2">
          {FEATURES.map(f => <FeatureCard key={f.title} feature={f} />)}
        </div>
      </div>

      {/* Platform note */}
      <p className="text-xs text-slate-400 text-center">
        Detected: {PLATFORM === 'ios' ? '🍎 iOS' : PLATFORM === 'android' ? '🤖 Android' : '🖥 Desktop'} · 
        Steps shown are tailored for your device
      </p>
    </div>
  );
}