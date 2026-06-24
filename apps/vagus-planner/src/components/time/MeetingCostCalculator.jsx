import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DollarSign, Users, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';

export default function MeetingCostCalculator() {
  const [hourlyRate, setHourlyRate] = useState(100);

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list()
  });

  const meetingCosts = useMemo(() => {
    const meetings = events.filter(e => ['work', 'social'].includes(e.category));
    
    return meetings.map(meeting => {
      const durationMinutes = (new Date(meeting.end_date) - new Date(meeting.start_date)) / (1000 * 60);
      const durationHours = durationMinutes / 60;
      
      // Estimate attendees - default to 3 if not specified
      const attendeeCount = meeting.attendees?.length || 3;
      
      const totalCost = durationHours * hourlyRate * attendeeCount;
      const costPerAttendee = durationHours * hourlyRate;
      
      return {
        title: meeting.title,
        duration: durationMinutes,
        attendees: attendeeCount,
        hourlyRate,
        totalCost: Math.round(totalCost * 100) / 100,
        costPerAttendee: Math.round(costPerAttendee * 100) / 100
      };
    }).sort((a, b) => b.totalCost - a.totalCost);
  }, [events, hourlyRate]);

  const totalWeeklyMeetingCost = useMemo(() => {
    return Math.round(meetingCosts.reduce((sum, m) => sum + m.totalCost, 0) * 100) / 100;
  }, [meetingCosts]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
            Meeting Cost Calculator
          </CardTitle>
          <CardDescription>See the real cost of your meetings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="hourly-rate" className="text-sm">Your Hourly Rate ($)</Label>
            <Input
              id="hourly-rate"
              type="number"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(Math.max(0, Number(e.target.value)))}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
            <div>
              <p className="text-xs text-green-600 dark:text-green-400">Weekly Total</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">${totalWeeklyMeetingCost.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-green-600 dark:text-green-400">Number of Meetings</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">{meetingCosts.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {meetingCosts.map((meeting, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="font-medium text-slate-900 dark:text-slate-100 text-sm truncate">{meeting.title}</p>
                <div className="flex gap-3 mt-1 text-xs text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {Math.round(meeting.duration)}m
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" /> {meeting.attendees}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-green-600 dark:text-green-400">${meeting.totalCost}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">${meeting.costPerAttendee}/person</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}