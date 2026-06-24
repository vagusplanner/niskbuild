/**
 * Travel-Aware Scheduling Alert — Priority #2 Standard Edition.
 * Detects upcoming trips and warns about scheduling conflicts:
 * - Early morning meetings after late flights
 * - Jet lag recovery days
 * - Meetings during travel dates
 * Unique: only possible because Vagus has Travel + Calendar in one app.
 */
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Plane, AlertTriangle, Check, X } from 'lucide-react';
import { format, addDays, differenceInHours, parseISO } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';

export default function TravelAwareAlert() {
  const [dismissed, setDismissed] = useState(false);

  const { data: holidays = [] } = useQuery({
    queryKey: ['holidays'],
    queryFn: () => base44.entities.Holiday.filter({ status: { $in: ['booked', 'in_progress', 'planned'] } }),
    staleTime: 60000,
  });
  const { data: events = [] } = useQuery({
    queryKey: ['upcomingEvents'],
    queryFn: () => {
      const today = new Date().toISOString().split('T')[0];
      const next14 = addDays(new Date(), 14).toISOString().split('T')[0];
      return base44.entities.Event.filter({ start_date: { $gte: `${today}T00:00:00Z`, $lte: `${next14}T23:59:59Z` } });
    },
    staleTime: 30000,
  });

  const alerts = React.useMemo(() => {
    const now = new Date();
    const results = [];

    holidays.forEach(trip => {
      if (!trip.start_date || !trip.end_date) return;
      const tripStart = new Date(trip.start_date);
      const tripEnd = new Date(trip.end_date);
      const returnDay = addDays(tripEnd, 1);

      // Only care about upcoming/current trips
      if (tripEnd < now) return;

      // Check for events scheduled during travel
      const duringTravel = events.filter(e => {
        const eDate = new Date(e.start_date);
        return eDate >= tripStart && eDate <= tripEnd && e.category === 'work';
      });

      if (duringTravel.length > 0) {
        results.push({
          type: 'conflict',
          trip: trip.title,
          dest: trip.destination,
          message: `${duringTravel.length} work event${duringTravel.length > 1 ? 's' : ''} scheduled during your trip to ${trip.destination || trip.title}`,
          events: duringTravel.slice(0, 2).map(e => e.title),
        });
      }

      // Check for early meetings on return day
      const returnMeetings = events.filter(e => {
        const eDate = new Date(e.start_date);
        const eDay = eDate.toISOString().split('T')[0];
        const retDay = returnDay.toISOString().split('T')[0];
        return eDay === retDay && eDate.getHours() < 10;
      });

      if (returnMeetings.length > 0) {
        results.push({
          type: 'jetlag',
          trip: trip.title,
          dest: trip.destination,
          message: `Early meeting on your return day from ${trip.destination || trip.title} — consider rescheduling`,
          events: returnMeetings.slice(0, 1).map(e => e.title),
        });
      }
    });

    return results;
  }, [holidays, events]);

  if (alerts.length === 0 || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
        <Card className="border border-amber-200 dark:border-amber-900/50 bg-gradient-to-br from-amber-50 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/20">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex-shrink-0 mt-0.5">
                  <Plane className="w-4 h-4 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Travel Scheduling Alert
                  </p>
                  <div className="mt-1.5 space-y-2">
                    {alerts.map((alert, i) => (
                      <div key={i}>
                        <p className="text-xs text-amber-700 dark:text-amber-400">{alert.message}</p>
                        {alert.events.length > 0 && (
                          <p className="text-[10px] text-amber-600/70 dark:text-amber-500/70 mt-0.5">
                            Affected: {alert.events.join(', ')}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <button onClick={() => setDismissed(true)} className="p-1 text-amber-400 hover:text-amber-600 transition-colors flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}