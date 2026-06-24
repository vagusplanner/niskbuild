import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const GEOFENCE_RADIUS = 500; // meters

export default function LocationAwareReminders() {
  const [reminders, setReminders] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [location, setLocation] = useState('');
  const [task, setTask] = useState('');
  const [radius, setRadius] = useState(GEOFENCE_RADIUS);
  const [userLocation, setUserLocation] = useState(null);
  const queryClient = useQueryClient();

  // Watch user location
  useEffect(() => {
    let watchId;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });

          // Check geofences
          checkGeofences(reminders, {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => console.error('Location error:', error)
      );
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [reminders]);

  const checkGeofences = (reminderList, currentPos) => {
    reminderList.forEach(reminder => {
      if (!reminder.alerted) {
        const distance = calculateDistance(
          currentPos.lat,
          currentPos.lng,
          reminder.lat,
          reminder.lng
        );

        if (distance < reminder.radius) {
          toast.success(`📍 ${reminder.task} near ${reminder.location}`);
          // Mark as alerted
          setReminders(prev =>
            prev.map(r => r.id === reminder.id ? { ...r, alerted: true } : r)
          );
        }
      }
    });
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleAddReminder = async () => {
    if (!location || !task) {
      toast.error('Please fill in all fields');
      return;
    }

    // In production, use geocoding API to convert location to coordinates
    // For now, use a dummy location
    const newReminder = {
      id: Date.now(),
      location,
      task,
      radius,
      lat: 40.7128 + Math.random() * 0.1,
      lng: -74.0060 + Math.random() * 0.1,
      alerted: false,
      createdAt: new Date()
    };

    setReminders([...reminders, newReminder]);
    setLocation('');
    setTask('');
    setShowForm(false);
    toast.success('Location reminder added');
  };

  const handleDeleteReminder = (id) => {
    setReminders(reminders.filter(r => r.id !== id));
    toast.success('Reminder removed');
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Location-Aware Reminders
          </CardTitle>
          <CardDescription>Get notified when near specific locations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {userLocation && (
            <div className="text-xs text-slate-600 dark:text-slate-400">
              📍 Current: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
            </div>
          )}

          <AnimatePresence>
            {showForm ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <div>
                  <Label htmlFor="location" className="text-sm">Location</Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g., Home, Grocery Store"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="task" className="text-sm">Task/Reminder</Label>
                  <Input
                    id="task"
                    value={task}
                    onChange={(e) => setTask(e.target.value)}
                    placeholder="e.g., Pick up dry cleaning"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="radius" className="text-sm">Radius (meters)</Label>
                  <Input
                    id="radius"
                    type="number"
                    value={radius}
                    onChange={(e) => setRadius(Number(e.target.value))}
                    className="mt-1"
                    min="100"
                    step="50"
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleAddReminder} className="flex-1" size="sm">Add Reminder</Button>
                  <Button onClick={() => setShowForm(false)} variant="outline" size="sm" className="flex-1">Cancel</Button>
                </div>
              </motion.div>
            ) : (
              <Button onClick={() => setShowForm(true)} className="w-full" variant="outline">
                <Plus className="w-4 h-4 mr-2" /> Add Location Reminder
              </Button>
            )}
          </AnimatePresence>

          {reminders.length > 0 && (
            <div className="space-y-2">
              {reminders.map(reminder => (
                <motion.div
                  key={reminder.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-medium text-sm text-slate-900 dark:text-slate-100">{reminder.task}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        📍 {reminder.location} ({reminder.radius}m radius)
                      </p>
                      {reminder.alerted && (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">✓ Notified</p>
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDeleteReminder(reminder.id)}
                      className="shrink-0"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}