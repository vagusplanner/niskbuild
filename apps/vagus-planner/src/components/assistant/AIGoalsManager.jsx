import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Target, Plus, Sparkles, Trash2, Loader2, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

const GOAL_TYPES = [
  { value: 'sadaqah_recipients', label: '💚 Find Sadaqah Recipients', icon: '🤲' },
  { value: 'islamic_events', label: '📅 Islamic Events Near Me', icon: '🕌' },
  { value: 'hajj_umrah_planning', label: '🕋 Hajj/Umrah Planning', icon: '✈️' },
  { value: 'quran_learning', label: '📖 Quran Learning Path', icon: '📚' },
  { value: 'health_wellness', label: '💪 Health & Wellness', icon: '🏃' },
  { value: 'financial_planning', label: '💰 Financial Planning', icon: '📊' },
  { value: 'custom', label: '✨ Custom Goal', icon: '⭐' }
];

export default function AIGoalsManager({ isOpen, onClose }) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [newGoal, setNewGoal] = useState({
    goal_type: 'sadaqah_recipients',
    goal_description: '',
    priority: 3
  });

  const queryClient = useQueryClient();

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['aiGoals'],
    queryFn: () => base44.entities.AIPersonalization.list('-priority')
  });

  const { data: analysis, refetch: refetchAnalysis } = useQuery({
    queryKey: ['userAnalysis'],
    queryFn: async () => {
      const res = await base44.functions.invoke('analyzeUserPersonalization', {});
      return res.data;
    },
    enabled: isOpen
  });

  const createGoalMutation = useMutation({
    mutationFn: (data) => base44.entities.AIPersonalization.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiGoals'] });
      setShowCreateForm(false);
      setNewGoal({ goal_type: 'sadaqah_recipients', goal_description: '', priority: 3 });
      toast.success('AI goal created successfully!');
    }
  });

  const toggleGoalMutation = useMutation({
    mutationFn: ({ id, is_active }) => 
      base44.entities.AIPersonalization.update(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiGoals'] });
    }
  });

  const deleteGoalMutation = useMutation({
    mutationFn: (id) => base44.entities.AIPersonalization.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiGoals'] });
      toast.success('Goal deleted');
    }
  });

  const handleAnalyze = async () => {
    setAnalyzing(true);
    await refetchAnalysis();
    setAnalyzing(false);
    toast.success('Analysis complete!');
  };

  const handleCreateFromSuggestion = (suggestion) => {
    setNewGoal({
      goal_type: suggestion.type,
      goal_description: suggestion.message,
      priority: 4
    });
    setShowCreateForm(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-teal-600" />
            AI Personalization & Goals
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Analysis Summary */}
          {analysis && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Your Patterns</CardTitle>
                    <CardDescription>AI insights from your activity</CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleAnalyze}
                    disabled={analyzing}
                  >
                    {analyzing ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing</>
                    ) : (
                      <><TrendingUp className="w-4 h-4 mr-2" /> Refresh</>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-emerald-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-emerald-700">
                      {Object.keys(analysis.analysis.charity_patterns.favorite_categories).length || 0}
                    </div>
                    <div className="text-sm text-emerald-600">Charity Categories</div>
                  </div>
                  <div className="bg-teal-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-teal-700">
                      {analysis.analysis.islamic_engagement.quran_reading_frequency}
                    </div>
                    <div className="text-sm text-teal-600">Quran Engagement</div>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-700">
                      {Object.keys(analysis.analysis.event_patterns.common_categories).length}
                    </div>
                    <div className="text-sm text-blue-600">Event Types</div>
                  </div>
                </div>

                {/* AI Suggestions */}
                {analysis.suggestions?.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className="font-semibold text-sm text-slate-700">AI Suggestions</h4>
                    {analysis.suggestions.map((suggestion, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <Sparkles className="w-5 h-5 text-amber-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm text-slate-700">{suggestion.message}</p>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleCreateFromSuggestion(suggestion)}
                        >
                          Create Goal
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Active Goals */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Your AI Goals</h3>
              <Button onClick={() => setShowCreateForm(true)} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                New Goal
              </Button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : goals.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-slate-500">
                  No AI goals yet. Create one to get personalized suggestions!
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {goals.map(goal => {
                  const goalType = GOAL_TYPES.find(t => t.value === goal.goal_type);
                  return (
                    <Card key={goal.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="text-2xl">{goalType?.icon}</div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-slate-900">{goalType?.label}</h4>
                              <Badge variant={goal.is_active ? 'default' : 'secondary'}>
                                {goal.is_active ? 'Active' : 'Paused'}
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-600">{goal.goal_description}</p>
                            {goal.last_suggestion_date && (
                              <p className="text-xs text-slate-400 mt-2">
                                Last suggestion: {new Date(goal.last_suggestion_date).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={goal.is_active}
                              onCheckedChange={(checked) => 
                                toggleGoalMutation.mutate({ id: goal.id, is_active: checked })
                              }
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteGoalMutation.mutate(goal.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Create Form */}
          {showCreateForm && (
            <Card className="border-teal-200 bg-teal-50/50">
              <CardHeader>
                <CardTitle className="text-lg">Create New AI Goal</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Goal Type</Label>
                  <Select 
                    value={newGoal.goal_type}
                    onValueChange={(v) => setNewGoal({ ...newGoal, goal_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GOAL_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.icon} {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Goal Description</Label>
                  <Textarea
                    placeholder="Describe what you want the AI to help you with..."
                    value={newGoal.goal_description}
                    onChange={(e) => setNewGoal({ ...newGoal, goal_description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Priority (1-5)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="5"
                    value={newGoal.priority}
                    onChange={(e) => setNewGoal({ ...newGoal, priority: parseInt(e.target.value) })}
                  />
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={() => setShowCreateForm(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => createGoalMutation.mutate(newGoal)}
                    disabled={!newGoal.goal_description}
                    className="flex-1 bg-teal-600 hover:bg-teal-700"
                  >
                    Create Goal
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}