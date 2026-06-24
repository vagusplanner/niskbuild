import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Calendar, CheckCircle, AlertCircle, Settings, ArrowLeftRight, Upload, Download, Zap } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function ExternalCalendarSync({ onSyncComplete }) {
  const [syncing, setSyncing] = useState(false);
  const [open, setOpen] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [conflictDetection, setConflictDetection] = useState(true);
  const [lastSync, setLastSync] = useState(null);
  const [syncStats, setSyncStats] = useState({ imported: 0, exported: 0 });
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => base44.entities.UserSettings.list()
  });

  useEffect(() => {
    if (settings?.[0]?.auto_sync_external_calendars) {
      setAutoSyncEnabled(true);
    }
  }, [settings]);

  const updateSettingsMutation = useMutation({
    mutationFn: (data) => {
      const settingsId = settings?.[0]?.id;
      if (settingsId) {
        return base44.entities.UserSettings.update(settingsId, data);
      }
      return base44.entities.UserSettings.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['userSettings']);
    }
  });

  const handleSync = async (type, action = 'two_way_sync') => {
    setSyncing(true);
    try {
      if (type === 'google') {
        const response = await base44.functions.invoke('enhancedCalendarSync', {
          action,
          calendar_type: 'google'
        });
        
        setSyncStats({
          imported: response.data.imported || 0,
          exported: response.data.exported || 0
        });
        setLastSync(new Date());
        
        if (action === 'two_way_sync') {
          toast.success(
            `Two-way sync complete! Imported ${response.data.imported || 0}, Exported ${response.data.exported || 0} events`
          );
        } else if (action === 'import') {
          toast.success(`Imported ${response.data.imported || 0} events from Google Calendar`);
        } else if (action === 'export') {
          toast.success(`Exported ${response.data.exported || 0} events to Google Calendar`);
        }
        
        // Run conflict detection after sync
        if (conflictDetection) {
          await detectConflicts();
        }
      } else if (type === 'outlook') {
        toast.info('Outlook Calendar sync coming soon');
      }
      onSyncComplete?.();
      queryClient.invalidateQueries(['events']);
    } catch (error) {
      console.error('Sync error:', error);
      toast.error(`Failed to sync calendar: ${error.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const detectConflicts = async () => {
    try {
      const events = await base44.entities.Event.list();
      let conflictsFound = 0;
      
      for (const event of events.slice(0, 10)) {
        const response = await base44.functions.invoke('detectCrossCalendarConflicts', {
          event_id: event.id
        });
        
        if (response.data.has_conflicts) {
          conflictsFound += response.data.conflicts.length;
        }
      }
      
      if (conflictsFound > 0) {
        toast.warning(`Found ${conflictsFound} potential conflicts across calendars`);
      }
    } catch (error) {
      console.log('Conflict detection skipped:', error.message);
    }
  };

  const toggleAutoSync = async (enabled) => {
    setAutoSyncEnabled(enabled);
    await updateSettingsMutation.mutateAsync({
      auto_sync_external_calendars: enabled
    });
    toast.success(enabled ? 'Auto-sync enabled - syncing every hour' : 'Auto-sync disabled');
  };

  const toggleConflictDetection = async (enabled) => {
    setConflictDetection(enabled);
    await updateSettingsMutation.mutateAsync({
      cross_calendar_conflict_detection: enabled
    });
    toast.success(enabled ? 'Conflict detection enabled' : 'Conflict detection disabled');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Sync Calendars
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sync External Calendars</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Sync Stats */}
          {lastSync && (
            <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-semibold text-green-900 dark:text-green-100">Last Synced</span>
                </div>
                <span className="text-xs text-green-700 dark:text-green-300">
                  {lastSync.toLocaleTimeString()}
                </span>
              </div>
              <div className="flex gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <Download className="w-3 h-3 text-green-600" />
                  <span className="text-green-800 dark:text-green-200">{syncStats.imported} imported</span>
                </div>
                <div className="flex items-center gap-1">
                  <Upload className="w-3 h-3 text-green-600" />
                  <span className="text-green-800 dark:text-green-200">{syncStats.exported} exported</span>
                </div>
              </div>
            </div>
          )}

          {/* Settings */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-blue-600" />
                <div>
                  <Label htmlFor="auto-sync" className="font-semibold text-slate-800 dark:text-slate-100">Auto-sync</Label>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Two-way sync every hour</p>
                </div>
              </div>
              <Switch
                id="auto-sync"
                checked={autoSyncEnabled}
                onCheckedChange={toggleAutoSync}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-amber-600" />
                <div>
                  <Label htmlFor="conflict-detection" className="font-semibold text-slate-800 dark:text-slate-100">Smart Conflict Detection</Label>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Detect overlaps across calendars</p>
                </div>
              </div>
              <Switch
                id="conflict-detection"
                checked={conflictDetection}
                onCheckedChange={toggleConflictDetection}
              />
            </div>
          </div>

          <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100">Google Calendar</h3>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">Connected</Badge>
                    <CheckCircle className="w-3 h-3 text-green-600" />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2 mb-3">
              <Button 
                onClick={() => handleSync('google', 'two_way_sync')} 
                disabled={syncing}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-xs"
              >
                <ArrowLeftRight className="w-3 h-3 mr-1" />
                Both
              </Button>
              <Button 
                onClick={() => handleSync('google', 'import')} 
                disabled={syncing}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                <Download className="w-3 h-3 mr-1" />
                Import
              </Button>
              <Button 
                onClick={() => handleSync('google', 'export')} 
                disabled={syncing}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                <Upload className="w-3 h-3 mr-1" />
                Export
              </Button>
            </div>
            
            {syncing && (
              <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Syncing...</span>
              </div>
            )}
          </div>

          <div className="p-4 border rounded-lg hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Outlook Calendar</h3>
                  <p className="text-xs text-slate-500">Microsoft 365 sync</p>
                </div>
              </div>
              <AlertCircle className="w-5 h-5 text-amber-500" />
            </div>
            <Button 
              onClick={() => handleSync('outlook')}
              disabled={true}
              variant="outline"
              className="w-full"
            >
              Coming Soon
            </Button>
          </div>
        </div>
        
        <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
          <p className="mb-2"><strong>Two-Way Sync:</strong> Automatically keeps both calendars in sync</p>
          <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
            <li>Import: Brings external events into this app</li>
            <li>Export: Sends local events to external calendar</li>
            <li>Conflict detection warns you about overlapping events</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}