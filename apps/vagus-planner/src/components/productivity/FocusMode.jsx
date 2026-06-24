/**
 * Focus Mode — combines Pomodoro + World Clock + "Do Not Disturb" context.
 * This is the main productivity hub component added to the Calendar/Productivity section.
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Globe, Clock, Zap, BarChart2, Timer, ArrowLeft } from 'lucide-react';
import PomodoroTimer from './PomodoroTimer';
import TimezoneScheduler from './TimezoneScheduler';
import WeeklyEmailDigest from './WeeklyEmailDigest';
import ZapierWebhookPanel from '@/components/integrations/ZapierWebhookPanel';
import NotionImport from '@/components/integrations/NotionImport';
import TwoFactorAuth from '@/components/settings/TwoFactorAuth';

const TOOLS = [
  { id: 'pomodoro',  icon: Timer,    label: 'Pomodoro',       sub: 'Focus timer',           gradient: 'from-rose-500 to-orange-500',   Component: PomodoroTimer },
  { id: 'worldclock',icon: Globe,    label: 'World Clock',    sub: 'Time zones',            gradient: 'from-indigo-500 to-blue-600',   Component: TimezoneScheduler },
  { id: 'digest',    icon: BarChart2,label: 'Weekly Digest',  sub: 'Email summary',         gradient: 'from-blue-500 to-cyan-500',     Component: WeeklyEmailDigest },
  { id: 'zapier',    icon: Zap,      label: 'Zapier',         sub: 'Webhook automation',    gradient: 'from-orange-500 to-amber-500',  Component: ZapierWebhookPanel },
  { id: 'import',    icon: Brain,    label: 'Import Data',    sub: 'Notion / CSV',          gradient: 'from-slate-600 to-slate-800',   Component: NotionImport },
  { id: 'security',  icon: Clock,    label: 'Security',       sub: '2FA & account safety',  gradient: 'from-emerald-500 to-teal-600',  Component: TwoFactorAuth },
];

export default function FocusMode() {
  const [active, setActive] = useState(null);
  const tool = TOOLS.find(t => t.id === active);

  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">
        {active ? (
          <motion.div key="tool" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <button onClick={() => setActive(null)}
              className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to Productivity Tools
            </button>
            <div className={`flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r ${tool.gradient} shadow-md`}>
              <div className="p-2.5 bg-white/20 rounded-xl">
                <tool.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">{tool.label}</h2>
                <p className="text-xs text-white/70">{tool.sub}</p>
              </div>
            </div>
            <tool.Component />
          </motion.div>
        ) : (
          <motion.div key="grid" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {TOOLS.map(t => {
                const Icon = t.icon;
                return (
                  <motion.button key={t.id} whileHover={{ y: -3, scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={() => setActive(t.id)}
                    className={`group relative overflow-hidden rounded-2xl p-4 text-left bg-gradient-to-br ${t.gradient} shadow-md hover:shadow-xl transition-all`}>
                    <div className="relative z-10 flex flex-col gap-3">
                      <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl w-fit">
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{t.label}</p>
                        <p className="text-xs text-white/70 mt-0.5">{t.sub}</p>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}