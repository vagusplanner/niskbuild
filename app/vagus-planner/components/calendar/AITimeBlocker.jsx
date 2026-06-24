/**
 * AI Time Blocker — Priority #1 Standard Edition.
 * Analyzes unscheduled tasks and available calendar gaps,
 * then suggests time blocks to place tasks into the calendar.
 * Unique: only possible because Vagus has both Calendar + Tasks in one app.
 */
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Check, Clock, Calendar, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays, startOfDay, endOfDay } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

export default function AITimeBlocker({ onEventCreated, islamicMode = false }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [creating, setCreating] = useState(null);

  const { data: tasks = [] } = useQuery({
    queryKey: ['activeTasks'],
    queryFn: () => base44.entities.Task.filter({ status: { $in: ['todo', 'in_progress'] } }, '-priority', 20),
  });
  const { data: events = [] } = useQuery({
    queryKey: ['upcomingEvents'],
    queryFn: () => {
      const today = new Date().toISOString().split('T')[0];
      const next7 = addDays(new Date(), 7).toISOString().split('T')[0];
      return base44.entities.Event.filter({ start_date: { $gte: `${today}T00:00:00Z`, $lte: `${next7}T23:59:59Z` } });
    },
  });

  const generateBlocks = async () => {
    if (tasks.length === 0) { toast.error('No pending tasks found. Add tasks first.'); return; }
    setLoading(true);
    setSuggestions([]);
    try {
      const taskSummary = tasks.slice(0, 10).map(t =>
        `- "${t.title}" (priority: ${t.priority || 'medium'}, est: ${t.estimated_minutes || 60}min)`
      ).join('\n');

      const eventSummary = events.slice(0, 20).map(e =>
        `- ${format(new Date(e.start_date), 'EEE MMM d HH:mm')} to ${format(new Date(e.end_date), 'HH:mm')}: ${e.title}`
      ).join('\n');

      const today = format(new Date(), 'yyyy-MM-dd');
      const islamicNote = islamicMode ? '\nIMPORTANT: Avoid scheduling during prayer times (Fajr ~6am, Dhuhr ~1pm, Asr ~4pm, Maghrib ~sunset, Isha ~9pm). Leave 15min buffer around each prayer.' : '';

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an AI time-blocking assistant. Schedule tasks into available calendar gaps.

Today: ${today}
Working hours: 9am-6pm${islamicNote}

Pending tasks:
${taskSummary}

Existing calendar events (occupied):
${eventSummary || 'None'}

Suggest 3-5 time blocks for the next 3 days. Find gaps in the calendar and assign the most important tasks.
For each suggestion provide:
- task_title: the task to schedule
- date: YYYY-MM-DD
- start_time: HH:MM (24h)
- end_time: HH:MM (24h)
- reasoning: one short sentence why this slot

Return JSON.`,
        response_json_schema: {
          type: 'object',
          properties: {
            blocks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  task_title: { type: 'string' },
                  date: { type: 'string' },
                  start_time: { type: 'string' },
                  end_time: { type: 'string' },
                  reasoning: { type: 'string' },
                }
              }
            }
          }
        }
      });

      setSuggestions(result?.blocks || []);
      if (!result?.blocks?.length) toast.error('Could not find suitable gaps. Try clearing some events.');
    } catch (e) {
      toast.error('AI failed to generate blocks. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const scheduleBlock = async (block, idx) => {
    setCreating(idx);
    try {
      const startDt = new Date(`${block.date}T${block.start_time}:00`);
      const endDt = new Date(`${block.date}T${block.end_time}:00`);
      const event = await base44.entities.Event.create({
        title: `🔷 ${block.task_title}`,
        start_date: startDt.toISOString(),
        end_date: endDt.toISOString(),
        category: 'work',
        notes: `AI time block: ${block.reasoning}`,
      });
      queryClient.invalidateQueries({ queryKey: ['upcomingEvents'] });
      queryClient.invalidateQueries({ queryKey: ['todayEvents'] });
      toast.success(`Scheduled "${block.task_title}" in calendar!`);
      setSuggestions(s => s.filter((_, i) => i !== idx));
      onEventCreated?.(event);
    } catch (e) {
      toast.error('Failed to create event');
    } finally {
      setCreating(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#E8B84B]" /> AI Time Blocker
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {tasks.length} pending tasks · AI schedules them into calendar gaps
            {islamicMode ? ' (prayer-time aware)' : ''}
          </p>
        </div>
        <Button onClick={generateBlocks} disabled={loading} size="sm"
          className="bg-gradient-to-r from-[#1a7ab8] to-[#3ecfa0] text-white border-0">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
          {loading ? 'Analysing...' : 'Auto-Schedule'}
        </Button>
      </div>

      <AnimatePresence>
        {suggestions.map((block, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
            transition={{ delay: i * 0.07 }}>
            <Card className="border border-blue-100 dark:border-blue-900/40 hover:shadow-md transition-shadow">
              <CardContent className="p-3.5 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex-shrink-0">
                  <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{block.task_title}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-slate-500">{format(new Date(block.date), 'EEE, MMM d')}</span>
                    <Badge className="text-[10px] py-0 px-1.5 bg-blue-100 text-blue-700 border-blue-200">
                      <Clock className="w-2.5 h-2.5 mr-0.5" />{block.start_time}–{block.end_time}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5 italic">{block.reasoning}</p>
                </div>
                <Button size="sm" onClick={() => scheduleBlock(block, i)} disabled={creating === i}
                  className="bg-emerald-600 hover:bg-emerald-700 flex-shrink-0 h-8 px-3">
                  {creating === i ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Check className="w-3.5 h-3.5 mr-1" />Add</>}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>

      {suggestions.length === 0 && !loading && (
        <p className="text-xs text-slate-400 text-center py-2">
          Click "Auto-Schedule" to let AI find gaps in your calendar and schedule your tasks.
        </p>
      )}
    </div>
  );
}