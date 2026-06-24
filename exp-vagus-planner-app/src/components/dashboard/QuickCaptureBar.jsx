/**
 * QuickCaptureBar — Universal natural language entry bar on the Dashboard.
 * Works for events AND tasks. Parses intent and routes accordingly.
 * Standard Edition: schedules to Calendar.
 * Islamic Edition: also detects prayer-related entries.
 */
import React, { useState, useEffect } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Check, X, Calendar, CheckSquare, Mic } from 'lucide-react';
import VoiceTaskInput from '@/components/tasks/VoiceTaskInput';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const EXAMPLES = [
  'Dentist Friday 3pm',
  'Buy groceries tomorrow',
  'Team standup Monday 9am',
  'Call mum this evening',
];

export default function QuickCaptureBar({ islamicMode = false }) {
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState(null); // { type: 'event'|'task', data: {} }
  const [exampleIdx, setExampleIdx] = useState(0);
  const [showVoice, setShowVoice] = useState(false);

  React.useEffect(() => {
    const t = setInterval(() => setExampleIdx(i => (i + 1) % EXAMPLES.length), 3000);
    return () => clearInterval(t);
  }, []);

  const handleParse = async () => {
    if (!text.trim()) return;
    setParsing(true);
    setResult(null);
    try {
      const res = await SDK.integrations.Core.InvokeLLM({
        prompt: `Parse this user input into either a calendar event or a task.
User input: "${text}"
Current date: ${new Date().toISOString().split('T')[0]}

Determine if this is:
- An EVENT: has a specific date/time, meeting, appointment
- A TASK: a to-do item without a specific time, or "buy", "call", "finish", "complete"

Return JSON with:
{
  "type": "event" or "task",
  "title": "clean title",
  "date": "YYYY-MM-DD or null",
  "time": "HH:MM or null",
  "priority": "low|medium|high (for tasks)",
  "category": "personal|work|health|shopping (for tasks)"
}`,
        response_json_schema: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            title: { type: 'string' },
            date: { type: 'string' },
            time: { type: 'string' },
            priority: { type: 'string' },
            category: { type: 'string' },
          }
        }
      });
      if (res?.title) setResult(res);
      else toast.error('Could not understand. Try: "Dentist Friday 3pm" or "Buy milk tomorrow"');
    } catch (e) {
      toast.error('Parse failed, try again');
    } finally {
      setParsing(false);
    }
  };

  const createMutation = useMutation({
    mutationFn: async (r) => {
      if (r.type === 'event') {
        const dateStr = r.date || new Date().toISOString().split('T')[0];
        const timeStr = r.time || '09:00';
        const start = new Date(`${dateStr}T${timeStr}:00`);
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        return SDK.entities.Event.create({
          title: r.title,
          start_date: start.toISOString(),
          end_date: end.toISOString(),
          category: 'personal',
        });
      } else {
        return SDK.entities.Task.create({
          title: r.title,
          due_date: r.date || null,
          priority: r.priority || 'medium',
          category: r.category || 'personal',
          status: 'todo',
        });
      }
    },
    onSuccess: (_, r) => {
      queryClient.invalidateQueries({ queryKey: ['todayEvents'] });
      queryClient.invalidateQueries({ queryKey: ['activeTasks'] });
      toast.success(r.type === 'event' ? `📅 Event added to Calendar` : `✅ Task created`);
      setText('');
      setResult(null);
    },
  });

  return (
    <div className="w-full space-y-2">
      <VoiceTaskInput
        isOpen={showVoice}
        onClose={() => setShowVoice(false)}
        onTasksCreated={() => {
          queryClient.invalidateQueries({ queryKey: ['activeTasks'] });
          setShowVoice(false);
        }}
      />
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#E8B84B] pointer-events-none" />
          <Input
            value={text}
            onChange={e => { setText(e.target.value); setResult(null); }}
            onKeyDown={e => e.key === 'Enter' && !parsing && handleParse()}
            placeholder={`Try: "${EXAMPLES[exampleIdx]}"${islamicMode ? ' or "Remind me Asr today"' : ''}`}
            className="pl-9 bg-white/90 dark:bg-slate-900/80 border-[#E8B84B]/30 focus:border-[#E8B84B]/60 shadow-sm text-sm h-10"
          />
        </div>
        <Button onClick={() => setShowVoice(true)} variant="outline"
          className="h-10 px-3 border-[#29ABE2]/40 text-[#29ABE2] hover:bg-[#29ABE2]/10 flex-shrink-0"
          title="Voice input">
          <Mic className="w-4 h-4" />
        </Button>
        <Button onClick={handleParse} disabled={!text.trim() || parsing}
          className="bg-gradient-to-r from-[#1a7ab8] to-[#3ecfa0] text-white border-0 h-10 px-4 shadow-sm">
          {parsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        </Button>
      </div>

      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-[#E8B84B]/30 shadow-sm">
            <div className={`p-1.5 rounded-lg ${result.type === 'event' ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-emerald-100 dark:bg-emerald-900/40'}`}>
              {result.type === 'event'
                ? <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                : <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{result.title}</p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <Badge className="text-[10px] py-0 px-1.5">{result.type === 'event' ? '📅 Event' : '✅ Task'}</Badge>
                {result.date && <span className="text-[10px] text-slate-400">{result.date}</span>}
                {result.time && <span className="text-[10px] text-slate-400">at {result.time}</span>}
              </div>
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => createMutation.mutate(result)} disabled={createMutation.isPending}
                className="p-1.5 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg hover:bg-emerald-200 transition-colors">
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin text-emerald-600" /> : <Check className="w-4 h-4 text-emerald-600" />}
              </button>
              <button onClick={() => setResult(null)}
                className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 transition-colors">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}