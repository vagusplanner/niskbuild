import React, { useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Plus, RotateCcw, FileText, ListChecks, BarChart2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ─── 1. Generate Description from Keywords ──────────────────────────────────
export function AIDescriptionGenerator({ title, category, onInsert }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');

  const generate = async () => {
    if (!title?.trim()) return;
    setLoading(true);
    setResult('');
    const res = await SDK.integrations.Core.InvokeLLM({
      prompt: `Write a concise, motivating goal description (2-3 sentences) for someone with the following goal title: "${title}" in the category: "${category}". Focus on the why and the benefit. Return only the description text, no extra formatting.`,
    });
    setResult(typeof res === 'string' ? res : res?.description || '');
    setLoading(false);
  };

  return (
    <div className="mt-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={generate}
        disabled={loading || !title?.trim()}
        className="h-7 px-2 text-xs text-violet-600 hover:text-violet-800 hover:bg-violet-50 gap-1"
      >
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
        {loading ? 'Generating…' : 'AI: Write description'}
      </Button>
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mt-2 p-3 bg-violet-50 border border-violet-200 rounded-lg text-sm text-slate-700"
          >
            <p className="mb-2">{result}</p>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => onInsert(result)}>
                <Plus className="w-3 h-3 mr-1" /> Use this
              </Button>
              <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={generate}>
                <RotateCcw className="w-3 h-3 mr-1" /> Regenerate
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── 2. Suggest Action Steps from Goal ──────────────────────────────────────
export function AITaskSuggester({ title, description, category, onAddSteps }) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selected, setSelected] = useState(new Set());

  const suggest = async () => {
    if (!title?.trim()) return;
    setLoading(true);
    setSuggestions([]);
    setSelected(new Set());
    const res = await SDK.integrations.Core.InvokeLLM({
      prompt: `Suggest 5 practical, specific action steps to achieve this goal:\nTitle: "${title}"\nCategory: "${category}"\nDescription: "${description || 'N/A'}"\n\nReturn a JSON object with a "steps" array of strings.`,
      response_json_schema: {
        type: 'object',
        properties: {
          steps: { type: 'array', items: { type: 'string' } }
        }
      }
    });
    setSuggestions(res?.steps || []);
    setSelected(new Set((res?.steps || []).map((_, i) => i)));
    setLoading(false);
  };

  const toggle = (i) => setSelected(prev => {
    const next = new Set(prev);
    next.has(i) ? next.delete(i) : next.add(i);
    return next;
  });

  const addSelected = () => {
    const steps = suggestions
      .filter((_, i) => selected.has(i))
      .map(s => ({ title: s, completed: false, due_date: '' }));
    onAddSteps(steps);
    setSuggestions([]);
  };

  return (
    <div className="mt-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={suggest}
        disabled={loading || !title?.trim()}
        className="h-7 px-2 text-xs text-teal-600 hover:text-teal-800 hover:bg-teal-50 gap-1"
      >
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ListChecks className="w-3 h-3" />}
        {loading ? 'Thinking…' : 'AI: Suggest steps'}
      </Button>
      <AnimatePresence>
        {suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mt-2 p-3 bg-teal-50 border border-teal-200 rounded-lg space-y-1.5"
          >
            <p className="text-xs font-medium text-teal-700 mb-2">Select steps to add:</p>
            {suggestions.map((s, i) => (
              <label key={i} className={cn(
                "flex items-center gap-2 p-2 rounded-lg cursor-pointer text-sm transition-colors",
                selected.has(i) ? "bg-teal-100" : "hover:bg-teal-50"
              )}>
                <input
                  type="checkbox"
                  checked={selected.has(i)}
                  onChange={() => toggle(i)}
                  className="rounded"
                />
                <span>{s}</span>
              </label>
            ))}
            <div className="flex gap-2 pt-1">
              <Button type="button" size="sm" className="h-7 text-xs bg-teal-600 hover:bg-teal-700" onClick={addSelected} disabled={selected.size === 0}>
                <Plus className="w-3 h-3 mr-1" /> Add {selected.size} step{selected.size !== 1 ? 's' : ''}
              </Button>
              <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSuggestions([])}>
                Dismiss
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── 3. Progress Update Summary ─────────────────────────────────────────────
export function AIProgressSummary({ goal }) {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [open, setOpen] = useState(false);

  const steps = goal.action_steps || [];
  const completedSteps = steps.filter(s => s.completed).length;
  const progress = steps.length ? Math.round((completedSteps / steps.length) * 100) : goal.progress || 0;

  const generate = async () => {
    setLoading(true);
    setSummary('');
    setOpen(true);
    const res = await SDK.integrations.Core.InvokeLLM({
      prompt: `Write a brief, encouraging progress update (2-3 sentences) for this goal:\nTitle: "${goal.title}"\nCategory: "${goal.category}"\nProgress: ${progress}%\nStatus: ${goal.status}\nCompleted steps: ${completedSteps} of ${steps.length} (${steps.map(s => s.title + (s.completed ? ' ✓' : '')).join(', ') || 'none defined'})\nTarget date: ${goal.target_date || 'not set'}\n\nHighlight achievements and give a motivating nudge for what's next. Return only the summary text.`,
    });
    setSummary(typeof res === 'string' ? res : res?.summary || '');
    setLoading(false);
  };

  return (
    <div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={open && !loading ? () => setOpen(false) : generate}
        className="h-7 px-2 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 gap-1"
      >
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <BarChart2 className="w-3 h-3" />}
        {loading ? 'Summarising…' : open ? 'Hide summary' : 'AI: Progress summary'}
      </Button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 overflow-hidden"
          >
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating summary…
                </div>
              ) : (
                <>
                  <p className="text-sm text-slate-700">{summary}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-2 h-7 text-xs gap-1"
                    onClick={generate}
                  >
                    <RotateCcw className="w-3 h-3" /> Regenerate
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}