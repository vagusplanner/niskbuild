import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SDK } from '@/lib/custom-sdk.js';
import { offlineStorage } from '@/components/utils/offlineStorageService';
import { Download, Trash2, RefreshCw, Wifi, WifiOff, HardDrive, CheckCircle2, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function OfflineContentManager() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [loading, setLoading] = useState(false);
  const [storageInfo, setStorageInfo] = useState(null);
  const [selectedContent, setSelectedContent] = useState({
    itineraries: true,
    ritualGuides: true,
    prayerTimes: true,
    concierge: true
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    loadStorageInfo();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadStorageInfo = async () => {
    const info = await offlineStorage.getStorageInfo();
    setStorageInfo(info);
  };

  const handleDownload = async () => {
    setLoading(true);
    try {
      const contentTypes = Object.keys(selectedContent).filter(k => selectedContent[k]);

      const { data } = await SDK.functions.invoke('prepareOfflineContent', {
        content_types: contentTypes
      });

      // Save to IndexedDB
      for (const [type, content] of Object.entries(data.content)) {
        if (type === 'itineraries') {
          for (const item of content) {
            await offlineStorage.saveData('itineraries', item);
          }
        } else if (type === 'ritualGuides') {
          await offlineStorage.saveData('ritualGuides', {
            id: 'guides',
            data: content
          });
        } else if (type === 'prayerTimes') {
          await offlineStorage.saveData('prayerTimes', {
            id: 'times',
            data: content
          });
        } else if (type === 'concierge') {
          await offlineStorage.saveData('conciergeInfo', {
            id: 'info',
            data: content
          });
        }
      }

      localStorage.setItem('lastOfflineSync', new Date().toISOString());
      await loadStorageInfo();
      toast.success(`Downloaded ${contentTypes.length} content types for offline access`);
    } catch (error) {
      toast.error('Failed to download offline content');
    } finally {
      setLoading(false);
    }
  };

  const handleClearData = async () => {
    if (!window.confirm('Clear all offline data?')) return;

    setLoading(true);
    try {
      await Promise.all([
        offlineStorage.clearStore('itineraries'),
        offlineStorage.clearStore('ritualGuides'),
        offlineStorage.clearStore('prayerTimes'),
        offlineStorage.clearStore('conciergeInfo')
      ]);

      await loadStorageInfo();
      toast.success('Offline data cleared');
    } catch (error) {
      toast.error('Failed to clear data');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setLoading(true);
    try {
      const syncQueue = await offlineStorage.getSyncQueue();

      if (syncQueue.length === 0) {
        toast.success('Already in sync');
        await loadStorageInfo();
        setLoading(false);
        return;
      }

      // Process sync queue
      for (const item of syncQueue) {
        // Upload any pending changes to server
        try {
          await SDK.functions.invoke('syncOfflineChanges', item);
        } catch (e) {
          console.error('Sync error for item:', e);
        }
      }

      await offlineStorage.clearSyncQueue();
      toast.success(`Synced ${syncQueue.length} items`);
    } catch (error) {
      toast.error('Sync failed');
    } finally {
      await loadStorageInfo();
      setLoading(false);
    }
  };

  const contentOptions = [
    {
      id: 'itineraries',
      label: 'Hajj/Umrah Itineraries',
      description: 'Your pilgrimage plans and schedules',
      icon: '📋'
    },
    {
      id: 'ritualGuides',
      label: 'Ritual Guides & Steps',
      description: 'Step-by-step instructions for all rituals',
      icon: '📖'
    },
    {
      id: 'prayerTimes',
      label: 'Prayer Times (90 days)',
      description: 'Prayer schedules for offline reference',
      icon: '🕌'
    },
    {
      id: 'concierge',
      label: 'Concierge Information',
      description: 'Emergency numbers, facilities, tips',
      icon: '🤖'
    }
  ];

  return (
    <div className="space-y-4">
      {/* Status Bar */}
      <Card className={isOnline ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isOnline ? (
                <>
                  <Wifi className="w-5 h-5 text-emerald-600" />
                  <span className="font-medium text-emerald-900">You're Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-5 h-5 text-amber-600" />
                  <span className="font-medium text-amber-900">You're Offline - Using cached data</span>
                </>
              )}
            </div>
            {isOnline && storageInfo?.pendingSyncItems > 0 && (
              <Button
                size="sm"
                onClick={handleSync}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Sync {storageInfo.pendingSyncItems} items
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Storage Info */}
      {storageInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <HardDrive className="w-4 h-4" />
              Offline Storage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {storageInfo.itineraries > 0 && (
                <div className="bg-blue-50 rounded p-2">
                  <p className="text-xs text-blue-600">Itineraries</p>
                  <p className="text-sm font-semibold text-blue-900">{storageInfo.itineraries}</p>
                </div>
              )}
              {storageInfo.ritualGuides > 0 && (
                <div className="bg-purple-50 rounded p-2">
                  <p className="text-xs text-purple-600">Ritual Guides</p>
                  <p className="text-sm font-semibold text-purple-900">Downloaded</p>
                </div>
              )}
              {storageInfo.prayerTimes > 0 && (
                <div className="bg-emerald-50 rounded p-2">
                  <p className="text-xs text-emerald-600">Prayer Times</p>
                  <p className="text-sm font-semibold text-emerald-900">90 days</p>
                </div>
              )}
              {storageInfo.conciergeInfo > 0 && (
                <div className="bg-amber-50 rounded p-2">
                  <p className="text-xs text-amber-600">Concierge Info</p>
                  <p className="text-sm font-semibold text-amber-900">Downloaded</p>
                </div>
              )}
            </div>

            {storageInfo.lastSyncTime && (
              <p className="text-xs text-slate-600">
                Last synced: {new Date(storageInfo.lastSyncTime).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Download Options */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Download for Offline</CardTitle>
          <CardDescription>Select content to download for offline access</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {contentOptions.map(option => (
              <motion.div
                key={option.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={selectedContent[option.id]}
                  onChange={(e) =>
                    setSelectedContent(prev => ({ ...prev, [option.id]: e.target.checked }))
                  }
                  className="w-4 h-4"
                />
                <div className="flex-1">
                  <p className="font-medium text-slate-900 flex items-center gap-2">
                    <span className="text-lg">{option.icon}</span>
                    {option.label}
                  </p>
                  <p className="text-sm text-slate-600">{option.description}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleDownload}
              disabled={loading || !Object.values(selectedContent).some(v => v)}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Download for Offline
            </Button>

            {storageInfo && (storageInfo.itineraries > 0 || storageInfo.ritualGuides > 0 || storageInfo.prayerTimes > 0 || storageInfo.conciergeInfo > 0) && (
              <Button
                onClick={handleClearData}
                disabled={loading}
                variant="destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Features */}
      <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-base">Offline Access Features</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-slate-700">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>View downloaded itineraries & schedules</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Access ritual guides step-by-step</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Check prayer times without internet</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Emergency contacts & facility info</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Auto-sync when connection restored</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}