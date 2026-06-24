import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, RefreshCw, ChevronDown, ChevronUp, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, addDays } from 'date-fns';

/**
 * JournalStarter
 * Props:
 *   currentMood (string)      — current mood selected in the editor
 *   onUsePrompt(prompt)       — called with selected prompt string
 */
export default function JournalStarter({ currentMood, onUsePrompt }) {
  const [open, setOpen] = useState(false);
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  // Recent journal entries (last 5)
  const { data: recentEntries = [] } = useQuery({
    queryKey: ['reflections-starter'],
    queryFn: () => base44.entities.Reflection.list('-date', 5),
    staleTime: 60_000,
  });

  // Upcoming events (next 7 days)
  const { data: events = [] } = useQuery({
    queryKey: ['events-starter'],
    queryFn: () => base44.entities.Event.filter({
      start_date: { $gte: new Date().toISOString(), $lte: addDays(new Date(), 7).toISOString() }
    }, 'start_date', 5),
    staleTime: 60_000,
  });

  const generatePrompts = async () => {
    setLoading(true);
    setOpen(true);

    // Build context
    const recentThemes = recentEntries
      .flatMap(e => [e.category, e.mood, ...(e.tags || [])].filter(Boolean))
      .slice(0, 12)
      .join(', ');

    const recentTitles = recentEntries
      .map(e => e.title || e.category)
      .filter(Boolean)
      .join('; ');

    const upcomingEventNames = events
      .map(e => `${e.title} on ${format(new Date(e.start_date), 'EEE do')}`)
      .join(', ');

    const moodContext = currentMood ? `The user's current mood is: ${currentMood}.` : '';

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a thoughtful journaling coach. Generate 4 personalised, open-ended reflection prompts for today's journal entry.

Context:
- ${moodContext}
- Recent journal themes/moods/tags: ${recentThemes || 'none yet'}
- Recent entry topics: ${recentTitles || 'none yet'}
- Upcoming events this week: ${upcomingEventNames || 'none'}
- Today's date: ${format(new Date(), 'EEEE, MMMM do yyyy')}

Rules:
- Make prompts specific and personal based on the context
- Vary the style: one introspective, one gratitude-focused, one future-focused, one about challenges
- Each prompt should be 1-2 sentences max
- Do NOT start prompts with "I" — phrase them as open questions or sentence starters
- Return a JSON object with a "prompts" array of 4 strings`,
        response_json_schema: {
          type: 'object',
          properties: {
            prompts: { type: 'array', items: { type: 'string' } }
          }
        }
      });
      setPrompts(result?.prompts || []);
      setGenerated(true);
    } catch (e) {
      // Fallback prompts
      setPrompts([
        'What made today feel meaningful, even in a small way?',
        'Three things I\'m grateful for right now, and why each matters…',
        'Looking at my upcoming week — what am I most looking forward to, and what am I anxious about?',
        'A challenge I\'m currently facing, and what it might be teaching me…',
      ]);
      setGenerated(true);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    if (!open) {
      if (!generated) {
        generatePrompts();
      } else {
        setOpen(true);
      }
    } else {
      setOpen(false);
    }
  };

  return (
    <div className="mb-4 rounded-2xl border border-[#E8B84B]/30 overflow-hidden bg-gradient-to-r from-amber-50/80 to-sky-50/80">
      {/* Header button */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-amber-50/50 transition-colors"
      >
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#E8B84B] to-amber-400 flex items-center justify-center flex-shrink-0 shadow-sm">
          <Wand2 className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-slate-700">Journal Starter</p>
          <p className="text-xs text-slate-400">AI prompts personalised to your mood & schedule</p>
        </div>
        {loading ? (
          <Loader2 className="w-4 h-4 text-[#E8B84B] animate-spin" />
        ) : open ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {/* Prompts panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-[#E8B84B]/20 px-4 py-3 space-y-2">
              {loading ? (
                <div className="flex items-center gap-2 py-2 text-sm text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin text-[#E8B84B]" />
                  Crafting personalised prompts for you…
                </div>
              ) : (
                <>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
                    <Sparkles className="inline w-3 h-3 mr-1 text-[#E8B84B]" />
                    Tap a prompt to use it
                  </p>
                  {prompts.map((p, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      onClick={() => { onUsePrompt(p); setOpen(false); }}
                      className="w-full text-left px-3 py-2.5 rounded-xl bg-white border border-slate-100 hover:border-[#E8B84B]/50 hover:bg-amber-50/60 transition-all text-sm text-slate-700 leading-snug shadow-sm group"
                    >
                      <span className="text-[#E8B84B] font-bold mr-2 text-xs">{i + 1}.</span>
                      {p}
                      <span className="ml-2 text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">Use →</span>
                    </motion.button>
                  ))}
                  <button
                    onClick={generatePrompts}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-[#1a5a9a] mt-1 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" /> Regenerate prompts
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}