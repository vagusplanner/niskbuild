import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import {
  Calendar, Moon, Heart, Plane, TrendingUp, Brain,
  Check, X, ArrowRight, Users, BookOpen, Bell,
  Shield, Zap, Menu, Target,
  Star, Globe, BarChart2,
  Gift, Trophy, Mic, Camera, Map, Sparkles, FileText
} from 'lucide-react';

const LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6965607bc386491646bad6e8/10b500d37_IMG_6630.png";

// ── Header ────────────────────────────────────────────────────────────────────
function LandingHeader({ onSignIn, onGetStarted }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);
  const scrollTo = (id) => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); setMobileOpen(false); };
  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled || mobileOpen ? 'bg-[#071224]/98 backdrop-blur-xl shadow-lg border-b border-[#E8B84B]/20' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <img src={LOGO} alt="Vagus Planner" className="w-9 h-9 rounded-xl object-cover ring-2 ring-[#E8B84B]/50" />
            <div>
              <div className="font-black text-[#E8B84B] text-base leading-tight tracking-tight">Vagus Planner</div>
              <div className="text-[8px] text-[#6de4be] tracking-widest uppercase font-medium">Life · Faith · Balance</div>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            {[['features','Features'],['unique','Unique Tools'],['how-it-works','How It Works'],['pricing','Pricing'],['compare','Compare Plans']].map(([id,label]) => (
              <button key={id} onClick={() => scrollTo(id)} className="text-white/60 hover:text-white text-sm font-medium transition-colors">{label}</button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="hidden sm:flex border-white/50 text-white bg-transparent hover:bg-white/15 hover:border-white h-9 text-sm min-h-[44px] font-semibold" onClick={onSignIn}>Sign In</Button>
            <Button className="bg-gradient-to-r from-[#E8B84B] to-[#f0c060] text-[#071224] font-bold h-9 text-sm hover:opacity-90 min-h-[44px]" onClick={onGetStarted}>Get Started Free</Button>
            <button className="md:hidden p-2 text-white/70 min-h-[44px] min-w-[44px] flex items-center justify-center" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
      {mobileOpen && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="md:hidden bg-[#071224] border-t border-[#E8B84B]/20 px-4 py-4 space-y-1">
          {[['features','Features'],['unique','Unique Tools'],['how-it-works','How It Works'],['pricing','Pricing'],['compare','Compare Plans']].map(([id,label]) => (
            <button key={id} onClick={() => scrollTo(id)} className="block w-full text-left py-2.5 px-2 text-white/70 hover:text-white text-sm font-medium rounded-lg hover:bg-white/5">{label}</button>
          ))}
          <div className="flex gap-2 pt-3 border-t border-white/10">
            <Button variant="outline" className="flex-1 border-white text-white bg-transparent hover:bg-white/15 text-sm font-semibold" onClick={onSignIn}>Sign In</Button>
            <Button className="flex-1 bg-[#E8B84B] text-[#071224] font-bold text-sm hover:opacity-90" onClick={onGetStarted}>Get Started</Button>
          </div>
        </motion.div>
      )}
    </header>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function HeroSection({ onGetStarted }) {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#060f1e] via-[#0a1f44] to-[#0f3460]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#E8B84B]/60 to-transparent" />
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-[#3ecfa0]/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 w-72 h-72 bg-[#E8B84B]/8 rounded-full blur-3xl pointer-events-none" />
      <div className="relative max-w-6xl mx-auto px-4 py-32 text-center">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <div className="inline-flex items-center gap-2 bg-[#E8B84B]/10 border border-[#E8B84B]/30 text-[#E8B84B] text-xs font-semibold px-4 py-2 rounded-full mb-8">
            <Star className="w-3.5 h-3.5 text-[#E8B84B] fill-[#E8B84B]" />
            The #1 Life OS for Muslims & Modern Planners — 100+ Features
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.08] mb-6">
            Plan Every Part<br />of Your Life<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E8B84B] via-[#f0c060] to-[#3ecfa0]">With Purpose & Faith</span>
          </h1>
          <p className="text-lg sm:text-xl text-white/80 max-w-2xl mx-auto mb-6 leading-relaxed font-medium">
            The world's most complete life planning platform — AI scheduling, wellness, finance, travel & a full <span className="text-[#E8B84B] font-bold">Islamic Edition</span> with prayer, Quran, Hajj, Zakat & 8 unique tools you won't find anywhere else.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
            <div className="flex items-center gap-2 bg-[#3ecfa0]/10 border border-[#3ecfa0]/30 rounded-xl px-4 py-2.5 text-sm text-white/80">
              <Zap className="w-4 h-4 text-[#3ecfa0] flex-shrink-0" />
              <div className="text-left"><div className="font-bold text-[#3ecfa0] text-xs">Standard Edition</div><div className="text-white/50 text-[10px]">Calendar · Wellness · Finance · Travel · AI · Goals</div></div>
            </div>
            <div className="flex items-center gap-2 bg-[#E8B84B]/10 border border-[#E8B84B]/30 rounded-xl px-4 py-2.5 text-sm text-white/80">
              <Moon className="w-4 h-4 text-[#E8B84B] flex-shrink-0" />
              <div className="text-left"><div className="font-bold text-[#E8B84B] text-xs">Islamic Edition</div><div className="text-white/50 text-[10px]">Prayer · Quran · Zakat · Hajj · Unique Islamic AI Tools</div></div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <Button size="lg" className="bg-gradient-to-r from-[#E8B84B] to-[#f0c060] text-[#071224] font-bold text-base px-8 h-12 shadow-xl shadow-[#E8B84B]/20 hover:opacity-90 hover:scale-105 transition-transform" onClick={onGetStarted}>
              Start Free Trial <ArrowRight className="w-5 h-5 ml-1" />
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white bg-transparent hover:bg-white/15 hover:border-white text-base px-8 h-12 font-semibold" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
              Explore All Features
            </Button>
          </div>
          <p className="text-white/40 text-sm font-medium">Free 14-day trial · No credit card required · Cancel anytime</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.35 }}
          className="mt-14 flex flex-wrap justify-center gap-2">
          {[
            { icon: Calendar, label: 'AI Calendar', color: 'text-[#38bdf8]' },
            { icon: Moon, label: 'Prayer Times', color: 'text-[#E8B84B]' },
            { icon: Heart, label: 'Wellness', color: 'text-rose-400' },
            { icon: Brain, label: 'AI Coach', color: 'text-purple-400' },
            { icon: Plane, label: 'Travel', color: 'text-[#3ecfa0]' },
            { icon: TrendingUp, label: 'Finance', color: 'text-emerald-400' },
            { icon: Mic, label: 'Voice AI', color: 'text-pink-400' },
            { icon: Gift, label: 'Hijri Dates', color: 'text-amber-400' },
            { icon: Trophy, label: 'Badges', color: 'text-yellow-400' },
            { icon: Camera, label: 'Halal Scanner', color: 'text-teal-400' },
            { icon: Target, label: 'Goals', color: 'text-orange-400' },
            { icon: Users, label: 'Family Hub', color: 'text-blue-400' },
          ].map(({ icon: Icon, label, color }) => (
            <div key={label} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-white/65 hover:bg-white/10 hover:text-white transition-colors">
              <Icon className={`w-3.5 h-3.5 ${color}`} />{label}
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ── Stats ─────────────────────────────────────────────────────────────────────
function StatsSection() {
  return (
    <section className="bg-[#0a1a38]/90 border-y border-[#E8B84B]/20 py-14">
      <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-5 gap-8">
        {[['15+','Life Modules'],['100+','Features'],['8','Unique Islamic Tools'],['5','Languages'],['★ 4.9','User Rating']].map(([value,label]) => (
          <motion.div key={label} whileInView={{ opacity:1,y:0 }} initial={{ opacity:0,y:20 }} viewport={{ once:true }} className="text-center">
            <div className="text-3xl font-black text-[#E8B84B] mb-1">{value}</div>
            <div className="text-white/70 text-sm font-medium">{label}</div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ── Features ──────────────────────────────────────────────────────────────────
function FeaturesSection() {
  const [tab, setTab] = useState('standard');
  const standardFeatures = [
    { icon: Calendar, ic:'text-blue-400', grad:'from-blue-500/15 to-blue-600/5', title:'AI-Powered Calendar', desc:'Smart scheduling, conflict detection, recurring events, Google Calendar sync & AI time-blocking.' },
    { icon: Brain, ic:'text-purple-400', grad:'from-purple-500/15 to-purple-600/5', title:'AI Daily Assistant', desc:'Natural language events, daily briefings, meeting prep, voice commands & context-aware AI.' },
    { icon: Heart, ic:'text-rose-400', grad:'from-rose-500/15 to-rose-600/5', title:'Wellness Tracking', desc:'Sleep, mood, nutrition & exercise. Period tracker, AI health coach & personalised insights.' },
    { icon: TrendingUp, ic:'text-emerald-400', grad:'from-emerald-500/15 to-emerald-600/5', title:'Finance Tracker', desc:'Multi-currency income, expenses, savings. CSV import, AI advisor & budget alerts.' },
    { icon: Plane, ic:'text-cyan-400', grad:'from-cyan-500/15 to-cyan-600/5', title:'Smart Travel Planner', desc:'AI itinerary builder, real-time alerts, Gmail booking scanner & visa checker.' },
    { icon: Target, ic:'text-orange-400', grad:'from-orange-500/15 to-orange-600/5', title:'Goals & Habits', desc:'Daily habit heatmaps, milestone tracking, gamification badges, streaks & AI goal planner.' },
    { icon: Users, ic:'text-indigo-400', grad:'from-indigo-500/15 to-indigo-600/5', title:'Team & Family Collab', desc:'Shared calendars, group chats, collaborative goals, meeting polls & real-time sync.' },
    { icon: BarChart2, ic:'text-teal-400', grad:'from-teal-500/15 to-teal-600/5', title:'Smart Analytics', desc:'Weekly insights, productivity scores, time ROI reports & predictive scheduling.' },
    { icon: Mic, ic:'text-pink-400', grad:'from-pink-500/15 to-pink-600/5', title:'Voice Journal', desc:'Record thoughts, AI extracts tasks & emotional insights, syncs to planner automatically.' },
    { icon: FileText, ic:'text-violet-400', grad:'from-violet-500/15 to-violet-600/5', title:'AI Meeting Notes', desc:'Auto-summarize meetings, extract action items, create follow-up tasks instantly.' },
    { icon: Bell, ic:'text-amber-400', grad:'from-amber-500/15 to-amber-600/5', title:'Smart Notifications', desc:'Per-feature notification preferences, quiet hours, weekly digest & push notifications.' },
    { icon: Globe, ic:'text-sky-400', grad:'from-sky-500/15 to-sky-600/5', title:'5 Languages', desc:'Full support for English, Arabic, French, Turkish & Urdu with RTL layouts.' },
  ];
  const islamicFeatures = [
    { icon: Moon, ic:'text-[#E8B84B]', grad:'from-amber-500/15 to-amber-600/5', title:'Prayer Times & Adhan', desc:'Auto-calculated prayer times, audio Adhan player, Qibla compass & mosque finder.' },
    { icon: BookOpen, ic:'text-emerald-400', grad:'from-emerald-500/15 to-emerald-600/5', title:'Full Quran Reader', desc:'Verse-by-verse audio, AI Tafsir, reading plans, memorisation tracker & learning path.' },
    { icon: Mic, ic:'text-green-400', grad:'from-green-500/15 to-green-600/5', title:'🆕 Quran Voice Check', desc:'Recite into mic — AI checks your Tajweed accuracy with a 0–100 score & coaching tips.' },
    { icon: Star, ic:'text-violet-400', grad:'from-violet-500/15 to-violet-600/5', title:'Ramadan Planner', desc:'Suhoor/Iftar alarms, fasting tracker, Laylat al-Qadr planner & community leaderboard.' },
    { icon: Map, ic:'text-rose-400', grad:'from-rose-500/15 to-rose-600/5', title:'Hajj & Umrah Guide', desc:'Step-by-step ritual tracker, group planner, packing list, visa checker & AI pilgrimage guide.' },
    { icon: TrendingUp, ic:'text-amber-400', grad:'from-amber-500/15 to-amber-600/5', title:'Zakat Calculator', desc:'Multi-currency Zakat al-Māl calculator with gold/silver prices, wealth breakdown & history.' },
    { icon: Heart, ic:'text-pink-400', grad:'from-pink-500/15 to-pink-600/5', title:'🆕 Mood → Du\'a Matcher', desc:'Feeling anxious or sad? AI suggests the perfect authenticated Du\'a with Arabic audio & reflection.' },
    { icon: Trophy, ic:'text-yellow-400', grad:'from-yellow-500/15 to-yellow-600/5', title:'🆕 Prayer Streak Badges', desc:'Gamified spiritual achievements — mint badges for streaks, all-5-prayer days & Fajr mastery.' },
    { icon: Gift, ic:'text-orange-400', grad:'from-orange-500/15 to-orange-600/5', title:'🆕 Hijri Birthday Tracker', desc:'Converts Gregorian dates to Hijri — annual reminders auto-sync to your calendar on the correct Islamic date.' },
    { icon: FileText, ic:'text-teal-400', grad:'from-teal-500/15 to-teal-600/5', title:'🆕 AI Khutbah Notes', desc:'Record Friday sermon, AI summarizes key points & creates action items directly in your planner.' },
    { icon: Camera, ic:'text-cyan-400', grad:'from-cyan-500/15 to-cyan-600/5', title:'🆕 Islamic Travel Companion', desc:'Real-time halal food scanner via camera + prayer time auto-adjustment for any travel destination.' },
    { icon: Users, ic:'text-rose-400', grad:'from-rose-500/15 to-rose-600/5', title:'🆕 Family Sadaqah Jar', desc:'Shared family charity pot with monthly goal progress bar, contributor leaderboard & tracking.' },
    { icon: Sparkles, ic:'text-violet-400', grad:'from-violet-500/15 to-violet-600/5', title:'🆕 Islamic Life Timeline', desc:'Visual milestone map from birth to Hajj — auto-populated from your activity, editable.' },
    { icon: Brain, ic:'text-teal-400', grad:'from-teal-500/15 to-teal-600/5', title:'AI Islamic Coach', desc:'Personalised spiritual goals, AI Dua generator, Hadith recommender & Islamic life score.' },
    { icon: Heart, ic:'text-pink-400', grad:'from-pink-500/15 to-pink-600/5', title:'Sunnah & Dhikr', desc:'Digital tasbih, Sunnah habit tracker, daily Asmaul Husna & Dua library with audio.' },
    { icon: Plane, ic:'text-cyan-400', grad:'from-cyan-500/15 to-cyan-600/5', title:'Islamic Travel Mode', desc:'Halal restaurant finder, prayer room locator & Muslim-friendly itineraries worldwide.' },
  ];
  const features = tab === 'standard' ? standardFeatures : islamicFeatures;
  return (
    <section id="features" className="py-24 bg-gradient-to-b from-[#0a1a38] to-[#071224]">
      <div className="max-w-7xl mx-auto px-4">
        <motion.div whileInView={{ opacity:1,y:0 }} initial={{ opacity:0,y:30 }} viewport={{ once:true }} className="text-center mb-10">
          <Badge className="bg-[#3ecfa0]/15 text-[#3ecfa0] border-[#3ecfa0]/30 mb-4 font-semibold">Two Powerful Editions</Badge>
          <h2 className="text-4xl font-black text-white mb-4">One App. Every Version of You.</h2>
          <p className="text-white/70 text-lg max-w-xl mx-auto mb-8">Choose your edition — both packed with everything you need.</p>
          <div className="inline-flex items-center bg-white/5 border border-white/10 rounded-full p-1">
            <button onClick={() => setTab('standard')} className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${tab==='standard'?'bg-[#3ecfa0] text-[#071224]':'text-white/60 hover:text-white'}`}>⚡ Standard Edition</button>
            <button onClick={() => setTab('islamic')} className={`px-6 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-1.5 ${tab==='islamic'?'bg-[#E8B84B] text-[#071224]':'text-white/60 hover:text-white'}`}><Moon className="w-3.5 h-3.5" /> Islamic Edition</button>
          </div>
          {tab==='islamic' && <motion.p initial={{ opacity:0,y:-8 }} animate={{ opacity:1,y:0 }} className="text-[#E8B84B] text-sm font-semibold mt-4">✦ Includes all Standard features + everything below (8 unique tools found nowhere else)</motion.p>}
        </motion.div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map(({ icon:Icon, grad, ic, title, desc }, i) => (
            <motion.div key={title} whileInView={{ opacity:1,y:0 }} initial={{ opacity:0,y:30 }} viewport={{ once:true }} transition={{ delay: i*0.04 }}
              className={`bg-gradient-to-br ${grad} border border-white/8 rounded-2xl p-5 hover:border-white/20 transition-all group cursor-default`}>
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Icon className={`w-5 h-5 ${ic}`} />
              </div>
              {title.startsWith('🆕') ? (
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[9px] font-black bg-[#E8B84B] text-[#071224] px-1.5 py-0.5 rounded-full">NEW</span>
                  <h3 className="text-white font-bold text-sm">{title.replace('🆕 ','')}</h3>
                </div>
              ) : (
                <h3 className="text-white font-bold text-sm mb-2">{title}</h3>
              )}
              <p className="text-white/75 text-xs leading-relaxed mt-1">{desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Unique Islamic Tools Showcase ─────────────────────────────────────────────
function UniqueToolsSection({ onGetStarted }) {
  const tools = [
    { emoji:'🎂', title:'Hijri Birthday & Anniversary Tracker', desc:'Automatically converts Gregorian dates to Hijri and creates recurring annual reminders on the exact correct Islamic calendar date — synced to your calendar.', color:'from-amber-400 to-orange-500', badge:'Smart Conversion' },
    { emoji:'🏆', title:'Prayer Streak NFT Badges', desc:'Gamified spiritual achievements — earn and mint badges for 7, 30, 100 & 365-day prayer streaks, all-5-prayers days, and Fajr mastery. Share your achievements.', color:'from-yellow-400 to-amber-600', badge:'Gamification' },
    { emoji:'📜', title:'AI Khutbah (Sermon) Notes', desc:'Record Friday sermons via voice — AI summarizes key points, extracts action items and automatically creates tasks in your planner. Never lose a lesson.', color:'from-teal-500 to-emerald-600', badge:'Voice AI' },
    { emoji:'✈️', title:'Islamic Travel Companion', desc:'Scan any food label with your camera to get instant Halal/Haram verdict with AI. Automatically fetches prayer times for your current or searched location.', color:'from-sky-500 to-cyan-600', badge:'Camera AI' },
    { emoji:'🫙', title:'Family Sadaqah Jar', desc:'A shared virtual charity pot for your whole family. Track contributions, set monthly goals, see who gave what, and celebrate when you reach your target together.', color:'from-rose-500 to-pink-600', badge:'Family Feature' },
    { emoji:'🎙️', title:'Quran Voice Check (Tajweed AI)', desc:'Recite any Surah into your microphone and receive an AI-powered Tajweed accuracy score (0–100) with specific rules to practice and encouraging feedback.', color:'from-emerald-500 to-green-600', badge:'AI Recitation' },
    { emoji:'✨', title:'Islamic Life Timeline', desc:'A beautiful visual milestone map of your spiritual journey — from birth to Hajj completion. Auto-populates from your prayer logs, Quran progress and achievements.', color:'from-violet-500 to-purple-600', badge:'Visual Journey' },
    { emoji:'❤️', title:"Mood → Du'a Matcher", desc:"Feeling anxious, sad, or grateful? AI suggests the most relevant authenticated Du'a with full Arabic text, transliteration, audio playback and a personal Islamic reflection.", color:'from-rose-400 to-pink-500', badge:'Emotional AI' },
  ];
  return (
    <section id="unique" className="py-24 bg-[#071224]">
      <div className="max-w-7xl mx-auto px-4">
        <motion.div whileInView={{ opacity:1,y:0 }} initial={{ opacity:0,y:30 }} viewport={{ once:true }} className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-[#E8B84B]/10 border border-[#E8B84B]/30 text-[#E8B84B] text-xs font-semibold px-4 py-2 rounded-full mb-6">
            <Sparkles className="w-3.5 h-3.5" /> Exclusive Features You Won't Find Anywhere Else
          </div>
          <h2 className="text-4xl font-black text-white mb-4">8 Unique Islamic Tools</h2>
          <p className="text-white/70 text-lg max-w-2xl mx-auto">Built specifically for the Muslim community — tools no other productivity app has.</p>
        </motion.div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {tools.map((t, i) => (
            <motion.div key={t.title} whileInView={{ opacity:1,y:0 }} initial={{ opacity:0,y:30 }} viewport={{ once:true }} transition={{ delay: i*0.06 }}
              className="relative rounded-2xl overflow-hidden group cursor-default">
              <div className={`absolute inset-0 bg-gradient-to-br ${t.color} opacity-10 group-hover:opacity-15 transition-opacity`} />
              <div className="relative border border-white/10 group-hover:border-white/20 rounded-2xl p-5 h-full transition-all bg-white/[0.02]">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-3xl">{t.emoji}</span>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full bg-gradient-to-r ${t.color} text-white`}>{t.badge}</span>
                </div>
                <h3 className="text-white font-bold text-sm mb-2 leading-tight">{t.title}</h3>
                <p className="text-white/65 text-xs leading-relaxed">{t.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
        <div className="text-center mt-10">
          <Button size="lg" className="bg-gradient-to-r from-[#E8B84B] to-[#f0c060] text-[#071224] font-bold text-base px-10 h-12 hover:opacity-90" onClick={onGetStarted}>
            Try All 8 Tools Free <ArrowRight className="w-5 h-5 ml-1" />
          </Button>
        </div>
      </div>
    </section>
  );
}

// ── How It Works ──────────────────────────────────────────────────────────────
function HowItWorksSection({ onGetStarted }) {
  const steps = [
    { icon: Shield, title:'Sign Up Free', desc:'Create your account in seconds. 14-day trial, no credit card needed.' },
    { icon: Zap, title:'Personalise', desc:'Enable Islamic mode, connect your calendar, set goals and location.' },
    { icon: Star, title:'Plan & Thrive', desc:'Let AI guide your day. Schedule, track habits, and achieve your goals.' },
  ];
  return (
    <section id="how-it-works" className="py-24 bg-gradient-to-b from-[#071224] to-[#0a1a38]">
      <div className="max-w-5xl mx-auto px-4">
        <motion.div whileInView={{ opacity:1,y:0 }} initial={{ opacity:0,y:30 }} viewport={{ once:true }} className="text-center mb-16">
          <Badge className="bg-[#E8B84B]/15 text-[#E8B84B] border-[#E8B84B]/30 mb-4">Simple Setup</Badge>
          <h2 className="text-4xl font-black text-white mb-4">Up & Running in Minutes</h2>
        </motion.div>
        <div className="grid md:grid-cols-3 gap-10">
          {steps.map(({ icon:Icon, title, desc }, i) => (
            <motion.div key={title} whileInView={{ opacity:1,y:0 }} initial={{ opacity:0,y:30 }} viewport={{ once:true }} transition={{ delay: i*0.12 }} className="text-center">
              <div className="relative inline-block mb-6">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#1a4a6e] to-[#1a7ab8] border border-[#E8B84B]/20 flex items-center justify-center mx-auto">
                  <Icon className="w-8 h-8 text-[#E8B84B]" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#E8B84B] text-[#071224] text-xs font-black flex items-center justify-center">{i+1}</div>
              </div>
              <h3 className="text-white font-bold text-lg mb-3">{title}</h3>
              <p className="text-white/70 text-sm leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Pricing ───────────────────────────────────────────────────────────────────
function PricingSection({ onSelectPlan }) {
  const [yearly, setYearly] = useState(false);
  const [showIslamic, setShowIslamic] = useState(false);
  const standardPlans = [
    { name:'Free', monthlyPrice:0, yearlyPrice:0, border:'border-white/10', badge:null, highlighted:false, isCustom:false, isFree:true,
      features:['Basic Calendar','Task Management','Mobile Access','Limited AI','1 User'] },
    { name:'Basic', monthlyPrice:7.99, yearlyPrice:70, border:'border-white/10', badge:null, highlighted:false, isCustom:false,
      features:['Smart Calendar','Basic AI Assistant','Wellness Tracking','Goals & Habits','Mobile App','1 User'] },
    { name:'Pro', monthlyPrice:14.99, yearlyPrice:149, border:'border-[#E8B84B]/50', badge:'Most Popular', highlighted:true, isCustom:false,
      features:['Everything in Basic','Full AI Features','Advanced Analytics','Finance Tracker','Travel Planner','Team (5 users)','Priority Support'] },
    { name:'Enterprise', monthlyPrice:null, yearlyPrice:null, border:'border-[#3ecfa0]/30', badge:null, highlighted:false, isCustom:true,
      features:['Everything in Pro','Unlimited Members','Custom Integrations','API Access','White-label','Account Manager'] },
  ];
  const islamicPlans = [
    { name:'Free', monthlyPrice:0, yearlyPrice:0, border:'border-white/10', badge:null, highlighted:false, isCustom:false, isFree:true,
      features:['Basic Calendar','Prayer Times','Quran Reader','Task Management','Mobile Access'] },
    { name:'Basic Islamic', monthlyPrice:9.99, yearlyPrice:89, border:'border-white/10', badge:null, highlighted:false, isCustom:false,
      features:['Smart Calendar','Full Islamic Mode','Prayer & Qibla','Quran Reader','Wellness','Goals & Habits'] },
    { name:'Pro Islamic', monthlyPrice:17.99, yearlyPrice:179, border:'border-[#E8B84B]/50', badge:'Most Popular', highlighted:true, isCustom:false,
      features:['Everything in Basic Islamic','All 8 Unique Islamic Tools','Zakat Calculator','Ramadan Planner','Hajj Guide','AI Islamic Coach','Team (5 users)'] },
    { name:'Enterprise Islamic', monthlyPrice:null, yearlyPrice:null, border:'border-[#3ecfa0]/30', badge:null, highlighted:false, isCustom:true,
      features:['Everything in Pro Islamic','Unlimited Members','Mosque/Org Features','Custom Content','White-label','Account Manager'] },
  ];
  const plans = showIslamic ? islamicPlans : standardPlans;
  return (
    <section id="pricing" className="py-24 bg-gradient-to-b from-[#0a1a38] to-[#071224]">
      <div className="max-w-5xl mx-auto px-4">
        <motion.div whileInView={{ opacity:1,y:0 }} initial={{ opacity:0,y:30 }} viewport={{ once:true }} className="text-center mb-12">
          <Badge className="bg-[#38bdf8]/15 text-[#38bdf8] border-[#38bdf8]/30 mb-4 font-semibold">Simple, Transparent Pricing</Badge>
          <h2 className="text-4xl font-black text-white mb-3">Start Free. Scale Anytime.</h2>
          <p className="text-white/40 text-sm mb-6">14-day free trial · No credit card · Cancel anytime</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
            <div className="inline-flex items-center bg-white/5 border border-white/10 rounded-full p-1">
              <button onClick={() => setYearly(false)} className={`px-5 py-1.5 rounded-full text-sm font-medium transition-all ${!yearly?'bg-[#E8B84B] text-[#071224] font-bold':'text-white/60 hover:text-white'}`}>Monthly</button>
              <button onClick={() => setYearly(true)} className={`px-5 py-1.5 rounded-full text-sm font-medium transition-all ${yearly?'bg-[#E8B84B] text-[#071224] font-bold':'text-white/60 hover:text-white'}`}>Yearly <span className="text-[10px] opacity-70 ml-1">~20% off</span></button>
            </div>
            <div className="inline-flex items-center bg-white/5 border border-white/10 rounded-full p-1">
              <button onClick={() => setShowIslamic(false)} className={`px-5 py-1.5 rounded-full text-sm font-medium transition-all ${!showIslamic?'bg-[#3ecfa0] text-[#071224] font-bold':'text-white/60 hover:text-white'}`}>⚡ Standard</button>
              <button onClick={() => setShowIslamic(true)} className={`px-5 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${showIslamic?'bg-[#E8B84B] text-[#071224] font-bold':'text-white/60 hover:text-white'}`}><Moon className="w-3.5 h-3.5" /> Islamic</button>
            </div>
          </div>
        </motion.div>
        <div className="grid md:grid-cols-4 gap-6">
          {plans.map(({ name, monthlyPrice, yearlyPrice, border, badge, highlighted, features, isCustom, isFree }, i) => (
            <motion.div key={name} whileInView={{ opacity:1,y:0 }} initial={{ opacity:0,y:30 }} viewport={{ once:true }} transition={{ delay: i*0.08 }}
              className={`relative rounded-2xl border ${border} p-6 ${highlighted?'bg-gradient-to-b from-[#E8B84B]/5 to-[#1a4a6e]/10':'bg-white/[0.02]'}`}>
              {badge && <div className="absolute -top-3 left-1/2 -translate-x-1/2"><div className="bg-[#E8B84B] text-[#071224] font-bold text-xs px-4 py-1 rounded-full">{badge}</div></div>}
              <div className="mb-6">
                <h3 className="text-white font-bold text-lg mb-2">{name}</h3>
                <div className="flex items-end gap-1">
                  {isCustom ? <span className="text-3xl font-black text-white">Custom</span>
                   : isFree  ? <span className="text-3xl font-black text-white">Free</span>
                   : <><span className="text-3xl font-black text-white">${yearly?yearlyPrice:monthlyPrice}</span><span className="text-white/40 text-sm mb-1">/{yearly?'year':'month'}</span></>}
                </div>
                {!isCustom && !isFree && yearly && <p className="text-[#3ecfa0] text-xs mt-1">Saves ${(monthlyPrice*12-yearlyPrice).toFixed(0)}/year</p>}
                {isFree && <p className="text-white/50 text-xs mt-1">Forever free · No credit card</p>}
                {isCustom && <p className="text-white/50 text-xs mt-1">Contact us for pricing</p>}
              </div>
              <ul className="space-y-2.5 mb-6">
                {features.map(f => <li key={f} className="flex items-center gap-2 text-sm text-white/80"><Check className="w-4 h-4 text-[#3ecfa0] flex-shrink-0" />{f}</li>)}
              </ul>
              <Button onClick={() => onSelectPlan(name)} className={`w-full font-bold ${highlighted?'bg-gradient-to-r from-[#E8B84B] to-[#f0c060] text-[#071224] hover:opacity-90':'bg-white/10 text-white hover:bg-white/20 border border-white/10'}`}>
                {isCustom?'Contact Sales':isFree?'Get Started Free':'Start Free Trial'}
              </Button>
            </motion.div>
          ))}
        </div>
        <p className="text-center text-white/25 text-xs mt-6">All prices in USD · Islamic Edition includes all Standard features · <Link to="/TermsOfService" className="text-[#38bdf8]/60 hover:text-[#38bdf8]">Full terms</Link></p>
      </div>
    </section>
  );
}

// ── Full Feature Comparison ───────────────────────────────────────────────────
function ComparisonSection({ onSelectPlan }) {
  const [showIslamic, setShowIslamic] = useState(false);

  const Y = <Check className="w-4 h-4 text-emerald-400 mx-auto" />;
  const N = <X className="w-4 h-4 text-slate-600 mx-auto" />;
  const P = <span className="text-[#E8B84B] text-xs font-bold mx-auto block text-center">Pro+</span>;
  const C = <span className="text-[#38bdf8] text-xs font-bold mx-auto block text-center">Custom</span>;
  const num = (n) => <span className="text-white/70 text-xs font-bold block text-center">{n}</span>;

  const standardGroups = [
    {
      group: '📅 Calendar & Scheduling',
      rows: [
        ['Smart AI Calendar', Y, Y, Y, Y],
        ['Recurring Events (advanced)', N, Y, Y, Y],
        ['Google Calendar Sync', N, Y, Y, Y],
        ['Outlook Calendar Sync', N, N, Y, Y],
        ['AI Time Blocking', N, N, Y, Y],
        ['Meeting Scheduler & Polls', N, Y, Y, Y],
        ['Calendar Sharing', N, Y, Y, Y],
        ['Natural Language Event Entry', N, Y, Y, Y],
        ['Multiple Calendar Views', Y, Y, Y, Y],
        ['Public Holidays Overlay', N, Y, Y, Y],
      ]
    },
    {
      group: '🤖 AI & Automation',
      rows: [
        ['Daily AI Briefing', N, Y, Y, Y],
        ['AI Goal Planner', N, N, Y, Y],
        ['AI Meeting Notes & Summary', N, N, Y, Y],
        ['Voice Journal with AI Insights', N, Y, Y, Y],
        ['Proactive AI Suggestions', N, N, Y, Y],
        ['AI Financial Advisor', N, N, Y, Y],
        ['AI Health Coach', N, Y, Y, Y],
        ['AI Travel Planner', N, N, Y, Y],
        ['Workflow Automation', N, N, P, Y],
      ]
    },
    {
      group: '❤️ Wellness & Health',
      rows: [
        ['Mood Tracker', Y, Y, Y, Y],
        ['Sleep Tracker', N, Y, Y, Y],
        ['Exercise & Nutrition Log', N, Y, Y, Y],
        ['Period Tracker', N, Y, Y, Y],
        ['AI Health Insights', N, N, Y, Y],
        ['Body Metrics & Goals', N, Y, Y, Y],
      ]
    },
    {
      group: '💰 Finance',
      rows: [
        ['Expense Tracking', Y, Y, Y, Y],
        ['Budget Alerts', N, Y, Y, Y],
        ['Multi-currency Support', N, N, Y, Y],
        ['CSV Import', N, N, Y, Y],
        ['AI Financial Reports', N, N, Y, Y],
      ]
    },
    {
      group: '✈️ Travel',
      rows: [
        ['Trip Planner', N, Y, Y, Y],
        ['AI Itinerary Builder', N, N, Y, Y],
        ['Real-time Travel Alerts', N, N, Y, Y],
        ['Gmail Booking Scanner', N, N, Y, Y],
        ['Visa Info Checker', N, N, Y, Y],
      ]
    },
    {
      group: '👥 Collaboration',
      rows: [
        ['Users / Seats', num('1'), num('1'), num('5'), num('Unlimited')],
        ['Shared Calendars', N, Y, Y, Y],
        ['Group Chat', N, N, Y, Y],
        ['Team Task Board', N, N, Y, Y],
        ['Goal Collaboration', N, N, Y, Y],
        ['Real-time Co-editing', N, N, P, Y],
      ]
    },
    {
      group: '🎮 Gamification & Goals',
      rows: [
        ['Habit Tracker', Y, Y, Y, Y],
        ['Goals & Milestones', Y, Y, Y, Y],
        ['Badges & Achievements', N, Y, Y, Y],
        ['Leaderboards', N, N, Y, Y],
        ['Challenges', N, N, Y, Y],
        ['Streak Tracking', N, Y, Y, Y],
      ]
    },
    {
      group: '⚙️ Platform',
      rows: [
        ['Mobile App (iOS & Android)', Y, Y, Y, Y],
        ['Offline Mode', N, N, Y, Y],
        ['5 Languages + RTL', Y, Y, Y, Y],
        ['Dark Mode', Y, Y, Y, Y],
        ['Push Notifications', Y, Y, Y, Y],
        ['Custom Notification Prefs', N, Y, Y, Y],
        ['Priority Support', N, N, Y, Y],
        ['Dedicated Account Manager', N, N, N, C],
        ['Custom Integrations / API', N, N, N, Y],
        ['White-label Options', N, N, N, C],
      ]
    },
  ];

  const islamicGroups = [
    {
      group: '🕌 Prayer & Worship',
      rows: [
        ['Prayer Times (GPS-based)', Y, Y, Y, Y],
        ['Audio Adhan Player', N, Y, Y, Y],
        ['Qibla Compass', Y, Y, Y, Y],
        ['Sunnah / Nafl Logger', N, Y, Y, Y],
        ['Qada Prayer Tracker', N, Y, Y, Y],
        ['Prayer Calendar Sync', N, Y, Y, Y],
        ['Prayer Streak Badges 🆕', N, N, Y, Y],
        ['Advanced Prayer Analytics', N, N, Y, Y],
      ]
    },
    {
      group: '📖 Quran',
      rows: [
        ['Quran Reader (full)', Y, Y, Y, Y],
        ['Audio Recitation (Alafasy etc)', N, Y, Y, Y],
        ['AI Tafsir Explanations', N, N, Y, Y],
        ['Quran Memorization Tracker', N, Y, Y, Y],
        ['Quran Voice Check (Tajweed AI) 🆕', N, N, Y, Y],
        ['Reading Plans & Goals', N, Y, Y, Y],
        ['Verse Discussion Threads', N, N, Y, Y],
      ]
    },
    {
      group: '🤲 Dua, Dhikr & Hadith',
      rows: [
        ['Dua Library', Y, Y, Y, Y],
        ['Digital Tasbih', Y, Y, Y, Y],
        ['Mood → Du\'a Matcher (AI) 🆕', N, N, Y, Y],
        ['AI Dua Generator', N, N, Y, Y],
        ['Daily Hadith', Y, Y, Y, Y],
        ['AI Hadith Recommender', N, N, Y, Y],
        ['Hadith Spaced Repetition', N, N, Y, Y],
        ['99 Names (Asmaul Husna)', N, Y, Y, Y],
      ]
    },
    {
      group: '🌙 Ramadan & Fasting',
      rows: [
        ['Ramadan Dashboard', N, Y, Y, Y],
        ['Suhoor / Iftar Alarms', N, Y, Y, Y],
        ['Fasting Tracker', N, Y, Y, Y],
        ['Ramadan Goals & Challenges', N, N, Y, Y],
        ['Laylat al-Qadr Planner', N, N, Y, Y],
        ['Ramadan Leaderboard', N, N, Y, Y],
      ]
    },
    {
      group: '🕋 Hajj & Umrah',
      rows: [
        ['Hajj / Umrah Planner', N, Y, Y, Y],
        ['Step-by-step Ritual Tracker', N, N, Y, Y],
        ['Group Pilgrimage Manager', N, N, Y, Y],
        ['AI Pilgrimage Guide', N, N, Y, Y],
        ['Visa & Condition Checker', N, N, Y, Y],
        ['Packing List Generator', N, N, Y, Y],
      ]
    },
    {
      group: '💰 Zakat & Charity',
      rows: [
        ['Zakat Calculator', N, Y, Y, Y],
        ['Multi-year Zakat Tracker', N, N, Y, Y],
        ['Sadaqah Tracker', N, Y, Y, Y],
        ['Family Sadaqah Jar 🆕', N, N, Y, Y],
        ['Charity Directory', N, Y, Y, Y],
        ['Auto Zakat from Expenses', N, N, Y, Y],
      ]
    },
    {
      group: '🌟 Unique Islamic Tools',
      rows: [
        ['Hijri Birthday & Anniversary Tracker 🆕', N, N, Y, Y],
        ['AI Khutbah (Sermon) Notes 🆕', N, N, Y, Y],
        ['Islamic Travel Companion (Halal Scanner) 🆕', N, N, Y, Y],
        ['Quran Voice Check (Tajweed AI) 🆕', N, N, Y, Y],
        ['Prayer Streak Badges 🆕', N, N, Y, Y],
        ['Family Sadaqah Jar 🆕', N, N, Y, Y],
        ['Islamic Life Timeline 🆕', N, N, Y, Y],
        ['Mood → Du\'a Matcher 🆕', N, N, Y, Y],
      ]
    },
    {
      group: '🎓 Islamic Learning & Life',
      rows: [
        ['Islamic Life Score', N, Y, Y, Y],
        ['Islamic Learning Path', N, N, Y, Y],
        ['AI Islamic Coach', N, N, Y, Y],
        ['Hijri Calendar with Events', N, Y, Y, Y],
        ['Blessed Days Alerts', N, Y, Y, Y],
        ['Islamic Life Timeline 🆕', N, N, Y, Y],
        ['Islamic Marriage Planner', N, N, Y, Y],
        ['Inheritance Calculator', N, N, Y, Y],
        ['Mosque Finder & Map', N, Y, Y, Y],
        ['Mosque Community Events', N, N, Y, Y],
        ['Family Prayer Hub', N, N, Y, Y],
      ]
    },
  ];

  const groups = showIslamic ? islamicGroups : standardGroups;
  const planNames = showIslamic
    ? ['Free','Basic Islamic','Pro Islamic','Enterprise Islamic']
    : ['Free','Basic','Pro','Enterprise'];
  const planColors = ['text-white/50','text-white/80','text-[#E8B84B]','text-[#3ecfa0]'];

  return (
    <section id="compare" className="py-24 bg-[#071224]">
      <div className="max-w-5xl mx-auto px-4">
        <motion.div whileInView={{ opacity:1,y:0 }} initial={{ opacity:0,y:30 }} viewport={{ once:true }} className="text-center mb-10">
          <Badge className="bg-[#E8B84B]/15 text-[#E8B84B] border-[#E8B84B]/30 mb-4 font-semibold">Full Feature Comparison</Badge>
          <h2 className="text-4xl font-black text-white mb-4">What's Included in Each Plan</h2>
          <p className="text-white/60 mb-6">Every feature across all plans — no surprises.</p>
          <div className="inline-flex items-center bg-white/5 border border-white/10 rounded-full p-1">
            <button onClick={() => setShowIslamic(false)} className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${!showIslamic?'bg-[#3ecfa0] text-[#071224]':'text-white/60 hover:text-white'}`}>⚡ Standard Edition</button>
            <button onClick={() => setShowIslamic(true)} className={`px-6 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-1.5 ${showIslamic?'bg-[#E8B84B] text-[#071224]':'text-white/60 hover:text-white'}`}><Moon className="w-3.5 h-3.5" /> Islamic Edition</button>
          </div>
        </motion.div>

        <div className="overflow-x-auto rounded-2xl border border-white/10 shadow-2xl">
          {/* Header */}
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03]">
                <th className="text-left px-5 py-4 text-white/40 text-xs font-black uppercase tracking-widest w-[42%]">Feature</th>
                {planNames.map((name, i) => (
                  <th key={name} className={`px-3 py-4 text-center text-sm font-black ${planColors[i]} w-[14.5%]`}>{name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <React.Fragment key={g.group}>
                  <tr className="bg-white/[0.04] border-t border-b border-white/10">
                    <td colSpan={5} className="px-5 py-2.5 text-xs font-black text-white/50 uppercase tracking-widest">{g.group}</td>
                  </tr>
                  {g.rows.map(([feature, ...vals], ri) => (
                    <tr key={ri} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3 text-sm text-white/75">{String(feature).replace(' 🆕', '')}
                        {String(feature).includes('🆕') && <span className="ml-2 text-[9px] font-black bg-[#E8B84B] text-[#071224] px-1.5 py-0.5 rounded-full align-middle">NEW</span>}
                      </td>
                      {vals.map((v, vi) => (
                        <td key={vi} className="px-3 py-3 text-center">{v}</td>
                      ))}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 text-center">
          <Button size="lg" className="bg-gradient-to-r from-[#E8B84B] to-[#f0c060] text-[#071224] font-bold text-base px-10 h-12 hover:opacity-90" onClick={() => onSelectPlan('Pro Islamic')}>
            Get Pro {showIslamic ? 'Islamic' : ''} — Most Popular <ArrowRight className="w-5 h-5 ml-1" />
          </Button>
          <p className="text-white/30 text-xs mt-3">14-day free trial · No credit card · Cancel anytime</p>
        </div>
      </div>
    </section>
  );
}

// ── App Download ──────────────────────────────────────────────────────────────
function AppDownloadSection() {
  return (
    <section className="py-20 bg-[#071224]">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <motion.div whileInView={{ opacity:1,y:0 }} initial={{ opacity:0,y:30 }} viewport={{ once:true }}>
          <Badge className="bg-[#3ecfa0]/15 text-[#3ecfa0] border-[#3ecfa0]/30 mb-4 font-semibold">Mobile App</Badge>
          <h2 className="text-3xl font-black text-white mb-3">Take It Everywhere</h2>
          <p className="text-white/60 mb-8">Available on iOS & Android — plan your life on the go.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="https://apps.apple.com/app/vagus-planner" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 bg-black border border-white/20 hover:border-white/40 text-white rounded-xl px-6 py-3 transition-all hover:scale-105 min-w-[180px]">
              <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white flex-shrink-0"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
              <div className="text-left"><div className="text-[10px] text-white/60">Download on the</div><div className="text-base font-bold">App Store</div></div>
            </a>
            <a href="https://play.google.com/store/apps/details?id=com.vagusplanner" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 bg-black border border-white/20 hover:border-white/40 text-white rounded-xl px-6 py-3 transition-all hover:scale-105 min-w-[180px]">
              <svg viewBox="0 0 24 24" className="w-7 h-7 flex-shrink-0">
                <path fill="#4CAF50" d="M1.22 0L13.4 12 1.22 24c-.47-.33-.77-.88-.77-1.5V1.5C.45.88.75.33 1.22 0z"/>
                <path fill="#FF3D00" d="M17.85 8.34L4.28 1.06 13.4 12l4.45-3.66z"/>
                <path fill="#FFD600" d="M4.28 22.94l13.57-7.28L13.4 12 4.28 22.94z"/>
                <path fill="#2196F3" d="M22.21 10.85l-4.36-2.51L13.4 12l4.45 3.66 4.36-2.51c.67-.38 1.09-1.08 1.09-1.85s-.42-1.47-1.09-1.85z"/>
              </svg>
              <div className="text-left"><div className="text-[10px] text-white/60">Get it on</div><div className="text-base font-bold">Google Play</div></div>
            </a>
          </div>
          <p className="text-white/30 text-xs mt-5">iOS App submitted — pending App Store review · Android coming soon</p>
        </motion.div>
      </div>
    </section>
  );
}

// ── Referral ──────────────────────────────────────────────────────────────────
function ReferralSection({ onGetStarted }) {
  return (
    <section className="py-20 bg-gradient-to-b from-[#0a1a38] to-[#071224]">
      <div className="max-w-3xl mx-auto px-4">
        <motion.div whileInView={{ opacity:1,y:0 }} initial={{ opacity:0,y:30 }} viewport={{ once:true }}
          className="relative rounded-3xl border border-[#E8B84B]/30 bg-gradient-to-br from-[#E8B84B]/5 to-[#3ecfa0]/5 p-10 text-center overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
            <div className="w-80 h-80 bg-[#E8B84B] rounded-full blur-3xl" />
          </div>
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#E8B84B] to-[#f0c060] flex items-center justify-center mx-auto mb-5 shadow-xl shadow-[#E8B84B]/30">
              <Users className="w-8 h-8 text-[#071224]" />
            </div>
            <Badge className="bg-[#E8B84B]/15 text-[#E8B84B] border-[#E8B84B]/30 mb-4 font-semibold">Refer & Earn</Badge>
            <h2 className="text-3xl font-black text-white mb-3">Share the Love 🎁</h2>
            <p className="text-white/70 text-base mb-2 font-medium max-w-lg mx-auto">Invite friends and <span className="text-[#E8B84B] font-bold">earn 1 month free</span> for every friend who subscribes.</p>
            <p className="text-white/50 text-sm mb-8">Your friend gets 20% off their first month too.</p>
            <Button onClick={onGetStarted} className="bg-gradient-to-r from-[#E8B84B] to-[#f0c060] text-[#071224] font-bold px-8 h-12 hover:opacity-90">
              <Users className="w-4 h-4 mr-2" /> Refer a Friend
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ── CTA ───────────────────────────────────────────────────────────────────────
function CTASection({ onGetStarted }) {
  return (
    <section className="py-28 bg-gradient-to-b from-[#0a1a38] to-[#071224] relative overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] pointer-events-none">
        <div className="w-[700px] h-[700px] bg-[#E8B84B] rounded-full blur-3xl" />
      </div>
      <div className="relative max-w-3xl mx-auto px-4 text-center">
        <motion.div whileInView={{ opacity:1,y:0 }} initial={{ opacity:0,y:30 }} viewport={{ once:true }}>
          <div className="text-6xl mb-6">🌙</div>
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-6">Start Living With <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E8B84B] to-[#3ecfa0]">Purpose</span></h2>
          <p className="text-white/70 text-lg mb-10 font-medium">Join thousands who've transformed their daily routines with Vagus Planner.</p>
          <Button size="lg" className="bg-gradient-to-r from-[#E8B84B] to-[#f0c060] text-[#071224] font-bold text-lg px-12 h-14 shadow-2xl shadow-[#E8B84B]/20 hover:opacity-90" onClick={onGetStarted}>
            Start Your Free Trial <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          <p className="text-white/40 text-sm mt-4">14 days free · No credit card · Cancel anytime</p>
        </motion.div>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
function LandingFooter({ onSignIn }) {
  return (
    <footer className="bg-[#060f1e] border-t border-[#E8B84B]/20 py-10">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col md:flex-row items-start justify-between gap-8 mb-8">
          <div className="flex items-center gap-2.5">
            <img src={LOGO} alt="Vagus Planner" className="w-8 h-8 rounded-lg object-cover" />
            <div>
              <div className="font-black text-[#E8B84B] text-sm">Vagus Planner</div>
              <div className="text-[8px] text-[#6de4be] tracking-widest uppercase">Life · Faith · Balance</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-white/50 font-medium">
            <div className="space-y-2">
              <div className="text-white/30 text-[10px] uppercase tracking-widest font-semibold mb-1">Product</div>
              {[['#features','Features'],['#unique','Unique Tools'],['#pricing','Pricing'],['#compare','Compare Plans']].map(([href,label]) => (
                <a key={label} href={href} className="block hover:text-white/80 transition-colors">{label}</a>
              ))}
              <button onClick={onSignIn} className="block hover:text-white/80 transition-colors text-left">Sign In</button>
            </div>
            <div className="space-y-2">
              <div className="text-white/30 text-[10px] uppercase tracking-widest font-semibold mb-1">Legal</div>
              <Link to="/PrivacyPolicy" className="block hover:text-white/80 transition-colors">Privacy Policy</Link>
              <Link to="/TermsOfService" className="block hover:text-white/80 transition-colors">Terms of Service</Link>
              <Link to="/PrivacyPolicy" className="block hover:text-white/80 transition-colors">Cookie Policy</Link>
            </div>
            <div className="space-y-2">
              <div className="text-white/30 text-[10px] uppercase tracking-widest font-semibold mb-1">Support</div>
              <Link to="/Contact" className="block hover:text-white/80 transition-colors">Contact Us</Link>
              <Link to="/Contact" className="block hover:text-white/80 transition-colors">Data Request</Link>
              <Link to="/Contact" className="block hover:text-white/80 transition-colors">Report Issue</Link>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-white/30 text-xs font-medium">© 2026 Vagus Planner. All rights reserved.</div>
          <div className="flex gap-4 text-white/25 text-xs">
            <Link to="/PrivacyPolicy" className="hover:text-white/50 transition-colors">Privacy</Link>
            <Link to="/TermsOfService" className="hover:text-white/50 transition-colors">Terms</Link>
            <Link to="/Contact" className="hover:text-white/50 transition-colors">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Landing() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  useEffect(() => {
    base44.auth.isAuthenticated().then(setIsAuthenticated).catch(() => {});
  }, []);
  const goToLogin = (next = '/dashboard') => base44.auth.redirectToLogin(next);
  const handleSignIn = () => isAuthenticated ? navigate('/dashboard') : goToLogin('/dashboard');
  const handleGetStarted = () => isAuthenticated ? navigate('/dashboard') : goToLogin('/dashboard');
  const handleSelectPlan = (planName) => {
    if (planName?.includes('Enterprise')) { navigate('/Contact'); return; }
    if (isAuthenticated) navigate('/Billing'); else goToLogin('/Billing');
  };
  return (
    <div className="min-h-screen" style={{ background:'#060f1e' }}>
      <LandingHeader onSignIn={handleSignIn} onGetStarted={handleGetStarted} />
      <HeroSection onGetStarted={handleGetStarted} />
      <StatsSection />
      <FeaturesSection />
      <UniqueToolsSection onGetStarted={handleGetStarted} />
      <HowItWorksSection onGetStarted={handleGetStarted} />
      <PricingSection onSelectPlan={handleSelectPlan} />
      <ComparisonSection onSelectPlan={handleSelectPlan} />
      <ReferralSection onGetStarted={handleGetStarted} />
      <AppDownloadSection />
      <CTASection onGetStarted={handleGetStarted} />
      <LandingFooter onSignIn={handleSignIn} />
    </div>
  );
}