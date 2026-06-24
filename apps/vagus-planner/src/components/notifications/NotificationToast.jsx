import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, MessageSquare, Users, FileText, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const NotificationIcon = ({ type, priority }) => {
  const icons = {
    chat_message: MessageSquare,
    group_message: Users,
    mention: Users,
    drive_file: FileText,
    slack_message: Zap,
    system: Bell
  };
  const Icon = icons[type] || Bell;
  
  const colorClass = priority === 'urgent' || type === 'mention'
    ? 'text-amber-600 bg-amber-100'
    : type === 'drive_file'
    ? 'text-blue-600 bg-blue-100'
    : type === 'slack_message'
    ? 'text-purple-600 bg-purple-100'
    : 'text-teal-600 bg-teal-100';
  
  return (
    <div className={cn('w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0', colorClass)}>
      <Icon className="w-5 h-5" />
    </div>
  );
};

export default function NotificationToast({ notification, onDismiss, onClick }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, x: '-50%' }}
      animate={{ opacity: 1, y: 0, x: '-50%' }}
      exit={{ opacity: 0, y: -50, x: '-50%' }}
      className="fixed top-20 left-1/2 z-[60] w-[90%] max-w-md"
    >
      <div
        onClick={onClick}
        className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-4 cursor-pointer hover:shadow-xl transition-shadow"
      >
        <div className="flex items-start gap-3">
          <NotificationIcon type={notification.type} priority={notification.priority} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-1">
              <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">
                {notification.title}
              </h4>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 -mt-1 -mr-2"
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss();
                }}
              >
                <X className="w-4 h-4 text-slate-400" />
              </Button>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
              {notification.message}
            </p>
            {notification.source && (
              <p className="text-xs text-slate-400 mt-1">{notification.source}</p>
            )}
          </div>
        </div>
        {notification.priority === 'urgent' && (
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="absolute top-0 left-0 right-0 h-1 bg-red-500 rounded-t-xl"
          />
        )}
      </div>
    </motion.div>
  );
}