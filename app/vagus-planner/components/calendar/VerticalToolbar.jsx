import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Calendar as CalendarIcon, Plus, Sparkles, Users, Cloud, Eye, EyeOff,
  Menu, CalendarDays, List, LayoutGrid, CheckSquare, Target, Plane,
  Activity, MessagesSquare, Palette, X, Settings, StickyNote,
  PanelLeftClose, PanelLeftOpen, Moon, Brain, Heart, MessageCircle,
  Zap, ChevronDown, ChevronUp, Clock, TrendingUp, Lightbulb, Star
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import WeatherWidget from './WeatherWidget';
import { Badge } from '@/components/ui/badge';
import ColorPicker from './ColorPicker';
import QuickNotes from './QuickNotes';
import CalendarGoals from './CalendarGoals';
import { useTranslation } from 'react-i18next';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

// ── Prayer countdown strip ────────────────────────────────────────────────────
function PrayerStrip({ settings }) {
  const city = settings?.location_city;
  const [next, setNext] = React.useState(null);
  const [countdown, setCountdown] = React.useState('');

  React.useEffect(() => {
    if (!city) return;
    base44.integrations.Core.InvokeLLM({
      prompt: `Next upcoming prayer from current time ${new Date().toLocaleTimeString()} in ${city} today ${new Date().toDateString()}. Return name and time_24h (HH:MM).`,
      add_context_from_internet: true,
      response_json_schema: { type: 'object', properties: { name: { type: 'string' }, time_24h: { type: 'string' } } }
    }).then(r => {
      if (r?.time_24h) {
        const [h, m] = r.time_24h.split(':').map(Number);
        const t = new Date(); t.setHours(h, m, 0, 0);
        if (t < new Date()) t.setDate(t.getDate() + 1);
        setNext({ ...r, target: t });
      }
    }).catch(() => {});
  }, [city]);

  React.useEffect(() => {
    if (!next?.target) return;
    const tick = setInterval(() => {
      const diff = next.target - new Date();
      if (diff <= 0) { setCountdown('Now!'); return; }
      const hh = Math.floor(diff / 3600000);
      const mm = Math.floor((diff % 3600000) / 60000);
      const ss = Math.floor((diff % 60000) / 1000);
      setCountdown(hh > 0 ? `${hh}h ${mm}m` : `${mm}m ${ss}s`);
    }, 1000);
    return () => clearInterval(tick);
  }, [next]);

  if (!city || !next) return null;
  return (
    <div className="mx-2 mb-2 flex items-center justify-between px-3 py-2 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200/70 dark:border-amber-700/40 rounded-xl">
      <div className="flex items-center gap-1.5">
        <Moon className="w-3.5 h-3.5 text-amber-500" />
        <span className="text-xs font-bold text-amber-700 dark:text-amber-300">{next.name}</span>
      </div>
      <span className="text-xs font-mono font-black text-amber-600 dark:text-amber-400 tabular-nums">{countdown || next.time_24h}</span>
    </div>
  );
}

