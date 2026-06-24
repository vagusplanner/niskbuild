/**
 * EnhancedOfflineSync
 * 
 * Mounts invisibly in the Layout. Responsible for:
 * - Detecting online/offline transitions
 * - Flushing the IndexedDB sync queue when back online
 * - Showing a minimal status badge / sync button
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { offlineStorage } from '@/components/offline/offlineStorage';
import { flushSyncQueue } from '@/hooks/useOfflineData';

async function getPendingCount() {
  try {
    await offlineStorage.init();
    const q = await offlineStorage.getSyncQueue();
    return q.length;
  } catch {
    return 0;
  }
}

export default function EnhancedOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const queryClient = useQueryClient();

  // Refresh pending count
  const refreshCount = useCallback(async () => {
    const n = await getPendingCount();
    setPending(n);
  }, []);

  // Flush queue + invalidate all queries
  const sync = useCallback(async () => {
    if (!navigator.onLine || syncing) return;
    setSyncing(true);
    try {
      const synced = await flushSyncQueue();
      if (synced > 0) {
        await queryClient.invalidateQueries();
        toast.success(`✅ ${synced} change${synced !== 1 ? 's' : ''} synced!`);
      }
      await refreshCount();
    } catch (err) {
      console.warn('Sync error:', err);
    } finally {
      setSyncing(false);
    }
  }, [syncing, queryClient, refreshCount]);

  useEffect(() => {
    refreshCount();

    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Back online — syncing…', { duration: 2000 });
      sync();
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('You\'re offline. Changes are saved locally and will sync when reconnected.', { duration: 4000 });
    };

    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for SW-triggered sync events
    const handleSWMessage = (e) => {
      if (e.data?.type === 'TRIGGER_SYNC') sync();
    };
    navigator.serviceWorker?.addEventListener('message', handleSWMessage);

    // Periodic pending count refresh
    const interval = setInterval(refreshCount, 15000);

    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
      navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
      clearInterval(interval);
    };
  }, [sync, refreshCount]);

  // Nothing to show when online and nothing pending
  if (isOnline && pending === 0) return null;

  return (
    <div className="fixed bottom-[5.5rem] right-3 lg:bottom-4 lg:right-4 z-50">
      {!isOnline ? (
        <Badge className="flex items-center gap-1.5 px-3 py-1.5 shadow-xl bg-amber-500 hover:bg-amber-500 text-white border-0 text-xs font-semibold">
          <WifiOff className="w-3.5 h-3.5" />
          Offline{pending > 0 ? ` · ${pending} pending` : ''}
        </Badge>
      ) : pending > 0 ? (
        <Button size="sm" onClick={sync} disabled={syncing}
          className="shadow-xl gap-1.5 bg-[#1D6FB8] hover:bg-[#2980B9] text-white text-xs font-semibold">
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing…' : `Sync ${pending} change${pending !== 1 ? 's' : ''}`}
        </Button>
      ) : null}
    </div>
  );
}