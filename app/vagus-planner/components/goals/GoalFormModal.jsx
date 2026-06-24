import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { AIDescriptionGenerator, AITaskSuggester } from './AIGoalAssistant';

const CATEGORIES = ['personal', 'professional', 'health', 'financial', 'learning', 'spiritual', 'relationships', 'other'];

export default function GoalFormModal({ isOpen, onClose, goal }) {
  const [form, setForm] = useState({
    title: '', description: '', category: 'personal',
    target_date: '', priority: 'medium', status: 'not_started',
    progress: 0, action_steps: [], notes: ''
  });
  const [newStep, setNewStep] = useState('');
  const [newStepDate, setNewStepDate] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    if (goal) setForm({ ...goal, action_steps: goal.action_steps || [] });
    else setForm({ title: '', description: '', category: 'personal', target_date: '', priority: 'medium', status: 'not_started', progress: 0, action_steps: [], notes: '' });
  }, [goal, isOpen]);

  const saveMutation = useMutation({
    mutationFn: (data) => goal ? base44.entities.Goal.update(goal.id, data) : base44.entities.Goal.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast.success(goal ? 'Goal updated!' : 'Goal created!');
      onClose();
    }
  });

  const addStep = () => {
    if (!newStep.trim()) return;
    setForm(prev => ({
      ...prev,
      action_steps: [...prev.action_steps, { title: newStep.trim(), completed: false, due_date: newStepDate }]
    }));
    setNewStep(''); setNewStepDate('');
  };

  const removeStep = (idx) => setForm(prev => ({ ...prev, action_steps: prev.action_steps.filter((_, i) => i !== idx) }));

  const toggleStep = (idx) => setForm(prev => ({
    ...prev,
    action_steps: prev.action_steps.map((s, i) => i === idx ? { ...s, completed: !s.completed } : s)
  }));

  const autoProgress = () => {
    const steps = form.action_steps;
    if (!steps.length) return form.progress;
    return Math.round((steps.filter(s => s.completed).length / steps.length) * 100);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title) return toast.error('Please enter a goal title');
    const progress = form.action_steps.length ? autoProgress() : form.progress;
    saveMutation.mutate({ ...form, progress });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{goal ? 'Edit Goal' : 'New Goal'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Goal Title *</Label>
            <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g., Memorize 10 Surahs" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Why is this goal important to you?" />
            <AIDescriptionGenerator
              title={form.title}
              category={form.category}
              onInsert={text => setForm(prev => ({ ...prev, description: text }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Target Date</Label>
              <Input type="date" value={form.target_date} onChange={e => setForm({ ...form, target_date: e.target.value })} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_started">Not Started</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Action Steps */}
          <div>
            <Label>Action Steps</Label>
            <AITaskSuggester
              title={form.title}
              description={form.description}
              category={form.category}
              onAddSteps={newSteps => setForm(prev => ({ ...prev, action_steps: [...prev.action_steps, ...newSteps] }))}
            />
            <div className="space-y-2 mt-2">
              {form.action_steps.map((step, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border">
                  <input
                    type="checkbox"
                    checked={step.completed}
                    onChange={() => toggleStep(idx)}
                    className="rounded"
                  />
                  <span className={`flex-1 text-sm ${step.completed ? 'line-through text-slate-400' : ''}`}>{step.title}</span>
                  {step.due_date && <span className="text-xs text-slate-400">{step.due_date}</span>}
                  <button type="button" onClick={() => removeStep(idx)}>
                    <X className="w-3.5 h-3.5 text-slate-400 hover:text-red-500" />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input value={newStep} onChange={e => setNewStep(e.target.value)} placeholder="Add a step..." className="flex-1 h-9 text-sm" />
                <Input type="date" value={newStepDate} onChange={e => setNewStepDate(e.target.value)} className="w-36 h-9 text-sm" />
                <Button type="button" size="sm" variant="outline" onClick={addStep}><Plus className="w-4 h-4" /></Button>
              </div>
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Any additional notes..." />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saveMutation.isPending} className="bg-teal-600 hover:bg-teal-700">
              {saveMutation.isPending ? 'Saving...' : 'Save Goal'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}