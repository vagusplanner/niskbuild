import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, Activity, Target, Trophy,
  ChevronRight, Sparkles, Flame, TrendingUp,
  Zap, Moon, Smile, Apple, Star, ArrowLeft, BookOpen
} from 'lucide-react';
import JournalWellnessPanel from '@/components/journal/JournalWellnessPanel';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import PullToRefresh from '@/components/mobile/PullToRefresh';
import { SDK } from '@/lib/custom-sdk.js';

import HealthTracking from '@/components/health/HealthTracking';
import UnifiedHealthAIPanel from '@/components/assistant/UnifiedHealthAIPanel';
import FullHabitTracker from '@/components/habits/FullHabitTracker';
import GoalsPanel from '@/components/goals/GoalsPanel';
import FocusMode from '@/components/productivity/FocusMode';
import { Link } from 'react-router-dom';

// Islamic wellness quote (only shown in Islamic mode)
const WELLNESS_QUOTES = [
  { text: '"Your body has a right over you."', source: 'Sahih al-Bukhari' },
  { text: '"The strong believer is better and more beloved to Allah than the weak believer."', source: 'Muslim' },
  { text: '"Take care of yourselves."', source: 'Quran 5:105' },
];

const STANDARD_WELLNESS_QUOTES = [
  { text: '"Take care of your body. It\'s the only place you have to live."', source: 'Jim Rohn' },
  { text: '"A healthy outside starts from the inside."', source: 'Robert Urich' },
  { text: '"Health is not valued until sickness comes."', source: 'Thomas Fuller' },
];

function HealthContent() { return <><UnifiedHealthAIPanel /><HealthTracking /></>; }
function HabitsContent() { return <FullHabitTracker />; }
function GoalsContent() {
  const { t } = useTranslation();
  return (
    <>
      <div className="flex items-center gap-2 p-3 rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900 mb-3">
        <Zap className="w-4 h-4 text-violet-600 flex-shrink-0" />
        <p className="text-xs text-violet-700 dark:text-violet-300">
          {t('wellness.goalProgress')} → {t('nav.calendar')}
        </p>
      </div>
      <GoalsPanel />
    </>
  );
}

function JournalContent() { return <JournalWellnessPanel />; }
function FinanceContent() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
      <TrendingUp className="w-12 h-12 text-emerald-400 mx-auto" />
      <h3 className="text-white font-black text-xl">Finance Dashboard</h3>
      <p className="text-white/50 text-sm max-w-xs">Track income, expenses, budgets and get AI-powered financial insights.</p>
      <Link to="/Finance">
        <button className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-8 py-3 rounded-2xl transition-all">Open Finance →</button>
      </Link>
    </div>
  );
}
function ProductivityContent() { return <FocusMode />; }

