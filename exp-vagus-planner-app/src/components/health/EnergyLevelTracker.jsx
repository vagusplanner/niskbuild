import React, { useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function EnergyLevelTracker() {
  const [showForm, setShowForm] = useState(false);
  const [energyForm, setEnergyForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    time: format(new Date(), 'HH:mm'),
    energy_level: 7,
    mood: 'neutral'
  });
  const queryClient = useQueryClient();

  const { data: energyLogs = [] } = useQuery({
    queryKey: ['energy-logs'],
    queryFn: () => SDK.entities.EnergyLog?.list?.('-created_date', 30) || []
  });

  const createEnergyMutation = useMutation({
    mutationFn: (data) => SDK.entities.EnergyLog?.create?.(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['energy-logs'] });
      setShowForm(false);
      setEnergyForm({ date: format(new Date(), 'yyyy-MM-dd'), time: format(new Date(), 'HH:mm'), energy_level: 7, mood: 'neutral' });
      toast.success('Energy level logged!');
    }
  });

  const energyChartData = energyLogs.slice(0, 14).reverse().map(e => ({
    date: format(new Date(e.created_date), 'MMM d'),
    energy: e.energy_level
  }));

  const avgEnergy = energyLogs.length > 0
    ? (energyLogs.reduce((sum, e) => sum + (e.energy_level || 0), 0) / energyLogs.length).toFixed(1)
    : 0;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-600" />
              Energy Levels
            </CardTitle>
            <Button onClick={() => setShowForm(!showForm)} size="sm" className="bg-amber-600 hover:bg-amber-700">
              <Plus className="w-4 h-4 mr-2" />
              Log Energy
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-amber-50 rounded-xl p-4 mb-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-amber-700">{avgEnergy}/10</div>
              <div className="text-sm text-amber-600">Average Energy</div>
            </div>
          </div>

          {energyChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={energyChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 10]} />
                <Tooltip />
                <Line type="monotone" dataKey="energy" stroke="#f59e0b" strokeWidth={2} name="Energy Level" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-slate-500 py-12">No energy logs yet</p>
          )}

          {showForm && (
            <div className="mt-6 space-y-4 p-4 bg-slate-50 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={energyForm.date}
                    onChange={(e) => setEnergyForm({ ...energyForm, date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Time</Label>
                  <Input
                    type="time"
                    value={energyForm.time}
                    onChange={(e) => setEnergyForm({ ...energyForm, time: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Energy Level (1-10)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={energyForm.energy_level}
                    onChange={(e) => setEnergyForm({ ...energyForm, energy_level: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Mood</Label>
                  <Select value={energyForm.mood} onValueChange={(v) => setEnergyForm({ ...energyForm, mood: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="happy">Happy</SelectItem>
                      <SelectItem value="neutral">Neutral</SelectItem>
                      <SelectItem value="tired">Tired</SelectItem>
                      <SelectItem value="stressed">Stressed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => createEnergyMutation.mutate(energyForm)} className="flex-1 bg-amber-600 hover:bg-amber-700">
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