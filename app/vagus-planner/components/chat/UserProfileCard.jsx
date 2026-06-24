import React from 'react';
import { cn } from '@/lib/utils';
import { Shield, Circle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const STATUS_CONFIG = {
  online:    { label: 'Online',    color: 'bg-green-500',  ring: 'ring-green-400' },
  away:      { label: 'Away',      color: 'bg-amber-400',  ring: 'ring-amber-300' },
  in_a_call: { label: 'In a call', color: 'bg-red-500',    ring: 'ring-red-400' },
  offline:   { label: 'Offline',   color: 'bg-slate-400',  ring: 'ring-slate-300' },
};

function avatarColor(name = '') {
  const colors = [
    'from-teal-400 to-emerald-500',
    'from-purple-400 to-indigo-500',
    'from-rose-400 to-pink-500',
    'from-amber-400 to-orange-500',
    'from-sky-400 to-blue-500',
  ];
  return colors[name.charCodeAt(0) % colors.length];
}

export function StatusDot({ status, size = 'sm' }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.offline;
  const sizeClass = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5';
  return (
    <span className={cn('rounded-full border-2 border-white dark:border-slate-900 flex-shrink-0', cfg.color, sizeClass)} />
  );
}

export default function UserProfileCard({ user, onClose }) {
  if (!user) return null;
  const status = user.status || 'offline';
  const cfg = STATUS_CONFIG[status];
  const name = user.full_name || user.email?.split('@')[0];

  return (
    <div className="w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Banner */}
      <div className={cn('h-16 bg-gradient-to-br', avatarColor(name))} />

      {/* Avatar + status */}
      <div className="px-5 pb-4 -mt-8">
        <div className="relative inline-block mb-3">
          <div className={cn(
            'w-16 h-16 rounded-full bg-gradient-to-br border-4 border-white dark:border-slate-900 flex items-center justify-center text-white text-2xl font-bold shadow-lg',
            avatarColor(name)
          )}>
            {name.charAt(0).toUpperCase()}
          </div>
          <span className={cn(
            'absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900',
            cfg.color
          )} />
        </div>

        <div className="mb-3">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base leading-tight">{name}</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500">{user.email}</p>
        </div>

        {/* Status badge */}
        <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium mb-3',
          status === 'online' ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400' :
          status === 'away' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' :
          status === 'in_a_call' ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400' :
          'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
        )}>
          <span className={cn('w-2 h-2 rounded-full', cfg.color)} />
          {cfg.label}
        </div>

        {/* Role */}
        {user.role === 'admin' && (
          <div className="flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400 mb-3">
            <Shield className="w-3.5 h-3.5" />
            <span className="font-semibold">Admin</span>
          </div>
        )}

        {/* Bio */}
        {user.bio && (
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-3">
            {user.bio}
          </p>
        )}

        {/* Last status change */}
        {user.status_updated_at && (
          <p className="text-[10px] text-slate-400 mt-2">
            Status updated {formatDistanceToNow(new Date(user.status_updated_at), { addSuffix: true })}
          </p>
        )}
      </div>
    </div>
  );
}