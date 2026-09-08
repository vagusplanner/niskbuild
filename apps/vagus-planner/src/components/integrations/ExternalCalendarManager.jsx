import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44, getVpApiFetchHeaders } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Cloud,
  Link as LinkIcon,
  Loader2,
  RefreshCw,
  Trash2,
  Unplug,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { createPageUrl } from '@/utils';

function apiBase() {
  return (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
}

function errorMessage(err, fallback) {
  if (!err) return fallback;
  if (typeof err === 'string' && err.trim()) return err;
  if (typeof err?.message === 'string' && err.message.trim()) return err.message;
  return fallback;
}

async function fetchGoogleCalendarStatus() {
  const res = await fetch(`${apiBase()}/api/vagus-planner/google-calendar/status`, {
    credentials: 'include',
    headers: await getVpApiFetchHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data.error === 'string' && data.error
        ? data.error
        : `Google Calendar status failed (HTTP ${res.status})`
    );
  }
  return data;
}

/**
 * Single Google Calendar integrations card (v1 one-way pull).
 * Replaces the previous dual layout (SyncPanel + Connected Calendars).
 */
export default function ExternalCalendarManager() {
  const queryClient = useQueryClient();
  const [consentOpen, setConsentOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [pulling, setPulling] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => base44.entities.UserSettings.list(),
  });
  const userSettings = settings?.[0];

  const {
    data: gcalStatus,
    isLoading: statusLoading,
    error: statusError,
    isError: statusIsError,
  } = useQuery({
    queryKey: ['googleCalendarStatus'],
    queryFn: fetchGoogleCalendarStatus,
    staleTime: 15_000,
    retry: 1,
  });

  const connected = gcalStatus?.connected === true;
  const configured = gcalStatus?.configured === true;

  const { data: gcalEvents = [] } = useQuery({
    queryKey: ['gcal-events-count'],
    queryFn: () =>
      base44.entities.Event.filter({ source: 'google_calendar' }, '-start_date', 5),
    staleTime: 30_000,
    enabled: connected,
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const flag = params.get('google_calendar');
    if (!flag) return;
    if (flag === 'connected') {
      toast.success('Google Calendar connected');
      queryClient.invalidateQueries({ queryKey: ['googleCalendarStatus'] });
      queryClient.invalidateQueries({ queryKey: ['userSettings'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['gcal-events-count'] });
      queryClient.invalidateQueries({ queryKey: ['syncState'] });
    } else if (flag === 'denied') {
      toast.error('Google Calendar access was denied');
    } else {
      toast.error(`Google Calendar connection failed (${flag})`);
    }
    params.delete('google_calendar');
    const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}`;
    window.history.replaceState({}, '', next);
  }, [queryClient]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates) => {
      if (!userSettings?.id) return;
      await base44.entities.UserSettings.update(userSettings.id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userSettings'] });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${apiBase()}/api/vagus-planner/google-calendar/disconnect`, {
        method: 'POST',
        credentials: 'include',
        headers: await getVpApiFetchHeaders(),
        body: JSON.stringify({ deleteEvents: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string' && data.error
            ? data.error
            : `Disconnect failed (HTTP ${res.status})`
        );
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userSettings'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['googleCalendarStatus'] });
      queryClient.invalidateQueries({ queryKey: ['syncState'] });
      queryClient.invalidateQueries({ queryKey: ['gcal-events-count'] });
      toast.success('Google Calendar disconnected');
    },
    onError: (err) => {
      toast.error(errorMessage(err, 'Failed to disconnect Google Calendar'));
    },
  });

  const handleConnectGoogle = async () => {
    if (statusIsError) {
      toast.error(
        errorMessage(
          statusError,
          'Cannot reach Google Calendar status API — is the NiskBuild server running?'
        )
      );
      return;
    }
    if (!configured) {
      toast.error(
        'Google Calendar OAuth is not configured on the server yet (set GOOGLE_CALENDAR_CLIENT_ID and GOOGLE_CALENDAR_CLIENT_SECRET, then restart).'
      );
      return;
    }
    setConnecting(true);
    try {
      const returnTo = `${window.location.origin}${createPageUrl('Account')}`;
      const res = await fetch(
        `${apiBase()}/api/vagus-planner/google-calendar/connect?return_to=${encodeURIComponent(returnTo)}`,
        {
          credentials: 'include',
          headers: {
            ...(await getVpApiFetchHeaders()),
            Accept: 'application/json',
          },
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.authorizeUrl) {
        if (data.oauthDebug) {
          console.error('[google-calendar] connect failed — oauthDebug', data.oauthDebug);
        }
        throw new Error(
          typeof data.error === 'string' && data.error
            ? data.error
            : typeof data.code === 'string'
              ? data.code
              : `Failed to start Google authorization (HTTP ${res.status})`
        );
      }
      // Log exact redirect_uri + redacted auth URL before leaving the app
      // (Google's generic "Un problème est survenu" often means redirect_uri_mismatch).
      if (data.oauthDebug) {
        console.info('[google-calendar] launching OAuth', data.oauthDebug);
      } else {
        try {
          const u = new URL(data.authorizeUrl);
          console.info('[google-calendar] launching OAuth', {
            redirect_uri: u.searchParams.get('redirect_uri'),
            client_id_suffix: (u.searchParams.get('client_id') || '').slice(-6),
            scope: u.searchParams.get('scope'),
            response_type: u.searchParams.get('response_type'),
            access_type: u.searchParams.get('access_type'),
            prompt: u.searchParams.get('prompt'),
            state_length: (u.searchParams.get('state') || '').length,
          });
        } catch {
          /* ignore */
        }
      }
      window.location.href = data.authorizeUrl;
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to connect Google Calendar'));
      setConnecting(false);
    }
  };

  const handlePull = async (mode = 'full') => {
    if (!connected) {
      toast.error('Connect Google Calendar first');
      return;
    }
    setPulling(true);
    try {
      const fn = mode === 'incremental' ? 'syncGoogleCalendar' : 'initialGCalSync';
      const res = await base44.functions.invoke(fn, {
        calendarId: 'primary',
        mode,
      });
      const data = res?.data || {};
      toast.success(
        `Pulled from Google: ${data.created ?? 0} new, ${data.updated ?? 0} updated (${data.total ?? data.imported ?? 0} from Google)`
      );
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['gcal-events-count'] });
      queryClient.invalidateQueries({ queryKey: ['syncState'] });
      queryClient.invalidateQueries({ queryKey: ['googleCalendarStatus'] });
      queryClient.invalidateQueries({ queryKey: ['userSettings'] });
    } catch (err) {
      toast.error(errorMessage(err, 'Google Calendar pull failed'));
      queryClient.invalidateQueries({ queryKey: ['googleCalendarStatus'] });
    } finally {
      setPulling(false);
    }
  };

  const handleToggleAutoPull = async () => {
    const isEnabled = userSettings?.google_calendar_sync_enabled;
    await updateSettingsMutation.mutateAsync({
      google_calendar_sync_enabled: !isEnabled,
    });
  };

  const handleDisconnect = async () => {
    if (
      confirm(
        'Disconnect Google Calendar? Synced events imported from Google will be deleted.'
      )
    ) {
      await disconnectMutation.mutateAsync();
    }
  };

  const lastSynced =
    gcalStatus?.lastSyncedAt || userSettings?.google_calendar_last_sync || null;

  return (
    <div className="space-y-4">
      <Card className="border-cyan-200/50 dark:border-cyan-800/50 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500" />
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-cyan-600" />
                Calendar integrations
              </CardTitle>
              <CardDescription className="mt-1">
                One-way pull from Google Calendar into Vagus Planner (read-only). No
                webhooks or write-back in v1.
              </CardDescription>
            </div>
            {statusLoading ? (
              <Badge className="bg-slate-100 text-slate-600 border-slate-200">Checking…</Badge>
            ) : connected ? (
              <Badge className="bg-green-100 text-green-700 border-green-200">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Connected
              </Badge>
            ) : (
              <Badge className="bg-slate-100 text-slate-600 border-slate-200">
                <Unplug className="w-3 h-3 mr-1" /> Not connected
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {statusIsError && (
            <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800 dark:text-amber-200">
                <p className="font-medium mb-1">Cannot reach Google Calendar API</p>
                <p className="text-xs">
                  {errorMessage(
                    statusError,
                    'Status request failed. For local dev, start NiskBuild on :3000 (Vite proxies /api there).'
                  )}
                </p>
              </div>
            </div>
          )}

          {!statusIsError && !statusLoading && !configured && (
            <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800 dark:text-amber-200">
                <p className="font-medium mb-1">OAuth not configured on server</p>
                <p className="text-xs">
                  Set <code className="text-[11px]">GOOGLE_CALENDAR_CLIENT_ID</code> and{' '}
                  <code className="text-[11px]">GOOGLE_CALENDAR_CLIENT_SECRET</code>, register
                  the redirect URI, run the SQL migration, then restart the API.
                </p>
              </div>
            </div>
          )}

          {/* Google */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-medium flex items-center gap-2">
                  <span className="text-red-500">📅</span>
                  Google Calendar
                </h3>
                {connected ? (
                  <p className="text-xs text-slate-500 mt-1 truncate">
                    {gcalStatus?.googleAccountEmail
                      ? `${gcalStatus.googleAccountEmail} · `
                      : ''}
                    Primary calendar · read-only pull
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 mt-1">
                    Imports events from your primary Google Calendar
                  </p>
                )}
              </div>

              <div className="flex gap-2 flex-shrink-0">
                {!connected ? (
                  <Button
                    onClick={() => setConsentOpen(true)}
                    size="sm"
                    className="bg-cyan-600 hover:bg-cyan-700"
                    disabled={connecting || statusLoading || !configured || statusIsError}
                  >
                    <LinkIcon className="w-4 h-4 mr-1" />
                    {connecting ? 'Connecting…' : 'Connect'}
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={() => handlePull('incremental')}
                      size="sm"
                      variant="outline"
                      disabled={pulling}
                      title="Incremental pull"
                    >
                      <RefreshCw className={`w-4 h-4 ${pulling ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button
                      onClick={handleToggleAutoPull}
                      size="sm"
                      variant={
                        userSettings?.google_calendar_sync_enabled ? 'default' : 'outline'
                      }
                      title="Auto-pull when visiting Calendar"
                    >
                      {userSettings?.google_calendar_sync_enabled ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      onClick={handleDisconnect}
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700"
                      disabled={disconnectMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 p-3 text-center">
              <Cloud className="w-5 h-5 text-blue-500 mx-auto mb-1" />
              <p className="text-xs font-bold text-blue-700 dark:text-blue-300">
                Google → Vagus Planner
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Manual pull, or auto-pull when you open Calendar (if enabled)
              </p>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-xl px-3 py-2">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {lastSynced
                    ? `Last synced ${formatDistanceToNow(new Date(lastSynced), { addSuffix: true })}`
                    : connected
                      ? 'Never synced — pull below'
                      : 'Connect to enable sync'}
                </span>
              </div>
              {gcalStatus?.hasSyncToken && (
                <Badge className="bg-slate-100 dark:bg-slate-700 text-slate-500 border-0 text-[9px]">
                  incremental ✓
                </Badge>
              )}
            </div>

            {connected && gcalEvents.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-1.5">
                  Recently synced from Google
                </p>
                <div className="space-y-1">
                  {gcalEvents.map((e) => (
                    <div
                      key={e.id}
                      className="flex items-center gap-2 text-xs bg-blue-50/60 dark:bg-blue-950/20 rounded-lg px-2.5 py-1.5"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                      <span className="flex-1 truncate text-slate-700 dark:text-slate-300 font-medium">
                        {e.title}
                      </span>
                      <span className="text-slate-400 flex-shrink-0">
                        {e.start_date ? new Date(e.start_date).toLocaleDateString() : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              onClick={() => handlePull('full')}
              disabled={pulling || !connected}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {pulling ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Syncing…
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" /> Pull from Google Calendar
                </>
              )}
            </Button>
            <p className="text-[10px] text-slate-400 text-center">
              Full pull: past 30 days + next 90 days. Write-back / webhooks are not available
              yet.
            </p>
          </div>

          {/* Outlook — planned, keep visible */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700 opacity-60">
            <div className="flex-1">
              <h3 className="font-medium flex items-center gap-2">
                <span>📧</span>
                Outlook Calendar
                <Badge className="bg-slate-100 text-slate-700 ml-2">Coming Soon</Badge>
              </h3>
              <p className="text-xs text-slate-500 mt-1">Microsoft 365 calendar import (planned)</p>
            </div>
            <Button size="sm" disabled className="text-slate-400">
              Connect
            </Button>
          </div>
        </CardContent>
      </Card>

      {consentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="max-w-md w-full shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg">Connect Google Calendar</CardTitle>
              <CardDescription>
                Connecting Google Calendar imports events from your primary calendar into
                Vagus Planner. You can disconnect at any time.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="text-sm text-slate-600 dark:text-slate-300 list-disc pl-5 space-y-1">
                <li>Read-only access to your primary Google Calendar</li>
                <li>
                  Event titles, times, locations, and descriptions are stored in your account
                </li>
                <li>
                  Calendar data is not sent to AI unless you use an AI feature that reads your
                  events
                </li>
              </ul>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setConsentOpen(false)}
                  disabled={connecting}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-cyan-600 hover:bg-cyan-700"
                  onClick={() => {
                    setConsentOpen(false);
                    handleConnectGoogle();
                  }}
                  disabled={connecting}
                >
                  Continue to Google
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
