import React, { useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';
import { Heart, Plus, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ItikaafPlanner() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [newItikaaf, setNewItikaaf] = useState({
    title: '',
    start_date: '',
    end_date: '',
    location: 'masjid',
    goal: ''
  });

  const { data: itikaafs = [] } = useQuery({
    queryKey: ['itikaaf'],
    queryFn: () => SDK.entities.Itikaaf.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => SDK.entities.Itikaaf.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['itikaaf'] });
      toast.success('I\'tikaf session created! 🕌');
      setShowDialog(false);
      setNewItikaaf({ title: '', start_date: '', end_date: '', location: 'masjid', goal: '' });
    }
  });

  const handleCreate = () => {
    if (!newItikaaf.title || !newItikaaf.start_date || !newItikaaf.end_date) {
      toast.error('Please fill in all required fields');
      return;
    }
    createMutation.mutate(newItikaaf);
  };

  return (
    <div className="space-y-6">
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogTrigger asChild>
          <Button className="w-full md:w-auto bg-gradient-to-r from-emerald-600 to-teal-600">
            <Plus className="w-4 h-4 mr-2" />
            Plan I'tikaf Session
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Plan Your I'tikaf</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Session Title</Label>
              <Input 
                value={newItikaaf.title}
                onChange={(e) => setNewItikaaf({...newItikaaf, title: e.target.value})}
                placeholder="e.g., Last 10 Days I'tikaf"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date & Time</Label>
                <Input 
                  type="datetime-local"
                  value={newItikaaf.start_date}
                  onChange={(e) => setNewItikaaf({...newItikaaf, start_date: e.target.value})}
                />
              </div>
              <div>
                <Label>End Date & Time</Label>
                <Input 
                  type="datetime-local"
                  value={newItikaaf.end_date}
                  onChange={(e) => setNewItikaaf({...newItikaaf, end_date: e.target.value})}
                />
              </div>
            </div>
            <div>
              <Label>Location</Label>
              <Select value={newItikaaf.location} onValueChange={(v) => setNewItikaaf({...newItikaaf, location: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="masjid">Masjid</SelectItem>
                  <SelectItem value="home">Home</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Your Goal</Label>
              <Textarea 
                value={newItikaaf.goal}
                onChange={(e) => setNewItikaaf({...newItikaaf, goal: e.target.value})}
                placeholder="What do you hope to achieve during this I'tikaf?"
                rows={3}
              />
            </div>
            <Button onClick={handleCreate} className="w-full">Create I'tikaf Session</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4">
        {itikaafs.map((itikaaf, idx) => (
          <motion.div
            key={itikaaf.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <Heart className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <CardTitle>{itikaaf.title}</CardTitle>
                      <p className="text-sm text-slate-600 mt-1">
                        {itikaaf.location.charAt(0).toUpperCase() + itikaaf.location.slice(1)} • {itikaaf.duration_days} days
                      </p>
                    </div>
                  </div>
                  {itikaaf.status === 'completed' && <CheckCircle2 className="w-6 h-6 text-green-600" />}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm">{itikaaf.goal}</p>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="bg-slate-50 p-3 rounded-lg">
                      <p className="text-slate-600">Quran Sessions</p>
                      <p className="font-bold text-lg">{itikaaf.quran_sessions || 0}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg">
                      <p className="text-slate-600">Du'a Sessions</p>
                      <p className="font-bold text-lg">{itikaaf.dua_sessions || 0}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg">
                      <p className="text-slate-600">Qiyam</p>
                      <p className="font-bold text-lg">{itikaaf.qiyam_performed ? '✓' : '—'}</p>
                    </div>
                  </div>
                  {itikaaf.key_learnings && (
                    <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                      <p className="text-xs text-emerald-600 font-semibold mb-1">Key Learnings</p>
                      <p className="text-sm text-emerald-800">{itikaaf.key_learnings}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}