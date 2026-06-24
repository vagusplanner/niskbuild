/**
 * ContextBanner — shown at top of a group chat when it's linked to a calendar event,
 * Hajj plan, prayer goal, or family group. Tappable to navigate to the source.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Map, Sun, Users, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

const CONTEXT_CONFIG = {
  event:   { icon: Calendar, label: 'Linked Event',         color: 'from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/20', text: 'text-blue-700 dark:text-blue-300', badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600',  link: '/Calendar' },
  goal:    { icon: Sun,      label: 'Prayer / Spiritual Goal', color: 'from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20', text: 'text-amber-700 dark:text-amber-300', badge: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600', link: '/Islam' },
  holiday: { icon: Map,      label: 'Trip / Hajj Plan',     color: 'from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/20',    text: 'text-rose-700 dark:text-rose-300',   badge: 'bg-rose-100 dark:bg-rose-900/40 text-rose-600',  link: '/Travel' },
  general: { icon: Users,    label: 'Family Group',         color: 'from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/20', text: 'text-teal-700 dark:text-teal-300',  badge: 'bg-teal-100 dark:bg-teal-900/40 text-teal-600',  link: '/FamilyHub' },
};

export default function ContextBanner({ chat }) {
  if (!chat?.context_type || chat.context_type === 'general' && !chat.context_id) return null;

  const cfg = CONTEXT_CONFIG[chat.context_type] || CONTEXT_CONFIG.general;
  const Icon = cfg.icon;

  return (
    <div className={cn('flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r border-b text-xs', cfg.color, 'border-slate-200/60 dark:border-slate-700/40')}>
      <Icon className={cn('w-3 h-3 flex-shrink-0', cfg.text)} />
      <span className={cn('font-medium flex-1 truncate', cfg.text)}>
        {cfg.label}{chat.name ? `: ${chat.name}` : ''}
      </span>
      <Link to={cfg.link} className={cn('flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold', cfg.badge)}>
        View <ExternalLink className="w-2.5 h-2.5" />
      </Link>
    </div>
  );
}