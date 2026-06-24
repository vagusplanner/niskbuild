import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Target, Plus, Edit2, Trash2, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function SpiritualGoalsManager() {
  const [showForm, setShowForm] = useState(false);
  const [editingIdx, setEditingIdx] = useState(null);
  const [formData, setFormData] = useState({
    goal: '',
    target_date: '',
    progress: 0,
    category: 'worship',
    status: 'active'
  });

  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ['islamicProfile'],
    queryFn: async () => {
      const profiles = await base44.entities.IslamicProfile.list();
      return profiles[0] || null;
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (goals) => {
      if (profile?.id) {
        return base44.entities.IslamicProfile.update(profile.id, {
          spiritual_goals: goals
        });
      } else {
        return base44.entities.IslamicProfile.create({
          spiritual_goals: goals
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['islamicProfile'] });
      setShowForm(false);
      setEditingIdx(null);
      toast.success('Spiritual goals updated');
    }
  });

  const handleSubmit = () => {
    if (!formData.goal.trim()) {
      toast.error('Please enter a goal');
      return;
    }

    const currentGoals = profile?.spiritual_goals || [];
    let updatedGoals;

    if (editingIdx !== null) {
      updatedGoals = currentGoals.map((g, i) => i === editingIdx ? formData : g);
    } else {
      updatedGoals = [...currentGoals, formData];
    }

    saveMutation.mutate(updatedGoals);
    setFormData({
      goal: '',
      target_date: '',
      progress: 0,
      category: 'worship',
      status: 'active'
    });
  };

  const handleEdit = (goal, idx) => {
    setFormData(goal);
    setEditingIdx(idx);
    setShowForm(true);
  };

  const handleDelete = (idx) => {
    if (confirm('Are you sure you want to delete this goal?')) {
      const currentGoals = profile?.spiritual_goals || [];
      const updatedGoals = currentGoals.filter((_, i) => i !== idx);
      saveMutation.mutate(updatedGoals);
    }
  };

  const handleUpdateProgress = (idx, newProgress) => {
    const currentGoals = profile?.spiritual_goals || [];
    const updatedGoals = currentGoals.map((g, i) => 
      i === idx ? { ...g, progress: newProgress, status: newProgress >= 100 ? 'completed' : 'active' } : g
    );
    saveMutation.mutate(updatedGoals);
  };

  const categoryColors = {
    quran: 'bg-emerald-100 text-emerald-800',
    prayer: 'bg-purple-100 text-purple-800',
    fasting: 'bg-amber-100 text-amber-800',
    charity: 'bg-pink-100 text-pink-800',
    character: 'bg-rose-100 text-rose-800',
    knowledge: 'bg-blue-100 text-blue-800',
    worship: 'bg-teal-100 text-teal-800'
  };

  const goals = profile?.spiritual_goals || [];
  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');

  return (
    <>
      <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-purple-900">
              <Target className="w-5 h-5" />
              Spiritual Goals
            </span>
            <Button onClick={() => { setEditingIdx(null); setShowForm(true); }} size="sm" className="bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Goal
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {goals.length > 0 ? (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-white rounded-lg text-center">
                  <p className="text-2xl font-bold text-purple-600">{goals.length}</p>
                  <p className="text-xs text-slate-600">Total Goals</p>
                </div>
                <div className="p-3 bg-white rounded-lg text-center">
                  <p className="text-2xl font-bold text-blue-600">{activeGoals.length}</p>
                  <p className="text-xs text-slate-600">Active</p>
                </div>
                <div className="p-3 bg-white rounded-lg text-center">
                  <p className="text-2xl font-bold text-emerald-600">{completedGoals.length}</p>
                  <p className="text-xs text-slate-600">Completed</p>
                </div>
              </div>

              {/* Active Goals */}
              {activeGoals.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-purple-900">Active Goals</h4>
                  {activeGoals.map((goal, idx) => {
                    const originalIdx = goals.indexOf(goal);
                    return (
                      <motion.div
                        key={originalIdx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 bg-white rounded-xl border border-purple-100"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h5 className="font-semibold text-slate-900">{goal.goal}</h5>
                            {goal.target_date && (
                              <p className="text-xs text-slate-500 mt-1">
                                Target: {format(new Date(goal.target_date), 'MMM d, yyyy')}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={categoryColors[goal.category]}>
                              {goal.category}
                            </Badge>
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(goal, originalIdx)}>
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(originalIdx)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">Progress</span>
                            <span className="font-semibold text-purple-700">{goal.progress}%</span>
                          </div>
                          <Progress value={goal.progress} className="h-2" />
                          <div className="flex gap-2">
                            {[25, 50, 75, 100].map(val => (
                              <Button
                                key={val}
                                size="sm"
                                variant="outline"
                                onClick={() => handleUpdateProgress(originalIdx, val)}
                                className="flex-1 text-xs"
                              >
                                {val}%
                              </Button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Completed Goals */}
              {completedGoals.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-emerald-900">Completed Goals</h4>
                  {completedGoals.map((goal, idx) => {
                    const originalIdx = goals.indexOf(goal);
                    return (
                      <div key={originalIdx} className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <Check className="w-5 h-5 text-emerald-600 mt-0.5" />
                            <div>
                              <h5 className="font-semibold text-slate-900">{goal.goal}</h5>
                              <Badge className={categoryColors[goal.category]} variant="outline">
                                {goal.category}
                              </Badge>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(originalIdx)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <Target className="w-16 h-16 text-purple-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">No spiritual goals yet</h3>
              <p className="text-sm text-slate-500 mb-4">
                Set goals for your spiritual development
              </p>
              <Button onClick={() => setShowForm(true)} className="bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Goal
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Goal Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingIdx !== null ? 'Edit' : 'Add'} Spiritual Goal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Goal *</Label>
              <Textarea
                value={formData.goal}
                onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                placeholder="e.g., Memorize Surah Al-Mulk"
                rows={2}
              />
            </div>

            <div>
              <Label>Category</Label>
              <Select
                value={formData.category}
                onValueChange={(val) => setFormData({ ...formData, category: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quran">Quran</SelectItem>
                  <SelectItem value="prayer">Prayer</SelectItem>
                  <SelectItem value="fasting">Fasting</SelectItem>
                  <SelectItem value="charity">Charity</SelectItem>
                  <SelectItem value="character">Character</SelectItem>
                  <SelectItem value="knowledge">Knowledge</SelectItem>
                  <SelectItem value="worship">General Worship</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Target Date (Optional)</Label>
              <Input
                type="date"
                value={formData.target_date}
                onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSubmit} disabled={saveMutation.isPending} className="flex-1 bg-purple-600 hover:bg-purple-700">
                {editingIdx !== null ? 'Update' : 'Add'} Goal
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}