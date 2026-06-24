/**
 * Chat-to-Action — Priority #5 Standard Edition.
 * AI reads the last N messages in a conversation and detects:
 * - Action items → creates Tasks
 * - Plans/meetings → creates Events
 * - Trip plans → creates Holiday
 * Unique: no other planner has native chat + cross-module AI action extraction.
 */
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Check, Calendar, CheckSquare, Plane, X } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const TYPE_ICON = { task: CheckSquare, event: Calendar, trip: Plane };
const TYPE_COLOR = { task: 'text-emerald-600', event: 'text-blue-600', trip: 'text-amber-600' };
const TYPE_BG = { task: 'bg-emerald-50 dark:bg-emerald-950/40', event: 'bg-blue-50 dark:bg-blue-950/40', trip: 'bg-amber-50 dark:bg-amber-950/40' };

export default function ChatToAction({ messages = [], conversationId }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [actions, setActions] = useState([]);
  const [creating, setCreating] = useState(null);

  const detect = async () => {
    if (messages.length < 2) { toast.error('Need at least 2 messages to analyze'); return; }
    setLoading(true);
    setActions([]);
    try {
      const transcript = messages.slice(-20).map(m => `${m.sender_name || m.sender_email}: ${m.message}`).join('\n');
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this chat conversation and detect actionable items.

Conversation:
${transcript}

Extract any:
1. Action items / tasks people agreed to do
2. Meeting/event plans with dates or times mentioned
3. Trip/travel plans

For each item return:
- type: "task", "event", or "trip"  
- title: concise action title
- date: YYYY-MM-DD if mentioned, else null
- time: HH:MM if mentioned, else null
- notes: brief context

Only extract clear, explicit actions — not hypotheticals.`,
        response_json_schema: {
          type: 'object',
          properties: {
            actions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string' },
                  title: { type: 'string' },
                  date: { type: 'string' },
                  time: { type: 'string' },
                  notes: { type: 'string' },
                }
              }
            }
          }
        }
      });
      const found = result?.actions || [];
      if (found.length === 0) toast.info('No clear action items found in this conversation');
      setActions(found);
    } catch (e) {
      toast.error('Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const createAction = async (action, idx) => {
    setCreating(idx);
    try {
      if (action.type === 'task') {
        await base44.entities.Task.create({
          title: action.title,
          due_date: action.date || null,
          priority: 'medium',
          category: 'personal',
          status: 'todo',
          notes: action.notes,
        });
        queryClient.invalidateQueries({ queryKey: ['activeTasks'] });
        toast.success('Task created!');
      } else if (action.type === 'event') {
        const dateStr = action.date || new Date().toISOString().split('T')[0];
        const timeStr = action.time || '10:00';
        const start = new Date(`${dateStr}T${timeStr}:00`);
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        await base44.entities.Event.create({
          title: action.title,
          start_date: start.toISOString(),
          end_date: end.toISOString(),
          category: 'social',
          notes: action.notes,
        });
        queryClient.invalidateQueries({ queryKey: ['todayEvents'] });
        toast.success('Event added to Calendar!');
      } else if (action.type === 'trip') {
        await base44.entities.Holiday.create({
          title: action.title,
          start_date: action.date || new Date().toISOString().split('T')[0],
          end_date: action.date || new Date().toISOString().split('T')[0],
          notes: action.notes,
          status: 'planned',
        });
        toast.success('Trip added to Travel!');
      }
      setActions(a => a.filter((_, i) => i !== idx));
    } catch (e) {
      toast.error('Failed to create');
    } finally {
      setCreating(null);
    }
  };

  return (
    <div className="space-y-2">
      <Button onClick={detect} disabled={loading} size="sm" variant="outline"
        className="w-full border-[#E8B84B]/40 hover:border-[#E8B84B] hover:bg-[#E8B84B]/5 text-slate-700 dark:text-slate-300 gap-2">
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-[#E8B84B]" />}
        {loading ? 'Analysing chat...' : 'Extract Actions from Chat'}
      </Button>

      <AnimatePresence>
        {actions.map((action, i) => {
          const Icon = TYPE_ICON[action.type] || CheckSquare;
          return (
            <motion.div key={i} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className={`flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800 ${TYPE_BG[action.type]}`}>
              <Icon className={`w-4 h-4 flex-shrink-0 ${TYPE_COLOR[action.type]}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{action.title}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge className="text-[9px] py-0 px-1.5 capitalize">{action.type}</Badge>
                  {action.date && <span className="text-[10px] text-slate-400">{action.date}</span>}
                </div>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <button onClick={() => createAction(action, i)} disabled={creating === i}
                  className="p-1.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-emerald-400 hover:bg-emerald-50 transition-colors">
                  {creating === i ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 text-emerald-600" />}
                </button>
                <button onClick={() => setActions(a => a.filter((_, idx) => idx !== i))}
                  className="p-1.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-red-300 hover:bg-red-50 transition-colors">
                  <X className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}