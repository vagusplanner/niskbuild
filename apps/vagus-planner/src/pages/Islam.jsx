import React, { useState } from 'react';
import IslamicEditionGate from '@/components/auth/IslamicEditionGate';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Moon, BookOpen, Hand, Map, Heart, Sunrise, ChevronRight,
  Sparkles, ArrowLeft, Loader2, Star, Crown, Users, Calendar, Flame
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PullToRefresh from '@/components/mobile/PullToRefresh';
import { cn } from '@/lib/utils';

// ── Section Components ────────────────────────────────────────────────────────
import PrayerTimesMaster from '@/components/islamic/PrayerTimesMaster';
import PrayerCalendarSync from '@/components/islamic/PrayerCalendarSync';
import AdhanPlayer from '@/components/islamic/AdhanPlayer';
import PrayerAwareScheduler from '@/components/islamic/PrayerAwareScheduler';
import SunnahNaflLogger from '@/components/islamic/SunnahNaflLogger';
import QadaTracker from '@/components/islamic/QadaTracker';
import HaydTracker from '@/components/islamic/HaydTracker';
import SunnahHabitTracker from '@/components/islamic/SunnahHabitTracker';
import PrayerStreakBadges from '@/components/islamic/unique/PrayerStreakBadges';
import SpiritualHabitTracker from '@/components/islamic/SpiritualHabitTracker';

import QuranReadingTracker from '@/components/quran/QuranReadingTracker';
import ComprehensiveQuranReader from '@/components/islamic/ComprehensiveQuranReader';
import QuranAudioPlayer from '@/components/islamic/QuranAudioPlayer';
import AITafsirPanel from '@/components/islamic/AITafsirPanel';
import QuranVoiceCheck from '@/components/islamic/unique/QuranVoiceCheck';

import DuaLibrary from '@/components/islamic/DuaLibrary';
import AISmartDuaGenerator from '@/components/islamic/AISmartDuaGenerator';
import DigitalTasbih from '@/components/islamic/DigitalTasbih';
import AsmaulHusna from '@/components/islamic/AsmaulHusna';
import DailyHadithWidget from '@/components/islamic/DailyHadithWidget';
import AIHadithRecommender from '@/components/islamic/AIHadithRecommender';
import HadithSpacedRepetition from '@/components/islamic/HadithSpacedRepetition';
import MoodDuaMatcher from '@/components/islamic/unique/MoodDuaMatcher';
import KhutbahNotes from '@/components/islamic/unique/KhutbahNotes';
import IslamicAITutor from '@/components/islamic/IslamicAITutor';

import RamadanDashboard from '@/components/ramadan/RamadanDashboard';
import RamadanCountdownPlanner from '@/components/ramadan/RamadanCountdownPlanner';

import IslamicLifeScore from '@/components/islamic/IslamicLifeScore';
import IslamicLearningPath from '@/components/islamic/IslamicLearningPath';

import IslamicMarriagePlanner from '@/components/islamic/IslamicMarriagePlanner';
import IslamicInheritanceCalculator from '@/components/islamic/IslamicInheritanceCalculator';
import FidyahKaffarahCalculator from '@/components/islamic/FidyahKaffarahCalculator';
import IslamicFinanceCalculator from '@/components/islamic/IslamicFinanceCalculator';

import ZakatCalculatorPanel from '@/components/islamic/zakat/ZakatCalculatorPanel';
import ZakatSadaqaDashboard from '@/components/islamic/ZakatSadaqaDashboard';
import IslamicFinancialPlanner from '@/components/islamic/IslamicFinancialPlanner';
import AutoZakatTracker from '@/components/islamic/AutoZakatTracker';
import FamilySadaqahJar from '@/components/islamic/unique/FamilySadaqahJar';

import PrayerAndQiblaPanel from '@/components/islamic/PrayerAndQiblaPanel';
import HijriEventsCalendar from '@/components/islamic/HijriEventsCalendar';
import DailyVerse from '@/components/islamic/DailyVerse';
import BlessedDaysPanel from '@/components/islamic/BlessedDaysPanel';
import GoalsStrip from '@/components/goals/GoalsStrip';

