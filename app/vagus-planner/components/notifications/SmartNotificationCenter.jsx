import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, X, Check, Trash2, Settings, Calendar, Moon, 
  Target, Heart, MessageCircle, Plane, AlertTriangle, 
  Zap, Star, Info, BellOff, Phone, Users, Clock, AlarmClock
} from 'lucide-react';
import { formatDistanceToNow, format, addMinutes } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const TYPE_CONFIG = {
  event_reminder:    { icon: Calendar, color: 'text-blue-600 bg-blue-50',   label: 'Events' },
  conflict_alert:    { icon: AlertTriangle, color: 'text-red-600 bg-red-50', label: 'Conflicts' },
  meeting_invitation:{ icon: Calendar, color: 'text-purple-600 bg-purple-50', label: 'Meetings' },
  task_due:          { icon: Target, color: 'text-orange-600 bg-orange-50',  label: 'Tasks' },
  task_assigned:     { icon: Target, color: 'text-green-600 bg-green-50',    label: 'Tasks' },
  goal_update:       { icon: Star, color: 'text-indigo-600 bg-indigo-50',    label: 'Goals' },
  health_insight:    { icon: Heart, color: 'text-pink-600 bg-pink-50',       label: 'Health' },
  prayer_time:       { icon: Moon, color: 'text-emerald-600 bg-emerald-50',  label: 'Prayer' },
  islamic_event:     { icon: Moon, color: 'text-amber-600 bg-amber-50',      label: 'Islamic' },
  travel_alert:      { icon: Plane, color: 'text-cyan-600 bg-cyan-50',       label: 'Travel' },
  comment_mention:   { icon: MessageCircle, color: 'text-violet-600 bg-violet-50', label: 'Social' },
  feature_update:    { icon: Zap, color: 'text-teal-600 bg-teal-50',         label: 'App' },
  system:            { icon: Info, color: 'text-slate-600 bg-slate-100',     label: 'System' },
  new_message:       { icon: MessageCircle, color: 'text-teal-600 bg-teal-50', label: 'Messages' },
  new_group_message: { icon: Users, color: 'text-indigo-600 bg-indigo-50',   label: 'Groups' },
  group_invitation:  { icon: Users, color: 'text-purple-600 bg-purple-50',   label: 'Groups' },
  incoming_call:     { icon: Phone, color: 'text-green-600 bg-green-50',     label: 'Calls' },
  message_reminder:  { icon: AlarmClock, color: 'text-amber-600 bg-amber-50', label: 'Reminders' },
};

const PREF_TYPES = [
  { type: 'event_reminder',    label: 'Event Reminders' },
  { type: 'conflict_alert',    label: 'Schedule Conflicts' },
  { type: 'task_due',          label: 'Task Due Dates' },
  { type: 'prayer_time',       label: 'Prayer Times' },
  { type: 'islamic_event',     label: 'Islamic Events' },
  { type: 'health_insight',    label: 'Health Insights' },
  { type: 'goal_update',       label: 'Goal Updates' },
  { type: 'travel_alert',      label: 'Travel Alerts' },
  { type: 'new_message',       label: 'Direct Messages' },
  { type: 'new_group_message', label: 'Group Messages' },
  { type: 'group_invitation',  label: 'Group Invitations' },
  { type: 'incoming_call',     label: 'Incoming Calls' },
  { type: 'message_reminder',  label: 'Message Reminders' },
  { type: 'comment_mention',   label: 'Comments & Mentions' },
  { type: 'feature_update',    label: 'New Features' },
];

// ── Snooze / Reminder options ────────────────────────────────────────────────
const SNOOZE_OPTIONS = [
  { label: '5 min', minutes: 5 },
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '1 hour', minutes: 60 },
  { label: 'Tomorrow', minutes: 60 * 24 },
];

