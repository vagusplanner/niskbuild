import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Share2, Coffee, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function SmartAvailabilitySharing() {
  const [freeSlots, setFreeSlots] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [slotDuration, setSlotDuration] = useState(30);
  const [slotLocation, setSlotLocation] = useState('Coffee Shop');
  const [copied, setCopied] = useState(null);
  const queryClient = useQueryClient();

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => SDK.entities.Event.list()
  });

  const generateFreeSlots = () => {
    const today = new Date();
    today.setHours(9, 0, 0, 0);
    const slots = [];

    for (let day = 0; day < 7; day++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() + day);

      for (let hour = 9; hour < 18; hour++) {
        const slotStart = new Date(checkDate);
        slotStart.setHours(hour, 0, 0, 0);
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + slotDuration);

        const hasConflict = events.some(event => {
          const eventStart = new Date(event.start_date);
          const eventEnd = new Date(event.end_date);
          return !(slotEnd <= eventStart || slotStart >= eventEnd);
        });

        if (!hasConflict) {
          slots.push({
            id: `${day}-${hour}`,
            start: slotStart,
            end: slotEnd,
            day,
            hour
          });
        }
      }
    }

    setFreeSlots(slots.slice(0, 8));
    setShowForm(false);
    toast.success(`Found ${slots.length} free slots`);
  };

  const handleShareSlot = (slot) => {
    const message = `Free for ${slotDuration}min ${slotLocation}? ${slot.start.toLocaleDateString()} ${slot.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    
    if (navigator.share) {
      navigator.share({ title: 'Free Slot', text: message });
    } else {
      navigator.clipboard.writeText(message);
      setCopied(slot.id);
      setTimeout(() => setCopied(null), 2000);
      toast.success('Copied to clipboard');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coffee className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            Smart Availability Sharing
          </CardTitle>
          <CardDescription>Share "free for coffee" slots with your network</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AnimatePresence>
            {showForm ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <div>
                  <Label htmlFor="duration" className="text-sm">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={slotDuration}
                    onChange={(e) => setSlotDuration(Number(e.target.value))}
                    className="mt-1"
                    min="15"
                    step="15"
                  />
                </div>

                <div>
                  <Label htmlFor="location" className="text-sm">Location</Label>
                  <Input
                    id="location"
                    value={slotLocation}
                    onChange={(e) => setSlotLocation(e.target.value)}
                    className="mt-1"
                    placeholder="Coffee Shop, Park, Zoom..."
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={generateFreeSlots} className="flex-1" size="sm">Generate Slots</Button>
                  <Button onClick={() => setShowForm(false)} variant="outline" size="sm" className="flex-1">Cancel</Button>
                </div>
              </motion.div>
            ) : (
              <Button onClick={() => setShowForm(true)} className="w-full" variant="outline">
                Generate Available Slots
              </Button>
            )}
          </AnimatePresence>

          {freeSlots.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Available slots this week:</p>
              {freeSlots.map(slot => (
                <motion.div
                  key={slot.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-2"
                >
                  <div>
                    <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                      {slot.start.toLocaleDateString([], { weekday: 'short' })}
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      {slot.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} @ {slotLocation}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleShareSlot(slot)}
                    className="shrink-0"
                  >
                    {copied === slot.id ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                  </Button>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}