import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { format, differenceInDays, addDays, isSameDay, isWithinInterval } from 'date-fns';

export default function PeriodTracker({ compact = false }) {
  const queryClient = useQueryClient();

  const { data: periods = [] } = useQuery({
    queryKey: ['periods'],
    queryFn: () => base44.entities.Period.list('-start_date', 50)
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Period.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periods'] });
    }
  });

  const lastPeriod = periods[0];
  const avgCycleLength = periods.length > 1
    ? Math.round(periods.slice(0, 5).reduce((sum, p, i, arr) => {
        if (i === 0) return sum;
        return sum + differenceInDays(new Date(arr[i-1].start_date), new Date(p.start_date));
      }, 0) / Math.min(4, periods.length - 1))
    : 28;

  const nextPredicted = lastPeriod 
    ? addDays(new Date(lastPeriod.start_date), avgCycleLength)
    : null;

  const daysUntilNext = nextPredicted 
    ? differenceInDays(nextPredicted, new Date())
    : null;

  const logPeriod = () => {
    createMutation.mutate({
      start_date: format(new Date(), 'yyyy-MM-dd'),
      cycle_length: avgCycleLength
    });
  };

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-rose-100 to-pink-100 rounded-2xl p-4 border border-rose-200"
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-600" />
            <span className="text-sm font-medium text-rose-800">Period Tracker</span>
          </div>
          <Button
            size="sm"
            onClick={logPeriod}
            className="h-7 text-xs bg-rose-600 hover:bg-rose-700"
          >
            Log Today
          </Button>
        </div>
        {nextPredicted && daysUntilNext !== null && (
          <div className="space-y-1">
            <p className="text-xs text-rose-600">Next period in:</p>
            <p className="text-2xl font-bold text-rose-800">{daysUntilNext} days</p>
            <p className="text-xs text-rose-500">{format(nextPredicted, 'MMM d, yyyy')}</p>
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <Card className="p-6 bg-gradient-to-br from-rose-50 to-pink-50 border-rose-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-rose-600" />
          <h3 className="text-lg font-semibold text-rose-900">Period Tracker</h3>
        </div>
        <Button
          size="sm"
          onClick={logPeriod}
          disabled={createMutation.isPending}
          className="bg-rose-600 hover:bg-rose-700"
        >
          <Plus className="w-4 h-4 mr-1" />
          Log Period
        </Button>
      </div>

      <div className="space-y-3">
        <div className="p-3 bg-white/60 rounded-lg">
          <p className="text-sm text-rose-600 mb-1">Cycle Length</p>
          <p className="text-xl font-bold text-rose-800">{avgCycleLength} days</p>
        </div>

        {nextPredicted && daysUntilNext !== null && (
          <div className="p-3 bg-white/60 rounded-lg">
            <p className="text-sm text-rose-600 mb-1">Next Period</p>
            <p className="text-xl font-bold text-rose-800">
              {daysUntilNext > 0 ? `In ${daysUntilNext} days` : 'Today'}
            </p>
            <p className="text-xs text-rose-500 mt-1">{format(nextPredicted, 'MMMM d, yyyy')}</p>
          </div>
        )}

        {lastPeriod && (
          <div className="pt-3 border-t border-rose-200">
            <p className="text-xs text-rose-600">Last period started</p>
            <p className="text-sm font-medium text-rose-800">
              {format(new Date(lastPeriod.start_date), 'MMM d, yyyy')}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

export function isPeriodDay(date, periods) {
  return periods.some(period => {
    const start = new Date(period.start_date);
    const end = period.end_date ? new Date(period.end_date) : addDays(start, 5);
    return isWithinInterval(date, { start, end });
  });
}

export function getPredictedPeriodDays(periods) {
  if (periods.length === 0) return [];
  
  const lastPeriod = periods[0];
  const avgCycleLength = periods.length > 1
    ? Math.round(periods.slice(0, 5).reduce((sum, p, i, arr) => {
        if (i === 0) return sum;
        return sum + differenceInDays(new Date(arr[i-1].start_date), new Date(p.start_date));
      }, 0) / Math.min(4, periods.length - 1))
    : 28;

  const nextStart = addDays(new Date(lastPeriod.start_date), avgCycleLength);
  const predictedDays = [];
  
  for (let i = 0; i < 5; i++) {
    predictedDays.push(addDays(nextStart, i));
  }
  
  return predictedDays;
}