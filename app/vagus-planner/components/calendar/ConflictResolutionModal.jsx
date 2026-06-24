import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, Clock, Sparkles, CheckCircle2, X, Calendar,
  ArrowRight, UserCheck, RefreshCw, Zap, ChevronRight, Loader2, Timer
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const RESOLUTION_TYPES = [
  { id: 'reschedule', label: 'Reschedule', icon: RefreshCw, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/40', border: 'border-blue-200 dark:border-blue-800' },
  { id: 'alternative', label: 'Find Alternative Time', icon: Clock, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-950/40', border: 'border-violet-200 dark:border-violet-800' },
  { id: 'delegate', label: 'Delegate', icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-200 dark:border-emerald-800' },
];

function SuggestionCard({ suggestion, index, isSelected, onSelect }) {
  const typeInfo = RESOLUTION_TYPES.find(t => t.id === suggestion.type) || RESOLUTION_TYPES[0];
  const Icon = typeInfo.icon;

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      onClick={onSelect}
      className={cn(
        "w-full text-left p-4 rounded-xl border-2 transition-all duration-200",
        isSelected
          ? "border-teal-500 bg-teal-50 dark:bg-teal-950/40 shadow-md"
          : "border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-700 bg-white dark:bg-slate-900"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Index / check */}
        <div className={cn(
          "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold mt-0.5 transition-colors",
          isSelected ? "bg-teal-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
        )}>
          {isSelected ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
        </div>

        <div className="flex-1 min-w-0">
          {/* Type badge */}
          <div className="flex items-center gap-2 mb-1.5">
            <span className={cn("inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border", typeInfo.bg, typeInfo.border, typeInfo.color)}>
              <Icon className="w-3 h-3" />
              {typeInfo.label}
            </span>
          </div>

          {/* Action */}
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">{suggestion.action}</p>

          {/* New time if available */}
          {suggestion.new_start_date && suggestion.new_end_date && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1.5">
              <Timer className="w-3 h-3 flex-shrink-0" />
              <span>
                {format(new Date(suggestion.new_start_date), 'EEE d MMM, h:mm a')}
                {' → '}
                {format(new Date(suggestion.new_end_date), 'h:mm a')}
              </span>
            </div>
          )}

          {/* Rationale */}
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{suggestion.rationale}</p>
        </div>
      </div>
    </motion.button>
  );
}

function ConflictEventChip({ title, time, category }) {
  const catColors = {
    work: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    personal: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
    health: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    prayer: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    family: 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300',
  };
  return (
    <div className={cn("flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/40")}>
      <Calendar className="w-4 h-4 text-orange-600 dark:text-orange-400 flex-shrink-0" />
      <div className="min-w-0">
        <div className="truncate font-semibold text-orange-900 dark:text-orange-100">{title}</div>
        {time && <div className="text-xs text-orange-600 dark:text-orange-400">{time}</div>}
      </div>
      {category && (
        <span className={cn("text-xs px-1.5 py-0.5 rounded-md ml-auto flex-shrink-0 font-medium", catColors[category] || catColors.personal)}>
          {category}
        </span>
      )}
    </div>
  );
}

export default function ConflictResolutionModal({ conflict, onClose, onResolve, events = [] }) {
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const [aiSuggestions, setAiSuggestions] = useState(conflict?.ai_suggestions || []);
  const [loadingAI, setLoadingAI] = useState(false);
  const queryClient = useQueryClient();

  // Enrich suggestions with type info if not present
  useEffect(() => {
    if (conflict?.ai_suggestions?.length) {
      setAiSuggestions(conflict.ai_suggestions.map((s, i) => ({
        ...s,
        type: s.type || (['reschedule', 'alternative', 'delegate'][i % 3]),
      })));
    }
  }, [conflict]);

  // Generate fresh AI suggestions if none exist
  const generateAISuggestions = async () => {
    setLoadingAI(true);
    try {
      const event1 = events.find(e => e.id === conflict.event1_id);
      const event2 = events.find(e => e.id === conflict.event2_id);

      const { data } = await base44.functions.invoke('detectConflicts', {
        event1_id: conflict.event1_id,
        event2_id: conflict.event2_id,
        generate_suggestions_only: true,
      });

      if (data?.suggestions?.length) {
        setAiSuggestions(data.suggestions.map((s, i) => ({
          ...s,
          type: ['reschedule', 'alternative', 'delegate'][i % 3],
        })));
      } else {
        // Fallback client-side suggestions
        const now = new Date(conflict.conflict_date);
        const suggestions = [
          {
            type: 'reschedule',
            action: `Move "${conflict.event2_title}" to later in the day`,
            rationale: `Reschedule the second event to avoid the overlap. Morning slots are typically less congested.`,
            event_id: conflict.event2_id,
            new_start_date: new Date(now.setHours(15, 0, 0, 0)).toISOString(),
            new_end_date: new Date(now.setHours(16, 0, 0, 0)).toISOString(),
          },
          {
            type: 'alternative',
            action: `Move "${conflict.event1_title}" to the morning`,
            rationale: `An 8–9 AM slot is usually free and ensures both events can happen on the same day.`,
            event_id: conflict.event1_id,
            new_start_date: new Date(now.setHours(8, 0, 0, 0)).toISOString(),
            new_end_date: new Date(now.setHours(9, 0, 0, 0)).toISOString(),
          },
          {
            type: 'delegate',
            action: `Delegate or skip "${conflict.event2_title}"`,
            rationale: `If this event is lower priority, consider delegating it to a team member or cancelling it entirely.`,
            event_id: conflict.event2_id,
          },
        ];
        setAiSuggestions(suggestions);
      }
    } catch {
      toast.error('Could not generate AI suggestions. Try again.');
    } finally {
      setLoadingAI(false);
    }
  };

  const applyMutation = useMutation({
    mutationFn: async ({ suggestion }) => {
      if (suggestion.type === 'delegate') {
        // Just dismiss the conflict
      } else if (suggestion.event_id && suggestion.new_start_date) {
        await base44.entities.Event.update(suggestion.event_id, {
          start_date: suggestion.new_start_date,
          end_date: suggestion.new_end_date,
        });
      }
      if (conflict?.id) {
        await base44.entities.ConflictResolution.update(conflict.id, {
          user_decision: 'accepted',
          status: 'resolved',
          resolved_at: new Date().toISOString(),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['conflicts'] });
      toast.success('Conflict resolved!');
      onResolve?.();
      onClose();
    },
    onError: (err) => toast.error(`Failed: ${err.message}`),
  });

  const ignoreMutation = useMutation({
    mutationFn: async () => {
      if (conflict?.id) {
        await base44.entities.ConflictResolution.update(conflict.id, {
          status: 'ignored',
          resolved_at: new Date().toISOString(),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conflicts'] });
      toast.info('Conflict dismissed');
      onClose();
    },
  });

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    try { return format(new Date(dateStr), 'h:mm a'); } catch { return ''; }
  };

  const event1 = events.find(e => e.id === conflict.event1_id);
  const event2 = events.find(e => e.id === conflict.event2_id);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0 gap-0">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-950 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-800 dark:text-slate-100">Schedule Conflict</DialogTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {conflict.conflict_date ? format(new Date(conflict.conflict_date), 'EEEE, MMMM d yyyy') : 'Conflicting events detected'}
              </p>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Conflicting events */}
          <div>
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2">Conflicting Events</p>
            <div className="space-y-2">
              <ConflictEventChip
                title={conflict.event1_title}
                time={event1 ? `${formatTime(event1.start_date)} – ${formatTime(event1.end_date)}` : undefined}
                category={event1?.category}
              />
              <div className="flex items-center justify-center">
                <div className="flex items-center gap-2 text-xs text-orange-500 font-medium">
                  <span className="h-px w-8 bg-orange-200 dark:bg-orange-800" />
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>overlap</span>
                  <span className="h-px w-8 bg-orange-200 dark:bg-orange-800" />
                </div>
              </div>
              <ConflictEventChip
                title={conflict.event2_title}
                time={event2 ? `${formatTime(event2.start_date)} – ${formatTime(event2.end_date)}` : undefined}
                category={event2?.category}
              />
            </div>
          </div>

          {/* AI Suggestions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-600" />
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">AI Suggestions</span>
              </div>
              {aiSuggestions.length === 0 && !loadingAI && (
                <Button variant="ghost" size="sm" onClick={generateAISuggestions} className="text-xs h-7 gap-1">
                  <Zap className="w-3.5 h-3.5" /> Generate
                </Button>
              )}
              {aiSuggestions.length > 0 && (
                <Button variant="ghost" size="sm" onClick={generateAISuggestions} disabled={loadingAI} className="text-xs h-7 gap-1 text-slate-400">
                  <RefreshCw className={cn("w-3 h-3", loadingAI && "animate-spin")} />
                  Refresh
                </Button>
              )}
            </div>

            {loadingAI ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mb-2" />
                <p className="text-sm">Analysing your schedule...</p>
              </div>
            ) : aiSuggestions.length === 0 ? (
              <div className="text-center py-6 text-slate-400">
                <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Click "Generate" for AI-powered resolution options</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {aiSuggestions.map((suggestion, index) => (
                  <SuggestionCard
                    key={index}
                    suggestion={suggestion}
                    index={index}
                    isSelected={selectedSuggestion === index}
                    onSelect={() => setSelectedSuggestion(selectedSuggestion === index ? null : index)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 bg-slate-50/50 dark:bg-slate-900/50">
          <Button
            onClick={() => {
              if (selectedSuggestion === null) { toast.error('Please select a suggestion first'); return; }
              applyMutation.mutate({ suggestion: aiSuggestions[selectedSuggestion] });
            }}
            disabled={selectedSuggestion === null || applyMutation.isPending}
            className="bg-teal-600 hover:bg-teal-700 flex-1 gap-2"
          >
            {applyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Apply Selected
          </Button>
          <Button
            variant="outline"
            onClick={() => ignoreMutation.mutate()}
            disabled={ignoreMutation.isPending}
            className="gap-1.5"
          >
            <X className="w-4 h-4" />
            Dismiss
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}