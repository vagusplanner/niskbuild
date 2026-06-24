import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, MicOff, Sparkles, X, Check, ChevronRight,
  Clock, Flag, AlertTriangle, Loader2, Volume2, RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const PRIORITY_STYLES = {
  urgent: 'bg-red-100 text-red-700 border-red-200',
  high:   'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low:    'bg-slate-100 text-slate-600 border-slate-200',
};

const CAT_EMOJI = {
  work: '💼', personal: '⭐', health: '💪', shopping: '🛒',
  learning: '📚', home: '🏠', prayer: '🕌', other: '📌',
};

// ── Hook: Web Speech API recorder ────────────────────────────────────────────
function useVoiceRecorder({ onTranscript }) {
  const [state, setState] = useState('idle'); // idle | listening | processing | error
  const [transcript, setTranscript] = useState('');
  const [liveText, setLiveText] = useState('');
  const recognitionRef = useRef(null);

  const isSupported = typeof window !== 'undefined' && (
    'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
  );

  const start = useCallback(() => {
    if (!isSupported) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;

    let finalText = '';

    recognition.onstart = () => setState('listening');
    recognition.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          finalText += e.results[i][0].transcript + ' ';
        } else {
          interim += e.results[i][0].transcript;
        }
      }
      setLiveText(finalText + interim);
    };
    recognition.onerror = (e) => {
      if (e.error !== 'aborted') setState('error');
    };
    recognition.onend = () => {
      const result = finalText.trim();
      setTranscript(result);
      setLiveText('');
      if (result) {
        setState('processing');
        onTranscript(result);
      } else {
        setState('idle');
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported, onTranscript]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const reset = useCallback(() => {
    recognitionRef.current?.abort();
    setState('idle');
    setTranscript('');
    setLiveText('');
  }, []);

  return { state, transcript, liveText, isSupported, start, stop, reset };
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function VoiceTaskInput({ isOpen, onClose, onTasksCreated }) {
  const [extractedItems, setExtractedItems] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [aiSummary, setAiSummary] = useState('');

  const processTranscript = useCallback(async (text) => {
    setExtractedItems([]);
    setSelected(new Set());
    setAiSummary('');
    try {
      const res = await base44.functions.invoke('voiceTaskExtractor', { transcript: text });
      const items = res.data?.extracted || [];
      setExtractedItems(items);
      setAiSummary(res.data?.summary || '');
      // Auto-select all tasks by default
      setSelected(new Set(items.map((_, i) => i)));
      if (items.length === 0) toast.info('No tasks found. Try speaking more clearly.');
    } catch (e) {
      toast.error('AI extraction failed. Try again.');
      recorder.reset();
    }
  }, []);

  const recorder = useVoiceRecorder({ onTranscript: processTranscript });

  // Close cleanly
  const handleClose = () => {
    recorder.reset();
    setExtractedItems([]);
    setSelected(new Set());
    setAiSummary('');
    onClose();
  };

  const toggleSelect = (i) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const handleSave = async () => {
    const toSave = extractedItems.filter((_, i) => selected.has(i));
    if (toSave.length === 0) return;
    setSaving(true);
    try {
      const created = [];
      for (const item of toSave) {
        if (item.type === 'task' || !item.type) {
          const task = await base44.entities.Task.create({
            title: item.title,
            priority: item.priority || 'medium',
            category: item.category || 'personal',
            due_date: item.due_date || null,
            due_time: item.due_time || null,
            estimated_minutes: item.estimated_minutes || null,
            notes: item.notes || null,
            status: 'todo',
          });
          created.push(task);
        }
      }
      toast.success(`✅ ${created.length} task${created.length !== 1 ? 's' : ''} created!`);
      onTasksCreated?.(created);
      handleClose();
    } catch (e) {
      toast.error('Failed to save tasks.');
    }
    setSaving(false);
  };

  if (!isOpen) return null;

  const isDone = recorder.state === 'idle' && extractedItems.length > 0;
  const isListening = recorder.state === 'listening';
  const isProcessing = recorder.state === 'processing';
  const isError = recorder.state === 'error';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="w-full sm:max-w-lg bg-[#0a1424] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92dvh] flex flex-col"
          onClick={e => e.stopPropagation()}
          style={{ border: '1.5px solid rgba(41,171,226,0.25)' }}
        >
          {/* Header */}
          <div className="relative p-5 pb-4 flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #0d2a4a 0%, #1D6FB8 100%)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <Mic className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-black text-base">Voice to Tasks</h3>
                  <p className="text-white/55 text-xs">Speak naturally — AI extracts your tasks</p>
                </div>
              </div>
              <button onClick={handleClose} className="p-2 rounded-xl hover:bg-white/15 transition-colors">
                <X className="w-4 h-4 text-white/60" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto hide-scrollbar p-5 space-y-5">
            {/* Not supported */}
            {!recorder.isSupported && (
              <div className="text-center py-10">
                <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
                <p className="text-white font-bold">Speech not supported</p>
                <p className="text-white/50 text-sm mt-1">Use Chrome or Safari for voice input.</p>
              </div>
            )}

            {/* Record button area */}
            {recorder.isSupported && !isDone && (
              <div className="flex flex-col items-center gap-5 py-4">

                {/* Mic Button */}
                <motion.button
                  onClick={isListening ? recorder.stop : recorder.start}
                  disabled={isProcessing}
                  whileTap={{ scale: 0.93 }}
                  className={cn(
                    'relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-200 shadow-xl',
                    isListening
                      ? 'bg-red-500 hover:bg-red-600'
                      : isProcessing
                        ? 'bg-[#1D6FB8] cursor-not-allowed'
                        : 'bg-[#1D6FB8] hover:bg-[#2980B9]'
                  )}
                >
                  {/* Pulse rings when listening */}
                  {isListening && (
                    <>
                      <motion.span
                        className="absolute inset-0 rounded-full bg-red-500/40"
                        animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
                        transition={{ duration: 1.2, repeat: Infinity }}
                      />
                      <motion.span
                        className="absolute inset-0 rounded-full bg-red-500/25"
                        animate={{ scale: [1, 2.1], opacity: [0.4, 0] }}
                        transition={{ duration: 1.2, repeat: Infinity, delay: 0.3 }}
                      />
                    </>
                  )}
                  {isProcessing
                    ? <Loader2 className="w-10 h-10 text-white animate-spin" />
                    : isListening
                      ? <MicOff className="w-10 h-10 text-white" />
                      : <Mic className="w-10 h-10 text-white" />
                  }
                </motion.button>

                <div className="text-center">
                  {isListening && (
                    <motion.p
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="text-red-400 font-bold text-sm">
                      Listening… tap to stop
                    </motion.p>
                  )}
                  {isProcessing && (
                    <p className="text-[#29ABE2] font-bold text-sm flex items-center gap-2 justify-center">
                      <Sparkles className="w-4 h-4 animate-pulse" /> AI is parsing your tasks…
                    </p>
                  )}
                  {!isListening && !isProcessing && !isError && (
                    <p className="text-white/40 text-sm">Tap the mic to start recording</p>
                  )}
                  {isError && (
                    <p className="text-red-400 text-sm">Microphone error. Please allow mic access and retry.</p>
                  )}
                </div>

                {/* Live transcript preview */}
                {(isListening && recorder.liveText) && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="w-full p-3 bg-white/5 border border-white/10 rounded-xl"
                  >
                    <div className="flex items-start gap-2">
                      <Volume2 className="w-3.5 h-3.5 text-[#29ABE2] mt-0.5 flex-shrink-0 animate-pulse" />
                      <p className="text-white/70 text-sm italic leading-relaxed">{recorder.liveText}</p>
                    </div>
                  </motion.div>
                )}

                {/* Example prompts */}
                {!isListening && !isProcessing && (
                  <div className="w-full space-y-2">
                    <p className="text-white/30 text-xs text-center font-medium uppercase tracking-wider">Try saying…</p>
                    {[
                      '"Call the dentist tomorrow at 10am"',
                      '"Buy groceries on Friday, urgent"',
                      '"Submit the report by end of week and book a haircut"',
                    ].map((ex, i) => (
                      <div key={i} className="text-center text-xs text-white/35 italic">{ex}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Extracted items */}
            {isDone && (
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                {/* AI summary */}
                {aiSummary && (
                  <div className="flex items-start gap-2 p-3 bg-[#1D6FB8]/15 border border-[#29ABE2]/20 rounded-xl">
                    <Sparkles className="w-3.5 h-3.5 text-[#29ABE2] mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-[#A8C8E8] leading-relaxed">{aiSummary}</p>
                  </div>
                )}

                <p className="text-white/50 text-xs font-semibold uppercase tracking-wider">
                  {extractedItems.length} item{extractedItems.length !== 1 ? 's' : ''} found — tap to deselect
                </p>

                <div className="space-y-2">
                  {extractedItems.map((item, i) => {
                    const isSel = selected.has(i);
                    return (
                      <motion.button
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => toggleSelect(i)}
                        className={cn(
                          'w-full text-left p-3.5 rounded-xl border transition-all duration-150',
                          isSel
                            ? 'bg-[#1D6FB8]/20 border-[#29ABE2]/40'
                            : 'bg-white/[0.03] border-white/8 opacity-50'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          {/* Checkbox */}
                          <div className={cn(
                            'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all',
                            isSel ? 'bg-[#29ABE2] border-[#29ABE2]' : 'border-white/25'
                          )}>
                            {isSel && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-sm">{CAT_EMOJI[item.category] || '📌'}</span>
                              <span className="text-white font-semibold text-sm truncate flex-1">{item.title}</span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full border', PRIORITY_STYLES[item.priority] || PRIORITY_STYLES.medium)}>
                                <Flag className="w-2.5 h-2.5 inline mr-0.5" />{item.priority || 'medium'}
                              </span>
                              {item.due_date && (
                                <span className="text-[10px] text-white/45 flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5" />
                                  {item.due_date}{item.due_time ? ` at ${item.due_time}` : ''}
                                </span>
                              )}
                              {item.estimated_minutes && (
                                <span className="text-[10px] text-white/35">~{item.estimated_minutes}m</span>
                              )}
                              {item.type === 'event' && (
                                <span className="text-[10px] text-purple-300 bg-purple-900/30 border border-purple-500/25 px-1.5 py-0.5 rounded-full">Event</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Redo + Save */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => { recorder.reset(); setExtractedItems([]); }}
                    className="border-white/15 text-white/50 bg-transparent gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Redo
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saving || selected.size === 0}
                    className="flex-1 font-bold gap-2 text-white h-11"
                    style={{ background: 'linear-gradient(135deg, #1D6FB8, #29ABE2)' }}
                  >
                    {saving
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <ChevronRight className="w-4 h-4" />
                    }
                    Save {selected.size} Task{selected.size !== 1 ? 's' : ''}
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}