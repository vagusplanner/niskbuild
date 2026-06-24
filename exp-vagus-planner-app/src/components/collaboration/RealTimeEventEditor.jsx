import React, { useState, useEffect } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Lock, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function RealTimeEventEditor({ eventId, children }) {
  const [activeEditors, setActiveEditors] = useState([]);
  const [isLocked, setIsLocked] = useState(false);
  const [lockedBy, setLockedBy] = useState(null);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => SDK.auth.me()
  });

  // Monitor event changes in real-time
  useEffect(() => {
    if (!eventId) return;

    const unsubscribe = SDK.entities.Event.subscribe((event) => {
      if (event.id === eventId && event.type === 'update') {
        queryClient.invalidateQueries({ queryKey: ['events'] });
      }
    });

    return unsubscribe;
  }, [eventId, queryClient]);

  // Monitor who's editing
  useEffect(() => {
    if (!eventId) return;

    const unsubscribe = SDK.entities.EventLock.subscribe((event) => {
      if (event.data?.event_id === eventId) {
        if (event.type === 'create') {
          setActiveEditors(prev => {
            const exists = prev.find(e => e === event.data.locked_by);
            return exists ? prev : [...prev, event.data.locked_by];
          });
          if (event.data.locked_by !== currentUser?.email) {
            setIsLocked(true);
            setLockedBy(event.data.locked_by);
          }
        } else if (event.type === 'delete') {
          setActiveEditors(prev => prev.filter(e => e !== event.data.locked_by));
          if (event.data.locked_by === lockedBy) {
            setIsLocked(false);
            setLockedBy(null);
          }
        }
      }
    });

    return unsubscribe;
  }, [eventId, currentUser, lockedBy]);

  // Fetch existing locks
  const { data: locks = [] } = useQuery({
    queryKey: ['eventLocks', eventId],
    queryFn: () => SDK.entities.EventLock.filter({ event_id: eventId }),
    enabled: !!eventId,
    refetchInterval: 10000
  });

  useEffect(() => {
    if (locks.length > 0) {
      const editors = locks.map(l => l.locked_by);
      setActiveEditors(editors);
      const otherLock = locks.find(l => l.locked_by !== currentUser?.email);
      if (otherLock) {
        setIsLocked(true);
        setLockedBy(otherLock.locked_by);
      }
    }
  }, [locks, currentUser]);

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

      {isLocked && lockedBy !== currentUser?.email && (
        <Alert className="border-amber-200 bg-amber-50">
          <Lock className="w-4 h-4 text-amber-600" />
          <AlertDescription className="text-sm text-amber-800">
            {lockedBy.split('@')[0]} is currently editing this event. Your changes may conflict.
          </AlertDescription>
        </Alert>
      )}

      {children}
    </div>
  );
}