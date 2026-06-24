/**
 * VoiceCaptureHub — Hands-free voice input with AI transcription & routing.
 * Records audio → AI transcribes → AI categorizes & extracts → saves to correct entity.
 * Supports: Tasks, Goals, Events, Islamic (Prayer/Dua), Travel, Finance, Journal.
 */
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, MicOff, Square, Loader2, X, Check, ChevronDown,
  Target, CheckSquare, Calendar, Moon, Plane, TrendingUp,
  BookOpen, Sparkles, Edit3, Volume2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { format, addDays } from 'date-fns';
import { cn } from '@/lib/utils';

// ── Entity routing config ────────────────────────────────────────────────────
const CATEGORIES = {
  task:     { label: 'Task',     icon: CheckSquare, color: 'bg-blue-500',   light: 'bg-blue-50 text-blue-700 border-blue-200',   entity: 'Task' },
  goal:     { label: 'Goal',     icon: Target,      color: 'bg-purple-500', light: 'bg-purple-50 text-purple-700 border-purple-200', entity: 'Goal' },
  event:    { label: 'Event',    icon: Calendar,    color: 'bg-emerald-500',light: 'bg-emerald-50 text-emerald-700 border-emerald-200', entity: 'Event' },
  islamic:  { label: 'Islamic',  icon: Moon,        color: 'bg-amber-500',  light: 'bg-amber-50 text-amber-700 border-amber-200',  entity: 'Task' },
  travel:   { label: 'Travel',   icon: Plane,       color: 'bg-cyan-500',   light: 'bg-cyan-50 text-cyan-700 border-cyan-200',    entity: 'Holiday' },
  finance:  { label: 'Finance',  icon: TrendingUp,  color: 'bg-green-500',  light: 'bg-green-50 text-green-700 border-green-200', entity: 'Expense' },
  journal:  { label: 'Journal',  icon: BookOpen,    color: 'bg-rose-500',   light: 'bg-rose-50 text-rose-700 border-rose-200',    entity: 'Reflection' },
};

