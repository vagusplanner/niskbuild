import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Watch, Activity, Wifi, WifiOff, RefreshCw, 
  CheckCircle, AlertCircle, Loader2, Link as LinkIcon,
  Heart, Footprints, Moon
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const DEVICES = [
  {
    id: 'apple_watch',
    name: 'Apple Watch',
    icon: Watch,
    color: 'from-gray-700 to-black',
    description: 'Sync workouts, heart rate, sleep, and activity'
  },
  {
    id: 'fitbit',
    name: 'Fitbit',
    icon: Activity,
    color: 'from-teal-500 to-cyan-600',
    description: 'Track steps, exercises, sleep, and heart rate'
  },
  {
    id: 'garmin',
    name: 'Garmin',
    icon: Watch,
    color: 'from-blue-600 to-indigo-700',
    description: 'Import advanced workout metrics and health data'
  }
];

export default function WearableDeviceManager() {
  const [syncing, setSyncing] = useState(null);
  const queryClient = useQueryClient();

  const { data: settings = [] } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => base44.entities.UserSettings.list()
  });

  const userSettings = settings[0] || {};

  const syncDevice = async (deviceType) => {
    setSyncing(deviceType);
    
    try {
      const response = await base44.functions.invoke('syncWearableData', {
        device_type: deviceType,
        auth_token: 'mock_token' // In production, use real OAuth token
      });

      if (response.data?.success) {
        toast.success(response.data.message || `${deviceType} synced successfully!`);
        queryClient.invalidateQueries({ queryKey: ['userSettings'] });
        queryClient.invalidateQueries({ queryKey: ['exercises'] });
        queryClient.invalidateQueries({ queryKey: ['sleep'] });
      } else {
        toast.error('Sync failed');
      }
    } catch (error) {
      toast.error(`Failed to sync ${deviceType}`);
      console.error(error);
    } finally {
      setSyncing(null);
    }
  };

  const getLastSync = (deviceType) => {
    const syncKey = `last_${deviceType}_sync`;
    const lastSync = userSettings[syncKey];
    
    if (!lastSync) return null;
    
    const syncDate = new Date(lastSync);
    const now = new Date();
    const diffMs = now - syncDate;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  const isConnected = (deviceType) => {
    return !!userSettings[`last_${deviceType}_sync`];
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Watch className="w-5 h-5 text-teal-600" />
            Connected Devices
          </CardTitle>
          <CardDescription>
            Automatically import health data from your wearable devices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {DEVICES.map((device) => {
              const Icon = device.icon;
              const connected = isConnected(device.id);
              const lastSync = getLastSync(device.id);
              const isSyncing = syncing === device.id;

              return (
                <motion.div
                  key={device.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "p-4 rounded-lg border transition-all",
                    connected 
                      ? "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800" 
                      : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={cn(
                        "p-2 rounded-lg bg-gradient-to-br shadow-lg",
                        device.color
                      )}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                            {device.name}
                          </h3>
                          {connected ? (
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs">
                              <Wifi className="w-3 h-3 mr-1" />
                              Connected
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              <WifiOff className="w-3 h-3 mr-1" />
                              Not Connected
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                          {device.description}
                        </p>
                        {connected && lastSync && (
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-green-600" />
                            Last synced {lastSync}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {connected ? (
                        <Button
                          size="sm"
                          onClick={() => syncDevice(device.id)}
                          disabled={isSyncing}
                          className="gap-2"
                        >
                          {isSyncing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                          Sync Now
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => syncDevice(device.id)}
                          disabled={isSyncing}
                          variant="outline"
                          className="gap-2"
                        >
                          {isSyncing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <LinkIcon className="w-4 h-4" />
                          )}
                          Connect
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-sm">What Gets Synced?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <Activity className="w-4 h-4 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium">Workouts</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Activity type, duration, intensity, calories
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Moon className="w-4 h-4 text-purple-600 mt-0.5" />
              <div>
                <p className="font-medium">Sleep</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Duration, quality, sleep stages
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Heart className="w-4 h-4 text-rose-600 mt-0.5" />
              <div>
                <p className="font-medium">Heart Rate</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Resting rate, workout averages
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-900 dark:text-amber-100 mb-1">
                Automatic Sync Coming Soon
              </p>
              <p className="text-amber-700 dark:text-amber-300">
                Currently, you need to manually sync. Automatic background sync will be available in the next update.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}