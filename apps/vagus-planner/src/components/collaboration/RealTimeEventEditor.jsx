import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Users, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

const STALE_MS = 90_000;

function isFresh(lock) {
  const last = new Date(lock.last_active || lock.created_date || lock.created_at);
  return Date.now() - last.getTime() < STALE_MS;
}

export default function RealTimeEventEditor({ eventId, children, onLockChange }) {
  const [activeEditors, setActiveEditors] = useState([]);
  const [isLocked, setIsLocked] = useState(false);
  const [lockedBy, setLockedBy] = useState(null);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  useEffect(() => {
    if (!eventId) return;

    const unsubscribe = base44.entities.Event.subscribe((event) => {
      if (event.id === eventId && event.type === 'update') {
        queryClient.invalidateQueries({ queryKey: ['events'] });
      }
    });

    return unsubscribe;
  }, [eventId, queryClient]);

  useEffect(() => {
    if (!eventId) return;

    const unsubscribe = base44.entities.EventLock.subscribe((event) => {
      if (event.data?.event_id === eventId) {
        queryClient.invalidateQueries({ queryKey: ['eventLocks', eventId] });
      }
    });

    return unsubscribe;
  }, [eventId, queryClient]);

  const { data: locks = [] } = useQuery({
    queryKey: ['eventLocks', eventId],
    queryFn: () => base44.entities.EventLock.filter({ event_id: eventId }),
    enabled: !!eventId,
    refetchInterval: 10000
  });

  useEffect(() => {
    const fresh = (locks || []).filter(isFresh);
    const editors = fresh.map(l => l.locked_by).filter(Boolean);
    setActiveEditors(editors);
    const otherLock = fresh.find(l => l.locked_by !== currentUser?.email);
    const locked = Boolean(otherLock);
    setIsLocked(locked);
    setLockedBy(otherLock?.locked_by || null);
    onLockChange?.(locked);
  }, [locks, currentUser, onLockChange]);

  useEffect(() => {
    if (!eventId || !currentUser?.email) return;
    let cancelled = false;
    let lockId = null;

    const acquire = async () => {
      try {
        const row = await base44.entities.EventLock.create({
          event_id: eventId,
          locked_by: currentUser.email,
          last_active: new Date().toISOString(),
        });
        if (cancelled) {
          if (row?.id && row.locked_by === currentUser.email) {
            await base44.entities.EventLock.delete(row.id);
          }
          return;
        }
        if (row?.locked_by === currentUser.email) {
          lockId = row?.id ?? null;
        }
        queryClient.invalidateQueries({ queryKey: ['eventLocks', eventId] });
      } catch (err) {
        console.warn('Could not acquire event lock', err);
      }
    };

    acquire();

    const beat = setInterval(() => {
      if (!lockId) return;
      base44.entities.EventLock.update(lockId, {
        last_active: new Date().toISOString(),
        locked_by: currentUser.email,
      }).catch(() => {});
    }, 20000);

    return () => {
      cancelled = true;
      clearInterval(beat);
      if (lockId) {
        base44.entities.EventLock.delete(lockId).catch(() => {});
      }
    };
  }, [eventId, currentUser?.email, queryClient]);

  const otherEditors = activeEditors.filter(e => e !== currentUser?.email);

  return (
    <div className="space-y-2">
      {otherEditors.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Users className="w-4 h-4 text-blue-500" />
          <span className="text-sm text-slate-600">Currently editing:</span>
          {otherEditors.map(editor => (
            <Badge key={editor} variant="outline" className="text-xs bg-blue-50">
              {editor.split('@')[0]}
            </Badge>
          ))}
        </div>
      )}

      {isLocked && lockedBy && lockedBy !== currentUser?.email && (
        <Alert className="border-amber-200 bg-amber-50">
          <Lock className="w-4 h-4 text-amber-600" />
          <AlertDescription className="text-sm text-amber-800">
            {lockedBy.split('@')[0]} is currently editing this event. Fields are locked until they leave.
          </AlertDescription>
        </Alert>
      )}

      {children}
    </div>
  );
}
