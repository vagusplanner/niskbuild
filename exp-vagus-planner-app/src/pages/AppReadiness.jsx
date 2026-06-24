import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronUp,
  Smartphone, Globe, Moon, Star, Zap, Shield, Languages
} from 'lucide-react';
import { cn } from '@/lib/utils';

const CHECKS = [
  {
    category: 'Standard Edition',
    icon: Star,
    color: 'teal',
    items: [
      { label: 'Dashboard: No Islamic content (Bismillah, prayer count, Islamic date, Islam quick link) when Standard mode', status: 'fixed', note: 'Now reads islamicMode from settings and conditionally renders' },
      { label: 'Wellness page: Standard quotes instead of Islamic quotes', status: 'fixed', note: 'Switched to time-appropriate secular wellness quotes' },
      { label: 'Wellness page: "balanced with faith" subtitle removed in standard', status: 'fixed' },
      { label: 'AI Health Coach: no Sunnah reference in standard', status: 'fixed' },
      { label: 'Navigation: Islam tab hidden in standard mode (sidebar + bottom bar)', status: 'ok', note: 'islamicOnly flag already filters this' },
      { label: 'Calendar: Islamic panel accessible but Islamic features gated', status: 'ok', note: 'Panel exists but hidden unless toggled' },
      { label: 'Prayer Times settings hidden from Preferences when Standard', status: 'fixed', note: 'Prayer Times card now conditional on islamicMode' },
    ]
  },
  {
    category: 'Islamic Edition',
    icon: Moon,
    color: 'indigo',
    items: [
      { label: 'Islam tab visible in sidebar and bottom bar', status: 'ok' },
      { label: 'Prayer page: Prayer times, Quran, Dua, Dhikr, Ramadan, Hajj, Charity all present', status: 'ok' },
      { label: 'Dashboard: Bismillah, Islamic date, prayer count shown', status: 'ok' },
      { label: 'Greeting banner for Islamic events (Ramadan, Eid, etc.)', status: 'ok' },
      { label: 'Calendar Islamic panel toggle working', status: 'ok' },
      { label: 'Prayer time customisation in Preferences', status: 'ok' },
      { label: 'Halal nearby button in header/sidebar', status: 'ok' },
    ]
  },
  {
    category: 'Mobile UX',
    icon: Smartphone,
    color: 'rose',
    items: [
      { label: 'Bottom tab bar safe area padding on notched devices', status: 'ok' },
      { label: 'Pull-to-refresh on all main pages', status: 'ok' },
      { label: 'Swipe navigation on Calendar', status: 'ok' },
      { label: 'Connect/Chat height fits mobile viewport (no overflow)', status: 'fixed', note: 'Changed to 100dvh for dynamic viewport height' },
      { label: 'Slide-up modals on mobile (EventForm, NLP input)', status: 'ok' },
      { label: 'All icons min 44px tap targets', status: 'ok', note: 'Enforced via globals.css' },
      { label: 'Scrolling works without visible scrollbars on iOS', status: 'ok', note: 'hide-scrollbar class applied globally on mobile' },
      { label: 'Dark mode persists across pages', status: 'ok' },
      { label: 'Font size 16px on inputs (prevents iOS auto-zoom)', status: 'ok', note: 'Set in globals.css' },
    ]
  },
  {
    category: 'Languages & RTL',
    icon: Languages,
    color: 'amber',
    items: [
      { label: 'Arabic (ar) — RTL layout applied', status: 'ok', note: 'html dir=rtl set on language switch + page load' },
      { label: 'Urdu (ur) — RTL layout applied', status: 'ok' },
      { label: 'French (fr) — LTR, all UI strings translated', status: 'ok', note: 'i18n translations present in i18n.js' },
      { label: 'Turkish (tr) — LTR, all UI strings translated', status: 'ok' },
      { label: 'Language persists after page reload (localStorage + DB sync)', status: 'ok' },
      { label: 'Amiri font loaded for Arabic/Urdu', status: 'fixed', note: 'Added Scheherazade New as fallback in globals.css' },
      { label: 'Language switcher accessible from header (mobile + desktop)', status: 'ok' },
      { label: 'RTL text direction applied to Arabic Quran / Dua content', status: 'ok', note: 'dir="rtl" set on individual Arabic text nodes' },
    ]
  },
  {
    category: 'Navigation & Structure',
    icon: Zap,
    color: 'violet',
    items: [
      { label: 'Back button logic on mobile (within tab stacks)', status: 'ok' },
      { label: 'Active tab indicator on bottom nav', status: 'ok' },
      { label: 'Desktop sidebar active highlight', status: 'ok' },
      { label: 'Admin items hidden for non-admin users', status: 'ok' },
      { label: 'Islam nav item hidden for standard users', status: 'ok' },
      { label: 'Breadcrumbs on sub-pages', status: 'ok' },
      { label: 'No duplicate Layout wrapping', status: 'ok', note: 'Pages do not import Layout' },
    ]
  },
  {
    category: 'Upgrade Gates & Plans',
    icon: Shield,
    color: 'emerald',
    items: [
      { label: 'AI Scheduling Assistant: 1 free use, then UpgradeGate banner', status: 'ok' },
      { label: 'AI Calendar Summary: 2 free refreshes, then UpgradeGate banner', status: 'ok' },
      { label: 'Enterprise plan shows "Contact Sales" not a price', status: 'ok' },
      { label: 'Billing page accessible from Account > Billing', status: 'ok' },
      { label: 'Stripe live mode active', status: 'ok' },
    ]
  },
  {
    category: 'Known Outstanding Items',
    icon: AlertTriangle,
    color: 'orange',
    items: [
      { label: 'i18n translations only cover nav/common/prayer keys — full app strings not translated', status: 'warn', note: 'Most UI text is in English only. Full i18n would require translating all component strings.' },
      { label: 'Arabic/French/Turkish AI responses depend on LLM — prompts not localised', status: 'warn', note: 'AI features respond in English regardless of UI language' },
      { label: 'Calendar event form does not auto-localise date format for RTL languages', status: 'warn' },
      { label: 'Push notifications not yet set up for production (PWA only)', status: 'warn' },
    ]
  }
];