function SectionTile({ section, onClick }) {
  const Icon = section.icon;
  return (
    <motion.button
      whileHover={{ y: -3, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl p-4 text-left bg-gradient-to-br ${section.gradient} shadow-md ${section.glow} hover:shadow-xl transition-all w-full`}
    >
      <div className="relative z-10 flex flex-col gap-3">
        <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl w-fit">
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">{section.label}</p>
          <p className="text-xs text-white/70 mt-0.5">{section.sub}</p>
        </div>
      </div>
      <ChevronRight className="absolute bottom-3 right-3 w-4 h-4 text-white/50 group-hover:text-white transition-colors" />
    </motion.button>
  );
}

function StatPill({ value, label, color }) {
  return (
    <div className={`flex-1 rounded-xl px-3 py-2.5 text-center border ${color}`}>
      <p className="text-xl font-black">{value}</p>
      <p className="text-xs mt-0.5 opacity-70">{label}</p>
    </div>
  );
}

export default function WellnessPage() {
  const { t } = useTranslation();
  
  // Support deep linking via ?section=finance
  const initialSection = (() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('section') || null;
  })();
  
  const [activeSection, setActiveSection] = useState(initialSection);
  const SECTIONS = [
    { id: 'health', icon: Activity, label: t('wellness.health'), sub: t('ai.healthCoach'), gradient: 'from-rose-500 to-pink-600', glow: 'shadow-rose-400/30', Content: HealthContent },
    { id: 'habits', icon: Flame, label: t('wellness.habits'), sub: t('wellness.habitStreak'), gradient: 'from-orange-400 to-amber-500', glow: 'shadow-orange-400/30', Content: HabitsContent },
    { id: 'goals', icon: Trophy, label: t('wellness.goals'), sub: t('wellness.goalProgress'), gradient: 'from-violet-500 to-indigo-600', glow: 'shadow-violet-400/30', Content: GoalsContent },
    { id: 'journal', icon: BookOpen, label: 'Journal', sub: 'Daily reflections & mood', gradient: 'from-amber-400 to-yellow-500', glow: 'shadow-amber-400/30', Content: JournalContent },
    { id: 'finance',       icon: TrendingUp, label: 'Finance',      sub: 'AI-powered budget insights',      gradient: 'from-emerald-500 to-green-600',  glow: 'shadow-emerald-400/30',  Content: FinanceContent },
    { id: 'productivity',  icon: Zap,        label: 'Productivity', sub: 'Pomodoro · World Clock · Zapier', gradient: 'from-rose-500 to-orange-500',    glow: 'shadow-rose-400/30',     Content: ProductivityContent },
  ];
  const queryClient = useQueryClient();

  const { data: settingsList = [] } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => SDK.entities.UserSettings.list(),
    staleTime: 60000,
  });
  const islamicMode = settingsList[0]?.islamic_mode ?? false;

  const { data: goals = [] } = useQuery({
    queryKey: ['goals'],
    queryFn: () => SDK.entities.Goal.list('-created_date', 20),
  });
  const { data: habits = [] } = useQuery({
    queryKey: ['habits'],
    queryFn: () => SDK.entities.Habit.list('-created_date', 20),
  });

  const activeGoals    = goals.filter(g => g.status === 'in_progress').length;
  const completedGoals = goals.filter(g => g.status === 'completed').length;
  const totalHabits    = habits.length;

  const quotePool = islamicMode ? WELLNESS_QUOTES : STANDARD_WELLNESS_QUOTES;
  const quote = quotePool[new Date().getDay() % quotePool.length];
  const section = SECTIONS.find(s => s.id === activeSection);

  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['habits'] }),
      queryClient.invalidateQueries({ queryKey: ['goals'] }),
    ]);
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen pb-safe">
        <div className="max-w-2xl lg:max-w-5xl mx-auto px-3 sm:px-5 py-4 lg:py-8 space-y-6">

          <AnimatePresence mode="wait">
            {activeSection ? (
              <motion.div key="section" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <button
                  onClick={() => setActiveSection(null)}
                  className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> {t('common.back')}
                </button>
                <div className={`flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r ${section.gradient} shadow-md`}>
                  <div className="p-2.5 bg-white/20 rounded-xl">
                    <section.icon className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-lg font-black text-white">{section.label}</h2>
                </div>
                <section.Content />
              </motion.div>
            ) : (
              <motion.div key="overview" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">

                {/* Header */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-fuchsia-600 p-5 shadow-lg">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-1">
                      <Heart className="w-5 h-5 text-pink-200" />
                      <span className="text-xs font-bold text-pink-200 uppercase tracking-widest">Wellness</span>
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight">{t('wellness.title')}</h1>
                    <p className="text-sm text-rose-100 mt-1">{t('wellness.subtitle')}</p>
                    <div className="mt-3 h-px w-full bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                  </div>
                </div>

                {/* Islamic wellness quote */}
                <div className="rounded-2xl border border-teal-100 dark:border-teal-900 bg-gradient-to-br from-teal-50 to-emerald-50/60 dark:from-teal-950/30 dark:to-emerald-950/20 p-4 flex items-start gap-3">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold italic text-slate-700 dark:text-slate-300">{quote.text}</p>
                    <p className="text-xs text-slate-400 mt-1">— {quote.source}</p>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex gap-2.5">
                  <StatPill value={activeGoals}    label={t('wellness.goals')} color="bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300" />
                  <StatPill value={completedGoals} label={t('tasks.completed')} color="bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300" />
                  <StatPill value={totalHabits}    label={t('wellness.habits')} color="bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300" />
                </div>

                {/* Active goals preview */}
                {goals.filter(g => g.status === 'in_progress').length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('wellness.goals')}</span>
                      <button onClick={() => setActiveSection('goals')} className="text-xs text-violet-600 font-semibold flex items-center gap-0.5 hover:underline">
                        {t('common.seeAll')} <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="space-y-2">
                      {goals.filter(g => g.status === 'in_progress').slice(0, 3).map(g => (
                        <div key={g.id} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                          <Trophy className="w-4 h-4 text-violet-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{g.title}</p>
                            <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-1.5">
                              <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all" style={{ width: `${g.progress || 0}%` }} />
                            </div>
                          </div>
                          <span className="text-xs font-bold text-slate-400">{g.progress || 0}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section tiles */}
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">{t('common.view')}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {SECTIONS.map(s => (
                      <SectionTile key={s.id} section={s} onClick={() => setActiveSection(s.id)} />
                    ))}
                  </div>
                </div>

                {/* AI Coach nudge */}
                <div className="rounded-2xl border border-rose-100 dark:border-rose-900 bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-4 h-4 text-rose-500" />
                    <span className="text-sm font-bold text-rose-800 dark:text-rose-200">{t('ai.healthCoach')}</span>
                  </div>
                  <p className="text-xs text-rose-600 dark:text-rose-400 mb-3">
                    {t('wellness.insights')}
                  </p>
                  <button
                    onClick={() => setActiveSection('health')}
                    className="text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-1 hover:underline"
                  >
                    {t('ai.healthCoach')} <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </PullToRefresh>
  );
}