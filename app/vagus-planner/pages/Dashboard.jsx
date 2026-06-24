import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Calendar, Moon, Heart, Plane, MessageSquare, User,
  CheckCircle2, Clock, Brain, ChevronRight, Sunrise, Star,
  Target, BookOpen, Utensils, Activity, Plus, DollarSign, Users
} from 'lucide-react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import IslamicGreetingBanner from '@/components/dashboard/IslamicGreetingBanner';
import NextPrayerCountdown from '@/components/dashboard/NextPrayerCountdown';
import DailyHadithWidget from '@/components/islamic/DailyHadithWidget';
import { useIslamicEdition } from '@/hooks/useIslamicEdition';
import GoalsStrip from '@/components/goals/GoalsStrip';
import DashboardJournalNudge from '@/components/journal/DashboardJournalNudge';
import SpendingWidget from '@/components/finance/SpendingWidget';
import QuickCaptureBar from '@/components/dashboard/QuickCaptureBar';
import MonthlyLifeRecap from '@/components/dashboard/MonthlyLifeRecap';
import TravelAwareAlert from '@/components/calendar/TravelAwareAlert';
import TravelModeActivator from '@/components/travel/TravelModeActivator';
import { toHijri } from '@/components/utils/hijriUtils';

function getTimeGreeting(t) {
  const h = new Date().getHours();
  if (h < 12) return t('dashboard.greeting_morning');
  if (h < 17) return t('dashboard.greeting_afternoon');
  if (h < 20) return t('dashboard.greeting_evening');
  return t('dashboard.greeting_night');
}



function StatCard({ icon: Icon, label, value, sub, accent, to }) {
  return (
    <Link to={to}>
      <motion.div
        whileHover={{ y: -2, scale: 1.01 }}
        className="relative overflow-hidden rounded-2xl p-3 sm:p-4 cursor-pointer group transition-all"
        style={{background:'linear-gradient(135deg, #D4E0EC 0%, #C0CDD9 60%, #A8C8E8 100%)', border:'1px solid rgba(74,110,138,0.4)', boxShadow:'0 4px 16px rgba(13,26,42,0.15)'}}
      >
        {/* NSC gold+blue top accent */}
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{background:'linear-gradient(90deg, #E8B84B, #29ABE2, #1D6FB8)'}} />
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{color:'#2D4A65'}}>{label}</p>
            <p className="text-2xl sm:text-3xl font-black leading-none" style={{color:'#0D1A2A'}}>{value}</p>
            {sub && <p className="text-xs mt-1 font-medium" style={{color:'#4A6E8A'}}>{sub}</p>}
          </div>
          <div className="p-2 rounded-xl" style={{background:'linear-gradient(135deg, rgba(29,111,184,0.15), rgba(41,171,226,0.1))', border:'1px solid rgba(41,171,226,0.3)'}}>
            <Icon className="w-4 h-4" style={{color:'#1D6FB8'}} />
          </div>
        </div>
        <ChevronRight className="absolute bottom-2.5 right-2.5 w-3 h-3 transition-colors" style={{color:'rgba(29,111,184,0.5)'}} />
      </motion.div>
    </Link>
  );
}

const NSC_GRADIENTS = [
  'linear-gradient(135deg, #1D6FB8 0%, #29ABE2 100%)',   // royal→cyan
  'linear-gradient(135deg, #1B2A4A 0%, #2D4A65 100%)',   // navy→dark steel
  'linear-gradient(135deg, #2980B9 0%, #1D6FB8 100%)',   // med blue→royal
  'linear-gradient(135deg, #0D4F6C 0%, #1B2A4A 100%)',   // deep navy→navy
  'linear-gradient(135deg, #4A55A2 0%, #1D6FB8 100%)',   // indigo→royal
  'linear-gradient(135deg, #0A3333 0%, #0D4F6C 100%)',   // deep teal→navy
];

