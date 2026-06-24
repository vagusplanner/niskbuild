import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CalendarDays, X, Check } from 'lucide-react';
import { toast } from 'sonner';

const ISLAMIC_EVENTS = [
  { name: 'Ramadan', month: 9, icon: '🌙', color: 'bg-purple-50 border-purple-200' },
  { name: 'Eid al-Fitr', month: 10, day: 1, icon: '🎉', color: 'bg-green-50 border-green-200' },
  { name: 'Hajj', month: 12, day: 8, icon: '🕋️', color: 'bg-amber-50 border-amber-200' },
  { name: 'Eid al-Adha', month: 12, day: 10, icon: '🐑', color: 'bg-orange-50 border-orange-200' },
  { name: 'Islamic New Year', month: 1, day: 1, icon: '📅', color: 'bg-blue-50 border-blue-200' },
];

export default function IslamicEventsNotificationPanel() {
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  // Fetch current Hijri date
  useEffect(() => {
    const fetchHijriDate = async () => {
      try {
        const response = await fetch('https://api.aladhan.com/v1/today');
        const data = await response.json();
        const hijri = data.data.hijri;
        
        // Calculate upcoming Islamic events
        const upcoming = ISLAMIC_EVENTS.filter(event => {
          if (event.month === hijri.month.number) {
            return !event.day || event.day >= hijri.day;
          }
          return event.month > hijri.month.number;
        }).slice(0, 3);

        setUpcomingEvents(upcoming);
      } catch (error) {
        console.error('Error fetching Hijri date:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHijriDate();
  }, []);

  const { data: notifications = [] } = useQuery({
    queryKey: ['islamic-event-notifications'],
    queryFn: () => base44.entities.Notification.filter({ type: 'islamic_event' }, '-scheduled_time', 10)
  });

  const dismissNotificationMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { dismissed: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['islamic-event-notifications'] });
      toast.success('Notification dismissed');
    }
  });

  const toggleNotificationMutation = useMutation({
    mutationFn: async (event) => {
      await base44.entities.Notification.create({
        type: 'islamic_event',
        title: `${event.icon} ${event.name}`,
        message: `Reminder: ${event.name} is coming up`,
        priority: 'high',
        icon: event.icon,
        scheduled_time: new Date().toISOString(),
        sound_enabled: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['islamic-event-notifications'] });
      toast.success('Notification enabled for this event');
    }
  });

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-purple-600" />
            Islamic Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-slate-500">Loading Islamic calendar...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-purple-600" />
            Upcoming Islamic Events
          </CardTitle>
          <Badge variant="outline" className="bg-white">
            {upcomingEvents.length} upcoming
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <AnimatePresence>
          {upcomingEvents.length > 0 ? (
            upcomingEvents.map((event, idx) => (
              <motion.div
                key={event.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ delay: idx * 0.1 }}
                className={`p-3 rounded-lg border ${event.color} flex items-center justify-between`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{event.icon}</span>
                  <div>
                    <p className="font-semibold text-slate-800">{event.name}</p>
                    <p className="text-xs text-slate-600">Hijri month {event.month}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => toggleNotificationMutation.mutate(event)}
                  className="text-xs"
                >
                  <Bell className="w-4 h-4" />
                </Button>
              </motion.div>
            ))
          ) : (
            <div className="py-4 text-center">
              <p className="text-sm text-slate-600">No upcoming events</p>
            </div>
          )}
        </AnimatePresence>

        {/* Recent Notifications */}
        {notifications.length > 0 && (
          <div className="mt-4 pt-4 border-t border-purple-200">
            <p className="text-xs font-semibold text-slate-700 mb-2">Recent Notifications</p>
            <AnimatePresence>
              {notifications.slice(0, 2).map((notif) => (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-between gap-2 p-2 bg-white/50 rounded-lg mb-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-700 truncate">{notif.title}</p>
                    <p className="text-xs text-slate-500">{notif.message}</p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 flex-shrink-0"
                    onClick={() => dismissNotificationMutation.mutate(notif.id)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
}