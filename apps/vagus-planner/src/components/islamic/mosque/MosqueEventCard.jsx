import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { MapPin, Clock, Users, CheckCircle2, Calendar, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

const CATEGORY_STYLES = {
  jumua:   { color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', border: 'border-l-emerald-500' },
  iftar:   { color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',   border: 'border-l-indigo-500'  },
  eid:     { color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',        border: 'border-l-amber-500'   },
  lecture: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',            border: 'border-l-blue-500'    },
  quran:   { color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',            border: 'border-l-teal-500'    },
  hajj:    { color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',    border: 'border-l-purple-500'  },
  youth:   { color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',    border: 'border-l-orange-500'  },
  charity: { color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',            border: 'border-l-rose-500'    },
  other:   { color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',           border: 'border-l-slate-400'   },
};

const CATEGORY_EMOJI = {
  jumua: '🕌', iftar: '🌙', eid: '✨', lecture: '📚', quran: '📖',
  hajj: '🕋', youth: '⭐', charity: '❤️', other: '📌',
};

export default function MosqueEventCard({ event, user, isAdmin, compact = false }) {
  const queryClient = useQueryClient();
  const styles = CATEGORY_STYLES[event.category] || CATEGORY_STYLES.other;
  const emoji = CATEGORY_EMOJI[event.category] || '📌';
  const hasRsvp = event.rsvp_emails?.includes(user?.email);
  const rsvpCount = event.rsvp_emails?.length || 0;
  const isFull = event.max_capacity && rsvpCount >= event.max_capacity;

  const rsvpMutation = useMutation({
    mutationFn: () => {
      if (hasRsvp) {
        return base44.entities.MosqueEvent.update(event.id, {
          rsvp_emails: event.rsvp_emails.filter(e => e !== user?.email),
          rsvp_names: (event.rsvp_names || []).filter(n => n !== (user?.full_name || user?.email)),
        });
      }
      return base44.entities.MosqueEvent.update(event.id, {
        rsvp_emails: [...(event.rsvp_emails || []), user?.email],
        rsvp_names: [...(event.rsvp_names || []), user?.full_name || user?.email],
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mosqueEvents'] })
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.MosqueEvent.delete(event.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mosqueEvents'] })
  });

  const startDate = event.start_datetime ? parseISO(event.start_datetime) : null;
  const endDate = event.end_datetime ? parseISO(event.end_datetime) : null;

  if (compact) {
    return (
      <div className={cn('px-2 py-1 rounded-lg border-l-2 text-xs font-medium truncate', styles.border, styles.color)}>
        {emoji} {event.title}
      </div>
    );
  }

  return (
    <div className={cn(
      'rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 overflow-hidden border-l-4 shadow-sm hover:shadow-md transition-shadow',
      styles.border
    )}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-xl flex-shrink-0">{emoji}</span>
            <div className="min-w-0">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-tight">{event.title}</h4>
              {event.is_recurring && (
                <Badge className={cn('text-[10px] mt-0.5', styles.color, 'border-0')}>
                  🔄 {event.recurrence}
                </Badge>
              )}
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={() => deleteMutation.mutate()}
              className="p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {event.description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 leading-relaxed line-clamp-2">{event.description}</p>
        )}

        <div className="space-y-1.5 mb-3">
          {startDate && (
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
              <Calendar className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              <span>{format(startDate, 'EEE d MMM yyyy')}</span>
              <span className="text-slate-400">·</span>
              <Clock className="w-3 h-3 text-slate-400 flex-shrink-0" />
              <span>{format(startDate, 'HH:mm')}{endDate ? ` – ${format(endDate, 'HH:mm')}` : ''}</span>
            </div>
          )}
          {event.location && (
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
              <MapPin className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              <span>{event.location}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Users className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
            <span>{rsvpCount} attending{event.max_capacity ? ` · ${event.max_capacity} max` : ''}</span>
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => rsvpMutation.mutate()}
          disabled={(!hasRsvp && isFull) || rsvpMutation.isPending}
          className={cn(
            'w-full h-8 text-xs font-semibold gap-1.5 rounded-xl transition-all',
            hasRsvp
              ? 'bg-emerald-100 text-emerald-700 hover:bg-red-50 hover:text-red-600 dark:bg-emerald-900/30 dark:text-emerald-300'
              : isFull
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-90'
          )}
        >
          {hasRsvp ? (
            <><CheckCircle2 className="w-3.5 h-3.5" /> Attending — Cancel RSVP</>
          ) : isFull ? (
            'Event Full'
          ) : (
            'RSVP — I\'m Attending'
          )}
        </Button>
      </div>
    </div>
  );
}