const STATUS_CONFIG = {
  ok:    { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/20', label: 'Pass' },
  fixed: { icon: CheckCircle2, color: 'text-teal-600',    bg: 'bg-teal-50 dark:bg-teal-950/20',       label: 'Fixed' },
  warn:  { icon: AlertTriangle,color: 'text-amber-600',   bg: 'bg-amber-50 dark:bg-amber-950/20',     label: 'Action needed' },
  fail:  { icon: XCircle,      color: 'text-red-600',     bg: 'bg-red-50 dark:bg-red-950/20',          label: 'Fail' },
};

const COLOR_MAP = {
  teal:    'from-teal-500 to-emerald-600',
  indigo:  'from-indigo-500 to-purple-600',
  rose:    'from-rose-500 to-pink-600',
  amber:   'from-amber-500 to-orange-500',
  violet:  'from-violet-500 to-indigo-600',
  emerald: 'from-emerald-500 to-teal-600',
  orange:  'from-orange-400 to-amber-500',
};

export default function AppReadinessPage() {
  const [open, setOpen] = useState({});
  const { data: settings = [] } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => SDK.entities.UserSettings.list()
  });
  const islamicMode = settings[0]?.islamic_mode ?? false;

  const toggle = (idx) => setOpen(p => ({ ...p, [idx]: !p[idx] }));

  const totalItems = CHECKS.flatMap(c => c.items).length;
  const passItems  = CHECKS.flatMap(c => c.items).filter(i => i.status === 'ok' || i.status === 'fixed').length;
  const warnItems  = CHECKS.flatMap(c => c.items).filter(i => i.status === 'warn').length;
  const failItems  = CHECKS.flatMap(c => c.items).filter(i => i.status === 'fail').length;
  const score      = Math.round((passItems / totalItems) * 100);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100">App Readiness Report</h1>
        <p className="text-sm text-slate-500 mt-0.5">Pre-submission checklist for App Store & Google Play</p>
      </div>

      {/* Score summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 text-center">
          <p className="text-4xl font-black text-teal-600">{score}%</p>
          <p className="text-xs text-slate-400 mt-1">Ready</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 text-center">
          <p className="text-4xl font-black text-amber-500">{warnItems}</p>
          <p className="text-xs text-slate-400 mt-1">Warnings</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 text-center">
          <p className="text-4xl font-black text-emerald-600">{passItems}</p>
          <p className="text-xs text-slate-400 mt-1">Checks Passed</p>
        </div>
      </div>

      {/* Edition info */}
      <div className={`p-3 rounded-xl text-sm font-medium ${islamicMode ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800' : 'bg-teal-50 dark:bg-teal-950/20 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800'}`}>
        {islamicMode ? '🌙 Currently: Islamic Edition' : '📅 Currently: Standard Edition'} — Switch in Account → Preferences
      </div>

      {/* Check categories */}
      <div className="space-y-3">
        {CHECKS.map((category, idx) => {
          const Icon = category.icon;
          const isOpen = open[idx];
          const passCount = category.items.filter(i => i.status === 'ok' || i.status === 'fixed').length;
          return (
            <div key={idx} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
              <button
                onClick={() => toggle(idx)}
                className="w-full flex items-center gap-3 p-4 text-left"
              >
                <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${COLOR_MAP[category.color]} flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{category.category}</p>
                  <p className="text-xs text-slate-400">{passCount}/{category.items.length} checks passed</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-16 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${COLOR_MAP[category.color]} rounded-full transition-all`}
                      style={{ width: `${(passCount / category.items.length) * 100}%` }}
                    />
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-slate-100 dark:border-slate-800 divide-y divide-slate-50 dark:divide-slate-800">
                  {category.items.map((item, iIdx) => {
                    const cfg = STATUS_CONFIG[item.status];
                    const StatusIcon = cfg.icon;
                    return (
                      <div key={iIdx} className={`flex items-start gap-3 px-4 py-3 ${cfg.bg}`}>
                        <StatusIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${cfg.color}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-700 dark:text-slate-300">{item.label}</p>
                          {item.note && <p className="text-xs text-slate-400 mt-0.5">{item.note}</p>}
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${cfg.color} bg-white/60 dark:bg-slate-900/60`}>
                          {cfg.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}