/**
 * Hadith Learning Page
 * Full spaced-repetition Hadith memorization hub with:
 * - Daily challenge mode with scoring
 * - Calendar integration (schedule future sessions)
 * - Progress visualization
 * - Wraps existing HadithSpacedRepetition component + adds challenge + calendar layer
 */
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Brain, Trophy, Calendar, Flame, Star,
  CheckCircle2, Clock, Plus, Sparkles, Target, BarChart2,
  ChevronRight, ArrowLeft, Eye, EyeOff, Zap, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format, parseISO, addDays } from 'date-fns';

// Reuse existing SRS component for the Browse/Add tab
import HadithSpacedRepetition from '@/components/islamic/HadithSpacedRepetition';

const TABS = [
  { id: 'challenge', label: 'Daily Challenge', icon: Brain },
  { id: 'learn',     label: 'SRS Deck',        icon: BookOpen },
  { id: 'progress',  label: 'Progress',         icon: BarChart2 },
  { id: 'schedule',  label: 'Schedule',         icon: Calendar },
];

// SM-2 score to colour helper
function scoreColor(score) {
  if (score >= 80) return 'text-emerald-600';
  if (score >= 50) return 'text-amber-500';
  return 'text-red-500';
}

// ── Challenge card component ───────────────────────────────────────────────────
function ChallengeCard({ card, onRate, onSkip, current, total }) {
  const [revealed, setRevealed] = useState(false);
  const [selected, setSelected] = useState(null);
  const [showAI, setShowAI] = useState(false);
  const [aiQ, setAiQ] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);

  const fetchAI = async () => {
    setLoadingAI(true);
    try {
      const res = await base44.functions.invoke('hadithSRSChallenge', {
        action: 'ai_challenge',
        hadith_text: card.hadith_text,
        hadith_narrator: card.hadith_narrator,
      });
      setAiQ(res.data);
      setShowAI(true);
    } catch { toast.error('Could not load quiz question'); }
    setLoadingAI(false);
  };

  const QUALITY = [
    { q: 0, label: 'Blackout', color: 'bg-red-500 hover:bg-red-600' },
    { q: 2, label: 'Hard', color: 'bg-amber-500 hover:bg-amber-600' },
    { q: 3, label: 'Good', color: 'bg-blue-500 hover:bg-blue-600' },
    { q: 5, label: 'Perfect', color: 'bg-emerald-600 hover:bg-emerald-700' },
  ];

  return (
    <motion.div key={card.id} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }} className="space-y-4">

      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-400 font-medium">{current}/{total}</span>
        <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <motion.div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
            animate={{ width: `${(current / total) * 100}%` }} />
        </div>
      </div>

      {/* Card */}
      <div className="rounded-2xl border border-amber-200 dark:border-amber-800/40 bg-white dark:bg-slate-800/60 overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-amber-100 dark:border-amber-800/30 bg-amber-50/50 dark:bg-amber-950/10 flex items-center justify-between">
          <span className="text-xs font-bold text-amber-700 dark:text-amber-300">#{card.hadith_number} · {card.hadith_collection?.toUpperCase()}</span>
          <span className="text-xs text-slate-400">{card.hadith_narrator}</span>
        </div>

        {card.hadith_arabic && (
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
            <p className="text-right text-lg leading-loose text-slate-800 dark:text-slate-100" dir="rtl">{card.hadith_arabic}</p>
          </div>
        )}

        <div className="px-5 py-4">
          {!revealed ? (
            <button onClick={() => setRevealed(true)}
              className="w-full flex items-center justify-center gap-2 py-6 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-600 text-slate-400 hover:border-amber-300 hover:text-amber-600 transition-colors">
              <Eye className="w-5 h-5" />
              <span className="text-sm font-medium">Reveal translation</span>
            </button>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Translation</p>
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">{card.hadith_text}</p>
            </motion.div>
          )}
        </div>
      </div>

      {/* AI Quiz */}
      {revealed && !showAI && (
        <button onClick={fetchAI} disabled={loadingAI}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/20 text-sm font-medium transition-colors">
          {loadingAI ? <><div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />Generating…</> : <><Brain className="w-4 h-4" />AI Challenge Question</>}
        </button>
      )}

      {showAI && aiQ && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/20 p-4 space-y-3">
          <p className="text-sm font-bold text-violet-800 dark:text-violet-200">🧠 {aiQ.question}</p>
          <div className="space-y-2">
            {(aiQ.options || []).map((opt, i) => (
              <button key={i} onClick={() => setSelected(i)}
                className={cn('w-full text-left text-xs p-3 rounded-xl border transition-colors',
                  selected === null ? 'border-violet-200 dark:border-violet-700 hover:bg-violet-100 dark:hover:bg-violet-900/30 text-slate-700 dark:text-slate-200' :
                  i === aiQ.correct_index ? 'border-green-400 bg-green-50 dark:bg-green-950/20 text-green-700 font-bold' :
                  selected === i ? 'border-red-400 bg-red-50 dark:bg-red-950/20 text-red-600' :
                  'border-slate-200 dark:border-slate-700 text-slate-400')}>
                <span className="font-bold mr-1.5">{['A','B','C','D'][i]}.</span>{opt}
              </button>
            ))}
          </div>
          {selected !== null && aiQ.explanation && (
            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-violet-200 dark:border-violet-700">
              <p className="text-xs text-slate-600 dark:text-slate-300">💡 {aiQ.explanation}</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Rating */}
      {revealed && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide text-center">Rate your recall</p>
          <div className="grid grid-cols-4 gap-2">
            {QUALITY.map(btn => (
              <button key={btn.q} onClick={() => onRate(card, btn.q)}
                className={cn('py-3 rounded-xl text-white font-bold text-xs transition-all hover:scale-105', btn.color)}>
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <button onClick={() => onSkip(card)} className="w-full text-center text-xs text-slate-400 hover:text-slate-600 py-1">
        Skip →
      </button>
    </motion.div>
  );
}

// ── Schedule modal ─────────────────────────────────────────────────────────────
function ScheduleModal({ onClose, onScheduled }) {
  const [days, setDays] = useState(1);
  const [numDays, setNumDays] = useState(7);
  const [saving, setSaving] = useState(false);

  const handleSchedule = async () => {
    setSaving(true);
    let created = 0;
    for (let i = 0; i < numDays; i++) {
      const date = format(addDays(new Date(), days + i), 'yyyy-MM-dd');
      try {
        await base44.entities.Event.create({
          title: '📿 Hadith Daily Challenge',
          description: `Daily Hadith memorization challenge session. Review your deck and track your score.`,
          start_date: `${date}T09:00:00`,
          end_date: `${date}T09:30:00`,
          is_all_day: false,
          category: 'personal',
          location: 'Hadith Learning',
        });
        created++;
      } catch {}
    }
    setSaving(false);
    toast.success(`${created} challenge sessions added to your calendar!`);
    onScheduled();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-5 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#1D6FB8]" />
            <h3 className="font-black text-slate-800 dark:text-slate-100">Schedule to Calendar</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-sm text-slate-500">Add daily Hadith challenge sessions to your calendar to build a consistent routine.</p>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase block mb-1.5">Start in (days)</label>
            <div className="flex gap-2">
              {[0, 1, 2, 3, 7].map(d => (
                <button key={d} onClick={() => setDays(d)}
                  className={cn('flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all',
                    days === d ? 'border-[#1D6FB8] bg-blue-50 dark:bg-blue-950/20 text-[#1D6FB8]' : 'border-slate-200 dark:border-slate-700 text-slate-500')}>
                  {d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : `+${d}d`}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase block mb-1.5">Duration (days)</label>
            <div className="flex gap-2">
              {[7, 14, 21, 30].map(n => (
                <button key={n} onClick={() => setNumDays(n)}
                  className={cn('flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all',
                    numDays === n ? 'border-[#1D6FB8] bg-blue-50 dark:bg-blue-950/20 text-[#1D6FB8]' : 'border-slate-200 dark:border-slate-700 text-slate-500')}>
                  {n}d
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800/40">
          <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
            📅 {numDays} × 30-minute sessions starting {days === 0 ? 'today' : `in ${days} day${days > 1 ? 's' : ''}`} · Added to 9:00 AM daily
          </p>
        </div>

        <Button onClick={handleSchedule} disabled={saving} className="w-full bg-[#1D6FB8] hover:bg-[#2980B9] text-white gap-2">
          {saving ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Scheduling…</> : <><Calendar className="w-4 h-4" />Add to Calendar</>}
        </Button>
      </motion.div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function HadithLearningPage() {
  const [activeTab, setActiveTab] = useState('challenge');
  const [challengeView, setChallengeView] = useState('home'); // home | review | complete
  const [reviewQueue, setReviewQueue] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [sessionResults, setSessionResults] = useState({ correct: 0, total: 0, scores: [] });
  const [showSchedule, setShowSchedule] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const { data: dailyData, isLoading, refetch } = useQuery({
    queryKey: ['hadithSRSDaily'],
    queryFn: async () => {
      const res = await base44.functions.invoke('hadithSRSChallenge', { action: 'get_daily' });
      return res.data;
    }
  });

  const { data: challenges = [] } = useQuery({
    queryKey: ['hadithChallenges', user?.email],
    queryFn: () => user?.email
      ? base44.entities.HadithChallenge.filter({ created_by: user.email }, '-challenge_date', 30)
      : [],
    enabled: !!user?.email,
  });

  const stats = dailyData?.stats || {};
  const daily = dailyData?.daily || [];

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayChallenge = challenges.find(c => c.challenge_date === todayStr);

  // Last 7 day scores for sparkline
  const last7 = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = format(addDays(new Date(), -(6 - i)), 'yyyy-MM-dd');
      const ch = challenges.find(c => c.challenge_date === d);
      return { date: d, score: ch?.score ?? null, completed: ch?.completed };
    });
  }, [challenges]);

  const startChallenge = () => {
    if (!daily.length) { toast.info('No cards due today. Come back tomorrow!'); return; }
    setReviewQueue(daily);
    setCurrentIdx(0);
    setSessionResults({ correct: 0, total: 0, scores: [] });
    setChallengeView('review');
  };

  const handleRate = async (card, quality) => {
    try {
      await base44.functions.invoke('hadithSRSChallenge', { action: 'review', card_id: card.id, quality });
      const isCorrect = quality >= 3;
      const itemScore = isCorrect ? Math.round((quality / 5) * 100) : 0;
      setSessionResults(prev => ({
        correct: prev.correct + (isCorrect ? 1 : 0),
        total: prev.total + 1,
        scores: [...prev.scores, itemScore],
      }));
    } catch {}
    advance();
  };

  const advance = () => {
    if (currentIdx < reviewQueue.length - 1) {
      setCurrentIdx(i => i + 1);
    } else {
      finishSession();
    }
  };

  const finishSession = async () => {
    setChallengeView('complete');
    const total = sessionResults.total + 1;
    const correct = sessionResults.correct;
    const avgScore = Math.round(sessionResults.scores.reduce((a, b) => a + b, 0) / Math.max(sessionResults.scores.length, 1));
    // Persist challenge record
    try {
      if (todayChallenge) {
        await base44.entities.HadithChallenge.update(todayChallenge.id, {
          score: avgScore, correct, total, completed: true,
          hadith_ids_reviewed: reviewQueue.map(c => c.id),
        });
      } else {
        await base44.entities.HadithChallenge.create({
          challenge_date: todayStr, score: avgScore, correct, total, completed: true,
          hadith_ids_reviewed: reviewQueue.map(c => c.id),
        });
      }
    } catch {}
    refetch();
    queryClient.invalidateQueries({ queryKey: ['hadithChallenges'] });
  };

  const currentCard = reviewQueue[currentIdx];

  return (
    <div className="max-w-2xl mx-auto pb-24 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl p-5 shadow-lg"
        style={{ background: 'linear-gradient(135deg, #4A55A2 0%, #1B2A4A 50%, #0A3333 100%)' }}>
        <div className="absolute -top-6 -right-6 w-28 h-28 bg-white/5 rounded-full" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-5 h-5 text-violet-300" />
            <span className="text-xs font-bold text-violet-300 uppercase tracking-widest">Islamic Learning</span>
          </div>
          <h1 className="text-2xl font-black text-white">Hadith Learning</h1>
          <p className="text-sm text-violet-200 mt-0.5">Spaced repetition · Daily challenges · Calendar scheduling</p>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn('flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0',
                active ? 'bg-[#4A55A2] text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-violet-300')}>
              <Icon className="w-3.5 h-3.5" />{tab.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

          {/* ── DAILY CHALLENGE TAB ─────────────────────────────────── */}
          {activeTab === 'challenge' && (
            <div className="space-y-4">
              {challengeView === 'home' && (
                <>
                  {/* Today's status */}
                  <div className={cn('rounded-2xl p-5 border-2 text-center space-y-3',
                    todayChallenge?.completed
                      ? 'bg-emerald-50 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-800/40'
                      : 'bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/20 dark:to-indigo-950/20 border-violet-200 dark:border-violet-800/40')}>
                    {todayChallenge?.completed ? (
                      <>
                        <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center mx-auto">
                          <Trophy className="w-7 h-7 text-white" />
                        </div>
                        <div>
                          <p className="font-black text-xl text-emerald-700 dark:text-emerald-300">Today's score: {todayChallenge.score}%</p>
                          <p className="text-sm text-emerald-600 dark:text-emerald-400">{todayChallenge.correct}/{todayChallenge.total} correct · Challenge complete ✓</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mx-auto">
                          <Brain className="w-7 h-7 text-white" />
                        </div>
                        <div>
                          <p className="font-black text-xl text-slate-800 dark:text-slate-100">Daily Challenge</p>
                          <p className="text-sm text-slate-500">{stats.due || 0} Hadiths ready · {stats.streak || 0} day streak</p>
                        </div>
                        <Button onClick={startChallenge} disabled={isLoading || !daily.length}
                          className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold hover:opacity-90 gap-2">
                          <Zap className="w-4 h-4" /> Start Challenge ({stats.due || 0})
                        </Button>
                      </>
                    )}
                  </div>

                  {/* 7-day progress */}
                  <div className="rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Last 7 Days</p>
                    <div className="flex items-end gap-1.5 h-16">
                      {last7.map((day, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full rounded-t-lg transition-all"
                            style={{
                              height: day.score !== null ? `${Math.max(8, day.score * 0.56)}px` : '6px',
                              background: day.completed ? '#4A55A2' : day.score !== null ? '#A8C8E8' : '#E2E8F0',
                            }} />
                          <span className="text-[8px] text-slate-400">{format(parseISO(day.date), 'EEE')}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-slate-400">7-day avg: <strong>{
                        Math.round(last7.filter(d => d.score !== null).reduce((s, d) => s + d.score, 0) / Math.max(last7.filter(d => d.score !== null).length, 1))
                      }%</strong></span>
                      <span className="text-xs font-bold text-violet-600">{last7.filter(d => d.completed).length}/7 complete</span>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { icon: Flame, label: 'Streak', value: stats.streak || 0, color: 'bg-orange-500' },
                      { icon: Star, label: 'Mastered', value: stats.mastered || 0, color: 'bg-emerald-500' },
                      { icon: Clock, label: 'Due Today', value: stats.due || 0, color: 'bg-violet-500' },
                    ].map(s => (
                      <div key={s.label} className="rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 p-3 text-center">
                        <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center mx-auto mb-1', s.color)}>
                          <s.icon className="w-4 h-4 text-white" />
                        </div>
                        <p className="text-lg font-black text-slate-800 dark:text-slate-100">{s.value}</p>
                        <p className="text-[10px] text-slate-400">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {challengeView === 'review' && currentCard && (
                <div className="space-y-4">
                  <button onClick={() => setChallengeView('home')}
                    className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                    <ArrowLeft className="w-4 h-4" /> Exit
                  </button>
                  <AnimatePresence mode="wait">
                    <ChallengeCard key={currentCard.id} card={currentCard}
                      onRate={handleRate} onSkip={advance}
                      current={currentIdx + 1} total={reviewQueue.length} />
                  </AnimatePresence>
                </div>
              )}

              {challengeView === 'complete' && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="rounded-2xl border border-emerald-200 dark:border-emerald-800/40 bg-white dark:bg-slate-900 p-6 text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mx-auto">
                    <Trophy className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">Challenge Complete! 🎉</h3>
                    <p className={cn('text-3xl font-black mt-2', scoreColor(
                      Math.round(sessionResults.scores.reduce((a, b) => a + b, 0) / Math.max(sessionResults.scores.length, 1))
                    ))}>
                      {Math.round(sessionResults.scores.reduce((a, b) => a + b, 0) / Math.max(sessionResults.scores.length, 1))}%
                    </p>
                    <p className="text-sm text-slate-400 mt-1">{sessionResults.correct}/{sessionResults.total} correct</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 p-3">
                      <p className="text-2xl font-black text-emerald-600">{sessionResults.correct}</p>
                      <p className="text-xs text-slate-400">Recalled</p>
                    </div>
                    <div className="rounded-xl bg-red-50 dark:bg-red-950/20 p-3">
                      <p className="text-2xl font-black text-red-500">{sessionResults.total - sessionResults.correct}</p>
                      <p className="text-xs text-slate-400">Need review</p>
                    </div>
                  </div>
                  <Button onClick={() => setChallengeView('home')} className="w-full bg-[#4A55A2] hover:bg-[#3a4492] text-white">
                    Back to Dashboard
                  </Button>
                </motion.div>
              )}
            </div>
          )}

          {/* ── SRS DECK TAB ─────────────────────────────────────────── */}
          {activeTab === 'learn' && (
            <HadithSpacedRepetition />
          )}

          {/* ── PROGRESS TAB ─────────────────────────────────────────── */}
          {activeTab === 'progress' && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-5 space-y-4">
                <p className="font-bold text-slate-800 dark:text-slate-100">Challenge History (30 days)</p>
                {challenges.length === 0 ? (
                  <div className="text-center py-8">
                    <Brain className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">No challenges completed yet. Start your first one!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {challenges.slice(0, 15).map(ch => (
                      <div key={ch.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/40">
                        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black flex-shrink-0',
                          ch.score >= 80 ? 'bg-emerald-500' : ch.score >= 50 ? 'bg-amber-500' : 'bg-red-500')}>
                          {ch.score}%
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {format(parseISO(ch.challenge_date), 'EEE, MMM d yyyy')}
                          </p>
                          <p className="text-xs text-slate-400">{ch.correct}/{ch.total} correct · {ch.completed ? 'Completed' : 'Partial'}</p>
                        </div>
                        {ch.completed && <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Overall stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-4 text-center">
                  <p className="text-2xl font-black text-[#4A55A2]">{challenges.filter(c => c.completed).length}</p>
                  <p className="text-xs text-slate-400 mt-1">Total challenges</p>
                </div>
                <div className="rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-4 text-center">
                  <p className="text-2xl font-black text-emerald-600">
                    {challenges.length > 0 ? Math.round(challenges.reduce((s, c) => s + (c.score || 0), 0) / challenges.length) : 0}%
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Average score</p>
                </div>
              </div>
            </div>
          )}

          {/* ── SCHEDULE TAB ─────────────────────────────────────────── */}
          {activeTab === 'schedule' && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#1D6FB8] flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-100">Schedule Challenge Sessions</p>
                    <p className="text-xs text-slate-400">Add recurring Hadith sessions to your calendar</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Consistency is key to memorization. Schedule your daily review sessions for the coming days or weeks, and they'll appear in your Calendar as reminders.
                </p>
                <Button onClick={() => setShowSchedule(true)} className="w-full bg-[#1D6FB8] hover:bg-[#2980B9] text-white gap-2">
                  <Calendar className="w-4 h-4" /> Open Schedule Planner
                </Button>
              </div>

              {/* Upcoming scheduled events hint */}
              <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-800/40 p-4">
                <p className="text-xs font-bold text-amber-700 dark:text-amber-300 mb-1.5">📅 Tip</p>
                <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
                  Scheduled sessions appear in your Calendar page. Tap a session to open the Hadith challenge directly. The SM-2 algorithm automatically adjusts next review dates based on your performance.
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Schedule Modal */}
      {showSchedule && (
        <ScheduleModal onClose={() => setShowSchedule(false)}
          onScheduled={() => queryClient.invalidateQueries({ queryKey: ['events'] })} />
      )}
    </div>
  );
}