import HijriBirthdayTracker from '@/components/islamic/unique/HijriBirthdayTracker';
import IslamicTravelCompanion from '@/components/islamic/unique/IslamicTravelCompanion';
import IslamicLifeTimeline from '@/components/islamic/unique/IslamicLifeTimeline';

// ── AI Guide Compact ──────────────────────────────────────────────────────────
function IslamicAICompact() {
  const [goal, setGoal] = useState(null);
  const [loading, setLoading] = useState(false);

  const { data: prayerLogs = [] } = useQuery({
    queryKey: ['prayerLogs'],
    queryFn: () => base44.entities.PrayerLog.list('-date', 14),
  });

  const generate = async () => {
    setLoading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Prayers completed=${prayerLogs.filter(p => p.completed).length}/${prayerLogs.length || 1} in last 14 days. Give ONE short specific actionable Islamic spiritual goal today (max 20 words) and ONE motivational sentence (max 15 words).`,
        response_json_schema: {
          type: 'object',
          properties: { goal: { type: 'string' }, motivation: { type: 'string' } }
        }
      });
      setGoal(result);
    } catch (_) {}
    setLoading(false);
  };

  return (
    <div className="rounded-2xl p-4" style={{background:'linear-gradient(135deg, #D4E0EC 0%, #C0CDD9 100%)', border:'1px solid rgba(74,110,138,0.4)'}}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" style={{color:'#1D6FB8'}} />
          <span className="text-sm font-bold" style={{color:'#0D1A2A'}}>Islamic AI Guide</span>
        </div>
        <Button size="sm" variant="outline" onClick={generate} disabled={loading}
          className="h-7 text-xs" style={{borderColor:'rgba(29,111,184,0.5)', color:'#1D6FB8', background:'white'}}>
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
          {loading ? '' : 'Get Guidance'}
        </Button>
      </div>
      {goal ? (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="space-y-1.5">
          <div className="p-3 rounded-xl text-white text-sm font-medium" style={{background:'linear-gradient(135deg, #1D6FB8, #29ABE2)'}}>🎯 {goal.goal}</div>
          <p className="text-xs italic px-1 font-medium" style={{color:'#2D4A65'}}>✨ {goal.motivation}</p>
        </motion.div>
      ) : (
        <p className="text-xs font-medium" style={{color:'#4A6E8A'}}>Tap "Get Guidance" for a personalised daily goal.</p>
      )}
    </div>
  );
}

// ── Section tile ──────────────────────────────────────────────────────────────
function SectionTile({ section, onClick }) {
  const Icon = section.icon;
  const inner = (
    <>
      <span className="absolute -top-2 -right-2 text-5xl font-black text-white/10 select-none leading-none" aria-hidden>{section.arabic}</span>
      <div className="relative z-10 flex flex-col gap-2.5">
        <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl w-fit">
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-tight">{section.label}</p>
          <p className="text-xs text-white/70 mt-0.5">{section.desc}</p>
        </div>
      </div>
      <ChevronRight className="absolute bottom-3 right-3 w-4 h-4 text-white/50" />
    </>
  );

  if (section.isLink) {
    return (
      <Link to={createPageUrl(section.isLink)}>
        <motion.div whileHover={{ y: -3, scale: 1.02 }} whileTap={{ scale: 0.98 }}
          className={`group relative overflow-hidden rounded-2xl p-4 text-left cursor-pointer bg-gradient-to-br ${section.gradient} shadow-lg hover:shadow-xl transition-all w-full min-h-[100px]`}>
          {inner}
        </motion.div>
      </Link>
    );
  }

  return (
    <motion.button whileHover={{ y: -3, scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl p-4 text-left cursor-pointer bg-gradient-to-br ${section.gradient} shadow-lg hover:shadow-xl transition-all w-full min-h-[100px]`}>
      {inner}
    </motion.button>
  );
}

