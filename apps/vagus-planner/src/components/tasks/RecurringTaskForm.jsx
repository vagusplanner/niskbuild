import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Repeat, Calendar } from 'lucide-react';

const WEEKDAYS = [
  { value: 0, label: 'Sunday', short: 'Su' },
  { value: 1, label: 'Monday', short: 'Mo' },
  { value: 2, label: 'Tuesday', short: 'Tu' },
  { value: 3, label: 'Wednesday', short: 'We' },
  { value: 4, label: 'Thursday', short: 'Th' },
  { value: 5, label: 'Friday', short: 'Fr' },
  { value: 6, label: 'Saturday', short: 'Sa' }
];

export default function RecurringTaskForm({ taskData, onChange }) {
  const [isRecurring, setIsRecurring] = useState(taskData.is_recurring || false);
  const [recurrenceType, setRecurrenceType] = useState(taskData.recurrence_type || 'daily');
  const [interval, setInterval] = useState(taskData.recurrence_interval || 1);
  const [selectedDays, setSelectedDays] = useState(taskData.recurrence_days || []);
  const [endType, setEndType] = useState(taskData.recurrence_end_type || 'never');

  const handleRecurringChange = (enabled) => {
    setIsRecurring(enabled);
    onChange({ is_recurring: enabled });
    if (!enabled) {
      onChange({
        is_recurring: false,
        recurrence_type: null,
        recurrence_interval: null,
        recurrence_days: null,
        recurrence_end_type: null,
        recurrence_end_date: null,
        recurrence_occurrences: null
      });
    }
  };

  const handleTypeChange = (type) => {
    setRecurrenceType(type);
    onChange({ recurrence_type: type });
    if (type !== 'weekly') {
      setSelectedDays([]);
      onChange({ recurrence_days: null });
    }
  };

  const toggleDay = (day) => {
    const newDays = selectedDays.includes(day)
      ? selectedDays.filter(d => d !== day)
      : [...selectedDays, day].sort((a, b) => a - b);
    setSelectedDays(newDays);
    onChange({ recurrence_days: newDays });
  };

  return (
    <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-base font-semibold">
          <Repeat className="w-4 h-4 text-teal-600" />
          Recurring Task
        </Label>
        <Switch
          checked={isRecurring}
          onCheckedChange={handleRecurringChange}
        />
      </div>

      {isRecurring && (
        <div className="space-y-4 pt-2">
          {/* Recurrence Type */}
          <div className="space-y-2">
            <Label>Repeat Pattern</Label>
            <Select value={recurrenceType} onValueChange={handleTypeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Interval */}
          <div className="space-y-2">
            <Label>Repeat Every</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="1"
                max="365"
                value={interval}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 1;
                  setInterval(val);
                  onChange({ recurrence_interval: val });
                }}
                className="w-20"
              />
              <span className="text-sm text-slate-600">
                {recurrenceType === 'daily' && 'day(s)'}
                {recurrenceType === 'weekly' && 'week(s)'}
                {recurrenceType === 'monthly' && 'month(s)'}
                {recurrenceType === 'yearly' && 'year(s)'}
              </span>
            </div>
          </div>

          {/* Weekly: Select Days */}
          {recurrenceType === 'weekly' && (
            <div className="space-y-2">
              <Label>Repeat On</Label>
              <div className="flex gap-2">
                {WEEKDAYS.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                      selectedDays.includes(day.value)
                        ? 'bg-teal-600 text-white'
                        : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {day.short}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* End Type */}
          <div className="space-y-2">
            <Label>Ends</Label>
            <Select value={endType} onValueChange={(val) => {
              setEndType(val);
              onChange({ recurrence_end_type: val });
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="never">Never</SelectItem>
                <SelectItem value="date">On specific date</SelectItem>
                <SelectItem value="occurrences">After X occurrences</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* End Date */}
          {endType === 'date' && (
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={taskData.recurrence_end_date || ''}
                onChange={(e) => onChange({ recurrence_end_date: e.target.value })}
              />
            </div>
          )}

          {/* Occurrences */}
          {endType === 'occurrences' && (
            <div className="space-y-2">
              <Label>Number of Occurrences</Label>
              <Input
                type="number"
                min="1"
                max="365"
                value={taskData.recurrence_occurrences || 10}
                onChange={(e) => onChange({ recurrence_occurrences: parseInt(e.target.value) })}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}