import React, { useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { Moon, Star, Zap, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function LastTenDaysTracker() {
  const queryClient = useQueryClient();
  const [selectedNight, setSelectedNight] = useState(null);
  const [editingNight, setEditingNight] = useState(null);

  const { data: nights = [] } = useQuery({
    queryKey: ['nights-of-power'],
    queryFn: () => SDK.entities.NightOfPower.list()
  });

  const updateNightMutation = useMutation({
    mutationFn: (data) => SDK.entities.NightOfPower.update(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nights-of-power'] });
      toast.success('Night updated! ✨');
      setSelectedNight(null);
    }
  });

  const sorted = [...nights].sort((a, b) => a.night_number - b.night_number);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl p-6">
        <h3 className="text-2xl font-bold mb-2">Last 10 Nights - Laylat al-Qadr</h3>
        <p className="text-purple-100">Seek the Night of Power with intensified worship and reflection</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sorted.map((night, idx) => (
          <motion.div
            key={night.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <Dialog open={selectedNight?.id === night.id} onOpenChange={(open) => !open && setSelectedNight(null)}>
              <DialogTrigger asChild>
                <Card 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setSelectedNight(night)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Moon className="w-5 h-5 text-purple-600" />
                          Night {night.night_number}
                        </CardTitle>
                        <p className="text-sm text-slate-600 mt-1">{new Date(night.date).toLocaleDateString()}</p>
                      </div>
                      {night.completion_percentage >= 100 && (
                        <Star className="w-6 h-6 text-yellow-500" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Completion</span>
                      <span className="text-purple-600 font-bold">{night.completion_percentage}%</span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all"
                        style={{ width: `${night.completion_percentage}%` }}
                      />
                    </div>
                    {night.qiyam_performed && (
                      <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
                        <CheckCircle2 className="w-4 h-4" />
                        Qiyam performed ({night.qiyam_duration} min)
                      </div>
                    )}
                    {night.is_laylat_qadr_suspected && (
                      <div className="flex items-center gap-2 text-sm text-yellow-600 font-medium">
                        <Zap className="w-4 h-4" />
                        Suspected as Laylat al-Qadr
                      </div>
                    )}
                    <p className="text-xs text-slate-500">{night.activities_completed?.length || 0} activities logged</p>
                  </CardContent>
                </Card>
              </DialogTrigger>

              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Night {night.night_number} Details</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  {/* Recommended Worship */}
                  <div>
                    <h4 className="font-semibold mb-3">Recommended Activities</h4>
                    <div className="space-y-2">
                      {night.recommended_worship?.map((activity, i) => (
                        <div key={i} className="bg-slate-50 p-3 rounded-lg">
                          <p className="font-medium text-sm">{activity.activity}</p>
                          <p className="text-xs text-slate-600">{activity.duration_minutes} min</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Logging Section */}
                  <div className="border-t pt-6">
                    <h4 className="font-semibold mb-3">Log Your Activities</h4>
                    <div className="space-y-4">
                      <div>
                        <Label>Qiyam Al-Layl Duration (minutes)</Label>
                        <Input 
                          type="number" 
                          value={editingNight?.qiyam_duration || night.qiyam_duration || 0}
                          onChange={(e) => setEditingNight({
                            ...editingNight,
                            id: night.id,
                            qiyam_duration: Number(e.target.value),
                            qiyam_performed: Number(e.target.value) > 0
                          })}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label>Energy Level (1-10)</Label>
                        <Input 
                          type="number" 
                          min="1" 
                          max="10"
                          value={editingNight?.energy_level || night.energy_level || 5}
                          onChange={(e) => setEditingNight({
                            ...editingNight,
                            id: night.id,
                            energy_level: Number(e.target.value)
                          })}
                        />
                      </div>
                      <div>
                        <Label>Reflection Notes</Label>
                        <Textarea 
                          value={editingNight?.reflection_notes || night.reflection_notes || ''}
                          onChange={(e) => setEditingNight({
                            ...editingNight,
                            id: night.id,
                            reflection_notes: e.target.value
                          })}
                          placeholder="Share your spiritual experience..."
                          rows={4}
                        />
                      </div>
                      <Button
                        onClick={() => editingNight && updateNightMutation.mutate(editingNight)}
                        className="w-full"
                      >
                        Save Night Log
                      </Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </motion.div>
        ))}
      </div>
    </div>
  );
}