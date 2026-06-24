import React, { useState, useEffect, useRef } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import {
  Calendar, CheckSquare, Target, Moon, Bell, Users,
  Zap, Heart, BookOpen, Star, RefreshCw, Activity,
  Filter, X, ArrowRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

// Map entity types to display config
const FEED_TYPES = {
  event:      { icon: Calendar,   color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300',   label: 'Event' },
  task:       { icon: CheckSquare,color: 'bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300', label: 'Task' },
  goal:       { icon: Target,     color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300', label: 'Goal' },
  prayer:     { icon: Moon,       color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300', label: 'Prayer' },
  habit:      { icon: Zap,        color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300', label: 'Habit' },
  donation:   { icon: Heart,      color: 'bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-300',   label: 'Donation' },
  quran:      { icon: BookOpen,   color: 'bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-300',   label: 'Quran' },
  achievement:{ icon: Star,       color: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-300', label: 'Achievement' },
  notification:{ icon: Bell,      color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',  label: 'Notification' },
};

const EVENT_VERB = { create: 'added', update: 'updated', delete: 'removed' };

function buildFeedItem(entityType, eventType, data, id) {
  const cfg = FEED_TYPES[entityType] || FEED_TYPES.notification;
  const title = data?.title || data?.name || data?.message || data?.habit_name || data?.charity_name || `#${id?.slice(-6)}`;
  return {
    id: `${entityType}-${eventType}-${id}-${Date.now()}`,
    type: entityType,
    eventType,
    title,
    status: data?.status,
    timestamp: new Date(),
    cfg,
  };
}

const FILTER_OPTIONS = ['all', 'event', 'task', 'goal', 'prayer', 'habit', 'donation', 'quran'];

export default function ActivityFeed({ maxItems = 80, compact = false }) {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [paused, setPaused] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const pausedRef = useRef(false);
  const queueRef = useRef([]);

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => SDK.auth.me() });

  // Flush queued items when unpaused
  useEffect(() => {
    pausedRef.current = paused;
    if (!paused && queueRef.current.length > 0) {
      setItems(prev => [...queueRef.current, ...prev].slice(0, maxItems));
      setNewCount(0);
      queueRef.current = [];
    }
  }, [paused]);

  const addItem = (item) => {
    if (pausedRef.current) {
      queueRef.current.unshift(item);
      setNewCount(n => n + 1);
    } else {
      setItems(prev => [item, ...prev].slice(0, maxItems));
    }
  };

  // Subscribe to all relevant entities
  useEffect(() => {
    const subs = [];

    const subscribe = (entityName, feedType) => {
      const unsub = SDK.entities[entityName]?.subscribe?.((ev) => {
        if (ev.type === 'delete') return; // skip deletes to reduce noise
        addItem(buildFeedItem(feedType, ev.type, ev.data, ev.id));
      });
      if (unsub) subs.push(unsub);
    };

    subscribe('Event', 'event');
    subscribe('Task', 'task');
    subscribe('Goal', 'goal');
    subscribe('PrayerLog', 'prayer');
    subscribe('Habit', 'habit');
    subscribe('CharityDonation', 'donation');
    subscribe('QuranReading', 'quran');
    subscribe('UserAchievement', 'achievement');
    subscribe('Notification', 'notification');

    return () => subs.forEach(u => u?.());
  }, []);

  // Seed with recent data on mount
  useEffect(() => {
    const load = async () => {
      try {
        const [events, tasks, goals, prayers] = await Promise.all([
          SDK.entities.Event.list('-created_date', 5),
          SDK.entities.Task.list('-created_date', 5),
          SDK.entities.Goal.list('-created_date', 5),
          SDK.entities.PrayerLog.list('-created_date', 5),
        ]);
        const seed = [
          ...events.map(d => buildFeedItem('event', 'create', d, d.id)),
          ...tasks.map(d => buildFeedItem('task', 'create', d, d.id)),
          ...goals.map(d => buildFeedItem('goal', 'create', d, d.id)),
          ...prayers.map(d => buildFeedItem('prayer', 'create', d, d.id)),
        ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 30);
        setItems(seed);
      } catch (_) {}
    };
    load();
  }, []);

  const filtered = filter === 'all' ? items : items.filter(i => i.type === filter);

  if (compact) {
    return (
      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {filtered.slice(0, 5).map(item => (
            <FeedItem key={item.id} item={item} compact />
          ))}
        </AnimatePresence>
        {filtered.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-3">No recent activity</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {FILTER_OPTIONS.map(f => {
            const cfg = f === 'all' ? null : FEED_TYPES[f];
            const Icon = cfg?.icon;
            return (
              <button key={f} onClick={() => setFilter(f)}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all border',
                  filter === f
                    ? 'bg-[#1a7ab8] text-white border-[#1a7ab8]'
                    : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-[#1a7ab8]/50'
                )}>
                {Icon && <Icon className="w-3 h-3" />}
                {f === 'all' ? 'All' : FEED_TYPES[f].label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          {newCount > 0 && (
            <button onClick={() => setPaused(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#E8B84B] text-white rounded-full text-xs font-bold animate-pulse">
              <RefreshCw className="w-3 h-3" /> {newCount} new
            </button>
          )}
          <button onClick={() => setPaused(p => !p)}
            className={cn('px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
              paused
                ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300'
                : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-slate-400'
            )}>
            {paused ? '▶ Resume' : '⏸ Pause'}
          </button>
        </div>
      </div>

      {/* Live indicator */}
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", paused ? "bg-slate-400" : "bg-emerald-400")} />
          <span className={cn("relative inline-flex rounded-full h-2 w-2", paused ? "bg-slate-400" : "bg-emerald-500")} />
        </span>
        <span className="text-xs text-slate-500">{paused ? 'Feed paused' : 'Live updates'}</span>
        <span className="text-xs text-slate-400 ml-auto">{filtered.length} items</span>
      </div>

      {/* Feed list */}
      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Activity className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No activity yet</p>
              <p className="text-sm mt-1">Updates will appear here in real-time</p>
            </div>
          ) : (
            filtered.map(item => <FeedItem key={item.id} item={item} />)
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function FeedItem({ item, compact = false }) {
  const { cfg, title, eventType, type, timestamp, status } = item;
  const Icon = cfg.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex items-start gap-3 p-3 rounded-xl border bg-white dark:bg-slate-800/60 border-slate-100 dark:border-slate-700/60 shadow-sm",
        compact && "p-2.5"
      )}
    >
      <div className={cn("p-2 rounded-lg flex-shrink-0", cfg.color)}>
        <Icon className={cn("w-4 h-4", compact && "w-3 h-3")} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn("font-semibold text-slate-800 dark:text-slate-100 truncate", compact ? "text-xs" : "text-sm")}>{title}</span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-slate-200 dark:border-slate-600 text-slate-400 flex-shrink-0">
            {EVENT_VERB[eventType] || eventType}
          </Badge>
          {status && (
            <Badge className={cn("text-[10px] px-1.5 py-0 flex-shrink-0",
              status === 'completed' ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400' :
              status === 'in_progress' ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400' :
              'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
            )} variant="outline">
              {status}
            </Badge>
          )}
        </div>
        <p className="text-[11px] text-slate-400 mt-0.5">{cfg.label} · {formatDistanceToNow(timestamp, { addSuffix: true })}</p>
      </div>
    </motion.div>
  );
}