import React, { useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const DATE_FORMATS = [
  { format: 'MM/dd/yyyy', label: 'US (12/25/2026)', example: '02/05/2026' },
  { format: 'dd/MM/yyyy', label: 'EU (25/12/2026)', example: '05/02/2026' },
  { format: 'yyyy-MM-dd', label: 'ISO (2026-12-25)', example: '2026-02-05' },
  { format: 'MMM dd, yyyy', label: 'Long (Dec 25, 2026)', example: 'Feb 05, 2026' },
  { format: 'dd MMMM yyyy', label: 'Full (25 December 2026)', example: '05 February 2026' },
];

const TIME_FORMATS = [
  { format: '12h', label: '12-hour (2:30 PM)' },
  { format: '24h', label: '24-hour (14:30)' },
];

const WEEK_START_OPTIONS = [
  { day: 0, label: 'Sunday' },
  { day: 1, label: 'Monday' },
  { day: 6, label: 'Saturday' },
];

export default function DateFormatCustomizer({ settings }) {
  const [dateFormat, setDateFormat] = useState(settings?.date_format || 'MM/dd/yyyy');
  const [timeFormat, setTimeFormat] = useState(settings?.time_format || '12h');
  const [weekStartDay, setWeekStartDay] = useState(settings?.week_starts_on || 1);
  const queryClient = useQueryClient();

  const updateFormatMutation = useMutation({
    mutationFn: (data) => SDK.auth.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userSettings'] });
      toast.success('Date format preferences updated');
    }
  });

  const handleSave = () => {
    updateFormatMutation.mutate({
      date_format: dateFormat,
      time_format: timeFormat,
      week_starts_on: weekStartDay
    });
  };

  const getDateExample = (fmt) => {
    try {
      return format(new Date(2026, 1, 5), fmt);
    } catch {
      return 'Invalid format';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-teal-600" />
          Date & Time Format
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Date Format */}
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-3">Date Format</p>
          <div className="grid grid-cols-1 gap-2">
            {DATE_FORMATS.map((option) => (
              <motion.button
                key={option.format}
                whileHover={{ scale: 1.02 }}
                onClick={() => setDateFormat(option.format)}
                className={`
                  text-left p-3 rounded-lg border-2 transition-all
                  ${dateFormat === option.format
                    ? 'border-teal-500 bg-teal-50'
                    : 'border-slate-200 hover:border-slate-300'
                  }
                `}
              >
                <p className="text-sm font-medium text-slate-800">{option.label}</p>
                <p className="text-xs text-slate-500 mt-1">{option.example}</p>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Time Format */}
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-3">Time Format</p>
          <div className="grid grid-cols-2 gap-3">
            {TIME_FORMATS.map((option) => (
              <motion.button
                key={option.format}
                whileHover={{ scale: 1.05 }}
                onClick={() => setTimeFormat(option.format)}
                className={`
                  p-3 rounded-lg border-2 transition-all
                  ${timeFormat === option.format
                    ? 'border-teal-500 bg-teal-50'
                    : 'border-slate-200 hover:border-slate-300'
                  }
                `}
              >
                <p className="text-sm font-medium text-slate-800">{option.label}</p>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Week Start Day */}
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-3">Week Starts On</p>
          <div className="grid grid-cols-3 gap-3">
            {WEEK_START_OPTIONS.map((option) => (
              <motion.button
                key={option.day}
                whileHover={{ scale: 1.05 }}
                onClick={() => setWeekStartDay(option.day)}
                className={`
                  p-3 rounded-lg border-2 transition-all
                  ${weekStartDay === option.day
                    ? 'border-teal-500 bg-teal-50'
                    : 'border-slate-200 hover:border-slate-300'
                  }
                `}
              >
                <p className="text-sm font-medium text-slate-800">{option.label}</p>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
          <p className="text-xs text-teal-700 mb-2">
            <span className="font-semibold">Preview:</span> {getDateExample(dateFormat)} at{' '}
            {timeFormat === '12h' ? '2:30 PM' : '14:30'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-slate-200">
          <Button
            onClick={handleSave}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white"
          >
            Save Preferences
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}