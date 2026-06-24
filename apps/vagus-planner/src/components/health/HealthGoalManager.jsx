import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Target, Plus, TrendingDown, Clock, Moon, Heart, Dumbbell, Brain, X, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const GOAL_TYPES = [
  { value: 'weight_loss', label: 'Lose Weight', icon: TrendingDown, unit: 'kg' },
  { value: 'weight_gain', label: 'Gain Weight', icon: TrendingDown, unit: 'kg' },
  { value: 'sleep', label: 'Better Sleep', icon: Moon, unit: 'hours' },
  { value: 'exercise', label: 'Exercise More', icon: Dumbbell, unit: 'times/week' },
  { value: 'meditation', label: 'Daily Meditation', icon: Brain, unit: 'mins/day' },
  { value: 'water', label: 'Hydration', icon: Heart, unit: 'liters/day' },
  { value: 'steps', label: 'Daily Steps', icon: Dumbbell, unit: 'steps' }
];

export default function HealthGoalManager() {
  const [showDialog, setShowDialog] = useState(false);
  const [newGoal, setNewGoal] = useState({
    goal_type: '',
    title: '',
    target_value: '',
    current_value: '',
    deadline: ''
  });

  const queryClient = useQueryClient();

  const { data: goals = [] } = useQuery({
    queryKey: ['healthGoals'],
    queryFn: () => base44.entities.Goal.filter({ category: 'health', status: 'active' })
  });

  const createGoalMutation = useMutation({
    mutationFn: (data) => base44.entities.Goal.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['healthGoals'] });
      queryClient.invalidateQueries({ queryKey: ['healthCoachAnalysis'] });
      toast.success('Health goal added!');
      setShowDialog(false);
      setNewGoal({ goal_type: '', title: '', target_value: '', current_value: '', deadline: '' });
    }
  });

  const updateGoalMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Goal.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['healthGoals'] });
      toast.success('Progress updated!');
    }
  });

  const deleteGoalMutation = useMutation({
    mutationFn: (id) => base44.entities.Goal.update(id, { status: 'completed' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['healthGoals'] });
      toast.success('Goal completed!');
    }
  });

  const handleCreateGoal = () => {
    if (!newGoal.goal_type || !newGoal.title || !newGoal.target_value) {
      toast.error('Please fill in all required fields');
      return;
    }

    createGoalMutation.mutate({
      title: newGoal.title,
      category: 'health',
      description: `Health goal: ${newGoal.goal_type}`,
      target_date: newGoal.deadline || null,
      status: 'active',
      progress: 0,
      metadata: {
        goal_type: newGoal.goal_type,
        target_value: parseFloat(newGoal.target_value),
        current_value: parseFloat(newGoal.current_value) || 0,
        unit: GOAL_TYPES.find(t => t.value === newGoal.goal_type)?.unit
      }
    });
  };

  const updateProgress = (goal, newValue) => {
    const progress = Math.min(100, (newValue / goal.metadata.target_value) * 100);
    updateGoalMutation.mutate({
      id: goal.id,
      data: {
        progress,
        metadata: { ...goal.metadata, current_value: parseFloat(newValue) }
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <Target className="w-5 h-5 text-purple-600" />
          My Health Goals
        </h3>
        <Button onClick={() => setShowDialog(true)} size="sm" className="bg-purple-600 hover:bg-purple-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Goal
        </Button>
      </div>

      {goals.length === 0 ? (
        <Card className="border-2 border-dashed border-purple-200">
          <CardContent className="py-8 text-center">
            <Target className="w-12 h-12 text-purple-300 mx-auto mb-3" />
            <p className="text-slate-600 text-sm">No health goals yet. Add one to get started!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {goals.map((goal) => {
            const goalType = GOAL_TYPES.find(t => t.value === goal.metadata?.goal_type);
            const Icon = goalType?.icon || Target;
            
            return (
              <motion.div key={goal.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="hover:border-purple-300 transition-all">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Icon className="w-5 h-5 text-purple-600" />
                        <h4 className="font-semibold text-slate-800">{goal.title}</h4>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteGoalMutation.mutate(goal.id)}
                          className="h-7 w-7"
                        >
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Current:</span>
                        <Input
                          type="number"
                          value={goal.metadata?.current_value || 0}
                          onChange={(e) => updateProgress(goal, e.target.value)}
                          className="w-24 h-7 text-right"
                        />
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Target:</span>
                        <span className="font-semibold text-slate-800">
                          {goal.metadata?.target_value} {goal.metadata?.unit}
                        </span>
                      </div>
                      <Progress value={goal.progress || 0} className="h-2" />
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">{Math.round(goal.progress || 0)}% complete</span>
                        {goal.target_date && (
                          <Badge variant="outline" className="text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            {new Date(goal.target_date).toLocaleDateString()}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add Goal Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Health Goal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Goal Type</Label>
              <Select value={newGoal.goal_type} onValueChange={(v) => setNewGoal({ ...newGoal, goal_type: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select goal type" />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Goal Title</Label>
              <Input
                placeholder="e.g., Lose 5kg by summer"
                value={newGoal.title}
                onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Current Value</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={newGoal.current_value}
                  onChange={(e) => setNewGoal({ ...newGoal, current_value: e.target.value })}
                />
              </div>
              <div>
                <Label>Target Value</Label>
                <Input
                  type="number"
                  placeholder="Target"
                  value={newGoal.target_value}
                  onChange={(e) => setNewGoal({ ...newGoal, target_value: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Deadline (Optional)</Label>
              <Input
                type="date"
                value={newGoal.deadline}
                onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
              />
            </div>

            <Button onClick={handleCreateGoal} className="w-full bg-purple-600 hover:bg-purple-700">
              Create Goal
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}