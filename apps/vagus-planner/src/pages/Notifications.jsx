import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import IntelligentNotificationManager from '@/components/notifications/IntelligentNotificationManager';

export default function Notifications() {
  // Safe prefetch so shared query keys resolve to [] on failure (child reads same cache)
  useQuery({
    queryKey: ['smartNotifications'],
    queryFn: async () => {
      try {
        const list = await base44.entities.SmartNotification.list('-scheduled_time', 50);
        return list ?? [];
      } catch (error) {
        console.error('Error fetching notifications:', error);
        return [];
      }
    },
  });

  useQuery({
    queryKey: ['notificationPreferences'],
    queryFn: async () => {
      try {
        const list = await base44.entities.NotificationPreference.list();
        return list ?? [];
      } catch (error) {
        console.error('Error fetching notification preferences:', error);
        return [];
      }
    },
  });

  return <IntelligentNotificationManager />;
}
