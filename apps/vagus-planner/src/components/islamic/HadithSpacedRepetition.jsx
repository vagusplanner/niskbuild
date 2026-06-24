/**
 * HadithSpacedRepetition — Full SM-2 spaced repetition system for Hadith memorization.
 * Collections: Bukhari, Muslim, Abu Dawud, Tirmidhi, Nasa'i, Ibn Majah
 * Features: Daily challenges, AI quiz generation, progress tracking, streak counter
 */
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Star, Flame, CheckCircle2, XCircle, RotateCcw,
  Brain, Plus, ChevronRight, ChevronLeft, Trophy, Sparkles,
  Clock, ArrowLeft, Eye, EyeOff, HelpCircle, BarChart2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const COLLECTIONS = [
  { id: 'bukhari', name: 'Sahih al-Bukhari', emoji: '📗', count: '7,563', color: 'from-emerald-500 to-teal-600' },
  { id: 'muslim', name: 'Sahih Muslim', emoji: '📘', count: '7,470', color: 'from-blue-500 to-indigo-600' },
  { id: 'abudawud', name: 'Sunan Abu Dawud', emoji: '📙', count: '5,274', color: 'from-amber-500 to-orange-600' },
  { id: 'tirmidhi', name: "Jami' al-Tirmidhi", emoji: '📕', count: '3,956', color: 'from-rose-500 to-pink-600' },
  { id: 'nasai', name: "Sunan an-Nasa'i", emoji: '📓', count: '5,761', color: 'from-violet-500 to-purple-600' },
  { id: 'ibnmajah', name: 'Sunan Ibn Majah', emoji: '📔', count: '4,341', color: 'from-cyan-500 to-blue-600' },
];

const QUALITY_BUTTONS = [
  { q: 0, label: 'Blackout', sub: 'No recall', color: 'bg-red-600 hover:bg-red-700', textColor: 'text-red-600' },
  { q: 1, label: 'Wrong', sub: 'Incorrect', color: 'bg-orange-500 hover:bg-orange-600', textColor: 'text-orange-500' },
  { q: 2, label: 'Hard', sub: 'Incorrect but familiar', color: 'bg-amber-500 hover:bg-amber-600', textColor: 'text-amber-500' },
  { q: 3, label: 'Hesitant', sub: 'Correct with effort', color: 'bg-yellow-500 hover:bg-yellow-600', textColor: 'text-yellow-600' },
  { q: 4, label: 'Good', sub: 'Correct after thought', color: 'bg-lime-500 hover:bg-lime-600', textColor: 'text-lime-600' },
  { q: 5, label: 'Perfect', sub: 'Instant recall', color: 'bg-emerald-600 hover:bg-emerald-700', textColor: 'text-emerald-600' },
];

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="flex flex-col items-center p-3 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
      <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center mb-1', color)}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <p className="text-lg font-black text-slate-800 dark:text-slate-100">{value}</p>
      <p className="text-[10px] text-slate-400 text-center leading-tight">{label}</p>
    </div>
  );
}

