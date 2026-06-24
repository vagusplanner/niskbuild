import React, { useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCircle2, Calendar, ShoppingCart, UserPlus, ClipboardList, BellOff, Trash2, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

const TYPE_CONFIG = {
  task_assigned:    { icon: ClipboardList, color: 'text-violet-400',  bg: 'bg-violet-400/10 border-violet-400/20',  emoji: '📋' },
  task_completed:   { icon: CheckCircle2,  color: 'text-teal-400',    bg: 'bg-teal-400/10 border-teal-400/20',      emoji: '✅' },
  event_proposed:   { icon: Calendar,      color: 'text-amber-400',   bg: 'bg-amber-400/10 border-amber-400/20',    emoji: '📅' },
  event_approved:   { icon: CheckCircle2,  color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20', emoji: '🎉' },
  event_rejected:   { icon: BellOff,       color: 'text-red-400',     bg: 'bg-red-400/10 border-red-400/20',        emoji: '❌' },
  grocery_added:    { icon: ShoppingCart,  color: 'text-orange-400',  bg: 'bg-orange-400/10 border-orange-400/20',  emoji: '🛒' },
  grocery_checked:  { icon: CheckCheck,    color: 'text-teal-400',    bg: 'bg-teal-400/10 border-teal-400/20',      emoji: '✔️' },
  member_joined:    { icon: UserPlus,      color: 'text-sky-400',     bg: 'bg-sky-400/10 border-sky-400/20',        emoji: '👋' },
};

export default function FamilyNotificationCenter({ groupId, userEmail }) {
  const [filter, setFilter] = useState('all');
  const qc = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['familyNotifications', groupId],
    queryFn: () => SDK.entities.FamilyNotification.filter({ family_group_id: groupId }, '-created_date', 50),
    enabled: !!groupId,
    refetchInterval: 30000,
  });

  const markRead = useMutation({
    mutationFn: (notif) => SDK.entities.FamilyNotification.update(notif.id, {
      is_read_by: [...(notif.is_read_by || []), userEmail]
    }),
    onSuccess: () => qc.invalidateQueries(['familyNotifications', groupId]),
  });

  const deleteNotif = useMutation({
    mutationFn: (id) => SDK.entities.FamilyNotification.delete(id),
    onSuccess: () => qc.invalidateQueries(['familyNotifications', groupId]),
  });

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.is_read_by?.includes(userEmail));
    await Promise.all(unread.map(n => markRead.mutateAsync(n)));
  };

  const unreadCount = notifications.filter(n => !n.is_read_by?.includes(userEmail)).length;

  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read_by?.includes(userEmail);
    if (filter === 'mine') return !n.target_email || n.target_email === userEmail || n.actor_email === userEmail;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-amber-400" />
          <span className="font-black text-white">Family Activity</span>
          {unreadCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-amber-400 text-[#071224] text-[10px] font-black flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button size="sm" variant="outline" onClick={markAllRead}
            className="border-white/15 text-white/50 bg-transparent text-xs h-8 gap-1">
            <CheckCheck className="w-3.5 h-3.5" /> Mark all read
          </Button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl p-0.5 gap-0.5">
        {[['all','All'], ['unread','Unread'], ['mine','For Me']].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${filter === k ? 'bg-amber-400 text-[#071224]' : 'text-white/40 hover:text-white'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-8 text-white/30 text-sm">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white/[0.02] border border-white/8 rounded-3xl">
          <Bell className="w-10 h-10 text-white/15 mx-auto mb-3" />
          <p className="text-white/40 text-sm">No notifications yet.</p>
          <p className="text-white/25 text-xs mt-1">Family activity will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {filtered.map(notif => {
              const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.task_assigned;
              const isRead = notif.is_read_by?.includes(userEmail);
              return (
                <motion.div key={notif.id} layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
                  className={`group flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${isRead ? 'bg-white/[0.02] border-white/5 opacity-60' : `${cfg.bg} hover:opacity-90`}`}
                  onClick={() => !isRead && markRead.mutate(notif)}>
                  <span className="text-base flex-shrink-0 mt-0.5">{cfg.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${isRead ? 'text-white/50' : 'text-white font-medium'}`}>{notif.message}</p>
                    {notif.created_date && (
                      <p className="text-[10px] text-white/30 mt-0.5">
                        {formatDistanceToNow(new Date(notif.created_date), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!isRead && <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />}
                    <button onClick={e => { e.stopPropagation(); deleteNotif.mutate(notif.id); }}
                      className="p-1 text-white/15 hover:text-red-400 transition-colors">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}