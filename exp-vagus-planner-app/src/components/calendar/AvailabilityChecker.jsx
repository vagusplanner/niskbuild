import React, { useState, useEffect } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Circle } from 'lucide-react';
import { format, isWithinInterval, parseISO } from 'date-fns';
import { motion } from 'framer-motion';

const STATUS_CONFIG = {
  available: { 
    color: 'bg-green-500', 
    label: 'Available', 
    textColor: 'text-green-700',
    bgColor: 'bg-green-50 dark:bg-green-950'
  },
  busy: { 
    color: 'bg-red-500', 
    label: 'Busy', 
    textColor: 'text-red-700',
    bgColor: 'bg-red-50 dark:bg-red-950'
  },
  away: { 
    color: 'bg-yellow-500', 
    label: 'Away', 
    textColor: 'text-yellow-700',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950'
  },
  in_meeting: { 
    color: 'bg-orange-500', 
    label: 'In Meeting', 
    textColor: 'text-orange-700',
    bgColor: 'bg-orange-50 dark:bg-orange-950'
  },
  do_not_disturb: { 
    color: 'bg-purple-500', 
    label: 'Do Not Disturb', 
    textColor: 'text-purple-700',
    bgColor: 'bg-purple-50 dark:bg-purple-950'
  }
};

export default function AvailabilityChecker({ userEmails, selectedDateTime }) {
  const [availability, setAvailability] = useState({});

  const { data: sharedCalendars = [] } = useQuery({
    queryKey: ['shared-calendars-check', userEmails],
    queryFn: async () => {
      if (!userEmails || userEmails.length === 0) return [];
      const results = await Promise.all(
        userEmails.map(email => 
          SDK.entities.SharedCalendar.filter({ shared_with_email: email })
        )
      );
      return results.flat();
    },
    enabled: userEmails && userEmails.length > 0
  });

  const { data: statuses = [] } = useQuery({
    queryKey: ['availability-statuses', userEmails],
    queryFn: async () => {
      if (!userEmails || userEmails.length === 0) return [];
      const results = await Promise.all(
        userEmails.map(email => 
          SDK.entities.AvailabilityStatus.filter({ user_email: email })
        )
      );
      return results.flat();
    },
    enabled: userEmails && userEmails.length > 0,
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const { data: events = [] } = useQuery({
    queryKey: ['all-events-for-availability'],
    queryFn: () => SDK.entities.Event.list('-start_date', 500),
    enabled: userEmails && userEmails.length > 0
  });

  useEffect(() => {
    if (!userEmails || !selectedDateTime) return;

    const checkAvailability = async () => {
      const results = {};

      for (const email of userEmails) {
        // Get user's status
        const userStatus = statuses.find(s => s.user_email === email);
        
        if (userStatus && !userStatus.auto_detect) {
          // Manual status set
          results[email] = {
            status: userStatus.status,
            message: userStatus.status_message,
            busyUntil: userStatus.busy_until,
            manual: true
          };
          continue;
        }

        // Auto-detect from calendar events
        const userEvents = events.filter(e => {
          // Check if event belongs to this user or their shared calendars
          return e.created_by === email;
        });

        const selectedDate = parseISO(selectedDateTime);
        const busyEvent = userEvents.find(event => {
          try {
            const start = parseISO(event.start_date);
            const end = parseISO(event.end_date);
            return isWithinInterval(selectedDate, { start, end });
          } catch {
            return false;
          }
        });

        if (busyEvent) {
          results[email] = {
            status: 'busy',
            message: `In: ${busyEvent.title}`,
            busyUntil: busyEvent.end_date,
            manual: false
          };
        } else {
          results[email] = {
            status: userStatus?.status || 'available',
            message: userStatus?.status_message,
            manual: false
          };
        }
      }

      setAvailability(results);
    };

    checkAvailability();
  }, [userEmails, selectedDateTime, events, statuses]);

  if (!userEmails || userEmails.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
        Availability Check
      </h3>
      <div className="grid gap-2">
        {userEmails.map((email) => {
          const userAvail = availability[email];
          const statusConfig = userAvail ? STATUS_CONFIG[userAvail.status] : null;

          return (
            <motion.div
              key={email}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className={statusConfig?.bgColor}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="relative">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="bg-teal-100 text-teal-700 text-xs">
                            {email.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {statusConfig && (
                          <Circle 
                            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${statusConfig.color} rounded-full border-2 border-white dark:border-slate-900`}
                            fill="currentColor"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{email}</p>
                        {userAvail?.message && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                            {userAvail.message}
                          </p>
                        )}
                        {userAvail?.busyUntil && (
                          <p className="text-xs text-slate-500">
                            Until {format(parseISO(userAvail.busyUntil), 'h:mm a')}
                          </p>
                        )}
                      </div>
                    </div>
                    {statusConfig ? (
                      <Badge 
                        variant="secondary" 
                        className={`${statusConfig.textColor} text-xs`}
                      >
                        {statusConfig.label}
                      </Badge>
                    ) : (
                      <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}