function ReviewCard({ card, onRate, onSkip }) {
  const [revealed, setRevealed] = useState(false);
  const [aiQuestion, setAiQuestion] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);

  const colInfo = COLLECTIONS.find(c => c.id === card.hadith_collection) || COLLECTIONS[0];

  const generateAIQuiz = async () => {
    setLoadingAI(true);
    try {
      const res = await base44.functions.invoke('hadithSRSChallenge', {
        action: 'ai_challenge',
        hadith_text: card.hadith_text,
        hadith_narrator: card.hadith_narrator,
      });
      setAiQuestion(res.data);
      setShowAI(true);
    } catch (e) {
      toast.error('Could not generate quiz');
    }
    setLoadingAI(false);
  };

  return (
    <motion.div key={card.id} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
      className="space-y-4">

      {/* Collection badge */}
      <div className="flex items-center justify-between">
        <div className={cn('flex items-center gap-1.5 px-3 py-1 rounded-full text-white text-xs font-bold bg-gradient-to-r', colInfo.color)}>
          <span>{colInfo.emoji}</span>
          <span>{colInfo.name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {card.status === 'new' && <Badge className="bg-blue-100 text-blue-700 border-0 text-[10px]">New</Badge>}
          {card.status === 'learning' && <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px]">Learning</Badge>}
          {card.status === 'review' && <Badge className="bg-green-100 text-green-700 border-0 text-[10px]">Review</Badge>}
          <span className="text-[10px] text-slate-400">#{card.hadith_number}</span>
        </div>
      </div>

      {/* Hadith card */}
      <div className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800/60 overflow-hidden">
        {/* Narrator prompt */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Narrator</p>
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{card.hadith_narrator || 'Unknown'}</p>
          {card.hadith_chapter && <p className="text-xs text-slate-400 mt-0.5">{card.hadith_chapter}</p>}
        </div>

        {/* Arabic text */}
        {card.hadith_arabic && (
          <div className="px-5 py-4 bg-amber-50/50 dark:bg-amber-950/10 border-b border-amber-100 dark:border-amber-800/30">
            <p className="text-right font-arabic text-lg leading-loose text-slate-800 dark:text-slate-200" dir="rtl">
              {card.hadith_arabic}
            </p>
          </div>
        )}

        {/* English translation — hidden until revealed */}
        <div className="px-5 py-4">
          {!revealed ? (
            <button onClick={() => setRevealed(true)}
              className="w-full flex items-center justify-center gap-2 py-6 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-400 hover:border-teal-300 hover:text-teal-600 transition-colors">
              <Eye className="w-5 h-5" />
              <span className="text-sm font-medium">Tap to reveal English translation</span>
            </button>
          ) : (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Translation</p>
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                {card.hadith_text}
              </p>
            </motion.div>
          )}
        </div>
      </div>

      {/* AI Quiz */}
      {!showAI && revealed && (
        <button onClick={generateAIQuiz} disabled={loadingAI}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/20 transition-colors text-sm font-medium">
          {loadingAI ? <><div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" /> Generating quiz…</> : <><Brain className="w-4 h-4" /> Test with AI Quiz</>}
        </button>
      )}

      {showAI && aiQuestion && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/20 p-4 space-y-3">
          <p className="text-sm font-bold text-violet-800 dark:text-violet-200">🧠 {aiQuestion.question}</p>
          <div className="space-y-2">
            {(aiQuestion.options || []).map((opt, i) => (
              <button key={i} onClick={() => { setSelectedOption(i); setShowExplanation(true); }}
                className={cn('w-full text-left text-xs p-3 rounded-xl border transition-colors',
                  selectedOption === null ? 'border-violet-200 dark:border-violet-700 hover:bg-violet-100 dark:hover:bg-violet-900/30 text-slate-700 dark:text-slate-200' :
                  i === aiQuestion.correct_index ? 'border-green-400 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 font-semibold' :
                  selectedOption === i ? 'border-red-400 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400' :
                  'border-slate-200 dark:border-slate-700 text-slate-400')}>
                <span className="font-bold mr-2">{['A', 'B', 'C', 'D'][i]}.</span>{opt}
              </button>
            ))}
          </div>
          {showExplanation && aiQuestion.explanation && (
            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-violet-200 dark:border-violet-700">
              <p className="text-xs text-slate-600 dark:text-slate-300">💡 {aiQuestion.explanation}</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Rating buttons — only shown after revealing */}
      {revealed && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide text-center">How well did you recall this?</p>
          <div className="grid grid-cols-3 gap-2">
            {QUALITY_BUTTONS.map(btn => (
              <button key={btn.q} onClick={() => onRate(card, btn.q)}
                className={cn('py-2.5 px-2 rounded-xl text-white font-bold text-xs transition-all hover:scale-105 active:scale-95', btn.color)}>
                <div>{btn.label}</div>
                <div className="font-normal opacity-80 text-[9px] mt-0.5">{btn.sub}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <button onClick={onSkip} className="w-full text-xs text-slate-400 hover:text-slate-600 py-1">
        Skip for now →
      </button>
    </motion.div>
  );
}

function AddHadithForm({ onClose, onAdded }) {
  const [form, setForm] = useState({ hadith_text: '', hadith_arabic: '', hadith_narrator: '', hadith_chapter: '', collection: 'bukhari', hadith_number: '' });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const addMutation = useMutation({
    mutationFn: () => base44.functions.invoke('hadithSRSChallenge', {
      action: 'add_hadith', ...form, hadith_number: parseInt(form.hadith_number) || 1
    }),
    onSuccess: () => { toast.success('Hadith added to your deck!'); onAdded(); onClose(); },
    onError: () => toast.error('Failed to add hadith'),
  });

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">Add Hadith to Deck</p>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xs">✕</button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Collection</label>
          <select value={form.collection} onChange={e => set('collection', e.target.value)}
            className="w-full h-8 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-2">
            {COLLECTIONS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Hadith #</label>
          <Input type="number" value={form.hadith_number} onChange={e => set('hadith_number', e.target.value)} placeholder="e.g. 1" className="h-8 text-xs" />
        </div>
      </div>
      <div>
        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Narrator</label>
        <Input value={form.hadith_narrator} onChange={e => set('hadith_narrator', e.target.value)} placeholder="e.g. Abu Hurairah (RA)" className="h-8 text-xs" />
      </div>
      <div>
        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Chapter / Topic</label>
        <Input value={form.hadith_chapter} onChange={e => set('hadith_chapter', e.target.value)} placeholder="e.g. Book of Faith" className="h-8 text-xs" />
      </div>
      <div>
        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Arabic text (optional)</label>
        <textarea value={form.hadith_arabic} onChange={e => set('hadith_arabic', e.target.value)} rows={2}
          className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 p-2 resize-none" dir="rtl" placeholder="اكتب الحديث بالعربية" />
      </div>
      <div>
        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">English translation *</label>
        <textarea value={form.hadith_text} onChange={e => set('hadith_text', e.target.value)} rows={4}
          className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 p-2 resize-none"
          placeholder="Paste the English translation of the hadith here…" />
      </div>
      <Button onClick={() => addMutation.mutate()} disabled={!form.hadith_text.trim() || addMutation.isPending}
        className="w-full h-9 text-sm bg-emerald-600 hover:bg-emerald-700">
        {addMutation.isPending ? 'Adding…' : 'Add to Deck'}
      </Button>
    </div>
  );
}

export default function HadithSpacedRepetition() {
  const [view, setView] = useState('home'); // home | review | add | stats
  const [reviewQueue, setReviewQueue] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [sessionResults, setSessionResults] = useState({ correct: 0, total: 0 });
  const [showAdd, setShowAdd] = useState(false);
  const queryClient = useQueryClient();

  const { data: dailyData, isLoading, refetch } = useQuery({
    queryKey: ['hadithSRSDaily'],
    queryFn: async () => {
      const res = await base44.functions.invoke('hadithSRSChallenge', { action: 'get_daily' });
      return res.data;
    }
  });

  const stats = dailyData?.stats || {};
  const daily = dailyData?.daily || [];

  const startReview = () => {
    if (!daily.length) { toast.info('No cards due today! Come back tomorrow.'); return; }
    setReviewQueue(daily);
    setCurrentIdx(0);
    setSessionResults({ correct: 0, total: 0 });
    setView('review');
  };

  const handleRate = async (card, quality) => {
    try {
      await base44.functions.invoke('hadithSRSChallenge', { action: 'review', card_id: card.id, quality });
      setSessionResults(prev => ({ correct: prev.correct + (quality >= 3 ? 1 : 0), total: prev.total + 1 }));
      nextCard();
    } catch (e) {
      toast.error('Failed to save review');
      nextCard();
    }
  };

  const nextCard = () => {
    if (currentIdx < reviewQueue.length - 1) {
      setCurrentIdx(i => i + 1);
    } else {
      // Session complete
      setView('complete');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['hadithSRSDaily'] });
    }
  };

  const currentCard = reviewQueue[currentIdx];
  const progress = reviewQueue.length > 0 ? (currentIdx / reviewQueue.length) * 100 : 0;

  if (view === 'complete') {
    const accuracy = sessionResults.total > 0 ? Math.round((sessionResults.correct / sessionResults.total) * 100) : 0;
    return (
      <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800/40 bg-white dark:bg-slate-900 p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mx-auto">
          <Trophy className="w-8 h-8 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">Session Complete! 🎉</h3>
          <p className="text-sm text-slate-500 mt-1">Reviewed {sessionResults.total} Hadiths · {accuracy}% accuracy</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 p-3">
            <p className="text-2xl font-black text-emerald-600">{sessionResults.correct}</p>
            <p className="text-xs text-slate-400">Remembered</p>
          </div>
          <div className="rounded-xl bg-red-50 dark:bg-red-950/20 p-3">
            <p className="text-2xl font-black text-red-500">{sessionResults.total - sessionResults.correct}</p>
            <p className="text-xs text-slate-400">Need more review</p>
          </div>
        </div>
        <Button onClick={() => setView('home')} className="w-full bg-emerald-600 hover:bg-emerald-700">Back to Dashboard</Button>
      </div>
    );
  }

  if (view === 'review' && currentCard) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button onClick={() => setView('home')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
            <ArrowLeft className="w-4 h-4" /> Stop
          </button>
          <span className="text-xs font-bold text-slate-500">{currentIdx + 1} / {reviewQueue.length}</span>
        </div>
        {/* Progress */}
        <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <motion.div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full" animate={{ width: `${progress}%` }} />
        </div>
        <AnimatePresence mode="wait">
          <ReviewCard key={currentCard.id} card={currentCard} onRate={handleRate} onSkip={nextCard} />
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-200 dark:border-amber-800/40 bg-white dark:bg-slate-900 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-slate-900 px-5 py-4 border-b border-amber-100 dark:border-amber-800/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 dark:text-slate-100">Hadith Memorization</h3>
              <p className="text-[11px] text-amber-600 dark:text-amber-400">Spaced repetition · 6 canonical collections</p>
            </div>
          </div>
          <Button size="sm" onClick={() => setShowAdd(v => !v)}
            className="h-8 text-xs bg-amber-500 hover:bg-amber-600 text-white">
            <Plus className="w-3 h-3 mr-1" /> Add
          </Button>
        </div>
      </div>

      <div className="p-5 space-y-5">

        {/* Add form */}
        <AnimatePresence>
          {showAdd && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <AddHadithForm onClose={() => setShowAdd(false)} onAdded={refetch} />
            </motion.div>
          )}
        </AnimatePresence>

        {isLoading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-24 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
          </div>
        ) : (
          <>
            {/* Stats grid */}
            <div className="grid grid-cols-4 gap-2">
              <StatCard icon={Flame} label="Day Streak" value={stats.streak || 0} color="bg-orange-500" />
              <StatCard icon={Clock} label="Due Today" value={stats.due || 0} color="bg-blue-500" />
              <StatCard icon={Star} label="Mastered" value={stats.mastered || 0} color="bg-emerald-500" />
              <StatCard icon={BookOpen} label="Total" value={stats.total || 0} color="bg-violet-500" />
            </div>

            {/* Daily review CTA */}
            <div className={cn('rounded-2xl p-4 text-center space-y-3',
              stats.due > 0 ? 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/10 border border-amber-200 dark:border-amber-800/40' :
              'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/10 border border-emerald-200 dark:border-emerald-800/40')}>
              {stats.due > 0 ? (
                <>
                  <p className="font-black text-amber-800 dark:text-amber-200 text-lg">{stats.due} Hadiths due for review</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400">Regular review is key to long-term retention</p>
                  <Button onClick={startReview} className="bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold hover:opacity-90">
                    <Brain className="w-4 h-4 mr-2" /> Start Daily Review ({stats.due})
                  </Button>
                </>
              ) : (
                <>
                  <p className="font-black text-emerald-700 dark:text-emerald-300">🎉 All caught up!</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">Come back tomorrow for your next session</p>
                  {stats.total === 0 && (
                    <Button onClick={() => setShowAdd(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                      <Plus className="w-4 h-4 mr-1" /> Add your first Hadith
                    </Button>
                  )}
                </>
              )}
            </div>

            {/* Collections overview */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-3">Collections Referenced</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {COLLECTIONS.map(col => (
                  <div key={col.id}
                    className={cn('rounded-xl p-2.5 bg-gradient-to-br text-white', col.color)}>
                    <div className="text-base mb-0.5">{col.emoji}</div>
                    <p className="text-xs font-bold leading-tight">{col.name}</p>
                    <p className="text-[10px] opacity-80">{col.count} hadiths</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quran & Hadith reference note */}
            <div className="rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-3 space-y-1.5">
              <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300">📚 Quran & Hadith Sources</p>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                <strong>Quran:</strong> alquran.cloud API (114 Surahs, 6,236 verses, Sahih International translation)<br />
                <strong>Hadith:</strong> Sahih al-Bukhari · Sahih Muslim · Sunan Abu Dawud · Jami' al-Tirmidhi · Sunan an-Nasa'i · Sunan Ibn Majah (6 canonical collections, 34,000+ hadiths)
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}