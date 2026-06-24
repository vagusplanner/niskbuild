import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, Search, Clock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format, isAfter } from 'date-fns';
import { cn } from '@/lib/utils';

export default function AttachEventModal({ open, onOpenChange, onAttachEvent }) {
  const [search, setSearch] = useState('');

  const { data: events = [] } = useQuery({
    queryKey: ['upcomingEvents'],
    queryFn: () => base44.entities.Event.filter({}, '-start_date', 30),
    enabled: open
  });

  const upcoming = events
    .filter(e => isAfter(new Date(e.start_date), new Date()))
    .filter(e => !search || e.title?.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 20);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-teal-600" />
            Attach Event
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search events…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="max-h-72 overflow-y-auto space-y-1.5">
            {upcoming.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No upcoming events found</p>
            ) : (
              upcoming.map(ev => (
                <button
                  key={ev.id}
                  onClick={() => { onAttachEvent(ev); onOpenChange(false); }}
                  className="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/20 transition-all"
                >
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{ev.title}</p>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                    <Clock className="w-3 h-3 text-teal-500" />
                    <span>{format(new Date(ev.start_date), 'EEE d MMM, HH:mm')}</span>
                    {ev.location && <span>· {ev.location}</span>}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}