function QuickLink({ icon: Icon, label, page, gradient, hash, _idx = 0 }) {
  const url = createPageUrl(page) + (hash ? hash : '');
  const bg = NSC_GRADIENTS[_idx % NSC_GRADIENTS.length];
  return (
    <Link to={url}>
      <motion.div
        whileHover={{ y: -3 }}
        whileTap={{ scale: 0.97 }}
        className="flex flex-col items-center gap-1 p-2.5 sm:p-3.5 rounded-2xl cursor-pointer shadow-sm hover:shadow-lg transition-all relative overflow-hidden"
        style={{background: bg, border:'1px solid rgba(255,255,255,0.15)'}}
      >
        <div className="absolute top-0 left-0 right-0 h-px" style={{background:'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)'}} />
        <div className="p-2 rounded-xl" style={{background:'rgba(255,255,255,0.2)'}}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </div>
        <span className="text-[10px] sm:text-xs font-bold text-white tracking-tight leading-tight text-center">{label}</span>
      </motion.div>
    </Link>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation();

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me(), retry: false, staleTime: 60000 });

  const { data: settingsList = [] } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => base44.entities.UserSettings.list(),
    retry: false,
    staleTime: 60000,
  });
  const { isIslamicEdition, isLoading: islamicEditionLoading } = useIslamicEdition();
  // islamicMode requires BOTH an Islamic plan AND the toggle enabled — never true for Standard users
  const islamicMode = !islamicEditionLoading && isIslamicEdition && (settingsList[0]?.islamic_mode ?? false);

  const { data: events = [] } = useQuery({
    queryKey: ['todayEvents'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const all = await base44.entities.Event.filter({ start_date: { $gte: `${today}T00:00:00Z`, $lte: `${today}T23:59:59Z` } });
      // Deduplicate by title (prayer events can get created multiple times)
      const seen = new Set();
      return all.filter(e => {
        const key = `${e.title?.toLowerCase().trim()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    },
    retry: false,
    staleTime: 30000,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['activeTasks'],
    queryFn: () => base44.entities.Task.filter({ status: { $in: ['todo', 'in_progress'] } }, '-priority', 5),
    retry: false,
    staleTime: 30000,
  });

  const { data: prayerLogs = [] } = useQuery({
    queryKey: ['todayPrayers'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      return base44.entities.PrayerLog.filter({ date: today });
    },
    retry: false,
    staleTime: 30000,
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['activeGoals'],
    queryFn: () => base44.entities.Goal.filter({ status: { $in: ['not_started', 'in_progress'] } }, '-priority', 3),
    retry: false,
    staleTime: 30000,
  });

  const { data: chats = [] } = useQuery({
    queryKey: ['unreadChats', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const msgs = await base44.entities.Chat.filter({ is_read: false }, '-created_date', 50);
      return msgs.filter(m => m.sender_email !== user.email);
    },
    enabled: !!user?.email,
    retry: false,
    staleTime: 60000,
  });

  const lang = typeof localStorage !== 'undefined' ? (localStorage.getItem('vagus_language') || 'en') : 'en';
  const rawName = user?.full_name?.split(' ')[0] || t('common.noData');
  const firstName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

  // Gregorian date
  const localeMap = { en: 'en-US', ar: 'ar-SA', fr: 'fr-FR', tr: 'tr-TR', ur: 'ur-PK' };
  const locale = localeMap[lang] || 'en-US';
  const gregorianDate = new Date().toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // Accurate Hijri date via our utility
  const [hijriDateStr, setHijriDateStr] = useState('');
  useEffect(() => {
    if (!isIslamicEdition) return;
    toHijri(new Date()).then(h => {
      if (h) setHijriDateStr(`${h.day} ${h.monthName} ${h.year} AH`);
    });
  }, [isIslamicEdition]);

  // Quick actions — differ by edition
  const QUICK_LINKS = islamicMode ? [
    { icon: Moon,         label: 'Log Prayer',  page: 'Islam',    gradient: '' },
    { icon: BookOpen,     label: 'Read Quran',  page: 'Islam',    gradient: '' },
    { icon: Target,       label: 'Add Goal',    page: 'Goals',    gradient: '' },
    { icon: Plus,         label: t('calendar.addEvent'), page: 'Calendar', gradient: '' },
    { icon: MessageSquare,label: t('nav.connect'),  page: 'Connect',  gradient: '' },
    { icon: Plane,        label: t('nav.travel'),   page: 'Travel',   gradient: '' },
  ] : [
    { icon: Plus,         label: t('calendar.addEvent'), page: 'Calendar',      gradient: '' },
    { icon: Target,       label: 'Add Goal',             page: 'Goals',         gradient: '' },
    { icon: Users,        label: 'Teams',                page: 'TeamWorkspace', gradient: '' },
    { icon: DollarSign,   label: 'Finance',              page: 'Finance',       gradient: '' },
    { icon: MessageSquare,label: t('nav.connect'),       page: 'Connect',       gradient: '' },
    { icon: Plane,        label: t('nav.travel'),        page: 'Travel',        gradient: '' },
  ];

  return (
    <div className="min-h-screen pb-safe w-full overflow-x-hidden">
      <div className="max-w-2xl lg:max-w-5xl mx-auto px-0 sm:px-2 py-3 lg:py-8 space-y-5">

        {/* ── Hero Header ── */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
          {/* Bismillah — only in Islamic mode */}
          {islamicMode && (
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
              <span className="text-sm font-semibold text-amber-700 dark:text-amber-400 tracking-wide" dir="rtl">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</span>
            </div>
          )}

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-none" style={{color:'#0D1A2A'}}>
            {islamicMode ? t('islamic.assalamu') + ',' : getTimeGreeting(t) + ','}<br />
            <span style={{background:'linear-gradient(90deg, #1D6FB8, #29ABE2, #E8B84B)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text'}}>{firstName}</span>
          </h1>
          <p className="text-sm flex items-center gap-2 mt-1 flex-wrap" style={{color:'#2D4A65'}}>
            <Clock className="w-3.5 h-3.5" style={{color:'#29ABE2'}} />
            {gregorianDate}
            {islamicMode && hijriDateStr && (
              <>
                <span className="text-slate-300 dark:text-slate-600">·</span>
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                <span>{hijriDateStr}</span>
              </>
            )}
          </p>
        </motion.div>

        {/* ── Islamic Greeting Banner — only in Islamic mode ── */}
        {islamicMode && <IslamicGreetingBanner />}

        {/* ── Next Prayer Countdown — Islamic mode only ── */}
        {islamicMode && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <NextPrayerCountdown settings={settingsList[0]} />
          </motion.div>
        )}

        {/* ── Travel-Aware Scheduling Alert ── */}
        <TravelAwareAlert />

        {/* ── Universal Quick Capture Bar ── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}>
          <QuickCaptureBar islamicMode={islamicMode} />
        </motion.div>

        {/* ── Stat Cards ── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
          <div className={`grid gap-2 sm:gap-3 ${islamicMode ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-3'}`}>
            {islamicMode && (
              <StatCard icon={Moon} label={t('prayer.title')} value={`${prayerLogs.length}/5`} sub={t('common.today')} accent="bg-indigo-500" to={createPageUrl('Islam')} />
            )}
            <StatCard icon={Calendar}      label={t('nav.calendar')} value={events.length}  sub={t('common.today')}  accent="bg-amber-500"   to={createPageUrl('Calendar')} />
            <StatCard icon={CheckCircle2}  label={t('tasks.title')}  value={tasks.length}   sub={t('tasks.pending')} accent="bg-orange-500"  to={createPageUrl('Calendar') + '?view=task-timeline'} />
            <StatCard icon={MessageSquare} label={t('connect.messages')} value={chats.length} sub="unread" accent="bg-teal-500" to={createPageUrl('Connect')} />
          </div>
        </motion.div>

        {/* ── Today's Agenda ── */}
        {events.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-widest flex items-center gap-1.5" style={{color:'#2D4A65'}}>
                <span className="w-3 h-0.5 rounded-full inline-block" style={{background:'linear-gradient(90deg, #E8B84B, #29ABE2)'}} />
                {t('dashboard.todayOverview')}
              </span>
              <Link to={createPageUrl('Calendar')} className="text-xs font-semibold flex items-center gap-0.5 hover:underline" style={{color:'#1D6FB8'}}>{t('common.seeAll')} <ChevronRight className="w-3 h-3" /></Link>
            </div>
            <div className="space-y-2">
              {events.slice(0, 4).map(event => {
                const start = event.start_date ? new Date(event.start_date) : null;
                const valid = start && !isNaN(start.getTime());
                return (
                  <div key={event.id} className="flex items-center gap-3 p-3 rounded-xl shadow-sm" style={{background:'linear-gradient(135deg, #D4E0EC 0%, #C0CDD9 100%)', border:'1px solid rgba(74,110,138,0.4)'}}>
                    <div className="w-1.5 h-8 rounded-full flex-shrink-0" style={{background:'linear-gradient(180deg, #E8B84B, #1D6FB8)'}} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{color:'#0D1A2A'}}>{event.title}</p>
                      <p className="text-xs font-medium" style={{color:'#4A6E8A'}}>{event.is_all_day ? t('calendar.allDay') : valid ? format(start, 'h:mm a') : ''}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ── Prayer nudge if 0 prayed — Islamic mode only ── */}
        {islamicMode && prayerLogs.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
            <Link to={createPageUrl('Islam')}>
              <div className="flex items-center gap-3 p-4 rounded-2xl hover:shadow-md transition-all group" style={{background:'linear-gradient(135deg, #D4E0EC, #C0CDD9)', border:'1px solid rgba(74,110,138,0.4)'}}>
                 <div className="p-2 rounded-xl" style={{background:'rgba(29,111,184,0.12)'}}>
                   <Sunrise className="w-5 h-5" style={{color:'#1D6FB8'}} />
                 </div>
                 <div className="flex-1">
                   <p className="text-sm font-bold" style={{color:'#0D1A2A'}}>{t('dashboard.prayerProgress')}</p>
                   <p className="text-xs font-medium" style={{color:'#4A6E8A'}}>{t('prayer.fajr')} & {t('prayer.today')}</p>
                 </div>
                 <ChevronRight className="w-4 h-4 transition-colors" style={{color:'#1D6FB8'}} />
              </div>
            </Link>
          </motion.div>
        )}

        {/* ── Travel Mode Widget — Islamic Edition only ── */}
        {isIslamicEdition && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.135 }}>
            <TravelModeActivator compact />
          </motion.div>
        )}

        {/* ── Journal Nudge ── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.13 }}>
          <DashboardJournalNudge />
        </motion.div>

        {/* ── Goals Strip ── */}
        {goals.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
            <GoalsStrip limit={2} linkTo="Goals" />
          </motion.div>
        )}

        {/* ── Daily Hadith — Islamic Edition only ── */}
        {islamicMode && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <DailyHadithWidget />
          </motion.div>
        )}

        {/* ── Finance / Spending Widget ── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
          <SpendingWidget />
        </motion.div>

        {/* ── Monthly Life Recap ── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.17 }}>
          <MonthlyLifeRecap islamicMode={islamicMode} />
        </motion.div>



        {/* ── Quick Links ── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-1.5" style={{color:'#2D4A65'}}>
            <span className="w-3 h-0.5 rounded-full inline-block" style={{background:'linear-gradient(90deg, #E8B84B, #29ABE2)'}} />
            {t('dashboard.quickActions')}
          </p>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {QUICK_LINKS.map((l, i) => <QuickLink key={l.label} {...l} _idx={i} />)}
          </div>
        </motion.div>

      </div>
    </div>
  );
}