// ── AI smart suggestion ───────────────────────────────────────────────────────
function AISmartTip({ events = [] }) {
  const [tip, setTip] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const titles = events.slice(0, 5).map(e => e.title).join(', ') || 'none';
      const r = await base44.integrations.Core.InvokeLLM({
        prompt: `User's upcoming events: ${titles}. Today: ${new Date().toDateString()}. Give ONE specific proactive scheduling tip (max 12 words) + emoji.`,
        response_json_schema: { type: 'object', properties: { tip: { type: 'string' }, emoji: { type: 'string' } } }
      });
      setTip(r);
    } catch (_) {}
    setLoading(false);
  };

  if (tip) return (
    <div className="mx-2 mb-2 flex items-start gap-2 px-3 py-2 bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 border border-teal-200/60 dark:border-teal-700/40 rounded-xl">
      <span className="text-sm flex-shrink-0">{tip.emoji}</span>
      <p className="text-[10px] text-teal-700 dark:text-teal-300 font-medium leading-tight flex-1">{tip.tip}</p>
      <button onClick={() => setTip(null)} className="text-teal-300 hover:text-teal-500 flex-shrink-0"><X className="w-3 h-3" /></button>
    </div>
  );

  return (
    <button onClick={fetch} disabled={loading}
      className="mx-2 mb-2 flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-[#1a4a6e]/8 to-[#3ecfa0]/8 dark:from-teal-900/20 dark:to-emerald-900/20 border border-teal-200/40 dark:border-teal-700/30 rounded-xl hover:from-[#1a4a6e]/15 hover:to-[#3ecfa0]/15 transition-all group w-[calc(100%-1rem)]">
      {loading
        ? <div className="w-3.5 h-3.5 border-2 border-teal-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
        : <Lightbulb className="w-3.5 h-3.5 text-[#E8B84B] flex-shrink-0" />}
      <span className="text-[10px] font-semibold text-teal-700 dark:text-teal-400 group-hover:text-teal-800 dark:group-hover:text-teal-300">
        {loading ? 'Thinking…' : 'AI Smart Tip'}
      </span>
      <Sparkles className="w-3 h-3 text-[#E8B84B]/70 ml-auto flex-shrink-0" />
    </button>
  );
}

// ── Section header ─────────────────────────────────────────────────────────────
function SectionLabel({ label, compact }) {
  if (compact) return <div className="h-px bg-[#1a7ab8]/15 dark:bg-teal-800/30 mx-2 my-1.5" />;
  return (
    <div className="flex items-center gap-2 px-3 py-1 mt-1">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#1a7ab8]/25 to-transparent" />
      <span className="text-[9px] font-black text-[#1a7ab8]/50 dark:text-teal-500/60 uppercase tracking-[0.18em]">{label}</span>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#1a7ab8]/25 to-transparent" />
    </div>
  );
}

// ── Single toolbar row button ─────────────────────────────────────────────────
function ToolBtn({ icon: Icon, label, iconBg, iconColor, compact, onClick, active, badge }) {
  return (
    <button onClick={onClick} title={label}
      className={cn(
        "flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left w-full group transition-all duration-150",
        active
          ? "bg-[#1a7ab8]/12 dark:bg-teal-900/40 ring-1 ring-[#1a7ab8]/25 dark:ring-teal-700/50"
          : "hover:bg-[#1a7ab8]/8 dark:hover:bg-teal-900/25"
      )}>
      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all", iconBg, active && "shadow-sm")}>
        <Icon className={cn("w-3.5 h-3.5", iconColor)} />
      </div>
      {!compact && (
        <span className={cn("text-xs font-semibold truncate flex-1", active ? "text-[#1a4a6e] dark:text-teal-200" : "text-slate-600 dark:text-teal-300 group-hover:text-[#1a4a6e] dark:group-hover:text-teal-200")}>
          {label}
        </span>
      )}
      {!compact && badge && (
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#E8B84B]/20 text-[#C9A227] flex-shrink-0">{badge}</span>
      )}
    </button>
  );
}

