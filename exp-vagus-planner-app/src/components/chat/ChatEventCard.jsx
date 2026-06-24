import React, { useState } from 'react';
import { Calendar, MapPin, Clock, Check, X, Users } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { SDK } from '@/lib/custom-sdk.js';
import { toast } from 'sonner';

export default function ChatEventCard({ message, currentUser }) {
  const event = message.metadata?.event;

  const [rsvp, setRsvp] = useState(() => {
    const rsvps = message.metadata?.rsvps || {};
    return rsvps[currentUser?.email] || null;
  });
  const [saving, setSaving] = useState(false);

  if (!event) return null;

  const rsvps = message.metadata?.rsvps || {};
  const accepted = Object.entries(rsvps).filter(([, v]) => v === 'yes').length;
  const declined = Object.entries(rsvps).filter(([, v]) => v === 'no').length;

  const respond = async (answer) => {
    if (saving) return;
    setSaving(true);
    const newRsvps = { ...rsvps, [currentUser.email]: answer };
    const entity = message.group_chat_id ? SDK.entities.GroupMessage : SDK.entities.Chat;
    await entity.update(message.id, {
      metadata: { ...message.metadata, rsvps: newRsvps }
    });
    setRsvp(answer);
    setSaving(false);
    toast.success(answer === 'yes' ? '✅ You\'re attending!' : '❌ Declined');
  };

  const start = event.start_date ? new Date(event.start_date) : null;
  const end = event.end_date ? new Date(event.end_date) : null;

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm min-w-[240px] max-w-[300px]">
      {/* Color header */}
      <div className={cn('px-3 py-2.5 flex items-center gap-2', 'bg-gradient-to-r from-teal-500 to-emerald-500')}>
        <Calendar className="w-4 h-4 text-white" />
        <span className="text-white text-xs font-semibold uppercase tracking-wide">
          {event.category || 'Event'}
        </span>
      </div>
      <div className="p-3 space-y-2">
        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug">{event.title}</p>
        {start && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Clock className="w-3.5 h-3.5 text-teal-500" />
            <span>{format(start, 'EEE d MMM, HH:mm')}{end ? ` – ${format(end, 'HH:mm')}` : ''}</span>
          </div>
        )}
        {event.location && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <MapPin className="w-3.5 h-3.5 text-teal-500" />
            <span className="truncate">{event.location}</span>
          </div>
        )}
        {/* RSVP counts */}
        <div className="flex items-center gap-2 text-[10px] text-slate-400">
          <Users className="w-3 h-3" />
          <span className="text-green-600 font-semibold">{accepted} going</span>
          {declined > 0 && <span className="text-red-500">{declined} declined</span>}
        </div>
        {/* RSVP buttons */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => respond('yes')}
            disabled={saving}
            className={cn(
              'flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl text-xs font-semibold border transition-all',
              rsvp === 'yes'
                ? 'bg-green-500 border-green-500 text-white'
                : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-green-400 hover:text-green-600'
            )}
          >
            <Check className="w-3.5 h-3.5" /> Going
          </button>
          <button
            onClick={() => respond('no')}
            disabled={saving}
            className={cn(
              'flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl text-xs font-semibold border transition-all',
              rsvp === 'no'
                ? 'bg-red-500 border-red-500 text-white'
                : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-red-400 hover:text-red-500'
            )}
          >
            <X className="w-3.5 h-3.5" /> Decline
          </button>
        </div>
      </div>
    </div>
  );
}