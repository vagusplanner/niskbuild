import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { AnimatePresence, motion } from 'framer-motion';
import NotificationCenter from './NotificationCenter';
import NotificationToast from './NotificationToast';

export default function NotificationManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [toastNotification, setToastNotification] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => SDK.auth.me()
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.email],
    queryFn: async () => {
      if (!user) return [];
      return await SDK.entities.Notification.filter({ 
        recipient_email: user.email 
      }, '-created_date', 100);
    },
    enabled: !!user,
    refetchInterval: 10000
  });

  useEffect(() => {
    // Request notification permission
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          setHasPermission(permission === 'granted');
        });
      } else if (Notification.permission === 'granted') {
        setHasPermission(true);
      }
    }
  }, []);

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!user) return;

    const unsubscribe = SDK.entities.Notification.subscribe((event) => {
      if (event.type === 'create' && event.data.recipient_email === user.email) {
        // Show in-app toast notification
        setToastNotification(event.data);
        
        // Show browser notification only if app is in background
        if (hasPermission && document.hidden && typeof window !== 'undefined' && 'Notification' in window) {
          new Notification(event.data.title, {
            body: event.data.message,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: event.data.id
          });
        }

        // Play notification sound
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFA==');
        audio.volume = 0.3;
        audio.play().catch(() => {});
      }
    });

    return unsubscribe;
  }, [user, hasPermission]);

  // Poll external services every 2 minutes
  useEffect(() => {
    if (!user) return;

    const pollServices = async () => {
      // Silently try to poll - these services may not be connected
      try {
        await SDK.functions.invoke('pollGoogleDriveNotifications', {});
      } catch (error) {
        // Ignore - service not connected or error
      }
      
      try {
        await SDK.functions.invoke('pollSlackNotifications', {});
      } catch (error) {
        // Ignore - service not connected or error
      }
    };

    pollServices(); // Initial poll
    const interval = setInterval(pollServices, 120000); // Every 2 minutes

    return () => clearInterval(interval);
  }, [user]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        className="relative h-10 w-10 no-select"
      >
        <motion.div
          animate={unreadCount > 0 ? { scale: [1, 1.1, 1] } : {}}
          transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
        >
          <Bell className="w-5 h-5" />
        </motion.div>
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1"
          >
            <Badge className="h-5 w-5 flex items-center justify-center p-0 bg-red-600 text-white text-xs rounded-full">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          </motion.div>
        )}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <NotificationCenter 
            isOpen={isOpen} 
            onClose={() => setIsOpen(false)} 
          />
        )}
      </AnimatePresence>
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toastNotification && (
          <NotificationToast
            notification={toastNotification}
            onDismiss={() => setToastNotification(null)}
            onClick={() => {
              setToastNotification(null);
              setIsOpen(true);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}