// ── Snooze dropdown ──────────────────────────────────────────────────────────
function SnoozeMenu({ notif, onSnooze }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative mt-1.5" onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 text-[10px] hover:underline" style={{color:'#1D6FB8'}}
      >
        <AlarmClock className="w-3 h-3" /> Remind me
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -4 }}
            className="absolute left-0 bottom-6 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl shadow-xl p-1.5 flex flex-col gap-0.5 min-w-[110px]"
          >
            {SNOOZE_OPTIONS.map(opt => (
              <button
                key={opt.minutes}
                onClick={() => { onSnooze(notif, opt.minutes); setOpen(false); }}
                className="text-xs text-left px-2.5 py-1.5 rounded-lg hover:bg-[#D4E0EC] text-slate-700 dark:text-slate-200 transition-colors"
              >
                {opt.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NotifIcon({ type, priority }) {
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.system;
  const Icon = cfg.icon;
  return (
    <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', cfg.color)}>
      <Icon className="w-4 h-4" />
    </div>
  );
}

export default function SmartNotificationCenter() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [pushPermission, setPushPermission] = useState(() => 
    'Notification' in window ? Notification.permission : 'unsupported'
  );

  const handleEnablePush = async () => {
    if (!('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setPushPermission(result);
    if (result === 'granted') {
      toast.success("Push notifications enabled!");
      new Notification('Vagus Planner', {
        body: 'Notifications are now active 🎉',
        icon: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6965607bc386491646bad6e8/10b500d37_IMG_6630.png',
        tag: 'welcome'
      });
    } else {
      toast.info('Blocked. Enable notifications in your browser settings.');
    }
  };

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.email],
    queryFn: () => user
      ? base44.entities.Notification.filter({ recipient_email: user.email }, '-created_date', 50)
      : [],
    enabled: !!user,
    refetchInterval: isOpen ? 10000 : 30000
  });

  const { data: preferences = [] } = useQuery({
    queryKey: ['notificationPreferences'],
    queryFn: () => base44.entities.NotificationPreference.list(),
    enabled: isOpen
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.is_read);
      await Promise.all(unread.map(n => base44.entities.Notification.update(n.id, { is_read: true })));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  });

  const markRead = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { is_read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  });

  const deleteNotif = useMutation({
    mutationFn: (id) => base44.entities.Notification.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  });

  const togglePref = useMutation({
    mutationFn: async ({ type, enabled }) => {
      const existing = preferences.find(p => p.notification_type === type);
      if (existing) {
        return base44.entities.NotificationPreference.update(existing.id, { enabled });
      }
      return base44.entities.NotificationPreference.create({
        notification_type: type,
        enabled,
        channels: [
          { channel: 'in_app', enabled: true },
          { channel: 'email', enabled: false },
          { channel: 'push', enabled: true }
        ]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationPreferences'] });
      toast.success('Preference saved');
    }
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getPref = (type) => {
    const p = preferences.find(p => p.notification_type === type);
    return p ? p.enabled : true; // default on
  };

  // Snooze: mark read now, create a new reminder notification at future time
  const handleSnooze = async (notif, minutes) => {
    await base44.entities.Notification.update(notif.id, { is_read: true });
    const remindAt = addMinutes(new Date(), minutes);
    // Store scheduled reminder as a notification with a future trigger
    await base44.entities.Notification.create({
      recipient_email: user?.email,
      type: 'message_reminder',
      title: `⏰ Reminder: ${notif.title}`,
      message: notif.message,
      priority: notif.priority || 'medium',
      icon: '⏰',
      entity_type: notif.entity_type,
      entity_id: notif.entity_id,
      is_read: false,
      dismissed: false,
      scheduled_for: remindAt.toISOString()
    });
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    toast.success(`Reminder set for ${format(remindAt, 'HH:mm')}`);
  };

  return (
    <>
      {/* Bell button */}
      <button
        onClick={() => setIsOpen(true)}
        className="relative p-2 rounded-lg hover:bg-white/10 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
        aria-label="Notifications"
      >
        <motion.div animate={unreadCount > 0 ? { rotate: [0, -10, 10, -10, 0] } : {}} transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 5 }}>
          <Bell className="w-5 h-5 text-white" />
        </motion.div>
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute top-0.5 right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-0.5"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, x: 40, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.97 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed right-2 top-16 sm:top-20 w-[calc(100vw-1rem)] sm:w-[400px] max-h-[80vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b dark:border-slate-700" style={{background:'linear-gradient(135deg, #D4E0EC 0%, #C0CDD9 100%)'}}>
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-[#1D6FB8]" />
                  <h2 className="font-semibold" style={{color:'#0D1A2A'}}>Notifications</h2>
                  {unreadCount > 0 && (
                    <Badge className="text-white text-xs h-5 px-1.5" style={{background:'#1D6FB8'}}>{unreadCount}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => markAllRead.mutate()} className="h-8 text-xs" style={{color:'#1D6FB8'}}>
                      <Check className="w-3 h-3 mr-1" /> All read
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-8 w-8">
                    <X className="w-4 h-4 text-slate-500" />
                  </Button>
                </div>
              </div>

              {/* Tabs */}
              <Tabs defaultValue="inbox" className="flex flex-col flex-1 overflow-hidden">
                <TabsList className="mx-4 mt-3 mb-0 grid grid-cols-2 h-9">
                  <TabsTrigger value="inbox" className="text-xs">Inbox</TabsTrigger>
                  <TabsTrigger value="settings" className="text-xs">
                    <Settings className="w-3 h-3 mr-1" /> Settings
                  </TabsTrigger>
                </TabsList>

                {/* Inbox */}
                <TabsContent value="inbox" className="flex-1 overflow-hidden mt-0">
                  <ScrollArea className="h-[calc(80vh-8rem)]">
                    <div className="p-3 space-y-2">
                      {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                          <Bell className="w-12 h-12 mb-3 opacity-30" />
                          <p className="text-sm font-medium">All caught up!</p>
                          <p className="text-xs mt-1">No notifications yet.</p>
                        </div>
                      ) : (
                        <AnimatePresence>
                          {notifications.map((n) => (
                            <motion.div
                              key={n.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                              className={cn(
                                'group flex gap-3 p-3 rounded-xl border cursor-pointer transition-all hover:shadow-sm',
                                !n.is_read
                                  ? 'border-[#29ABE2]/40 dark:border-[#1D6FB8]/50'
                                  : 'bg-white border-slate-100 dark:bg-slate-800 dark:border-slate-700'
                              )}
                              style={!n.is_read ? {background:'rgba(41,171,226,0.08)'} : {}}
                              onClick={() => !n.is_read && markRead.mutate(n.id)}
                            >
                              <NotifIcon type={n.type} priority={n.priority} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-1">
                                  <p className={cn('text-sm font-medium truncate', !n.is_read ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300')}>
                                    {n.title}
                                  </p>
                                  {!n.is_read && <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{background:'#29ABE2'}} />}
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">{n.message}</p>
                                <p className="text-[10px] text-slate-400 mt-1">
                                  {n.created_date ? formatDistanceToNow(new Date(n.created_date), { addSuffix: true }) : ''}
                                </p>
                                {/* Snooze / Remind later */}
                                <SnoozeMenu notif={n} onSnooze={handleSnooze} />
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); deleteNotif.mutate(n.id); }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 flex-shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                              </button>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* Settings */}
                <TabsContent value="settings" className="flex-1 overflow-hidden mt-0">
                  <ScrollArea className="h-[calc(80vh-8rem)]">
                    <div className="p-4 space-y-1">
                      {/* Push permission banner */}
                      {pushPermission !== 'granted' && pushPermission !== 'unsupported' && (
                        <div className="flex items-center justify-between p-3 mb-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                          <div className="flex items-center gap-2">
                            <BellOff className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            <span className="text-xs font-medium text-amber-800 dark:text-amber-300">Push notifications off</span>
                          </div>
                          <Button size="sm" className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white" onClick={handleEnablePush}>
                            Enable
                          </Button>
                        </div>
                      )}

                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                        Choose which notifications you receive in-app.
                      </p>
                      {PREF_TYPES.map(({ type, label }) => {
                        const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.system;
                        const Icon = cfg.icon;
                        const enabled = getPref(type);
                        return (
                          <div key={type} className="flex items-center justify-between py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
                            <div className="flex items-center gap-2.5">
                              <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', cfg.color)}>
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">{label}</Label>
                            </div>
                            <Switch
                              checked={enabled}
                              onCheckedChange={(val) => togglePref.mutate({ type, enabled: val })}
                              className="data-[state=checked]:bg-[#1D6FB8]"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}