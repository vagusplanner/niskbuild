import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';

// This component no longer renders a visible button in the header.
// Permission request is triggered via the requestPushPermission exported function,
// and can be called from within the notification center.
export function requestPushPermission() {
  if (!('Notification' in window)) {
    toast.error('Notifications not supported on this device');
    return;
  }
  if (Notification.permission === 'granted') {
    toast.info('Notifications are already enabled.');
    return;
  }
  Notification.requestPermission().then((result) => {
    if (result === 'granted') {
      toast.success("Notifications enabled! You'll be alerted for prayers, events & more.");
      new Notification('Vagus Planner', {
        body: 'Notifications are now active 🎉',
        icon: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6965607bc386491646bad6e8/10b500d37_IMG_6630.png',
        tag: 'welcome'
      });
    } else {
      toast.info('Notifications blocked. You can enable them in browser settings.');
    }
  });
}

export default function EnhancedPushNotifications() {
  // Renders nothing — the button was cluttering the header.
  // Use requestPushPermission() to prompt the user.
  return null;
}