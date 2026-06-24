import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Bell, Check, Trash2, MessageSquare, Users, FileText, Zap, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const NotificationIcon = ({ type }) => {
  const icons = {
    chat_message: MessageSquare,
    group_message: Users,
    mention: Users,
    drive_file: FileText,
    slack_message: Zap,
    system: Bell
  };
  const Icon = icons[type] || Bell;
  return <Icon className="w-4 h-4" />;
};

export default function NotificationCenter({ isOpen, onClose }) {
  const [filter, setFilter] = useState('all');
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.email],
    queryFn: async () => {
      if (!user) return [];
      const allNotifs = await base44.entities.Notification.filter({ 
        recipient_email: user.email 
      }, '-created_date', 100);
      return allNotifs;
    },
    enabled: !!user && isOpen,
    refetchInterval: 5000
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { is_read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.is_read);
      await Promise.all(unread.map(n => 
        base44.entities.Notification.update(n.id, { is_read: true })
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications marked as read');
    }
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Notification deleted');
    }
  });

  const handleNotificationClick = (notification) => {
    markAsReadMutation.mutate(notification.id);
    if (notification.link) {
      window.location.href = notification.link;
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read;
    if (filter === 'read') return n.is_read;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
      />
      
      {/* Notification Panel */}
      <motion.div
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 100 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed right-0 top-0 bottom-0 w-full sm:w-96 bg-white dark:bg-slate-900 shadow-2xl z-50 flex flex-col"
      >
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950 dark:to-emerald-950">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Bell className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              {unreadCount > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"
                />
              )}
            </div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Notifications</h2>
            {unreadCount > 0 && (
              <Badge className="bg-teal-600 text-white">{unreadCount}</Badge>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
            className={cn('h-8 text-xs', filter === 'all' && 'bg-teal-600')}
          >
            All
          </Button>
          <Button
            size="sm"
            variant={filter === 'unread' ? 'default' : 'outline'}
            onClick={() => setFilter('unread')}
            className={cn('h-8 text-xs', filter === 'unread' && 'bg-teal-600')}
          >
            Unread
          </Button>
          <Button
            size="sm"
            variant={filter === 'read' ? 'default' : 'outline'}
            onClick={() => setFilter('read')}
            className={cn('h-8 text-xs', filter === 'read' && 'bg-teal-600')}
          >
            Read
          </Button>
          {unreadCount > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => markAllAsReadMutation.mutate()}
              className="h-8 text-xs ml-auto"
            >
              <Check className="w-3 h-3 mr-1" />
              Mark all
            </Button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <Bell className="w-16 h-16 mb-3 opacity-50" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            <AnimatePresence>
              {filteredNotifications.map((notification) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className={cn(
                    "p-3 mb-2 rounded-lg border cursor-pointer transition-all hover:shadow-md group relative",
                    !notification.is_read 
                      ? 'bg-teal-50 border-teal-200 dark:bg-teal-950/30 dark:border-teal-800' 
                      : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700'
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                      notification.type === 'mention' || notification.priority === 'high'
                        ? 'bg-amber-100 text-amber-600'
                        : notification.type === 'drive_file'
                        ? 'bg-blue-100 text-blue-600'
                        : notification.type === 'slack_message'
                        ? 'bg-purple-100 text-purple-600'
                        : 'bg-teal-100 text-teal-600'
                    )}>
                      <NotificationIcon type={notification.type} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">
                            {notification.title}
                          </h4>
                          {notification.priority === 'urgent' && (
                            <Badge variant="destructive" className="h-4 text-xs px-1">!</Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotificationMutation.mutate(notification.id);
                          }}
                        >
                          <Trash2 className="w-3 h-3 text-red-500" />
                        </Button>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-2">
                       {notification.message}
                      </p>
                      <div className="flex items-center justify-between">
                        {notification.source && (
                          <span className="text-xs text-slate-400">
                            {notification.source}
                          </span>
                        )}
                        <span className="text-xs text-slate-400">
                          {format(new Date(notification.created_date), 'MMM d, HH:mm')}
                        </span>
                      </div>
                    </div>
                  </div>
                  {!notification.is_read && (
                    <div className="w-2 h-2 rounded-full bg-teal-600 absolute top-3 right-3" />
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </ScrollArea>
    </motion.div>
    </>
  );
}