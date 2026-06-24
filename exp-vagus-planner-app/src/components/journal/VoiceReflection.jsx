import React, { useState, useRef, useCallback } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Sparkles, Loader2, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/**
 * VoiceReflection
 * Props:
 *   onTranscript(text)         — called with raw transcript to append to content
 *   onAIExtract({ themes, gratitude_items, mood_suggestion, summary })
 *                              — called with AI-parsed insights
 */
export default function VoiceReflection({ onTranscript, onAIExtract }) {
  const [state, setState] = useState('idle'); // idle | listening | processing | done | error
  const [transcript, setTranscript] = useState('');
  const [insights, setInsights] = useState(null);
  const recognitionRef = useRef(null);

  const supported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let finalTranscript = '';

    recognition.onstart = () => setState('listening');

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += text + ' ';
        } else {
          interim = text;
        }
      }
      setTranscript(finalTranscript + interim);
    };

    recognition.onerror = (e) => {
      console.error('Speech recognition error:', e.error);
      setState('error');
      toast.error('Microphone error: ' + e.error);
    };

    recognition.onend = () => {
      if (finalTranscript.trim()) {
        setTranscript(finalTranscript.trim());
        processWithAI(finalTranscript.trim());
      } else {
        setState('idle');
      }
    };

    recognitionRef.current = recognition;
    recognitionRef.current._finalTranscript = () => finalTranscript;
    recognition.start();
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const processWithAI = async (text) => {
    setState('processing');
    try {
      const result = await SDK.integrations.Core.InvokeLLM({
        prompt: `Analyse this journal reflection and extract insights as JSON.

Reflection: "${text}"

Return a JSON object with:
- "themes": array of 3-5 key theme strings (e.g. "self-growth", "family", "work stress")
- "gratitude_items": array of specific things the person is grateful for (extract from text, or suggest 2-3 based on tone)
- "mood_suggestion": one of: joyful, grateful, peaceful, hopeful, reflective, motivated, anxious, sad, frustrated, tired
- "summary": one sentence summary of the reflection (max 20 words)
- "tags": array of 2-4 lowercase tag strings

Return ONLY valid JSON, no markdown.`,
        add_context_from_internet: false,
        response_json_schema: {
          type: 'object',
          properties: {
            themes: { type: 'array', items: { type: 'string' } },
            gratitude_items: { type: 'array', items: { type: 'string' } },
            mood_suggestion: { type: 'string' },
            summary: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
          }
        }
      });
      setInsights(result);
      setState('done');
    } catch (e) {
      console.error('AI extract error:', e);
      // Still provide the transcript even if AI fails
      setState('done');
      setInsights(null);
      toast.error('AI insights unavailable, but your transcript is ready.');
    }
  };

  const applyAll = () => {
    onTranscript(transcript);
    if (insights) onAIExtract(insights);
    setTranscript('');
    setInsights(null);
    setState('idle');
    toast.success('Voice reflection applied!');
  };

  const dismiss = () => {
    recognitionRef.current?.abort();
    setTranscript('');
    setInsights(null);
    setState('idle');
  };

  if (!supported) return null;

  return (
    <div className="mb-4">
      {/* Trigger button */}
      {state === 'idle' && (
        <button
          onClick={startListening}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#1a5a9a]/10 to-[#3ecfa0]/10 border border-[#3ecfa0]/30 text-[#1a5a9a] text-sm font-semibold hover:from-[#1a5a9a]/20 hover:to-[#3ecfa0]/20 transition-all"
        >
          <Mic className="w-4 h-4 text-[#E8B84B]" />
          Speak your reflection
        </button>
      )}

      <AnimatePresence>
        {state !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl border border-sky-100 bg-white shadow-sm overflow-hidden"
          >
            {/* Header */}
            <div className={cn(
              'flex items-center gap-3 px-4 py-3',
              state === 'listening' ? 'bg-red-50 border-b border-red-100' :
              state === 'processing' ? 'bg-amber-50 border-b border-amber-100' :
              state === 'done' ? 'bg-emerald-50 border-b border-emerald-100' :
              'bg-red-50 border-b border-red-100'
            )}>
              {state === 'listening' && (
                <>
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                  </span>
                  <span className="text-sm font-semibold text-red-700 flex-1">Listening… speak freely</span>
                  <Button size="sm" variant="ghost" onClick={stopListening} className="text-red-600 hover:bg-red-100 h-7 gap-1">
                    <MicOff className="w-3.5 h-3.5" /> Stop
                  </Button>
                </>
              )}
              {state === 'processing' && (
                <>
                  <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
                  <span className="text-sm font-semibold text-amber-700 flex-1">AI is extracting themes & insights…</span>
                </>
              )}
              {state === 'done' && (
                <>
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-semibold text-emerald-700 flex-1">Ready to apply</span>
                  <button onClick={dismiss} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                </>
              )}
              {state === 'error' && (
                <>
                  <span className="text-sm font-semibold text-red-700 flex-1">Microphone error</span>
                  <button onClick={dismiss} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                </>
              )}
            </div>

            {/* Live transcript */}
            {(state === 'listening' || state === 'done' || state === 'processing') && transcript && (
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Transcript</p>
                <p className="text-sm text-slate-700 leading-relaxed italic">"{transcript}"</p>
              </div>
            )}

            {/* AI Insights */}
            {state === 'done' && insights && (
              <div className="px-4 py-3 space-y-3">
                {insights.summary && (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Summary</p>
                    <p className="text-sm text-slate-700">{insights.summary}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {insights.themes?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">🎯 Themes</p>
                      <div className="flex flex-wrap gap-1">
                        {insights.themes.map(t => (
                          <span key={t} className="px-2 py-0.5 bg-sky-100 text-sky-700 text-xs rounded-full">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {insights.gratitude_items?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">🙏 Gratitude</p>
                      <ul className="space-y-0.5">
                        {insights.gratitude_items.map(g => (
                          <li key={g} className="text-xs text-slate-600 flex items-start gap-1">
                            <span className="text-emerald-500 mt-0.5">•</span>{g}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                {insights.mood_suggestion && (
                  <p className="text-xs text-slate-500">
                    Detected mood: <span className="font-semibold text-[#1a5a9a] capitalize">{insights.mood_suggestion}</span>
                  </p>
                )}
              </div>
            )}

            {/* Apply button */}
            {state === 'done' && transcript && (
              <div className="px-4 py-3 bg-slate-50 flex gap-2 justify-end border-t border-slate-100">
                <Button variant="ghost" size="sm" onClick={dismiss} className="text-slate-500 h-8">Discard</Button>
                <Button size="sm" onClick={applyAll} className="bg-[#1a5a9a] hover:bg-[#1a3a6e] text-white gap-1.5 h-8">
                  <Check className="w-3.5 h-3.5" /> Apply to Entry
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}