// ── Animated waveform during recording ──────────────────────────────────────
function Waveform({ active }) {
  return (
    <div className="flex items-center justify-center gap-0.5 h-8">
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full bg-white"
          animate={active ? {
            height: [4, Math.random() * 24 + 8, 4],
            opacity: [0.4, 1, 0.4],
          } : { height: 4, opacity: 0.3 }}
          transition={{
            duration: 0.5 + Math.random() * 0.4,
            repeat: Infinity,
            delay: i * 0.06,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

// ── AI extraction + save logic ───────────────────────────────────────────────
async function extractAndSave(transcript, queryClient) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const in7Days = format(addDays(new Date(), 7), 'yyyy-MM-dd');

  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `You are a smart personal assistant. Analyze this voice note and extract structured data.

Voice note: "${transcript}"
Today: ${today}

Instructions:
1. Determine the PRIMARY category: task, goal, event, islamic, travel, finance, or journal
2. Extract all relevant fields based on category
3. For dates, use YYYY-MM-DD format. If someone says "tomorrow", use ${addDays(new Date(), 1).toISOString().split('T')[0]}. If "next week", use ${in7Days}.
4. For finance: extract amount (number only), type (expense/income/saving/zakat/sadaqa), category
5. For tasks: extract priority (low/medium/high/urgent), due date, tags
6. For goals: extract category (personal/professional/health/financial/learning/spiritual/relationships), priority
7. For events: extract start_date (ISO datetime), duration in minutes (default 60)
8. For travel: extract destination, start_date, end_date
9. For islamic: classify as prayer_reminder, dua, quran_goal, habit — then map to a task with category="spiritual"
10. Extract a clean, concise title (max 10 words)
11. Extract any description/notes
12. Set confidence 0-100 for how sure you are about the category

Return ONLY valid JSON, no explanation.`,
    response_json_schema: {
      type: 'object',
      properties: {
        category: { type: 'string' },
        confidence: { type: 'number' },
        title: { type: 'string' },
        description: { type: 'string' },
        due_date: { type: 'string' },
        priority: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        amount: { type: 'number' },
        finance_type: { type: 'string' },
        finance_category: { type: 'string' },
        start_date: { type: 'string' },
        end_date: { type: 'string' },
        destination: { type: 'string' },
        duration_minutes: { type: 'number' },
        goal_category: { type: 'string' },
        islamic_subtype: { type: 'string' },
      }
    }
  });

  return result;
}

async function saveExtracted(extracted, transcript, queryClient) {
  const cat = extracted.category;

  if (cat === 'task' || cat === 'islamic') {
    const record = await base44.entities.Task.create({
      title: extracted.title || transcript.substring(0, 80),
      description: extracted.description || transcript,
      priority: extracted.priority || 'medium',
      due_date: extracted.due_date || null,
      category: cat === 'islamic' ? 'personal' : 'personal',
      tags: [
        ...(extracted.tags || []),
        cat === 'islamic' ? 'islamic' : 'voice',
        'voice-capture',
      ],
      status: 'todo',
    });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    return { entity: 'Task', record };
  }

  if (cat === 'goal') {
    const record = await base44.entities.Goal.create({
      title: extracted.title || transcript.substring(0, 80),
      description: extracted.description || transcript,
      priority: extracted.priority || 'medium',
      category: extracted.goal_category || 'personal',
      target_date: extracted.due_date || extracted.end_date || null,
      status: 'in_progress',
    });
    queryClient.invalidateQueries({ queryKey: ['goals'] });
    return { entity: 'Goal', record };
  }

  if (cat === 'event') {
    const startDate = extracted.start_date || new Date().toISOString();
    const durationMs = (extracted.duration_minutes || 60) * 60000;
    const endDate = new Date(new Date(startDate).getTime() + durationMs).toISOString();
    const record = await base44.entities.Event.create({
      title: extracted.title || transcript.substring(0, 80),
      description: extracted.description || transcript,
      start_date: startDate,
      end_date: endDate,
      category: 'personal',
      source: 'app',
    });
    queryClient.invalidateQueries({ queryKey: ['events'] });
    return { entity: 'Event', record };
  }

  if (cat === 'finance') {
    const record = await base44.entities.Expense.create({
      date: format(new Date(), 'yyyy-MM-dd'),
      amount: extracted.amount || 0,
      type: extracted.finance_type || 'expense',
      category: extracted.finance_category || 'other',
      description: extracted.title || transcript.substring(0, 100),
      notes: extracted.description || transcript,
    });
    queryClient.invalidateQueries({ queryKey: ['expenses'] });
    return { entity: 'Expense', record };
  }

  if (cat === 'travel') {
    const record = await base44.entities.Holiday.create({
      title: extracted.title || `Trip to ${extracted.destination || 'Destination'}`,
      destination: extracted.destination || '',
      start_date: extracted.start_date || format(new Date(), 'yyyy-MM-dd'),
      end_date: extracted.end_date || format(addDays(new Date(), 7), 'yyyy-MM-dd'),
      notes: extracted.description || transcript,
      status: 'planned',
    });
    queryClient.invalidateQueries({ queryKey: ['holidays'] });
    return { entity: 'Holiday', record };
  }

  if (cat === 'journal') {
    const record = await base44.entities.Reflection.create({
      date: format(new Date(), 'yyyy-MM-dd'),
      content: transcript,
      title: extracted.title || 'Voice Note',
      mood: 'neutral',
      tags: ['voice-capture'],
    });
    queryClient.invalidateQueries({ queryKey: ['reflections'] });
    return { entity: 'Reflection', record };
  }

  // Fallback: save as task
  const record = await base44.entities.Task.create({
    title: extracted.title || transcript.substring(0, 80),
    description: transcript,
    priority: 'medium',
    status: 'todo',
    tags: ['voice-capture'],
  });
  queryClient.invalidateQueries({ queryKey: ['tasks'] });
  return { entity: 'Task', record };
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function VoiceCaptureHub({ onClose }) {
  const [phase, setPhase] = useState('idle'); // idle | recording | processing | review | saved
  const [transcript, setTranscript] = useState('');
  const [editedTranscript, setEditedTranscript] = useState('');
  const [extracted, setExtracted] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => () => {
    clearInterval(timerRef.current);
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4' });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        setAudioBlob(blob);
        await processAudio(blob);
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setPhase('recording');
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch (e) {
      toast.error('Microphone access denied. Please allow microphone permissions.');
    }
  };

  const stopRecording = () => {
    clearInterval(timerRef.current);
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setPhase('processing');
  };

  const processAudio = async (blob) => {
    setPhase('processing');
    try {
      // Upload audio for LLM processing
      const { file_url } = await base44.integrations.Core.UploadFile({ file: blob });

      // Transcribe + extract in one LLM call using vision+audio
      const transcribeResult = await base44.integrations.Core.InvokeLLM({
        prompt: `This is an audio recording. Please transcribe EXACTLY what is said, word for word. Return only the transcription text, nothing else.`,
        file_urls: [file_url],
      });

      const text = typeof transcribeResult === 'string' ? transcribeResult : JSON.stringify(transcribeResult);
      setTranscript(text);
      setEditedTranscript(text);

      // Now extract structured data
      const data = await extractAndSave(text, queryClient);
      setExtracted(data);
      setPhase('review');
    } catch (e) {
      console.error('Voice processing error:', e);
      toast.error('Could not process audio. Try speaking more clearly.');
      setPhase('idle');
    }
  };

  const handleSave = async () => {
    if (!extracted) return;
    setPhase('processing');
    try {
      // Use potentially edited transcript
      const finalExtracted = editedTranscript !== transcript
        ? await extractAndSave(editedTranscript, queryClient)
        : extracted;

      const { entity } = await saveExtracted(finalExtracted, editedTranscript, queryClient);
      setPhase('saved');
      const catConfig = CATEGORIES[finalExtracted.category] || CATEGORIES.task;
      toast.success(`Saved to ${entity}! ✓`, { duration: 3000 });
      setTimeout(onClose, 1500);
    } catch (e) {
      console.error('Save error:', e);
      toast.error('Could not save. Please try again.');
      setPhase('review');
    }
  };

  const handleOverrideCategory = async (newCat) => {
    setExtracted(prev => ({ ...prev, category: newCat }));
  };

  const formatTime = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const catConfig = extracted ? (CATEGORIES[extracted.category] || CATEGORIES.task) : null;
  const CatIcon = catConfig?.icon || Sparkles;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
      style={{ width: '100%', maxWidth: '440px' }}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1a4a6e] to-[#3ecfa0] p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-white/20 rounded-lg">
            <Mic className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm">Voice Capture</p>
            <p className="text-white/60 text-[10px]">Speak — AI handles the rest</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
          <X className="w-4 h-4 text-white/80" />
        </button>
      </div>

      <div className="p-5 space-y-4">

        {/* ── IDLE ── */}
        {phase === 'idle' && (
          <div className="text-center space-y-4">
            <div className="text-xs text-slate-400 mb-2">What can you capture by voice:</div>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(CATEGORIES).map(([key, c]) => {
                const Icon = c.icon;
                return (
                  <div key={key} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-800">
                    <Icon className="w-4 h-4 text-slate-500" />
                    <span className="text-[10px] text-slate-400 font-medium">{c.label}</span>
                  </div>
                );
              })}
            </div>
            <div className="pt-2">
              <p className="text-xs text-slate-400 mb-3 italic">
                e.g. "Remind me to call the dentist tomorrow morning" or "I spent £40 on groceries today"
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={startRecording}
                className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-red-500 to-rose-600 shadow-xl shadow-red-200 dark:shadow-red-900 flex items-center justify-center"
              >
                <Mic className="w-8 h-8 text-white" />
              </motion.button>
              <p className="text-xs text-slate-400 mt-2">Tap to start recording</p>
            </div>
          </div>
        )}

        {/* ── RECORDING ── */}
        {phase === 'recording' && (
          <div className="text-center space-y-4">
            <div className="relative w-24 h-24 mx-auto">
              <motion.div
                className="absolute inset-0 rounded-full bg-red-500/20"
                animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <motion.div
                className="absolute inset-2 rounded-full bg-red-500/15"
                animate={{ scale: [1, 1.25, 1], opacity: [0.4, 0, 0.4] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
              />
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg">
                <Waveform active={true} />
              </div>
            </div>

            <div>
              <p className="text-2xl font-mono font-bold text-slate-800 dark:text-slate-100">{formatTime(recordingTime)}</p>
              <p className="text-xs text-red-500 font-semibold animate-pulse">● Recording…</p>
            </div>

            <p className="text-sm text-slate-500 dark:text-slate-400 px-4">
              Speak naturally — mention tasks, dates, amounts, places, or prayers
            </p>

            <Button onClick={stopRecording}
              className="bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 text-white rounded-full px-8">
              <Square className="w-4 h-4 mr-2 fill-current" /> Stop Recording
            </Button>
          </div>
        )}

        {/* ── PROCESSING ── */}
        {phase === 'processing' && (
          <div className="text-center space-y-4 py-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-[#1a4a6e] to-[#3ecfa0] flex items-center justify-center">
              <Loader2 className="w-7 h-7 text-white animate-spin" />
            </div>
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-100">Processing your voice note…</p>
              <p className="text-xs text-slate-400 mt-1">Transcribing · Categorizing · Extracting details</p>
            </div>
            <div className="flex justify-center gap-1">
              {['Transcribe', 'Categorize', 'Extract', 'Save'].map((step, i) => (
                <motion.div key={step} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.4 }}
                  className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] text-slate-500 font-medium">
                  {step}
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* ── REVIEW ── */}
        {phase === 'review' && extracted && (
          <div className="space-y-3">
            {/* Transcript (editable) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-slate-500">Transcript</p>
                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <Edit3 className="w-3 h-3" /> editable
                </div>
              </div>
              <textarea
                value={editedTranscript}
                onChange={(e) => setEditedTranscript(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl resize-none focus:outline-none focus:ring-1 focus:ring-blue-400 text-slate-700 dark:text-slate-300"
              />
            </div>

            {/* Detected category */}
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1.5">AI detected as</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(CATEGORIES).map(([key, c]) => {
                  const Icon = c.icon;
                  const isActive = extracted.category === key;
                  return (
                    <button key={key} onClick={() => handleOverrideCategory(key)}
                      className={cn('flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all', isActive ? c.light + ' ring-2 ring-offset-1' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-slate-300')}>
                      <Icon className="w-3 h-3" />
                      {c.label}
                      {isActive && <Check className="w-3 h-3 ml-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Extracted fields preview */}
            <div className={cn('rounded-xl border p-3 space-y-1.5', catConfig?.light)}>
              <div className="flex items-center gap-1.5 mb-2">
                <CatIcon className="w-4 h-4" />
                <span className="text-xs font-bold">Will save to: {catConfig?.label}</span>
                {extracted.confidence && (
                  <Badge className="ml-auto text-[10px] bg-white/60 border-current/20">
                    {extracted.confidence}% confident
                  </Badge>
                )}
              </div>
              {extracted.title && (
                <div className="flex gap-2 text-xs">
                  <span className="font-semibold opacity-60 w-16 flex-shrink-0">Title</span>
                  <span className="font-medium">{extracted.title}</span>
                </div>
              )}
              {extracted.due_date && (
                <div className="flex gap-2 text-xs">
                  <span className="font-semibold opacity-60 w-16 flex-shrink-0">Due</span>
                  <span>{extracted.due_date}</span>
                </div>
              )}
              {extracted.priority && (
                <div className="flex gap-2 text-xs">
                  <span className="font-semibold opacity-60 w-16 flex-shrink-0">Priority</span>
                  <span className="capitalize">{extracted.priority}</span>
                </div>
              )}
              {extracted.amount > 0 && (
                <div className="flex gap-2 text-xs">
                  <span className="font-semibold opacity-60 w-16 flex-shrink-0">Amount</span>
                  <span>{extracted.amount} ({extracted.finance_type})</span>
                </div>
              )}
              {extracted.destination && (
                <div className="flex gap-2 text-xs">
                  <span className="font-semibold opacity-60 w-16 flex-shrink-0">To</span>
                  <span>{extracted.destination}</span>
                </div>
              )}
              {extracted.start_date && (
                <div className="flex gap-2 text-xs">
                  <span className="font-semibold opacity-60 w-16 flex-shrink-0">Date</span>
                  <span>{extracted.start_date?.split('T')[0]}</span>
                </div>
              )}
              {extracted.tags?.length > 0 && (
                <div className="flex gap-1 flex-wrap mt-1">
                  {extracted.tags.map(t => <span key={t} className="px-1.5 py-0.5 rounded-full bg-white/50 text-[10px] font-medium">#{t}</span>)}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPhase('idle')} className="flex-1 text-xs">
                <MicOff className="w-3 h-3 mr-1" /> Re-record
              </Button>
              <Button onClick={handleSave} size="sm" className="flex-1 text-xs bg-gradient-to-r from-[#1a4a6e] to-[#3ecfa0] text-white hover:opacity-90">
                <Check className="w-3 h-3 mr-1" /> Save to {catConfig?.label}
              </Button>
            </div>
          </div>
        )}

        {/* ── SAVED ── */}
        {phase === 'saved' && (
          <div className="text-center space-y-3 py-6">
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg"
            >
              <Check className="w-8 h-8 text-white" />
            </motion.div>
            <p className="font-bold text-slate-800 dark:text-slate-100">Saved successfully!</p>
            <p className="text-xs text-slate-400">Your voice note has been processed and added.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}