import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { toast } from 'sonner';

/**
 * NotificationEngine evaluates whether to send a notification based on user preferences
 */
export class NotificationManager {
  constructor(preferences = []) {
    this.preferences = preferences;
  }

  getPreference(notificationType) {
    return this.preferences.find(p => p.notification_type === notificationType) || {
      enabled: true,
      priority: 'medium',
      channels: [
        { channel: 'in_app', enabled: true },
        { channel: 'email', enabled: true },
        { channel: 'push', enabled: true }
      ],
      advance_notice_minutes: 30,
      include_sound: true,
      include_vibration: true
    };
  }

  shouldNotify(notificationType, options = {}) {
    const preference = this.getPreference(notificationType);

    // Check if notification type is enabled
    if (!preference.enabled) return false;

    // Check event priority filtering
    if (options.eventPriority && preference.filter_by_priority?.length > 0) {
      if (!preference.filter_by_priority.includes(options.eventPriority)) {
        return false;
      }
    }

    // Check event category filtering
    if (options.eventCategory && preference.filter_by_category?.length > 0) {
      if (!preference.filter_by_category.includes(options.eventCategory)) {
        return false;
      }
    }

    // Check quiet hours
    if (preference.quiet_hours_enabled && this.isInQuietHours(preference)) {
      return preference.do_not_disturb_mode !== 'suppress';
    }

    return true;
  }

  isInQuietHours(preference) {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const start = preference.quiet_hours_start || '22:00';
    const end = preference.quiet_hours_end || '08:00';

    // Simple comparison (doesn't handle crossing midnight)
    if (start < end) {
      return currentTime >= start && currentTime <= end;
    } else {
      return currentTime >= start || currentTime <= end;
    }
  }

  getEnabledChannels(notificationType) {
    const preference = this.getPreference(notificationType);
    return (preference.channels || [])
      .filter(c => c.enabled)
      .map(c => c.channel);
  }

  getNotificationConfig(notificationType) {
    const preference = this.getPreference(notificationType);
    return {
      priority: preference.priority || 'medium',
      sound: preference.include_sound ?? true,
      vibration: preference.include_vibration ?? true,
      channels: this.getEnabledChannels(notificationType),
      advanceMinutes: preference.advance_notice_minutes || 30,
      frequency: preference.frequency || 'once',
      customMessage: preference.custom_message
    };
  }
}

/**
 * Hook to use notification engine in components
 */
export function useNotificationEngine() {
  const { data: preferences = [] } = useQuery({
    queryKey: ['notificationPreferences'],
    queryFn: () => SDK.entities.NotificationPreference.list(),
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  const manager = new NotificationManager(preferences);

  return {
    manager,
    shouldNotify: (type, options) => manager.shouldNotify(type, options),
    getEnabledChannels: (type) => manager.getEnabledChannels(type),
    getConfig: (type) => manager.getNotificationConfig(type)
  };
}

/**
 * Send notification through selected channels
 */
export async function sendNotification(config) {
  const {
    type,
    title,
    message,
    channels = ['in_app'],
    data = {},
    sound = true,
    vibration = true
  } = config;

  const results = {
    success: false,
    channels: {}
  };

  // In-app notification
  if (channels.includes('in_app')) {
    try {
      toast.success(title, { description: message });
      results.channels.in_app = true;
    } catch (err) {
      results.channels.in_app = false;
    }
  }

  // Email notification
  if (channels.includes('email')) {
    try {
      const user = await SDK.auth.me();
      if (user?.email) {
        await SDK.integrations.Core.SendEmail({
          to: user.email,
          subject: title,
          body: message
        });
        results.channels.email = true;
      }
    } catch (err) {
      console.error('Email notification failed:', err);
      results.channels.email = false;
    }
  }

  // Push notification
  if (channels.includes('push') && 'Notification' in window) {
    try {
      if (Notification.permission === 'granted') {
        const notification = new Notification(title, {
          body: message,
          tag: type,
          silent: !sound,
          data
        });

        if (vibration && 'vibrate' in navigator) {
          navigator.vibrate([200, 100, 200]);
        }

        results.channels.push = true;
      }
    } catch (err) {
      console.error('Push notification failed:', err);
      results.channels.push = false;
    }
  }

  results.success = Object.values(results.channels).some(v => v === true);
  return results;
}

/**
 * Hook to request push notification permission
 */
export function useRequestPushPermission() {
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);
}

/**
 * Component that provides notification engine to children
 */
export function NotificationEngineProvider({ children }) {
  useRequestPushPermission();
  return children;
}