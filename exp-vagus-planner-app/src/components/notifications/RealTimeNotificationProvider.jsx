import React, { useEffect, useRef, useCallback } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// ── Browser push helper ──────────────────────────────────────────────────────
function fireBrowserPush(title, body, icon, tag) {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: icon || 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6965607bc386491646bad6e8/10b500d37_IMG_6630.png',
        tag: tag || 'vagus-notif',
        silent: false
      });
    } catch (_) {}
  }
}

/**
 * Real-time notification provider that listens for new events, messages, goals, and updates
 * Automatically creates notifications and displays them to users
 */
export default function RealTimeNotificationProvider({ children }) {
  const queryClient = useQueryClient();
  
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => SDK.auth.me()
  });

  const { data: preferences = [] } = useQuery({
    queryKey: ['notificationPreferences'],
    queryFn: () => SDK.entities.NotificationPreference.list()
  });

  // Helper to check if notification should be sent based on preferences
  // Stable ref so it doesn't change identity on every render
  const preferencesRef = React.useRef(preferences);
  useEffect(() => { preferencesRef.current = preferences; }, [preferences]);

  const shouldNotify = React.useCallback((type) => {
    const pref = preferencesRef.current.find(p => p.notification_type === type);
    if (!pref) return true;
    return pref.enabled;
  }, []);

  // Dedup guard: track recently-created notification keys to avoid double-fires
  const recentKeys = useRef(new Set());

  const createNotification = useCallback(async (data) => {
    if (!user) return;
    const key = `${data.type}:${data.entity_id}:${data.title}`;
    if (recentKeys.current.has(key)) return;
    recentKeys.current.add(key);
    setTimeout(() => recentKeys.current.delete(key), 10000);

    try {
      await SDK.entities.Notification.create({
        recipient_email: user.email,
        ...data,
        is_read: false,
        dismissed: false
      });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });

      // Browser push when tab is hidden / user is "offline" in-tab
      if (document.hidden) {
        fireBrowserPush(data.title, data.message, null, key);
      }
    } catch (error) {
      console.error('Failed to create notification:', error);
    }
  }, [user, queryClient]);

  // Subscribe to new events
  useEffect(() => {
    if (!user || !shouldNotify('event_reminder')) return;

    const unsubscribe = SDK.entities.Event.subscribe((event) => {
      if (event.type === 'create' && event.data.created_by === user.email) {
        const eventData = event.data;
        
        // Check if event is within next 24 hours
        const eventTime = new Date(eventData.start_date);
        const now = new Date();
        const hoursDiff = (eventTime - now) / (1000 * 60 * 60);
        
        if (hoursDiff > 0 && hoursDiff < 24) {
          createNotification({
            type: 'event_reminder',
            title: 'Upcoming Event',
            message: `${eventData.title} is scheduled for ${eventTime.toLocaleString()}`,
            priority: 'medium',
            icon: '📅',
            entity_type: 'event',
            entity_id: eventData.id
          });
        }
      }
    });

    return unsubscribe;
  }, [user, preferences]);

  // Subscribe to new direct messages
  useEffect(() => {
    if (!user) return;

    const unsubscribeChat = SDK.entities.Chat.subscribe((event) => {
      if (event.type === 'create') {
        const msg = event.data;
        if (msg.conversation_id?.includes(user.email) && msg.sender_email !== user.email) {
          const preview = msg.message?.substring(0, 60) || '';
          const senderName = msg.sender_name || msg.sender_email?.split('@')[0] || 'Someone';
          createNotification({
            type: 'new_message',
            title: `💬 ${senderName}`,
            message: preview,
            priority: 'high',
            icon: '💬',
            entity_type: 'chat',
            entity_id: msg.conversation_id
          });
          // Also show in-app toast if tab is visible
          if (!document.hidden) {
            toast(`💬 ${senderName}`, { description: preview, duration: 4000 });
          }
        }
      }
    });

    const unsubscribeGroup = SDK.entities.GroupMessage.subscribe((event) => {
      if (event.type === 'create') {
        const msg = event.data;
        if (msg.sender_email !== user.email) {
          const preview = msg.message?.substring(0, 60) || '';
          const senderName = msg.sender_name || msg.sender_email?.split('@')[0] || 'Someone';
          createNotification({
            type: 'new_group_message',
            title: `👥 ${senderName} (group)`,
            message: preview,
            priority: 'medium',
            icon: '👥',
            entity_type: 'group_message',
            entity_id: msg.group_chat_id
          });
        }
      }
    });

    // GroupChat creation = group invitation
    const unsubscribeGroupChat = SDK.entities.GroupChat.subscribe((event) => {
      if (event.type === 'create') {
        const group = event.data;
        if (group.members?.includes(user.email) && group.created_by !== user.email) {
          createNotification({
            type: 'group_invitation',
            title: '👥 Group Invitation',
            message: `You were added to "${group.name}"`,
            priority: 'high',
            icon: '👥',
            entity_type: 'group_chat',
            entity_id: group.id
          });
          if (!document.hidden) {
            toast('👥 Group Invitation', { description: `You were added to "${group.name}"`, duration: 5000 });
          } else {
            fireBrowserPush('Group Invitation', `You were added to "${group.name}"`);
          }
        }
      }
    });

    return () => {
      unsubscribeChat();
      unsubscribeGroup();
      unsubscribeGroupChat();
    };
  }, [user, createNotification]);

  // Subscribe to goal achievements
  useEffect(() => {
    if (!user || !shouldNotify('goal_update')) return;

    const unsubscribe = SDK.entities.Goal.subscribe((event) => {
      if (event.type === 'update' && event.data.created_by === user.email) {
        const goal = event.data;
        
        // Check if goal was just completed
        if (goal.status === 'completed' && event.old_data?.status !== 'completed') {
          createNotification({
            type: 'goal_update',
            title: '🎉 Goal Achieved!',
            message: `Congratulations! You completed: ${goal.title}`,
            priority: 'high',
            icon: '🎯',
            entity_type: 'goal',
            entity_id: goal.id
          });
        }
        
        // Check if goal progress reached milestone
        if (goal.progress >= 50 && event.old_data?.progress < 50) {
          createNotification({
            type: 'goal_update',
            title: 'Goal Progress',
            message: `You're halfway there! ${goal.title} is now ${goal.progress}% complete`,
            priority: 'medium',
            icon: '📈',
            entity_type: 'goal',
            entity_id: goal.id
          });
        }
      }
    });

    return unsubscribe;
  }, [user, preferences]);

  // Subscribe to task assignments
  useEffect(() => {
    if (!user || !shouldNotify('task_assigned')) return;

    const unsubscribe = SDK.entities.Task.subscribe((event) => {
      if (event.type === 'create') {
        const task = event.data;
        
        // Notify if task is assigned to current user
        if (task.assigned_to === user.email && task.created_by !== user.email) {
          createNotification({
            type: 'task_assigned',
            title: 'New Task Assigned',
            message: `${task.title} - Due: ${task.due_date || 'No due date'}`,
            priority: task.priority === 'urgent' ? 'critical' : 'medium',
            icon: '✅',
            entity_type: 'task',
            entity_id: task.id
          });
        }
      }
    });

    return unsubscribe;
  }, [user, preferences]);

  // Subscribe to meeting invitations
  useEffect(() => {
    if (!user || !shouldNotify('meeting_invitation')) return;

    const unsubscribe = SDK.entities.Meeting.subscribe((event) => {
      if (event.type === 'create') {
        const meeting = event.data;
        
        // Notify if user is an attendee
        if (meeting.attendees?.includes(user.email) && meeting.organizer_email !== user.email) {
          createNotification({
            type: 'meeting_invitation',
            title: 'Meeting Invitation',
            message: `${meeting.title} - ${meeting.confirmed_date || 'Date pending'}`,
            priority: 'high',
            icon: '📅',
            entity_type: 'meeting',
            entity_id: meeting.id
          });
        }
      }
    });

    return unsubscribe;
  }, [user, preferences]);

  // Poll for scheduled reminders every minute and fire them when due
  useEffect(() => {
    if (!user) return;
    const check = async () => {
      try {
        const pending = await SDK.entities.Notification.filter({
          recipient_email: user.email,
          is_read: false,
          type: 'message_reminder'
        });
        const now = new Date();
        for (const n of pending) {
          if (!n.scheduled_for) continue;
          const due = new Date(n.scheduled_for);
          if (due <= now) {
            // Fire browser push
            fireBrowserPush(n.title, n.message, null, `reminder-${n.id}`);
            // Show toast
            toast(n.title, { description: n.message, duration: 8000 });
          }
        }
      } catch (_) {}
    };
    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, [user]);

  return <>{children}</>;
}