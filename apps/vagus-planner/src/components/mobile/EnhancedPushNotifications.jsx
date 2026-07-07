import React from 'react';
import { toast } from 'sonner';
import {
  fireNotification,
  getNotificationPermission,
  requestNotificationPermission,
} from '@/lib/vp-notifications';

export async function requestPushPermission() {
  const perm = await getNotificationPermission();
  if (perm === 'unsupported') {
    toast.error('Notifications not supported on this device');
    return;
  }
  if (perm === 'granted') {
    toast.info('Notifications are already enabled.');
    return;
  }
  const result = await requestNotificationPermission();
  if (result === 'granted') {
    toast.success("Notifications enabled! You'll be alerted for prayers, events & more.");
    await fireNotification({
      title: 'Vagus Planner',
      body: 'Notifications are now active 🎉',
      tag: 'welcome',
    });
  } else {
    toast.info('Notifications blocked. You can enable them in device settings.');
  }
}

export default function EnhancedPushNotifications() {
  return null;
}
