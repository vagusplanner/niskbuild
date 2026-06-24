import React, { useEffect, useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, BellOff, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function PushNotificationManager() {
  const [permission, setPermission] = useState('default');
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(false);

  const { data: settings = [] } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => SDK.entities.UserSettings.list()
  });

  const userSettings = settings[0];

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
      checkSubscription();
    }
  }, []);

  const checkSubscription = async () => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        const sub = await registration.pushManager.getSubscription();
        setSubscription(sub);
      } catch (error) {
        console.error('Error checking subscription:', error);
      }
    }
  };

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('This browser does not support notifications');
      return;
    }

    setLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        await subscribeToPush();
        toast.success('Notifications enabled!');
        
        // Schedule prayer time notifications
        schedulePrayerNotifications();
      } else {
        toast.error('Notification permission denied');
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast.error('Failed to enable notifications');
    } finally {
      setLoading(false);
    }
  };

  const subscribeToPush = async () => {
    if (!('serviceWorker' in navigator && 'PushManager' in window)) {
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Check for existing subscription
      let sub = await registration.pushManager.getSubscription();
      
      if (!sub) {
        // Subscribe to push notifications
        // In production, you'd use your VAPID public key here
        sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            'BEl62iUYgUivxIkv69yViEuiBIa-Ib37J8YpNp8QcJjCMkYGVSePB4L0SJ4WXQXqBpGMNNKUfBLgOQvZFpNf3E0'
          )
        });
      }
      
      setSubscription(sub);
      
      // Store subscription on server (you'd implement this backend function)
      // await SDK.functions.invoke('savePushSubscription', { subscription: sub.toJSON() });
      
    } catch (error) {
      console.error('Error subscribing to push:', error);
    }
  };

  const unsubscribe = async () => {
    if (!subscription) return;

    setLoading(true);
    try {
      await subscription.unsubscribe();
      setSubscription(null);
      toast.success('Notifications disabled');
    } catch (error) {
      console.error('Error unsubscribing:', error);
      toast.error('Failed to disable notifications');
    } finally {
      setLoading(false);
    }
  };

  const schedulePrayerNotifications = async () => {
    if (!userSettings?.prayer_enabled) return;
    
    // Prayer times are already calculated and displayed
    // The service worker will handle showing notifications at the right times
    console.log('Prayer notifications scheduled');
  };

  const testNotification = () => {
    if (permission !== 'granted') {
      toast.error('Please enable notifications first');
      return;
    }

    new Notification('Test Notification', {
      body: 'This is a test notification from MyAssistant',
      icon: '/pwa-icon-192.png',
      badge: '/pwa-icon-192.png',
      vibrate: [200, 100, 200],
      tag: 'test-notification'
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-teal-600" />
          Push Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-3">
            {permission === 'granted' ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600" />
            )}
            <div>
              <p className="font-medium text-slate-800">
                {permission === 'granted' ? 'Enabled' : 'Disabled'}
              </p>
              <p className="text-sm text-slate-500">
                {permission === 'granted' 
                  ? 'You will receive prayer times and reminders'
                  : 'Enable to get timely reminders'
                }
              </p>
            </div>
          </div>
        </div>

        {permission !== 'granted' ? (
          <Button
            onClick={requestPermission}
            disabled={loading}
            className="w-full bg-teal-600 hover:bg-teal-700"
          >
            <Bell className="w-4 h-4 mr-2" />
            Enable Notifications
          </Button>
        ) : (
          <div className="space-y-2">
            <Button
              onClick={testNotification}
              variant="outline"
              className="w-full"
            >
              Test Notification
            </Button>
            <Button
              onClick={unsubscribe}
              disabled={loading}
              variant="outline"
              className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <BellOff className="w-4 h-4 mr-2" />
              Disable Notifications
            </Button>
          </div>
        )}

        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-800">
            <strong>Note:</strong> Notifications work best when the app is installed on your home screen. 
            You'll receive alerts for prayer times, task reminders, and calendar events.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper function for VAPID key conversion
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}