// ── MERGED section content renderers ─────────────────────────────────────────

/** Prayer — unified with internal tabs */
function PrayerContent() {
  return (
    <div className="space-y-1">
      <p className="text-xs mb-3 font-medium" style={{color:'#2D4A65'}}>
        All your prayer tools in one place: times & Adhan, tracking your 5 daily prayers, Sunnah/Nafl extras, missed prayers (Qada), streaks & gamified badges, and spiritual habits.
      </p>
      <Tabs defaultValue="times">
        <TabsList className="grid grid-cols-4 w-full h-auto mb-4">
          <TabsTrigger value="times" className="text-[11px] py-2">🕌 Times & Adhan</TabsTrigger>
          <TabsTrigger value="tracker" className="text-[11px] py-2">✅ Tracker</TabsTrigger>
          <TabsTrigger value="badges" className="text-[11px] py-2">🏆 Streaks</TabsTrigger>
          <TabsTrigger value="habits" className="text-[11px] py-2">🔥 Habits</TabsTrigger>
        </TabsList>
        <TabsContent value="times" className="space-y-4">
          <p className="text-xs rounded-xl p-2.5 font-medium" style={{background:'rgba(29,111,184,0.08)', color:'#1B2A4A', border:'1px solid rgba(29,111,184,0.15)'}}>📍 Your daily prayer schedule with automatic Adhan sound alerts. Enable the bell icon to hear the call to prayer at each prayer time.</p>
          <PrayerCalendarSync />
          <PrayerTimesMaster />
          <AdhanPlayer />
          <PrayerAwareScheduler />
        </TabsContent>
        <TabsContent value="tracker" className="space-y-4">
          <p className="text-xs rounded-xl p-2.5 font-medium" style={{background:'rgba(29,111,184,0.08)', color:'#1B2A4A', border:'1px solid rgba(29,111,184,0.15)'}}>📊 Log each prayer as you complete it. Track Sunnah and Nafl (optional) prayers, record missed prayers to make up (Qada), and track Hayd (menstrual) periods.</p>
          <SunnahNaflLogger />
          <SunnahHabitTracker />
          <QadaTracker />
          <HaydTracker />
        </TabsContent>
        <TabsContent value="badges" className="space-y-4">
          <p className="text-xs rounded-xl p-2.5 font-medium" style={{background:'rgba(29,111,184,0.08)', color:'#1B2A4A', border:'1px solid rgba(29,111,184,0.15)'}}>🎖️ Earn badges and achievements for prayer streaks — 7 days, 30 days, praying all 5 in one day, Fajr mastery and more. Gamified motivation to stay consistent.</p>
          <PrayerStreakBadges />
        </TabsContent>
        <TabsContent value="habits" className="space-y-4">
          <p className="text-xs rounded-xl p-2.5 font-medium" style={{background:'rgba(29,111,184,0.08)', color:'#1B2A4A', border:'1px solid rgba(29,111,184,0.15)'}}>📈 Build long-term spiritual habits beyond just prayers: Quran reading, morning Adhkar, Tahajjud, charity — visualised with heatmaps and streak charts.</p>
          <SpiritualHabitTracker />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** Quran — unified reader + audio + voice check */
function QuranContent() {
  return (
    <div className="space-y-1">
      <p className="text-xs mb-3 font-medium" style={{color:'#2D4A65'}}>
        Everything Quran in one place: read the text with translation, listen to recitation audio, check your Tajweed (pronunciation) with AI, and track your reading progress & memorisation goals.
      </p>
      <Tabs defaultValue="read">
        <TabsList className="grid grid-cols-4 w-full h-auto mb-4">
          <TabsTrigger value="read" className="text-[11px] py-2">📖 Read</TabsTrigger>
          <TabsTrigger value="listen" className="text-[11px] py-2">🎧 Listen</TabsTrigger>
          <TabsTrigger value="tajweed" className="text-[11px] py-2">🎙️ Tajweed</TabsTrigger>
          <TabsTrigger value="progress" className="text-[11px] py-2">📊 Progress</TabsTrigger>
        </TabsList>
        <TabsContent value="read" className="space-y-4">
          <p className="text-xs rounded-xl p-2.5 font-medium" style={{background:'rgba(29,111,184,0.08)', color:'#1B2A4A', border:'1px solid rgba(29,111,184,0.15)'}}>📖 Read the full Quran with Arabic text, English translation, and AI-powered Tafsir (explanation). Tap any verse for detailed commentary.</p>
          <ComprehensiveQuranReader />
          <AITafsirPanel />
        </TabsContent>
        <TabsContent value="listen" className="space-y-4">
          <p className="text-xs rounded-xl p-2.5 font-medium" style={{background:'rgba(29,111,184,0.08)', color:'#1B2A4A', border:'1px solid rgba(29,111,184,0.15)'}}>🎧 Listen to professional Quran recitation. Choose your Surah and follow along. Great for learning pronunciation and memorisation by listening.</p>
          <QuranAudioPlayer surah={1} ayah={1} totalAyahs={7} />
        </TabsContent>
        <TabsContent value="tajweed" className="space-y-4">
          <p className="text-xs rounded-xl p-2.5 font-medium" style={{background:'rgba(29,111,184,0.08)', color:'#1B2A4A', border:'1px solid rgba(29,111,184,0.15)'}}>🎙️ Recite a Surah into your microphone and get an AI Tajweed accuracy score (0–100) with specific feedback on which rules to improve. Different from just listening — this checks YOUR recitation.</p>
          <QuranVoiceCheck />
        </TabsContent>
        <TabsContent value="progress" className="space-y-4">
          <p className="text-xs rounded-xl p-2.5 font-medium" style={{background:'rgba(29,111,184,0.08)', color:'#1B2A4A', border:'1px solid rgba(29,111,184,0.15)'}}>📊 Track how many Surahs/Juz you've read, set memorisation goals, and see your reading streak over time.</p>
          <QuranReadingTracker />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** Dua, Dhikr & Hadith — all in one */
function DuaContent() {
  return (
    <div className="space-y-1">
      <p className="text-xs mb-3 font-medium" style={{color:'#2D4A65'}}>
        Supplications, remembrance and prophetic teachings unified. Browse du'as by situation, get AI-generated personal du'as, count Tasbih, explore the 99 Names, and study Hadith with spaced repetition.
      </p>
      <Tabs defaultValue="library">
        <TabsList className="grid grid-cols-4 w-full h-auto mb-4">
          <TabsTrigger value="library" className="text-[11px] py-2">🤲 Du'as</TabsTrigger>
          <TabsTrigger value="mood" className="text-[11px] py-2">❤️ Mood→Du'a</TabsTrigger>
          <TabsTrigger value="dhikr" className="text-[11px] py-2">📿 Dhikr</TabsTrigger>
          <TabsTrigger value="hadith" className="text-[11px] py-2">📚 Hadith</TabsTrigger>
        </TabsList>
        <TabsContent value="library" className="space-y-4">
          <p className="text-xs rounded-xl p-2.5 font-medium" style={{background:'rgba(29,111,184,0.08)', color:'#1B2A4A', border:'1px solid rgba(29,111,184,0.15)'}}>🤲 Browse authenticated du'as organised by situation (morning, evening, stress, travel, etc.) plus an AI generator that creates a personalised du'a based on what you're going through right now.</p>
          <DuaLibrary />
          <AISmartDuaGenerator />
        </TabsContent>
        <TabsContent value="mood" className="space-y-4">
          <p className="text-xs rounded-xl p-2.5 font-medium" style={{background:'rgba(29,111,184,0.08)', color:'#1B2A4A', border:'1px solid rgba(29,111,184,0.15)'}}>❤️ Select how you're feeling right now (anxious, sad, grateful, hopeful...) and the AI will match you to the most relevant authenticated du'a with Arabic text, transliteration, audio and a personal reflection.</p>
          <MoodDuaMatcher />
        </TabsContent>
        <TabsContent value="dhikr" className="space-y-4">
          <p className="text-xs rounded-xl p-2.5 font-medium" style={{background:'rgba(29,111,184,0.08)', color:'#1B2A4A', border:'1px solid rgba(29,111,184,0.15)'}}>📿 Digital tasbih counter for Subhanallah / Alhamdulillah / Allahu Akbar and custom phrases. Also explore all 99 Names of Allah (Asmaul Husna) with meanings.</p>
          <DigitalTasbih />
          <AsmaulHusna />
        </TabsContent>
        <TabsContent value="hadith" className="space-y-4">
          <p className="text-xs rounded-xl p-2.5 font-medium" style={{background:'rgba(29,111,184,0.08)', color:'#1B2A4A', border:'1px solid rgba(29,111,184,0.15)'}}>📚 Daily Hadith from Bukhari, Muslim & others. The AI Recommender suggests Hadith relevant to your life. Spaced Repetition helps you memorise and review Hadith over time (like flashcards).</p>
          <DailyHadithWidget />
          <AIHadithRecommender />
          <HadithSpacedRepetition />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** Zakat & Finance — fully unified */
function ZakatContent() {
  return (
    <div className="space-y-1">
      <p className="text-xs mb-3 font-medium" style={{color:'#2D4A65'}}>
        All Islamic finance and charity tools in one place. Calculate your Zakat, log Sadaqah, auto-track from expenses, plan finances Islamically, and run a family Sadaqah jar.
      </p>
      <Tabs defaultValue="calculator">
        <TabsList className="grid grid-cols-4 w-full h-auto mb-4">
          <TabsTrigger value="calculator" className="text-[11px] py-2">🧮 Zakat Calc</TabsTrigger>
          <TabsTrigger value="sadaqah" className="text-[11px] py-2">💝 Sadaqah</TabsTrigger>
          <TabsTrigger value="auto" className="text-[11px] py-2">🤖 Auto-Track</TabsTrigger>
          <TabsTrigger value="finance" className="text-[11px] py-2">💰 Finance</TabsTrigger>
        </TabsList>
        <TabsContent value="calculator" className="space-y-4">
          <p className="text-xs rounded-xl p-2.5 font-medium" style={{background:'rgba(29,111,184,0.08)', color:'#1B2A4A', border:'1px solid rgba(29,111,184,0.15)'}}>🧮 Enter your assets (cash, gold, silver, investments) and liabilities. The calculator works out your total zakatable wealth, checks against the Nisab threshold, and shows exactly how much Zakat you owe (2.5%). Multi-currency supported.</p>
          <ZakatCalculatorPanel onZakatCalculated={() => {}} />
        </TabsContent>
        <TabsContent value="sadaqah" className="space-y-4">
          <p className="text-xs rounded-xl p-2.5 font-medium" style={{background:'rgba(29,111,184,0.08)', color:'#1B2A4A', border:'1px solid rgba(29,111,184,0.15)'}}>💝 Log your voluntary charity (Sadaqah) and Zakat payments. See your giving history and impact. The Family Sadaqah Jar is a shared virtual charity pot — your whole family contributes towards a monthly goal together.</p>
          <ZakatSadaqaDashboard />
          <FamilySadaqahJar />
        </TabsContent>
        <TabsContent value="auto" className="space-y-4">
          <p className="text-xs rounded-xl p-2.5 font-medium" style={{background:'rgba(29,111,184,0.08)', color:'#1B2A4A', border:'1px solid rgba(29,111,184,0.15)'}}>🤖 Auto-Track analyses your expense history and savings to automatically estimate your zakatable wealth without you having to enter everything manually. Useful as a quick sanity check alongside the manual calculator.</p>
          <AutoZakatTracker />
        </TabsContent>
        <TabsContent value="finance" className="space-y-4">
          <p className="text-xs rounded-xl p-2.5 font-medium" style={{background:'rgba(29,111,184,0.08)', color:'#1B2A4A', border:'1px solid rgba(29,111,184,0.15)'}}>💰 Islamic Financial Planning gives AI-guided advice on halal investing, avoiding riba (interest), and planning your finances according to Islamic principles. Also includes inheritance (Mirath) and Fidyah/Kaffarah calculators.</p>
          <IslamicFinancialPlanner />
          <IslamicInheritanceCalculator />
          <FidyahKaffarahCalculator />
          <IslamicFinanceCalculator />
          <IslamicMarriagePlanner />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** Knowledge — AI Tutor + Khutbah Notes + Life Score */
function KnowledgeContent() {
  return (
    <div className="space-y-4">
      <p className="text-xs rounded-xl p-2.5 font-medium" style={{background:'rgba(29,111,184,0.08)', color:'#1B2A4A', border:'1px solid rgba(29,111,184,0.15)'}}>🎓 Ask anything about Islam (Fiqh, Quran, Hadith), record and summarise Friday sermons (Khutbah) with AI, and track your overall Islamic Life Score and learning path.</p>
      <IslamicAITutor />
      <KhutbahNotes />
      <IslamicLifeScore />
      <IslamicLearningPath />
    </div>
  );
}

// ── Section definitions (reorganised — no duplicates) ─────────────────────────
const SECTION_GROUPS = [
  {
    id: 'prayer_worship',
    label: '🕌 Prayer & Worship',
    sections: [
      {
        id: 'prayer',
        icon: Sunrise,
        label: 'Prayer',
        arabic: 'الصلاة',
        desc: 'Times · Adhan · Tracker · Badges · Habits',
        gradient: 'from-[#1D6FB8] to-[#29ABE2]',
        content: () => <PrayerContent />,
      },
    ],
  },
  {
    id: 'quran_section',
    label: '📖 Quran',
    sections: [
      {
        id: 'quran',
        icon: BookOpen,
        label: 'Quran',
        arabic: 'القرآن',
        desc: 'Read · Listen · Tajweed Check · Progress',
        gradient: 'from-[#0D4F6C] to-[#1D6FB8]',
        content: () => <QuranContent />,
      },
    ],
  },
  {
    id: 'dua_section',
    label: '🤲 Du\'a, Dhikr & Hadith',
    sections: [
      {
        id: 'dua',
        icon: Hand,
        label: "Du'a, Dhikr & Hadith",
        arabic: 'الدعاء',
        desc: "Library · AI Generator · Mood Match · Tasbih · Hadith",
        gradient: 'from-[#29ABE2] to-[#7BB8D4]',
        content: () => <DuaContent />,
      },
      {
        id: 'ai_tutor',
        icon: Sparkles,
        label: 'Islamic Knowledge',
        arabic: 'المعلم',
        desc: 'AI Tutor · Khutbah Notes · Life Score',
        gradient: 'from-[#4A55A2] to-[#1D6FB8]',
        content: () => <KnowledgeContent />,
      },
    ],
  },
  {
    id: 'ramadan_hajj',
    label: '🌙 Ramadan & Hajj',
    sections: [
      {
        id: 'ramadan',
        icon: Moon,
        label: 'Ramadan',
        arabic: 'رمضان',
        desc: 'Fasting · Iftar · Goals · Leaderboard',
        gradient: 'from-[#2D4A65] to-[#4A6E8A]',
        content: () => (
          <div className="space-y-4">
            <p className="text-xs rounded-xl p-2.5 font-medium" style={{background:'rgba(29,111,184,0.08)', color:'#1B2A4A', border:'1px solid rgba(29,111,184,0.15)'}}>🌙 Full Ramadan dashboard: track your fast each day, set Suhoor/Iftar alarms, plan the blessed last 10 nights, join community challenges, and count down to the next Ramadan.</p>
            <RamadanDashboard />
            <RamadanCountdownPlanner />
          </div>
        ),
      },
      {
        id: 'hajj',
        icon: Map,
        label: 'Hajj & Umrah',
        arabic: 'الحج',
        desc: 'Full guide · Rituals · Ziyarat · Diary',
        gradient: 'from-[#1B2A4A] to-[#2D4A65]',
        isLink: 'HajjUmrahDashboard',
      },
      {
        id: 'travel_companion',
        icon: Map,
        label: 'Travel Companion',
        arabic: 'السفر',
        desc: 'Halal food finder · Prayer abroad',
        gradient: 'from-[#0D4F6C] to-[#2980B9]',
        content: () => (
          <div className="space-y-4">
            <p className="text-xs rounded-xl p-2.5 font-medium" style={{background:'rgba(29,111,184,0.08)', color:'#1B2A4A', border:'1px solid rgba(29,111,184,0.15)'}}>✈️ Travelling abroad? This activates Travel Mode — uses your GPS to show local prayer times in your destination timezone, find halal restaurants nearby (2km radius), and locate mosques (5km radius).</p>
            <IslamicTravelCompanion />
          </div>
        ),
      },
    ],
  },
  {
    id: 'zakat_finance',
    label: '💰 Zakat, Sadaqah & Finance',
    sections: [
      {
        id: 'zakat',
        icon: Heart,
        label: 'Zakat & Finance',
        arabic: 'الزكاة',
        desc: 'Calculator · Sadaqah · Auto-Track · Planning',
        gradient: 'from-[#1D6FB8] to-[#4A55A2]',
        content: () => <ZakatContent />,
      },
    ],
  },
  {
    id: 'unique_tools',
    label: '✨ Unique Islamic Tools',
    sections: [
      {
        id: 'hijri_calendar',
        icon: Calendar,
        label: 'Hijri Calendar',
        arabic: 'التقويم الهجري',
        desc: 'Islamic dates · Events · Blessed days',
        gradient: 'from-[#2980B9] to-[#29ABE2]',
        content: () => (
          <div className="space-y-4">
            <p className="text-xs rounded-xl p-2.5 font-medium" style={{background:'rgba(29,111,184,0.08)', color:'#1B2A4A', border:'1px solid rgba(29,111,184,0.15)'}}>🗓️ View the full Islamic (Hijri) calendar with important dates automatically highlighted — Eid, Ramadan, Muharram, Shaban and more. Import events to your main calendar.</p>
            <HijriEventsCalendar />
            <BlessedDaysPanel limit={5} />
          </div>
        ),
      },
      {
        id: 'hijri_birthdays',
        icon: Calendar,
        label: 'Hijri Dates',
        arabic: 'المناسبات',
        desc: 'Birthdays & anniversaries on Hijri calendar',
        gradient: 'from-[#4A6E8A] to-[#7BB8D4]',
        content: () => (
          <div className="space-y-4">
            <p className="text-xs rounded-xl p-2.5 font-medium" style={{background:'rgba(29,111,184,0.08)', color:'#1B2A4A', border:'1px solid rgba(29,111,184,0.15)'}}>🎂 Convert any Gregorian date (birthdays, anniversaries, Islamic milestones) to its Hijri equivalent. The app automatically reminds you on the correct Islamic calendar date each year.</p>
            <HijriBirthdayTracker />
          </div>
        ),
      },
      {
        id: 'life_timeline',
        icon: Star,
        label: 'Life Timeline',
        arabic: 'الرحلة',
        desc: 'Spiritual milestones · Visual journey map',
        gradient: 'from-[#1B2A4A] to-[#4A55A2]',
        content: () => (
          <div className="space-y-4">
            <p className="text-xs rounded-xl p-2.5 font-medium" style={{background:'rgba(29,111,184,0.08)', color:'#1B2A4A', border:'1px solid rgba(29,111,184,0.15)'}}>🗺️ A visual map of your spiritual journey from birth to now — birth, first Quran reading, Hajj, marriage, and other milestones. Auto-populated from your activity and fully editable.</p>
            <IslamicLifeTimeline />
          </div>
        ),
      },
    ],
  },
  {
    id: 'community',
    label: '🏡 Community & Maps',
    sections: [
      {
        id: 'family_hub',
        icon: Users,
        label: 'Family Hub',
        arabic: 'الأسرة',
        desc: 'Prayer goals · Hajj · Zakat · Budget',
        gradient: 'from-[#0D4F6C] to-[#1D6FB8]',
        isLink: 'FamilyHub',
      },
      {
        id: 'mosque_map',
        icon: Map,
        label: 'Mosque Finder',
        arabic: 'المساجد',
        desc: 'Map · Services · Claim listing',
        gradient: 'from-[#2980B9] to-[#29ABE2]',
        isLink: 'MosqueMap',
      },
    ],
  },
];

// Flatten all sections for lookup
const ALL_SECTIONS = SECTION_GROUPS.flatMap(g => g.sections);

function Islam() {
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState(null);

  const section = ALL_SECTIONS.find(s => s.id === activeSection);

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['prayerLogs'] });
    await queryClient.invalidateQueries({ queryKey: ['verses'] });
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen pb-safe">
        <div className="max-w-2xl lg:max-w-5xl mx-auto px-3 sm:px-5 py-4 lg:py-8 space-y-6">
          <AnimatePresence mode="wait">
            {activeSection && section ? (
              /* ── Section detail view ── */
              <motion.div key={`section-${activeSection}`}
                initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
                className="space-y-4">
                {/* Back button — always visible */}
                <button onClick={() => setActiveSection(null)}
                  className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#1D6FB8] dark:hover:text-[#29ABE2] transition-colors min-h-[44px] -ml-1 px-1">
                  <ArrowLeft className="w-4 h-4" /> Back to Islam
                </button>
                <div className={`flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r ${section.gradient} shadow-md`}>
                  <div className="p-2.5 bg-white/20 rounded-xl">
                    <section.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white">{section.label}</h2>
                    <p className="text-xs text-white/70" dir="rtl">{section.arabic}</p>
                  </div>
                </div>
                <section.content />
              </motion.div>
            ) : (
              /* ── Overview ── */
              <motion.div key="overview"
                initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }}
                className="space-y-6">

                {/* Header banner */}
                <div className="relative overflow-hidden rounded-2xl p-5 shadow-lg" style={{background:'linear-gradient(135deg, #0D1A2A 0%, #1B2A4A 25%, #0D4F6C 60%, #1D6FB8 100%)', border:'1px solid rgba(41,171,226,0.3)'}}>
                  <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-1">
                      <Moon className="w-5 h-5" style={{color:'#E8B84B'}} />
                      <span className="text-xs font-bold uppercase tracking-widest" style={{color:'#E8B84B'}}>Islamic Hub</span>
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Islam</h1>
                    <p className="text-sm text-indigo-200 mt-1">Prayer · Quran · Du'a · Charity · Hajj · Knowledge</p>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="h-px flex-1 bg-white/20" />
                      <span className="text-white/60 text-xs" dir="rtl">بِسْمِ اللَّهِ</span>
                      <div className="h-px flex-1 bg-white/20" />
                    </div>
                  </div>
                </div>

                {/* Today's highlights */}
                <AsmaulHusna compact />
                <AdhanPlayer compact />
                <PrayerAndQiblaPanel />
                <IslamicAICompact />
                <GoalsStrip filterCategory="spiritual" linkTo="Wellness" filterLabel="Spiritual Goals" />
                <DailyVerse />

                {/* Section groups */}
                <div className="space-y-6">
                  {SECTION_GROUPS.map(group => (
                    <div key={group.id}>
                      <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                        {group.label}
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-full font-semibold">{group.sections.length}</span>
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {group.sections.map(s => (
                          <SectionTile key={s.id} section={s} onClick={() => setActiveSection(s.id)} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </PullToRefresh>
  );
}

export default function IslamPage() {
  return (
    <IslamicEditionGate page>
      <Islam />
    </IslamicEditionGate>
  );
}