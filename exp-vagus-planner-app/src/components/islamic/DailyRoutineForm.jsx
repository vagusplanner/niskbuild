import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

export default function DailyRoutineForm({ routine, onClose, onSave }) {
  const [formData, setFormData] = useState({
    routine_type: 'quran_reading',
    title: '',
    description: '',
    target_time: 'after_fajr',
    frequency: 'daily',
    target_count: 0,
    is_active: true,
    reminder_enabled: true,
    reminder_minutes_before: 5,
    auto_create_events: true,
    ...routine
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{routine ? 'Edit Routine' : 'Add New Routine'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Routine Type</Label>
            <Select
              value={formData.routine_type}
              onValueChange={(val) => setFormData({ ...formData, routine_type: val })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="quran_reading">Quran Reading</SelectItem>
                <SelectItem value="dhikr">Dhikr</SelectItem>
                <SelectItem value="dua">Dua</SelectItem>
                <SelectItem value="tasbih">Tasbih</SelectItem>
                <SelectItem value="prayer_sunnah">Sunnah Prayer</SelectItem>
                <SelectItem value="charity">Charity</SelectItem>
                <SelectItem value="learning">Islamic Learning</SelectItem>
                <SelectItem value="fitness">Fitness</SelectItem>
                <SelectItem value="family_time">Family Time</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Title *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Read Surah Al-Kahf"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Details about this routine..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Target Time</Label>
              <Select
                value={formData.target_time}
                onValueChange={(val) => setFormData({ ...formData, target_time: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="after_fajr">After Fajr</SelectItem>
                  <SelectItem value="after_dhuhr">After Dhuhr</SelectItem>
                  <SelectItem value="after_asr">After Asr</SelectItem>
                  <SelectItem value="after_maghrib">After Maghrib</SelectItem>
                  <SelectItem value="after_isha">After Isha</SelectItem>
                  <SelectItem value="before_sleep">Before Sleep</SelectItem>
                  <SelectItem value="friday_only">Friday Only</SelectItem>
                  <SelectItem value="anytime">Anytime</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select
                value={formData.frequency}
                onValueChange={(val) => setFormData({ ...formData, frequency: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="friday_only">Friday Only</SelectItem>
                  <SelectItem value="weekends">Weekends</SelectItem>
                  <SelectItem value="weekdays">Weekdays</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Target Count (Optional)</Label>
            <Input
              type="number"
              value={formData.target_count || ''}
              onChange={(e) => setFormData({ ...formData, target_count: parseInt(e.target.value) || 0 })}
              placeholder="e.g., 33 for tasbih, 100 for dhikr"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Enable Reminders</Label>
              <Switch
                checked={formData.reminder_enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, reminder_enabled: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Auto-create Calendar Events</Label>
              <Switch
                checked={formData.auto_create_events}
                onCheckedChange={(checked) => setFormData({ ...formData, auto_create_events: checked })}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-teal-600 hover:bg-teal-700">
              {routine ? 'Update' : 'Add Routine'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}