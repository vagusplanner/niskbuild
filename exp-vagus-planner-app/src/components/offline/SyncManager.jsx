import React, { useEffect, useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQueryClient } from '@tanstack/react-query';
import { offlineStorage } from './offlineStorage';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, CheckCircle2, Wifi, WifiOff } from 'lucide-react';

export default function SyncManager() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const queryClient = useQueryClient();

  useEffect(() => {
    const initStorage = async () => {
      try {
        await offlineStorage.init();
        await updatePendingCount();
      } catch (error) {
        console.error('Failed to initialize offline storage:', error);
      }
    };

    initStorage();
  }, []);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      toast.success('Connection restored');
      await syncData();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.info('You are offline. Changes will sync when reconnected.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const updatePendingCount = async () => {
    try {
      const syncQueue = await offlineStorage.getSyncQueue();
      const unsyncedPrayers = await offlineStorage.getUnsyncedPrayerLogs();
      setPendingCount((syncQueue?.length || 0) + (unsyncedPrayers?.length || 0));
    } catch (error) {
      console.error('Failed to update pending count:', error);
      setPendingCount(0);
    }
  };

  const syncData = async () => {
    if (!isOnline || isSyncing) return;

    setIsSyncing(true);
    let conflictsDetected = 0;
    
    try {
      // Sync prayer logs
      const unsyncedPrayers = await offlineStorage.getUnsyncedPrayerLogs();
      
      for (const prayer of (unsyncedPrayers || [])) {
        try {
          await SDK.entities.PrayerLog.create({
            prayer_name: prayer.prayer_name,
            date: prayer.date,
            status: prayer.status,
            prayed_on_time: prayer.prayed_on_time
          });
          
          await offlineStorage.put('prayerLogs', { ...prayer, synced: true });
        } catch (error) {
          console.error('Failed to sync prayer:', error);
        }
      }

      // Sync queued actions with conflict detection
      let syncQueue = [];
      try {
        syncQueue = await offlineStorage.getSyncQueue();
      } catch (error) {
        console.warn('Failed to load sync queue:', error);
      }
      
      for (const item of (syncQueue || [])) {
        try {
          if (item.action === 'create') {
            await SDK.entities[item.entity].create(item.data);
          } else if (item.action === 'update') {
            // Check for conflicts on updates
            try {
              const serverData = await SDK.entities[item.entity].list();
              const serverItem = serverData.find(s => s.id === item.data.id);
              
              if (serverItem && serverItem.updated_date) {
                const serverUpdateTime = new Date(serverItem.updated_date).getTime();
                const localUpdateTime = item.data.offline_updated_at || item.timestamp;
                
                // Conflict detected if server was updated after local change started
                if (serverUpdateTime > localUpdateTime) {
                  try {
                    await offlineStorage.addConflict(
                      item.entity,
                      item.data.id,
                      item.data,
                      serverItem
                    );
                    conflictsDetected++;
                    continue;
                  } catch (conflictError) {
                    console.warn('Failed to add conflict:', conflictError);
                  }
                }
              }
              
              await SDK.entities[item.entity].update(item.data.id, item.data);
            } catch (updateError) {
              console.error('Update failed:', updateError);
              continue;
            }
          } else if (item.action === 'delete') {
            try {
              await SDK.entities[item.entity].delete(item.data.id);
            } catch (deleteError) {
              // Item might already be deleted on server
              if (!deleteError.message?.includes('not found')) {
                throw deleteError;
              }
            }
          }
          
          try {
            await offlineStorage.delete('syncQueue', item.id);
          } catch (delError) {
            console.warn('Failed to delete from queue:', delError);
          }
        } catch (error) {
          console.error('Failed to sync item:', error);
        }
      }

      // Refresh cached data
      try {
        const [events, tasks] = await Promise.all([
          SDK.entities.Event.list(),
          SDK.entities.Task.list()
        ]);
        
        await Promise.all([
          offlineStorage.cacheEvents(events),
          offlineStorage.cacheTasks(tasks)
        ]);
      } catch (cacheError) {
        console.error('Failed to refresh cache:', cacheError);
      }

      queryClient.invalidateQueries();
      await updatePendingCount();
      
      if (conflictsDetected > 0) {
        toast.warning(`Synced with ${conflictsDetected} conflict${conflictsDetected > 1 ? 's' : ''} detected. Review conflicts.`);
      } else {
        toast.success('All changes synced successfully');
      }
    } catch (error) {
      console.error('Sync failed:', error);
      toast.error('Some changes failed to sync');
    } finally {
      setIsSyncing(false);
    }
  };

  if (pendingCount === 0 && isOnline) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-20 right-4 z-40"
      >
        <div className={`px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 ${
          isOnline 
            ? 'bg-white border border-slate-200' 
            : 'bg-amber-50 border border-amber-300'
        }`}>
          {isSyncing ? (
            <>
              <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
              <span className="text-sm font-medium text-slate-700">Syncing...</span>
            </>
          ) : isOnline && pendingCount > 0 ? (
            <>
              <Wifi className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-slate-700">
                {pendingCount} change{pendingCount !== 1 ? 's' : ''} pending
              </span>
              <button
                onClick={syncData}
                className="ml-2 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded"
              >
                Sync Now
              </button>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800">
                Offline • {pendingCount} pending
              </span>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}