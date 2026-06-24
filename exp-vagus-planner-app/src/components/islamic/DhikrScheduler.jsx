import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SDK } from '@/lib/custom-sdk.js';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Clock, Repeat, Plus, Heart } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const DHIKR_TYPES = [
  { label: 'SubhanAllah (سبحان الله)', value: 'subhanallah', count: 33 },
  { label: 'Alhamdulillah (الحمد لله)', value: 'alhamdulillah', count: 33 },
  { label: 'Allahu Akbar (الله أكبر)', value: 'allahu_akbar', count: 34 },
  { label: 'La ilaha illallah (لا إله إلا الله)', value: 'la_ilaha_illallah', count: 100 },
  { label: 'Astaghfirullah (أستغفر الله)', value: 'astaghfirullah', count: 100 },
  { label: 'Salawat on Prophet ﷺ', value: 'salawat', count: 100 },
  { label: 'Custom Dhikr', value: 'custom', count: 0 }
];

const RECURRENCE_OPTIONS = [
  { label: 'Daily', value: 'daily' },
  { label: 'After Each Prayer', value: 'after_prayer' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Custom Days', value: 'custom' }
];

export default function DhikrScheduler({ isOpen, onClose }) {
  const [dhikrType, setDhikrType] = useState('');
  const [customDhikr, setCustomDhikr] = useState('');
  const [targetCount, setTargetCount] = useState('');
  const [recurrence, setRecurrence] = useState('daily');
  const [time, setTime] = useState('09:00');
  const queryClient = useQueryClient();

  const createEventMutation = useMutation({
    mutationFn: (eventData) => SDK.entities.Event.create(eventData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Dhikr session scheduled! 🤲');
      onClose();
      resetForm();
    }
  });

  const resetForm = () => {
    setDhikrType('');
    setCustomDhikr('');
    setTargetCount('');
    setRecurrence('daily');
    setTime('09:00');
  };

  const handleSchedule = () => {
    const selectedDhikr = DHIKR_TYPES.find(d => d.value === dhikrType);
    
    if (!dhikrType || (dhikrType === 'custom' && !customDhikr)) {
      toast.error('Please select a dhikr type');
      return;
    }

    const dhikrName = dhikrType === 'custom' ? customDhikr : selectedDhikr.label;
    const count = targetCount || selectedDhikr?.count || 33;

    const today = new Date();
    const [hours, minutes] = time.split(':');
    const startDate = new Date(today.setHours(parseInt(hours), parseInt(minutes), 0, 0));
    const endDate = new Date(startDate.getTime() + 15 * 60000); // 15 minutes

    const eventData = {
      title: `${dhikrName} - ${count}x`,
      description: `Recurring dhikr session: ${dhikrName}\nTarget: ${count} repetitions`,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      category: 'prayer',
      is_recurring: recurrence !== 'once',
      recurrence_type: recurrence === 'daily' ? 'daily' : recurrence === 'weekly' ? 'weekly' : 'daily',
      recurrence_interval: 1,
      recurrence_end_type: 'never',
      reminders: [
        { minutes_before: 5, type: 'notification', sent: false }
      ],
      notes: `🤲 Dhikr Practice\n${dhikrName}\nCount: ${count}\n\nMay Allah accept this worship.`
    };

    createEventMutation.mutate(eventData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-600" />
            Schedule Dhikr Session
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Dhikr Type */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Select Dhikr
            </label>
            <Select value={dhikrType} onValueChange={setDhikrType}>
              <SelectTrigger>
                <SelectValue placeholder="Choose dhikr type..." />
              </SelectTrigger>
              <SelectContent>
                {DHIKR_TYPES.map(dhikr => (
                  <SelectItem key={dhikr.value} value={dhikr.value}>
                    {dhikr.label} {dhikr.count > 0 && `(${dhikr.count}x)`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Dhikr Text */}
          {dhikrType === 'custom' && (
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Custom Dhikr Text
              </label>
              <Input
                value={customDhikr}
                onChange={(e) => setCustomDhikr(e.target.value)}
                placeholder="Enter your dhikr..."
              />
            </div>
          )}

          {/* Target Count */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Target Count
            </label>
            <Input
              type="number"
              value={targetCount}
              onChange={(e) => setTargetCount(e.target.value)}
              placeholder={DHIKR_TYPES.find(d => d.value === dhikrType)?.count?.toString() || '33'}
            />
          </div>

          {/* Time */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Preferred Time
            </label>
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>

          {/* Recurrence */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
              <Repeat className="w-4 h-4" />
              Recurrence
            </label>
            <Select value={recurrence} onValueChange={setRecurrence}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RECURRENCE_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Info */}
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
            <p className="text-sm text-teal-800">
              💡 This will create a recurring calendar event to remind you of your dhikr practice.
              You can track completion in the Dhikr Counter.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={handleSchedule}
              className="flex-1 bg-teal-600 hover:bg-teal-700"
              disabled={createEventMutation.isPending}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Schedule to Calendar
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}