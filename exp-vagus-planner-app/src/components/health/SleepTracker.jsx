import React, { useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Moon, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function SleepTracker() {
  const [showForm, setShowForm] = useState(false);
  const [sleepForm, setSleepForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    sleep_time: '23:00',
    wake_time: '07:00',
    sleep_quality: 'good'
  });
  const queryClient = useQueryClient();

  const { data: sleepData = [] } = useQuery({
    queryKey: ['sleep-data'],
    queryFn: () => SDK.entities.Sleep.list('-date', 30)
  });

  const createSleepMutation = useMutation({
    mutationFn: async (data) => {
      const [sleepH, sleepM] = data.sleep_time.split(':').map(Number);
      const [wakeH, wakeM] = data.wake_time.split(':').map(Number);
      let duration = (wakeH * 60 + wakeM) - (sleepH * 60 + sleepM);
      if (duration < 0) duration += 24 * 60;
      
      return SDK.entities.Sleep.create({
        ...data,
        sleep_hours: duration / 60,
        source: 'manual'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sleep-data'] });
      setShowForm(false);
      toast.success('Sleep data logged!');
    }
  });

  const sleepChartData = sleepData.slice(0, 14).reverse().map(s => ({
    date: format(new Date(s.date), 'MMM d'),
    hours: s.sleep_hours || 0
  }));

  const avgSleep = sleepData.length > 0
    ? (sleepData.reduce((sum, s) => sum + (s.sleep_hours || 0), 0) / sleepData.length).toFixed(1)
    : 0;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Moon className="w-5 h-5 text-blue-600" />
              Sleep Tracking
            </CardTitle>
            <Button onClick={() => setShowForm(!showForm)} size="sm" className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Log Sleep
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 rounded-xl p-4 mb-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-700">{avgSleep}h</div>
              <div className="text-sm text-blue-600">Average Sleep</div>
            </div>
          </div>

          {sleepChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={sleepChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="hours" stroke="#3b82f6" fill="#93c5fd" name="Sleep Hours" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-slate-500 py-12">No sleep data yet</p>
          )}

          {showForm && (
            <div className="mt-6 space-y-4 p-4 bg-slate-50 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={sleepForm.date}
                    onChange={(e) => setSleepForm({ ...sleepForm, date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Quality</Label>
                  <Select value={sleepForm.sleep_quality} onValueChange={(v) => setSleepForm({ ...sleepForm, sleep_quality: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="poor">Poor</SelectItem>
                      <SelectItem value="fair">Fair</SelectItem>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="excellent">Excellent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Sleep Time</Label>
                  <Input
                    type="time"
                    value={sleepForm.sleep_time}
                    onChange={(e) => setSleepForm({ ...sleepForm, sleep_time: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Wake Time</Label>
                  <Input
                    type="time"
                    value={sleepForm.wake_time}
                    onChange={(e) => setSleepForm({ ...sleepForm, wake_time: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => createSleepMutation.mutate(sleepForm)} className="flex-1 bg-blue-600 hover:bg-blue-700">
                  Save
                </Button>
                <Button onClick={() => setShowForm(false)} variant="outline">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}