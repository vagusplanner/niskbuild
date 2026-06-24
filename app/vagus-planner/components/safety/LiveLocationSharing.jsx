/**
 * LiveLocationSharing — toggle real-time location broadcast for group safety
 */
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { MapPin, Navigation, Battery, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function LiveLocationSharing({
  groupChatId,
  tripId,
  contextType = 'group_chat',
  groupName = 'Group'
}) {
  const [isSharing, setIsSharing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [battery, setBattery] = useState(100);
  const [accuracy, setAccuracy] = useState(null);
  const watchIdRef = useRef(null);
  const updateIntervalRef = useRef(null);
  const currentUser = useRef(null);

  // Get current user
  useEffect(() => {
    base44.auth.me().then(user => {
      currentUser.current = user;
    });
  }, []);

  // Monitor battery level
  useEffect(() => {
    if (!navigator.getBattery) return;
    navigator.getBattery().then(battery => {
      setBattery(Math.round(battery.level * 100));
      battery.addEventListener('levelchange', () => {
        setBattery(Math.round(battery.level * 100));
      });
    });
  }, []);

  const startSharing = async () => {
    if (!currentUser.current) {
      toast.error('User not loaded');
      return;
    }

    setIsLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      setIsLoading(false);
      return;
    }

    try {
      // Request permission
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setIsSharing(true);
          setAccuracy(pos.coords.accuracy);
          toast.success(`📍 Location sharing enabled in ${groupName}`);

          // Start watching position with updates every 10 seconds
          watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => {
              setAccuracy(pos.coords.accuracy);
              // Will be sent by the interval handler
            },
            (err) => {
              console.error('Geolocation error:', err);
              setError(err.message);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
          );

          // Update server every 10 seconds when sharing
          updateIntervalRef.current = setInterval(async () => {
            navigator.geolocation.getCurrentPosition(
              async (pos) => {
                try {
                  await base44.entities.LiveLocation.create({
                    [contextType === 'trip' ? 'trip_id' : 'group_chat_id']: contextType === 'trip' ? tripId : groupChatId,
                    context_type: contextType,
                    user_email: currentUser.current.email,
                    user_name: currentUser.current.full_name || currentUser.current.email.split('@')[0],
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    accuracy_meters: Math.round(pos.coords.accuracy),
                    battery_level: battery,
                    is_sharing: true,
                    last_updated_at: new Date().toISOString()
                  });
                } catch (err) {
                  console.error('Location update error:', err);
                }
              }
            );
          }, 10000);

          setIsLoading(false);
        },
        (err) => {
          setError(err.message);
          setIsLoading(false);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const stopSharing = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }
    setIsSharing(false);
    toast.success('Location sharing stopped');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSharing();
    };
  }, []);

  return (
    <div className="space-y-3">
      {/* Status */}
      <div className={cn(
        'flex items-center justify-between p-3 rounded-lg border transition-all',
        isSharing
          ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
      )}>
        <div className="flex items-center gap-2">
          <div className={cn(
            'w-3 h-3 rounded-full animate-pulse',
            isSharing ? 'bg-emerald-500' : 'bg-slate-400'
          )} />
          <div>
            <p className={cn(
              'text-sm font-bold',
              isSharing ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-400'
            )}>
              {isSharing ? 'Sharing Location' : 'Location Sharing Off'}
            </p>
            {accuracy !== null && (
              <p className="text-xs text-slate-500">Accuracy: ±{Math.round(accuracy)}m</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Battery className={cn('w-4 h-4', battery < 20 ? 'text-red-500' : 'text-slate-400')} />
          <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{battery}%</span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {!isSharing ? (
          <Button
            onClick={startSharing}
            disabled={isLoading}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 gap-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Navigation className="w-4 h-4" />
            )}
            Enable Sharing
          </Button>
        ) : (
          <Button
            onClick={stopSharing}
            variant="destructive"
            className="flex-1"
          >
            Stop Sharing
          </Button>
        )}
      </div>

      {/* Info */}
      <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 rounded-lg text-xs text-blue-700 dark:text-blue-300">
        <p className="font-semibold mb-1">🔒 Privacy & Safety</p>
        <ul className="space-y-0.5 text-xs">
          <li>• Only visible to {groupName} members</li>
          <li>• Updates every 10 seconds</li>
          <li>• Stop anytime to disable sharing</li>
          <li>• High battery usage — use during rituals only</li>
        </ul>
      </div>
    </div>
  );
}