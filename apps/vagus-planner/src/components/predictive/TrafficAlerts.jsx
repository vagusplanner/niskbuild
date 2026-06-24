import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, MapPin, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function TrafficAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [userLocation, setUserLocation] = useState(null);

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list()
  });

  useEffect(() => {
    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
      });
    }

    // Check for upcoming events with travel time
    checkTrafficAlerts();
    const interval = setInterval(checkTrafficAlerts, 5 * 60 * 1000); // Check every 5 minutes
    return () => clearInterval(interval);
  }, [events, userLocation]);

  const checkTrafficAlerts = () => {
    const now = new Date();
    const newAlerts = [];

    events.forEach(event => {
      const eventStart = new Date(event.start_date);
      const minutesUntilEvent = (eventStart - now) / 60000;

      // If event is in 15-60 minutes and has a location
      if (minutesUntilEvent > 15 && minutesUntilEvent < 60 && event.location) {
        // Simulate traffic conditions (in production, use real traffic API)
        const hasTraffic = Math.random() > 0.7; // 30% chance of traffic
        const travelTime = hasTraffic ? 25 : 15; // minutes

        if (travelTime > minutesUntilEvent) {
          newAlerts.push({
            id: event.id,
            title: event.title,
            location: event.location,
            eventTime: eventStart,
            currentTime: now,
            travelTime,
            minutesUntilEvent,
            severity: minutesUntilEvent < travelTime ? 'urgent' : 'warning'
          });
        }
      }
    });

    setAlerts(newAlerts);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-red-600 dark:text-red-400" />
            Traffic Alerts
          </CardTitle>
          <CardDescription>Proactive notifications about travel delays</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <AnimatePresence>
            {alerts.length > 0 ? (
              alerts.map(alert => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Alert className={alert.severity === 'urgent' ? 'border-red-500 bg-red-50 dark:bg-red-950' : 'border-amber-500 bg-amber-50 dark:bg-amber-950'}>
                    <AlertTriangle className={alert.severity === 'urgent' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'} />
                    <AlertDescription className={alert.severity === 'urgent' ? 'text-red-800 dark:text-red-100' : 'text-amber-800 dark:text-amber-100'}>
                      <p className="font-medium">{alert.title}</p>
                      <p className="text-sm mt-1">
                        📍 {alert.location}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Leave in {Math.ceil(alert.minutesUntilEvent - alert.travelTime)} min
                        </span>
                        <span className="font-semibold">
                          {alert.travelTime} min travel + buffer
                        </span>
                      </div>
                    </AlertDescription>
                  </Alert>
                </motion.div>
              ))
            ) : (
              <div className="p-4 text-center">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  ✓ No traffic issues detected for upcoming events
                </p>
              </div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}