/**
 * LiveLocationSharing — toggle real-time location broadcast for group safety
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { Navigation, Battery, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function LiveLocationSharing({
  groupChatId,
  tripId,
  contextType = 'group_chat',
  groupName = 'Group',
}) {
  const [isSharing, setIsSharing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [battery, setBattery] = useState(100);
  const [accuracy, setAccuracy] = useState(null);
  const watchIdRef = useRef(null);
  const updateIntervalRef = useRef(null);
  const locationRowIdRef = useRef(null);
  const currentUser = useRef(null);
  const batteryRef = useRef(100);

  useEffect(() => {
    base44.auth.me().then((user) => {
      currentUser.current = user;
    });
  }, []);

  useEffect(() => {
    if (!navigator.getBattery) return;
    navigator.getBattery().then((bat) => {
      const level = Math.round(bat.level * 100);
      batteryRef.current = level;
      setBattery(level);
      bat.addEventListener('levelchange', () => {
        const next = Math.round(bat.level * 100);
        batteryRef.current = next;
        setBattery(next);
      });
    });
  }, []);

  const contextFilters = useCallback(() => {
    if (contextType === 'trip') {
      return { context_type: 'trip', trip_id: tripId, group_chat_id: null };
    }
    return { context_type: 'group_chat', group_chat_id: groupChatId, trip_id: null };
  }, [contextType, tripId, groupChatId]);

  const persistLocation = useCallback(
    async (pos, sharing) => {
      const user = currentUser.current;
      if (!user?.id) {
        throw new Error('User not loaded');
      }

      const payload = {
        ...contextFilters(),
        user_id: user.id,
        user_email: user.email,
        user_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy_meters: Math.round(pos.coords.accuracy),
        battery_level: batteryRef.current,
        is_sharing: sharing,
        last_updated_at: new Date().toISOString(),
      };

      if (locationRowIdRef.current) {
        await base44.entities.LiveLocation.update(locationRowIdRef.current, payload);
        return;
      }

      const filter =
        contextType === 'trip'
          ? { trip_id: tripId, context_type: 'trip' }
          : { group_chat_id: groupChatId, context_type: 'group_chat' };

      const existing = await base44.entities.LiveLocation.filter(filter);
      const mine = existing.find((row) => row.user_id === user.id);

      if (mine?.id) {
        locationRowIdRef.current = mine.id;
        await base44.entities.LiveLocation.update(mine.id, payload);
      } else {
        const created = await base44.entities.LiveLocation.create(payload);
        if (created?.id) {
          locationRowIdRef.current = created.id;
        }
      }
    },
    [contextFilters, contextType, tripId, groupChatId]
  );

  const markSharingStopped = useCallback(async () => {
    if (!locationRowIdRef.current) return;
    try {
      await base44.entities.LiveLocation.update(locationRowIdRef.current, {
        is_sharing: false,
        last_updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Failed to mark location sharing stopped:', err);
    }
  }, []);

  const stopSharing = useCallback(async () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }
    setIsSharing(false);
    await markSharingStopped();
    toast.success('Location sharing stopped');
  }, [markSharingStopped]);

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

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await persistLocation(pos, true);
          setIsSharing(true);
          setAccuracy(pos.coords.accuracy);
          toast.success(`Location sharing enabled in ${groupName}`);

          watchIdRef.current = navigator.geolocation.watchPosition(
            (watchPos) => {
              setAccuracy(watchPos.coords.accuracy);
            },
            (err) => {
              console.error('Geolocation error:', err);
              setError(err.message);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
          );

          updateIntervalRef.current = setInterval(() => {
            navigator.geolocation.getCurrentPosition(
              async (intervalPos) => {
                try {
                  await persistLocation(intervalPos, true);
                  setAccuracy(intervalPos.coords.accuracy);
                } catch (err) {
                  console.error('Location update error:', err);
                  setError(err.message || 'Failed to save location update');
                }
              },
              (err) => {
                console.error('Geolocation error:', err);
                setError(err.message);
              },
              { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
            );
          }, 10000);
        } catch (err) {
          setError(err.message || 'Failed to start location sharing');
          toast.error('Could not save location — sharing not enabled');
        } finally {
          setIsLoading(false);
        }
      },
      (err) => {
        setError(err.message);
        setIsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
      void markSharingStopped();
    };
  }, [markSharingStopped]);

  return (
    <div className="space-y-3">
      <div
        className={cn(
          'flex items-center justify-between p-3 rounded-lg border transition-all',
          isSharing
            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
        )}
      >
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'w-3 h-3 rounded-full',
              isSharing ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
            )}
          />
          <div>
            <p
              className={cn(
                'text-sm font-bold',
                isSharing ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-400'
              )}
            >
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

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

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
          <Button onClick={stopSharing} variant="destructive" className="flex-1">
            Stop Sharing
          </Button>
        )}
      </div>

      <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 rounded-lg text-xs text-blue-700 dark:text-blue-300">
        <p className="font-semibold mb-1">Privacy & Safety</p>
        <ul className="space-y-0.5 text-xs">
          <li>• Only visible to {groupName} members who are also sharing</li>
          <li>• Updates every 10 seconds while enabled</li>
          <li>• Stop anytime to disable sharing immediately</li>
          <li>• High battery usage — use during group travel only</li>
        </ul>
      </div>
    </div>
  );
}