export default function VerticalToolbar({
  eventColorMode, onEventColorChange,
  selectedDate, onNewEvent, onNaturalLanguage, onScheduleMeeting,
  onToggleFasting, showFasting, onViewChange, currentView, onDateSelect,
  settings, events = [],
  onPlanTravel, onWellness, onDiscussions, onOpenSettings,
  onToggleTasks, onToggleHabits, onToggleIslamic, showIslamicPanel,
  isIslamicEdition, onClose
}) {
  const { t } = useTranslation();
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showGoals, setShowGoals] = useState(false);
  const [showWeather, setShowWeather] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('toolbar_collapsed') === 'true');
  const [isMobileView, setIsMobileView] = useState(typeof window !== 'undefined' && window.innerWidth < 1024);

  useEffect(() => {
    const check = () => setIsMobileView(window.innerWidth < 1024);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('toolbar_collapsed', String(next));
  };

  const isCompact = !isMobileView && collapsed;

  const views = [
    { value: 'month',         icon: LayoutGrid,   label: t('calendar.views.month') },
    { value: 'week',          icon: CalendarDays, label: t('calendar.views.week') },
    { value: 'work-week',     icon: CalendarDays, label: t('toolbar.workWeek') },
    { value: 'day',           icon: List,         label: t('calendar.views.day') },
    { value: 'agenda',        icon: List,         label: t('calendar.views.agenda') },
    { value: 'timeline',      icon: CalendarDays, label: t('calendar.views.timeline') },
    { value: 'year',          icon: LayoutGrid,   label: t('toolbar.year') },
    { value: 'task-timeline', icon: CheckSquare,  label: 'Task Timeline' },
  ];

  const desktopWidth = isCompact ? 'w-14' : 'w-[13.5rem]';

  return (
    <div className={cn(
      "flex flex-col flex-shrink-0 overflow-y-auto overflow-x-hidden transition-all duration-200",
      "bg-gradient-to-b from-white via-slate-50/80 to-white dark:from-[#0d1f1c] dark:via-[#0b1a18] dark:to-[#0d1f1c]",
      "border-r border-[#1a7ab8]/15 dark:border-teal-800/30",
      isMobileView ? "w-full px-2 py-3" : cn(desktopWidth, "py-3")
    )}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className={cn("flex items-center mb-3", isMobileView ? "justify-between px-2" : (isCompact ? "justify-center px-1" : "justify-between px-3"))}>
        {!isCompact && (
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-[#1a7ab8] to-[#3ecfa0] flex items-center justify-center">
              <CalendarIcon className="w-3 h-3 text-white" />
            </div>
            <span className="text-xs font-black text-[#1a4a6e] dark:text-teal-200 tracking-tight">
              {isMobileView ? 'Calendar Tools' : 'Calendar Tools'}
            </span>
          </div>
        )}
        {!isMobileView && (
          <button onClick={toggleCollapsed} title={collapsed ? 'Expand' : 'Collapse'}
            className="w-6 h-6 rounded-lg hover:bg-[#1a7ab8]/10 dark:hover:bg-teal-900/30 flex items-center justify-center text-[#1a7ab8]/50 dark:text-teal-500 hover:text-[#1a7ab8] transition-colors">
            {collapsed ? <PanelLeftOpen className="w-3.5 h-3.5" /> : <PanelLeftClose className="w-3.5 h-3.5" />}
          </button>
        )}
        {isMobileView && onClose && (
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#1a7ab8]/10 dark:bg-teal-900/30 flex items-center justify-center">
            <X className="w-4 h-4 text-[#1a4a6e] dark:text-teal-300" />
          </button>
        )}
      </div>

      {/* ── Gold accent bar ───────────────────────────────────── */}
      <div className="mx-3 mb-3 h-0.5 rounded-full bg-gradient-to-r from-transparent via-[#E8B84B]/60 to-transparent" />

      {/* ── Prayer countdown (Islamic only) ──────────────────── */}
      {isIslamicEdition && <PrayerStrip settings={settings} />}

      {/* ── AI Smart Tip ─────────────────────────────────────── */}
      {!isCompact && <AISmartTip events={events} />}

      {/* ── Date Jump ────────────────────────────────────────── */}
      <Popover>
        <PopoverTrigger asChild>
          <button title="Jump to Date"
            className={cn(
              "flex items-center rounded-xl mx-2 mb-1 transition-all hover:bg-[#1a7ab8]/8 dark:hover:bg-teal-900/25 group",
              isCompact ? "justify-center p-2" : "gap-2.5 px-2.5 py-2"
            )}>
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#1a4a6e] to-[#1a7ab8] flex items-center justify-center flex-shrink-0 shadow-sm">
              <CalendarIcon className="w-3.5 h-3.5 text-white" />
            </div>
            {!isCompact && (
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[10px] font-bold text-[#1a4a6e] dark:text-teal-300 leading-tight">Jump to Date</p>
                <p className="text-[9px] text-slate-400 font-medium">{format(selectedDate, 'EEE, MMM d')}</p>
              </div>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 z-[500]" align="start" side={isMobileView ? "bottom" : "right"} sideOffset={8}>
          <div className="p-3">
            <p className="text-sm font-semibold mb-2">Jump to Date</p>
            <input type="date" value={format(selectedDate, 'yyyy-MM-dd')}
              onChange={e => onDateSelect(new Date(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" />
          </div>
        </PopoverContent>
      </Popover>

      <SectionLabel label="Create" compact={isCompact} />

      {/* ── Add Event ──────────────────────────────────────────── */}
      <div className="px-2 space-y-0.5">
        <ToolBtn icon={Plus} label="Add Event" compact={isCompact} onClick={onNewEvent}
          iconBg="bg-gradient-to-br from-[#1a7ab8] to-[#3ecfa0]" iconColor="text-white" />
        <ToolBtn icon={Sparkles} label="AI Quick Add" compact={isCompact} onClick={onNaturalLanguage}
          iconBg="bg-gradient-to-br from-[#E8B84B] to-amber-500" iconColor="text-white" badge="AI" />
        <ToolBtn icon={Users} label="Schedule Meeting" compact={isCompact} onClick={onScheduleMeeting}
          iconBg="bg-indigo-100 dark:bg-indigo-900/40" iconColor="text-indigo-600 dark:text-indigo-400" />
      </div>

      <SectionLabel label="Navigate" compact={isCompact} />

      <div className="px-2 space-y-0.5">
        {isIslamicEdition && (
          <ToolBtn icon={Moon} label="Islam" compact={isCompact} onClick={onToggleIslamic} active={showIslamicPanel}
            iconBg="bg-gradient-to-br from-amber-400/20 to-orange-400/20 dark:from-amber-900/40 dark:to-orange-900/40" iconColor="text-amber-600 dark:text-amber-400" />
        )}
        <ToolBtn icon={CheckSquare} label="Tasks" compact={isCompact}
          onClick={() => window.dispatchEvent(new CustomEvent('toggle-task-panel'))}
          iconBg="bg-violet-100 dark:bg-violet-900/40" iconColor="text-violet-600 dark:text-violet-400" />
        {onDiscussions && (
          <ToolBtn icon={MessagesSquare} label="Discussions" compact={isCompact} onClick={onDiscussions}
            iconBg="bg-sky-100 dark:bg-sky-900/40" iconColor="text-sky-600 dark:text-sky-400" />
        )}
        <ToolBtn icon={Target} label="Goals" compact={isCompact}
          onClick={() => setShowGoals(true)}
          iconBg="bg-emerald-100 dark:bg-emerald-900/40" iconColor="text-emerald-600 dark:text-emerald-400" />
        {onWellness && (
          <ToolBtn icon={Heart} label="Track Wellness" compact={isCompact} onClick={onWellness}
            iconBg="bg-rose-100 dark:bg-rose-900/40" iconColor="text-rose-500 dark:text-rose-400" />
        )}
        {onPlanTravel && (
          <ToolBtn icon={Plane} label="Plan Travel" compact={isCompact} onClick={onPlanTravel}
            iconBg="bg-orange-100 dark:bg-orange-900/40" iconColor="text-orange-600 dark:text-orange-400" />
        )}
      </div>

      <SectionLabel label="Views" compact={isCompact} />

      <div className="px-2">
        <Popover>
          <PopoverTrigger asChild>
            <button title="Change View"
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left w-full group transition-all hover:bg-[#1a7ab8]/8 dark:hover:bg-teal-900/25"
              )}>
              <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                <Menu className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
              </div>
              {!isCompact && <span className="text-xs font-semibold text-slate-600 dark:text-teal-300 truncate flex-1">Change View</span>}
              {!isCompact && <span className="text-[9px] bg-[#1a7ab8]/10 text-[#1a7ab8] dark:bg-teal-900/40 dark:text-teal-400 px-1.5 py-0.5 rounded-full font-semibold capitalize flex-shrink-0">{currentView}</span>}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-48 z-[500]" align="start" side={isMobileView ? "bottom" : "right"} sideOffset={8}>
            <div className="space-y-1">
              <p className="text-sm font-semibold mb-2">Select View</p>
              {views.map(v => {
                const Icon = v.icon;
                return (
                  <Button key={v.value} variant={currentView === v.value ? 'default' : 'ghost'} size="sm"
                    onClick={() => onViewChange(v.value)} className="w-full justify-start">
                    <Icon className="w-4 h-4 mr-2" />{v.label}
                  </Button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <SectionLabel label="Tools" compact={isCompact} />

      <div className="px-2 space-y-0.5">
        {/* Quick Notes */}
        <Popover open={showNotes} onOpenChange={setShowNotes}>
          <PopoverTrigger asChild>
            <button title="Quick Notes"
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left w-full group transition-all",
                showNotes ? "bg-yellow-50 dark:bg-yellow-900/20 ring-1 ring-yellow-200 dark:ring-yellow-700/40" : "hover:bg-yellow-50/60 dark:hover:bg-yellow-900/15"
              )}>
              <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0", showNotes ? "bg-yellow-400" : "bg-yellow-100 dark:bg-yellow-900/40")}>
                <StickyNote className={cn("w-3.5 h-3.5", showNotes ? "text-white" : "text-yellow-600 dark:text-yellow-400")} />
              </div>
              {!isCompact && <span className="text-xs font-semibold text-slate-600 dark:text-teal-300 truncate flex-1">Quick Notes</span>}
              {!isCompact && <span className="text-[9px] text-yellow-600 dark:text-yellow-400 font-semibold flex-shrink-0">📝</span>}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[min(320px,90vw)] p-0 z-[500]" align="start" side={isMobileView ? "bottom" : "right"} sideOffset={8}>
            <QuickNotes selectedDate={selectedDate} onClose={() => setShowNotes(false)} />
          </PopoverContent>
        </Popover>

        {/* Goals panel */}
        <Popover open={showGoals} onOpenChange={setShowGoals}>
          <PopoverTrigger asChild>
            <button title="Goals"
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left w-full group transition-all",
                showGoals ? "bg-emerald-50 dark:bg-emerald-900/20 ring-1 ring-emerald-200 dark:ring-emerald-700/40" : "hover:bg-emerald-50/60 dark:hover:bg-emerald-900/15"
              )}>
              <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0", showGoals ? "bg-emerald-500" : "bg-emerald-100 dark:bg-emerald-900/40")}>
                <Target className={cn("w-3.5 h-3.5", showGoals ? "text-white" : "text-emerald-600 dark:text-emerald-400")} />
              </div>
              {!isCompact && <span className="text-xs font-semibold text-slate-600 dark:text-teal-300 truncate flex-1">Goals</span>}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[min(320px,90vw)] p-0 z-[500]" align="start" side={isMobileView ? "bottom" : "right"} sideOffset={8}>
            <CalendarGoals onClose={() => setShowGoals(false)} />
          </PopoverContent>
        </Popover>

        {/* Weather */}
        <button onClick={() => setShowWeather(v => !v)} title="Weather"
          className={cn(
            "flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left w-full group transition-all",
            showWeather ? "bg-sky-50 dark:bg-sky-900/20 ring-1 ring-sky-200 dark:ring-sky-700/40" : "hover:bg-sky-50/60 dark:hover:bg-sky-900/15"
          )}>
          <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0", showWeather ? "bg-sky-500" : "bg-sky-100 dark:bg-sky-900/40")}>
            <Cloud className={cn("w-3.5 h-3.5", showWeather ? "text-white" : "text-sky-600 dark:text-sky-400")} />
          </div>
          {!isCompact && <span className="text-xs font-semibold text-slate-600 dark:text-teal-300 truncate flex-1">Weather</span>}
          {!isCompact && (showWeather ? <ChevronUp className="w-3 h-3 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-3 h-3 text-slate-400 flex-shrink-0" />)}
        </button>
        <AnimatePresence>
          {showWeather && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden">
              <div className="mx-0.5 mb-1 rounded-xl border border-sky-100 dark:border-sky-800/40 overflow-hidden">
                <WeatherWidget date={selectedDate} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Settings */}
        <ToolBtn icon={Settings} label="Settings" compact={isCompact} onClick={onOpenSettings}
          iconBg="bg-slate-100 dark:bg-slate-800" iconColor="text-slate-500 dark:text-slate-400" />
      </div>

      <SectionLabel label="Visibility" compact={isCompact} />

      <div className="px-2 space-y-0.5">
        {/* Fasting toggle */}
        {settings?.prayer_enabled !== false && (
          <button onClick={onToggleFasting} title={showFasting ? 'Hide Fasting' : 'Show Fasting'}
            className={cn(
              "flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left w-full group transition-all",
              showFasting ? "bg-amber-50 dark:bg-amber-900/20 ring-1 ring-amber-200/60 dark:ring-amber-700/30" : "hover:bg-[#1a7ab8]/8 dark:hover:bg-teal-900/25"
            )}>
            <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0", showFasting ? "bg-amber-400" : "bg-amber-50 dark:bg-amber-900/30")}>
              {showFasting
                ? <Eye className="w-3.5 h-3.5 text-white" />
                : <EyeOff className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />}
            </div>
            {!isCompact && <span className="text-xs font-semibold text-slate-600 dark:text-teal-300 truncate flex-1">{showFasting ? 'Hide Fasting' : 'Show Fasting'}</span>}
          </button>
        )}

        {/* Color picker */}
        <button onClick={() => setShowColorPicker(v => !v)} title="Event Colors"
          className={cn(
            "flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left w-full group transition-all",
            showColorPicker ? "bg-purple-50 dark:bg-purple-900/20 ring-1 ring-purple-200 dark:ring-purple-700/40" : "hover:bg-purple-50/60 dark:hover:bg-purple-900/15"
          )}>
          <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0", showColorPicker ? "bg-purple-500" : "bg-purple-100 dark:bg-purple-900/40")}>
            <Palette className={cn("w-3.5 h-3.5", showColorPicker ? "text-white" : "text-purple-600 dark:text-purple-400")} />
          </div>
          {!isCompact && <span className="text-xs font-semibold text-slate-600 dark:text-teal-300 truncate flex-1">Event Colors</span>}
        </button>
      </div>

      {/* ── Bottom gold bar ──────────────────────────────────── */}
      <div className="mt-auto mx-3 pt-3">
        <div className="h-0.5 rounded-full bg-gradient-to-r from-transparent via-[#E8B84B]/50 to-transparent" />
      </div>

      {/* ── Color Picker Popup ───────────────────────────────── */}
      <AnimatePresence>
        {showColorPicker && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[90]" onClick={() => setShowColorPicker(false)} />
            <motion.div
              initial={{ opacity: 0, x: -16, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -16, scale: 0.96 }}
              className="fixed left-[13.5rem] top-1/2 -translate-y-1/2 z-[100] w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-sm">
                  <Palette className="w-4 h-4 text-purple-500" /> Event Colors
                </h3>
                <button onClick={() => setShowColorPicker(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2">
                {['work', 'personal', 'health', 'prayer', 'family', 'social'].map(cat => (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="text-xs capitalize text-slate-700 dark:text-slate-300 w-16 font-medium">{cat}</span>
                    <ColorPicker value={eventColorMode?.[cat] || '#3b82f6'} onChange={color => onEventColorChange?.(cat, color)} compact />
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}