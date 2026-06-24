import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, addDays } from 'date-fns';
import {
  Mic, MicOff, Square, Play, Loader2, Sparkles, CheckCircle2,
  Brain, Heart, Moon, Calendar, Flame, ChevronDown, ChevronUp,
  X, Plus, RefreshCw, AlignLeft, Clock, TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ── Mood colour map ────────────────────────────────────────────────────────
const MOOD_COLORS = { 1:'bg-red-400', 2:'bg-red-300', 3:'bg-orange-400', 4:'bg-orange-300',
  5:'bg-yellow-400', 6:'bg-yellow-300', 7:'bg-lime-400', 8:'bg-green-400', 9:'bg-emerald-400', 10:'bg-teal-500' };

// ── Emotion badge ──────────────────────────────────────────────────────────
function EmotionBadge({ emotion, intensity }) {
  const colors = { high: 'bg-rose-100 text-rose-700 border-rose-200', medium: 'bg-amber-100 text-amber-700 border-amber-200', low: 'bg-sky-100 text-sky-700 border-sky-200' };
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border', colors[intensity] || colors.medium)}>
      {emotion}
    </span>
  );
}

// ── Past entry card ────────────────────────────────────────────────────────
function EntryCard({ entry, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const moodColor = MOOD_COLORS[Math.round(entry.mood_score)] || 'bg-slate-300';

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-black text-sm', moodColor)}>
          {entry.mood_score || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{entry.title || 'Journal Entry'}</p>
          <p className="text-[10px] text-slate-400">{format(new Date(entry.entry_date), 'EEE, MMM d')} · {entry.input_method === 'voice' ? '🎤 Voice' : '⌨️ Text'}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {entry.synced_tasks_count > 0 && (
            <span className="text-[10px] bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-300 px-1.5 py-0.5 rounded-full font-bold">{entry.synced_tasks_count} tasks</span>
          )}
          {entry.synced_events_count > 0 && (
            <span className="text-[10px] bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-300 px-1.5 py-0.5 rounded-full font-bold">{entry.synced_events_count} synced</span>
          )}
          <button onClick={() => setExpanded(v => !v)} className="text-slate-400 hover:text-slate-600">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button onClick={() => onDelete(entry.id)} className="text-slate-300 hover:text-red-400 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-slate-50 dark:border-slate-700/60">
            <div className="px-4 pb-4 pt-3 space-y-3">
              {entry.ai_summary && (
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic">"{entry.ai_summary}"</p>
              )}
              {entry.emotional_insights?.length > 0 && (
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wide mb-1.5">Emotional Insights</p>
                  <div className="flex flex-wrap gap-1.5">
                    {entry.emotional_insights.map((e, i) => <EmotionBadge key={i} emotion={e.emotion} intensity={e.intensity} />)}
                  </div>
                  {entry.emotional_insights[0]?.insight && (
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">{entry.emotional_insights[0].insight}</p>
                  )}
                </div>
              )}
              {entry.tasks?.length > 0 && (
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wide mb-1.5">Tasks Extracted</p>
                  <div className="space-y-1">
                    {entry.tasks.slice(0,3).map((t, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                        {t.title}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {entry.spiritual_reminders?.length > 0 && (
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wide mb-1.5">Spiritual Reminders</p>
                  <div className="space-y-1">
                    {entry.spiritual_reminders.slice(0,2).map((r, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                        <Moon className="w-3 h-3 text-amber-400 flex-shrink-0" />
                        {r.reminder}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function VoiceJournal() {
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState('idle'); // idle | recording | transcribing | analysing | result | syncing
  const [transcript, setTranscript] = useState('');
  const [inputMode, setInputMode] = useState('voice'); // voice | text
  const [analysisResult, setAnalysisResult] = useState(null);
  const [savedEntry, setSavedEntry] = useState(null);
  const [seconds, setSeconds] = useState(0);
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const hasRecognitionRef = useRef(false);

  const { data: entries = [] } = useQuery({
    queryKey: ['journalEntries'],
    queryFn: () => SDK.entities.JournalEntry.list('-created_date', 20),
  });

  // Set up speech recognition
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { hasRecognitionRef.current = false; return; }
    hasRecognitionRef.current = true;
    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let final = '';
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + ' ';
      }
      if (final) setTranscript(prev => prev + final);
    };
    r.onerror = () => { toast.error('Microphone error. Please try text mode.'); stopRecording(); };
    recognitionRef.current = r;
    return () => { r.abort(); };
  }, []);

  const startRecording = () => {
    if (!hasRecognitionRef.current) {
      toast.error('Speech recognition not supported. Use text mode.');
      setInputMode('text');
      return;
    }
    setTranscript('');
    setSeconds(0);
    setPhase('recording');
    recognitionRef.current.start();
    timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    clearInterval(timerRef.current);
    setPhase('idle');
  };

  const analyzeEntry = async () => {
    if (!transcript.trim()) { toast.error('Please record or type something first.'); return; }
    setPhase('analysing');
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const result = await SDK.integrations.Core.InvokeLLM({
        prompt: `Analyze this personal journal entry from ${today}. Extract the following:
1. A short title (max 8 words)
2. A 2-sentence summary
3. Up to 4 actionable tasks mentioned or implied (with priority: high/medium/low and suggested due date relative to today)
4. Emotional insights (list up to 3 emotions with intensity: high/medium/low and a brief insight per emotion)
5. Spiritual reminders (up to 3 — Quran-inspired, prayer, dhikr, or gratitude-based depending on content)
6. A mood score from 1-10 based on overall tone

Journal entry: "${transcript}"`,
        response_json_schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            summary: { type: 'string' },
            mood_score: { type: 'number' },
            tasks: {
              type: 'array',
              items: { type: 'object', properties: { title: { type: 'string' }, priority: { type: 'string' }, due_days: { type: 'number' } } }
            },
            emotional_insights: {
              type: 'array',
              items: { type: 'object', properties: { emotion: { type: 'string' }, intensity: { type: 'string' }, insight: { type: 'string' } } }
            },
            spiritual_reminders: {
              type: 'array',
              items: { type: 'object', properties: { reminder: { type: 'string' }, type: { type: 'string' } } }
            }
          }
        }
      });
      setAnalysisResult(result);
      setPhase('result');
    } catch (_) {
      toast.error('Analysis failed. Please try again.');
      setPhase('idle');
    }
  };

  const syncAll = async () => {
    if (!analysisResult) return;
    setPhase('syncing');
    const today = format(new Date(), 'yyyy-MM-dd');
    let taskCount = 0;
    let eventCount = 0;

    try {
      // Sync tasks
      for (const task of (analysisResult.tasks || [])) {
        await SDK.entities.Task.create({
          title: task.title,
          priority: task.priority || 'medium',
          due_date: task.due_days ? format(addDays(new Date(), task.due_days), 'yyyy-MM-dd') : undefined,
          status: 'pending',
          notes: `From journal entry: ${analysisResult.title || today}`,
          category: 'personal',
        });
        taskCount++;
      }

      // Sync spiritual reminders as calendar events
      for (const reminder of (analysisResult.spiritual_reminders || [])) {
        const start = new Date();
        start.setHours(20, 0, 0, 0);
        const end = new Date(start.getTime() + 30 * 60000);
        await SDK.entities.Event.create({
          title: `🤲 ${reminder.reminder}`,
          description: 'Spiritual reminder from journal',
          start_date: start.toISOString(),
          end_date: end.toISOString(),
          category: 'prayer',
          is_all_day: false,
        });
        eventCount++;
      }

      // Sync a journaling habit completion
      const habitMatches = await SDK.entities.Habit.filter({ category: 'spiritual' }, '-created_date', 50);
      const journalHabit = habitMatches.find(h => h.title?.toLowerCase().includes('journal'));
      if (journalHabit) {
        const completions = journalHabit.completion_dates || [];
        if (!completions.includes(today)) {
          await SDK.entities.Habit.update(journalHabit.id, { completion_dates: [...completions, today] });
        }
      }

      // Save entry
      const entry = await SDK.entities.JournalEntry.create({
        title: analysisResult.title,
        transcript,
        ai_summary: analysisResult.summary,
        tasks: (analysisResult.tasks || []).map(t => ({ ...t, synced: true })),
        emotional_insights: analysisResult.emotional_insights || [],
        spiritual_reminders: (analysisResult.spiritual_reminders || []).map(r => ({ ...r, synced: true })),
        mood_score: analysisResult.mood_score,
        entry_date: today,
        input_method: inputMode,
        synced_tasks_count: taskCount,
        synced_events_count: eventCount,
      });

      setSavedEntry(entry);
      queryClient.invalidateQueries({ queryKey: ['journalEntries'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['spiritualHabits'] });
      toast.success(`✅ Synced ${taskCount} tasks & ${eventCount} reminders!`);
      setPhase('done');
    } catch (_) {
      toast.error('Sync failed. Please try again.');
      setPhase('result');
    }
  };

  const reset = () => {
    setTranscript('');
    setAnalysisResult(null);
    setSavedEntry(null);
    setPhase('idle');
    setSeconds(0);
  };

  const fmt = (s) => `${Math.floor(s / 60).toString().padStart(2,'0')}:${(s % 60).toString().padStart(2,'0')}`;

  return (
    <div className="flex flex-col gap-5">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span className="text-xl">🎤</span> Voice Journal
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Record your thoughts · AI extracts tasks, insights & spiritual reminders</p>
        </div>
        {(phase === 'result' || phase === 'done') && (
          <Button variant="outline" size="sm" onClick={reset} className="h-8 text-xs">
            <RefreshCw className="w-3 h-3 mr-1" /> New Entry
          </Button>
        )}
      </div>

      {/* ── Mode switcher ─────────────────────────────────────── */}
      {phase === 'idle' && (
        <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
          <button onClick={() => setInputMode('voice')}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
              inputMode === 'voice' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-slate-100' : 'text-slate-400')}>
            <Mic className="w-3.5 h-3.5" /> Voice
          </button>
          <button onClick={() => setInputMode('text')}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
              inputMode === 'text' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-slate-100' : 'text-slate-400')}>
            <AlignLeft className="w-3.5 h-3.5" /> Text
          </button>
        </div>
      )}

      {/* ── Recording / Input ────────────────────────────────── */}
      {(phase === 'idle' || phase === 'recording') && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm">
          {inputMode === 'voice' ? (
            <div className="flex flex-col items-center gap-4">
              {/* Mic button */}
              <button
                onClick={phase === 'recording' ? stopRecording : startRecording}
                className={cn(
                  'w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all',
                  phase === 'recording'
                    ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                    : 'bg-gradient-to-br from-teal-500 to-emerald-600 hover:opacity-90 hover:scale-105'
                )}>
                {phase === 'recording'
                  ? <Square className="w-7 h-7 text-white" />
                  : <Mic className="w-8 h-8 text-white" />}
              </button>

              {phase === 'recording' && (
                <div className="flex items-center gap-2 text-red-500 font-bold text-sm">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  Recording… {fmt(seconds)}
                </div>
              )}

              {phase === 'idle' && <p className="text-xs text-slate-400 text-center">Tap to start recording your journal entry</p>}

              {/* Live transcript preview */}
              {transcript && (
                <div className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-h-28 overflow-y-auto">
                  {transcript}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Write your journal entry</label>
              <textarea
                value={transcript}
                onChange={e => setTranscript(e.target.value)}
                rows={6}
                placeholder="Write freely about your day, feelings, challenges, goals, or anything on your mind…"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none leading-relaxed"
              />
            </div>
          )}

          {transcript.trim() && phase !== 'recording' && (
            <div className="mt-4">
              <Button onClick={analyzeEntry} className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:opacity-90 font-bold">
                <Sparkles className="w-4 h-4 mr-2" /> Analyse with AI
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── Loading states ───────────────────────────────────── */}
      {(phase === 'analysing' || phase === 'syncing') && (
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-md">
            <Loader2 className="w-7 h-7 text-white animate-spin" />
          </div>
          <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">
            {phase === 'analysing' ? 'Analysing your entry…' : 'Syncing to Calendar & Habits…'}
          </p>
          <p className="text-xs text-slate-400">
            {phase === 'analysing' ? 'Extracting tasks, insights & spiritual reminders' : 'Creating tasks, events & habit completions'}
          </p>
        </div>
      )}

      {/* ── Analysis result ──────────────────────────────────── */}
      {(phase === 'result' || phase === 'done') && analysisResult && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Mood + summary */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0', MOOD_COLORS[Math.round(analysisResult.mood_score)] || 'bg-slate-400')}>
                {analysisResult.mood_score}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{analysisResult.title}</p>
                <p className="text-[10px] text-slate-400">Mood score · {format(new Date(), 'EEE, MMM d')}</p>
              </div>
              {phase === 'done' && <CheckCircle2 className="w-5 h-5 text-emerald-500 ml-auto flex-shrink-0" />}
            </div>
            {analysisResult.summary && (
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic">"{analysisResult.summary}"</p>
            )}
          </div>

          {/* Tasks */}
          {analysisResult.tasks?.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 shadow-sm">
              <p className="text-[10px] font-black text-violet-600 dark:text-violet-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Actionable Tasks ({analysisResult.tasks.length})
              </p>
              <div className="space-y-2">
                {analysisResult.tasks.map((t, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800/40">
                    <div className={cn('w-2 h-2 rounded-full flex-shrink-0',
                      t.priority === 'high' ? 'bg-red-500' : t.priority === 'medium' ? 'bg-amber-500' : 'bg-slate-400')} />
                    <span className="text-xs text-slate-700 dark:text-slate-300 flex-1">{t.title}</span>
                    {t.due_days != null && (
                      <span className="text-[9px] text-slate-400 flex-shrink-0 flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />{t.due_days === 0 ? 'Today' : `+${t.due_days}d`}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Emotional insights */}
          {analysisResult.emotional_insights?.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 shadow-sm">
              <p className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5" /> Emotional Insights
              </p>
              <div className="space-y-3">
                {analysisResult.emotional_insights.map((e, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <EmotionBadge emotion={e.emotion} intensity={e.intensity} />
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed flex-1">{e.insight}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Spiritual reminders */}
          {analysisResult.spiritual_reminders?.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 shadow-sm">
              <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <Moon className="w-3.5 h-3.5" /> Spiritual Reminders
              </p>
              <div className="space-y-2">
                {analysisResult.spiritual_reminders.map((r, i) => (
                  <div key={i} className="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/40">
                    <Moon className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-slate-700 dark:text-slate-300 flex-1">{r.reminder}</span>
                    <Calendar className="w-3.5 h-3.5 text-slate-300 flex-shrink-0 mt-0.5" title="Will be added to Calendar" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sync button */}
          {phase === 'result' && (
            <Button onClick={syncAll} className="w-full bg-gradient-to-r from-[#1a4a6e] to-[#3ecfa0] hover:opacity-90 font-bold h-12 text-sm shadow-md">
              <Calendar className="w-4 h-4 mr-2" />
              Sync to Calendar, Tasks & Habits
            </Button>
          )}

          {phase === 'done' && (
            <div className="flex items-center gap-2 p-3.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <div className="text-xs text-emerald-700 dark:text-emerald-300">
                <span className="font-bold">All synced!</span> Tasks added, spiritual reminders scheduled in calendar, habits updated.
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Past entries ─────────────────────────────────────── */}
      {entries.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-slate-400" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Recent Entries</p>
          </div>
          {entries.slice(0, 5).map(e => (
            <EntryCard key={e.id} entry={e} onDelete={async (id) => {
              await SDK.entities.JournalEntry.delete(id);
              queryClient.invalidateQueries({ queryKey: ['journalEntries'] });
              toast.success('Entry deleted.');
            }} />
          ))}
        </div>
      )}
    </div>
  );
}