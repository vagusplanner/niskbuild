import React, { useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const WORK_PRESETS = [
  { name: '9 AM - 5 PM', start: '09:00', end: '17:00' },
  { name: '8 AM - 6 PM', start: '08:00', end: '18:00' },
  { name: '10 AM - 6 PM', start: '10:00', end: '18:00' },
  { name: '24/7', start: '00:00', end: '23:59' },
];

export default function WorkingHoursCustomizer({ settings }) {
  const [workStart, setWorkStart] = useState(settings?.work_hours_start || '09:00');
  const [workEnd, setWorkEnd] = useState(settings?.work_hours_end || '17:00');
  const [workDays, setWorkDays] = useState(settings?.work_days || [1, 2, 3, 4, 5]);
  const [showHours, setShowHours] = useState(settings?.show_working_hours_on_calendar !== false);
  const queryClient = useQueryClient();

  const updateWorkingHoursMutation = useMutation({
    mutationFn: (data) => SDK.auth.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userSettings'] });
      toast.success('Working hours updated');
    }
  });

  const handleSave = () => {
    updateWorkingHoursMutation.mutate({
      work_hours_start: workStart,
      work_hours_end: workEnd,
      work_days: workDays,
      show_working_hours_on_calendar: showHours
    });
  };

  const applyPreset = (preset) => {
    setWorkStart(preset.start);
    setWorkEnd(preset.end);
  };

  const toggleWorkDay = (day) => {
    setWorkDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const isValidTimeRange = workStart < workEnd;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          Working Hours
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Presets */}
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-3">Quick Presets</p>
          <div className="grid grid-cols-2 gap-2">
            {WORK_PRESETS.map((preset) => (
              <Button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                {preset.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Time Range */}
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-3">Work Time Range</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-600 mb-1 block">Start Time</label>
              <input
                type="time"
                value={workStart}
                onChange={(e) => setWorkStart(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600 mb-1 block">End Time</label>
              <input
                type="time"
                value={workEnd}
                onChange={(e) => setWorkEnd(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          {!isValidTimeRange && (
            <div className="mt-2 flex items-center gap-2 p-2 bg-amber-50 rounded-lg border border-amber-200">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <p className="text-xs text-amber-700">End time must be after start time</p>
            </div>
          )}
        </div>

        {/* Work Days */}
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-3">Work Days</p>
          <div className="flex gap-2">
            {dayLabels.map((day, idx) => (
              <motion.button
                key={day}
                whileHover={{ scale: 1.05 }}
                onClick={() => toggleWorkDay(idx)}
                className={`
                  w-10 h-10 rounded-lg font-medium text-sm transition-all
                  ${workDays.includes(idx)
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }
                `}
              >
                {day}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Display Option */}
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
          <input
            type="checkbox"
            id="showHours"
            checked={showHours}
            onChange={(e) => setShowHours(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 accent-blue-600"
          />
          <label htmlFor="showHours" className="text-sm text-slate-700 cursor-pointer">
            Show working hours on calendar view
          </label>
        </div>

        {/* Preview */}
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs text-blue-700">
            <span className="font-semibold">Preview:</span> Work {workStart} - {workEnd} on {workDays.length} days per week
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-slate-200">
          <Button
            onClick={handleSave}
            disabled={!isValidTimeRange}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            Save Working Hours
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}