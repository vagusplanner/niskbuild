/**
 * GoogleCalendarSyncPanel — UI control panel for two-way Google Calendar sync.
 * Shows sync status, last sync time, allows manual full sync trigger,
 * and exposes a "Push to Google" button on any event.
 */
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import {
  RefreshCw, CheckCircle2, AlertCircle, Calendar, ArrowLeftRight,
  Loader2, Clock, Cloud, Smartphone
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

export default function GoogleCalendarSyncPanel() {
  const [syncing, setSyncing] = useState(false);
  const queryClient = useQueryClient();

  const { data: syncStates = [] } = useQuery({
    queryKey: ['syncState'],
    queryFn: () => base44.entities.SyncState.filter({ service: 'googlecalendar' }),
    refetchInterval: 30000,
  });

  const { data: gcalEvents = [] } = useQuery({
    queryKey: ['gcal-events-count'],
    queryFn: () => base44.entities.Event.filter({ source: 'google_calendar' }, '-start_date', 5),
    staleTime: 30000,
  });

  const syncState = syncStates[0];
  const lastSynced = syncState?.last_synced_at;

  const handleFullSync = async () => {
    setSyncing(true);
    try {
      const res = await base44.functions.invoke('initialGCalSync', {});
      const { created, updated, total } = res.data || {};
      toast.success(`Sync complete! ${created} new, ${updated} updated (${total} total events)`);
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['syncState'] });
      queryClient.invalidateQueries({ queryKey: ['gcal-events-count'] });
    } catch (e) {
      toast.error('Sync failed. Please try again.');
    }
    setSyncing(false);
  };

  return (
    <Card className="border-blue-100 dark:border-blue-900 overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/40">
            <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Google Calendar Sync</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Two-way · Real-time via webhook</p>
          </div>
          <Badge className="bg-green-100 text-green-700 border-green-200">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Connected
          </Badge>
        </div>

        {/* How it works */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 p-3 text-center">
            <Cloud className="w-5 h-5 text-blue-500 mx-auto mb-1" />
            <p className="text-xs font-bold text-blue-700 dark:text-blue-300">Google → App</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Real-time via webhook</p>
          </div>
          <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900 p-3 text-center">
            <Smartphone className="w-5 h-5 text-indigo-500 mx-auto mb-1" />
            <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300">App → Google</p>
            <p className="text-[10px] text-slate-500 mt-0.5">On save via sync button</p>
          </div>
        </div>

        {/* Last sync */}
        <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-xl px-3 py-2">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>
              {lastSynced
                ? `Last synced ${formatDistanceToNow(new Date(lastSynced), { addSuffix: true })}`
                : 'Never synced — run initial sync below'}
            </span>
          </div>
          {syncState?.sync_token && (
            <Badge className="bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-0 text-[9px]">
              incremental ✓
            </Badge>
          )}
        </div>

        {/* Recent GCal events */}
        {gcalEvents.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-1.5">Recently synced from Google</p>
            <div className="space-y-1">
              {gcalEvents.map(e => (
                <div key={e.id} className="flex items-center gap-2 text-xs bg-blue-50/60 dark:bg-blue-950/20 rounded-lg px-2.5 py-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                  <span className="flex-1 truncate text-slate-700 dark:text-slate-300 font-medium">{e.title}</span>
                  <span className="text-slate-400 flex-shrink-0">{e.start_date ? new Date(e.start_date).toLocaleDateString() : ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Manual full sync */}
        <Button
          onClick={handleFullSync}
          disabled={syncing}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          {syncing
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Syncing…</>
            : <><RefreshCw className="w-4 h-4 mr-2" /> Pull from Google Calendar</>
          }
        </Button>
        <p className="text-[10px] text-slate-400 text-center">
          Pulls your events from Google Calendar into Vagus Planner (past 30 days + next 90 days).<br />
          Events you create here are pushed to Google when you click the sync icon on each event.
        </p>
      </CardContent>
    </Card>
  );
}