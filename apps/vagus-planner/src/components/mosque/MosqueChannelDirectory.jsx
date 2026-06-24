/**
 * MosqueChannelDirectory — searchable mosque directory with prayer times,
 * upcoming events, and direct join-to-group-chat functionality.
 */
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, MapPin, Clock, Calendar, MessageCircle, Users,
  ChevronRight, ChevronDown, Loader2, Globe, Phone, CheckCircle2, Hash
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, isAfter } from 'date-fns';

// ── Prayer times via Aladhan API ──────────────────────────────────────────────

async function fetchPrayerTimesForCity(city, country = 'GB') {
  const today = format(new Date(), 'dd-MM-yyyy');
  const res = await fetch(`https://api.aladhan.com/v1/timingsByCity/${today}?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=2`);
  if (!res.ok) throw new Error('Prayer times unavailable');
  const data = await res.json();
  return data.data?.timings || null;
}

const PRAYER_NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

function PrayerTimesRow({ city, country }) {
  const { data: timings, isLoading } = useQuery({
    queryKey: ['prayerTimesCity', city, country],
    queryFn: () => fetchPrayerTimesForCity(city, country),
    staleTime: 1000 * 60 * 60,
    retry: false,
  });

  if (isLoading) return <div className="flex gap-1 flex-wrap">{PRAYER_NAMES.map(p => <div key={p} className="h-5 w-12 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />)}</div>;
  if (!timings) return <p className="text-xs text-slate-400">Prayer times unavailable</p>;

  return (
    <div className="flex gap-2 flex-wrap">
      {PRAYER_NAMES.map(p => (
        <div key={p} className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/20 px-2 py-0.5 rounded-lg">
          <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400">{p}</span>
          <span className="text-[10px] text-amber-600 dark:text-amber-300">{timings[p]?.substring(0, 5)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Mosque Card ───────────────────────────────────────────────────────────────

function MosqueCard({ mosque, currentUser, onJoinChat }) {
  const [expanded, setExpanded] = useState(false);
  const queryClient = useQueryClient();

  const { data: events = [] } = useQuery({
    queryKey: ['mosqueEvents', mosque.id],
    queryFn: async () => {
      if (!expanded) return [];
      const all = await base44.entities.MosqueEvent.filter({ is_public: true }, '-start_datetime', 10);
      return all.filter(e =>
        (e.location?.toLowerCase().includes(mosque.city?.toLowerCase() || '') ||
         e.location?.toLowerCase().includes(mosque.name?.toLowerCase() || ''))
        && isAfter(new Date(e.start_datetime), new Date())
      );
    },
    enabled: expanded,
  });

  const { data: groupChat } = useQuery({
    queryKey: ['mosqueGroupChat', mosque.id],
    queryFn: async () => {
      const all = await base44.entities.GroupChat.list('-created_date');
      return all.find(c => c.context_id === mosque.id) || null;
    },
  });

  const joinMutation = useMutation({
    mutationFn: async () => {
      if (groupChat) {
        // Join existing
        const members = Array.from(new Set([...(groupChat.members || []), currentUser.email]));
        return base44.entities.GroupChat.update(groupChat.id, { members });
      } else {
        // Create new
        return base44.entities.GroupChat.create({
          name: `${mosque.name} Community`,
          context_type: 'general',
          context_id: mosque.id,
          members: [currentUser.email],
          created_by: currentUser.email,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mosqueGroupChat', mosque.id] });
      queryClient.invalidateQueries({ queryKey: ['groupChats'] });
      toast.success(`Joined ${mosque.name} community channel!`);
      if (onJoinChat) onJoinChat();
    },
    onError: () => toast.error('Could not join channel'),
  });

  const isAlreadyMember = groupChat?.members?.includes(currentUser?.email);
  const memberCount = groupChat?.members?.length || 0;

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm overflow-hidden">

      {/* Header row */}
      <button onClick={() => setExpanded(e => !e)}
        className="w-full text-left flex items-start gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-sm">
          {mosque.photo_url
            ? <img src={mosque.photo_url} alt={mosque.name} className="w-full h-full object-cover rounded-xl" />
            : <span className="text-xl">🕌</span>
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{mosque.name}</p>
            {mosque.verified && <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" />}
          </div>
          {mosque.address && (
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 truncate">
              <MapPin className="w-3 h-3 flex-shrink-0" />{mosque.address}
            </p>
          )}
          <div className="flex items-center gap-3 mt-1">
            {memberCount > 0 && (
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <Users className="w-3 h-3" />{memberCount} in channel
              </span>
            )}
            {mosque.services?.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {mosque.services.slice(0, 3).map(s => (
                  <span key={s} className="text-[9px] bg-teal-50 dark:bg-teal-950/30 text-teal-600 dark:text-teal-400 px-1.5 py-0.5 rounded-full capitalize">
                    {s.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <ChevronDown className={cn('w-4 h-4 text-slate-400 flex-shrink-0 transition-transform mt-1', expanded && 'rotate-180')} />
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="px-4 pb-4 space-y-4 border-t border-slate-100 dark:border-slate-700/40 pt-3">

              {/* Prayer times */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Today's Prayer Times
                </p>
                <PrayerTimesRow city={mosque.city || mosque.address?.split(',')[0] || 'London'} country="GB" />
              </div>

              {/* Upcoming events */}
              {events.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Upcoming Events
                  </p>
                  <div className="space-y-1.5">
                    {events.slice(0, 3).map(e => (
                      <div key={e.id} className="flex items-center gap-2.5 p-2 bg-slate-50 dark:bg-slate-700/40 rounded-xl">
                        <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                          <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{e.title}</p>
                          <p className="text-[10px] text-slate-400">{format(new Date(e.start_datetime), 'EEE, MMM d · HH:mm')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact info */}
              <div className="flex gap-3 text-xs text-slate-500">
                {mosque.phone && <a href={`tel:${mosque.phone}`} className="flex items-center gap-1 hover:text-teal-600 transition-colors"><Phone className="w-3 h-3" />{mosque.phone}</a>}
                {mosque.website && <a href={mosque.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-teal-600 transition-colors"><Globe className="w-3 h-3" />Website</a>}
              </div>

              {/* Join channel */}
              <div className="flex items-center gap-3 pt-1">
                {isAlreadyMember ? (
                  <div className="flex items-center gap-2 text-sm text-teal-600 dark:text-teal-400 font-medium">
                    <CheckCircle2 className="w-4 h-4" /> Joined
                    <span className="text-xs text-slate-400">· {memberCount} members</span>
                  </div>
                ) : (
                  <Button onClick={() => joinMutation.mutate()} disabled={joinMutation.isPending}
                    className="bg-teal-600 hover:bg-teal-700 h-9 text-sm gap-2 flex-1">
                    {joinMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
                    Join Community Channel
                  </Button>
                )}
                {isAlreadyMember && (
                  <Button variant="outline" size="sm" onClick={onJoinChat} className="flex-1 gap-1.5 text-sm">
                    <MessageCircle className="w-4 h-4" /> Open Chat
                  </Button>
                )}
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main Directory ────────────────────────────────────────────────────────────

export default function MosqueChannelDirectory({ currentUser, onJoinChat }) {
  const [search, setSearch] = useState('');
  const [filterService, setFilterService] = useState('');

  const { data: mosques = [], isLoading } = useQuery({
    queryKey: ['mosqueDirectory'],
    queryFn: () => base44.entities.MosaqueDirectory.list('-rating', 100),
  });

  const allServices = useMemo(() => {
    const s = new Set();
    mosques.forEach(m => m.services?.forEach(sv => s.add(sv)));
    return Array.from(s).sort();
  }, [mosques]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return mosques.filter(m => {
      const matchSearch = !q ||
        m.name?.toLowerCase().includes(q) ||
        m.city?.toLowerCase().includes(q) ||
        m.address?.toLowerCase().includes(q);
      const matchService = !filterService || m.services?.includes(filterService);
      return matchSearch && matchService;
    });
  }, [mosques, search, filterService]);

  return (
    <div className="space-y-4">
      {/* Search & filter bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            placeholder="Search mosques by name or city..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-400 text-slate-700 dark:text-slate-200"
          />
        </div>
        {allServices.length > 0 && (
          <select value={filterService} onChange={e => setFilterService(e.target.value)}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-400 text-slate-700 dark:text-slate-200">
            <option value="">All services</option>
            {allServices.map(s => <option key={s} value={s} className="capitalize">{s.replace(/_/g, ' ')}</option>)}
          </select>
        )}
      </div>

      {/* Results count */}
      {!isLoading && (
        <p className="text-xs text-slate-400">
          {filtered.length} mosque{filtered.length !== 1 ? 's' : ''} found
          {filterService && <span> · filtering by <b className="capitalize">{filterService.replace(/_/g, ' ')}</b></span>}
        </p>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="text-4xl mb-3">🕌</span>
          <p className="font-semibold text-slate-600 dark:text-slate-400">No mosques found</p>
          <p className="text-sm text-slate-400 mt-1">Try a different search or add your mosque via Mosque Finder</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(mosque => (
            <MosqueCard
              key={mosque.id}
              mosque={mosque}
              currentUser={currentUser}
              onJoinChat={() => onJoinChat && onJoinChat(mosque)}
            />
          ))}
        </div>
      )}
    </div>
  );
}