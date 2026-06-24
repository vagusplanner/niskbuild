import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from 'sonner';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function HabitForm({ isOpen, onClose, habit }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    frequency: 'daily',
    target_days: [],
    target_day_of_month: 1,
    category: 'other',
    color: '#3b82f6',
    is_active: true
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    if (habit) {
      setFormData(habit);
    } else {
      setFormData({
        name: '',
        description: '',
        frequency: 'daily',
        target_days: [],
        target_day_of_month: 1,
        category: 'other',
        color: '#3b82f6',
        is_active: true
      });
    }
  }, [habit, isOpen]);

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (habit) {
        return base44.entities.Habit.update(habit.id, data);
      }
      return base44.entities.Habit.create(data);
    },
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ['habits'] });
      const previous = queryClient.getQueryData(['habits']);
      queryClient.setQueryData(['habits'], (old = []) =>
        habit
          ? old.map(h => h.id === habit.id ? { ...h, ...data } : h)
          : [{ ...data, id: `temp-${Date.now()}`, is_active: true }, ...old]
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(['habits'], context?.previous);
      toast.error('Failed to save habit');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      toast.success(habit ? 'Habit updated' : 'Habit created');
      onClose();
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('Please enter a habit name');
      return;
    }
    saveMutation.mutate(formData);
  };

  const toggleDay = (dayIndex) => {
    setFormData(prev => ({
      ...prev,
      target_days: prev.target_days?.includes(dayIndex)
        ? prev.target_days.filter(d => d !== dayIndex)
        : [...(prev.target_days || []), dayIndex]
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{habit ? 'Edit Habit' : 'New Habit'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Habit Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Drink 8 glasses of water"
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional details..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Category</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="health">Health</SelectItem>
                  <SelectItem value="fitness">Fitness</SelectItem>
                  <SelectItem value="productivity">Productivity</SelectItem>
                  <SelectItem value="learning">Learning</SelectItem>
                  <SelectItem value="spiritual">Spiritual</SelectItem>
                  <SelectItem value="social">Social</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Frequency</Label>
              <Select value={formData.frequency} onValueChange={(value) => setFormData({ ...formData, frequency: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {formData.frequency === 'weekly' && (
            <div>
              <Label>Days of Week</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {DAYS.map((day, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.target_days?.includes(index)}
                      onCheckedChange={() => toggleDay(index)}
                    />
                    <Label className="text-sm">{day}</Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {formData.frequency === 'monthly' && (
            <div>
              <Label>Day of Month</Label>
              <Input
                type="number"
                min="1"
                max="31"
                value={formData.target_day_of_month}
                onChange={(e) => setFormData({ ...formData, target_day_of_month: parseInt(e.target.value) })}
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save Habit'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}