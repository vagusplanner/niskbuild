import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { X, Plus, Trash2, ArrowDown, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import WorkflowAISuggestions from './WorkflowAISuggestions';
import AIStepGenerator from './AIStepGenerator';
import WorkflowOptimizer from './WorkflowOptimizer';

export default function WorkflowBuilder({ workflow, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true,
    trigger_type: 'manual',
    trigger_config: {},
    steps: []
  });

  useEffect(() => {
    if (workflow) {
      setFormData({
        name: workflow.name || '',
        description: workflow.description || '',
        is_active: workflow.is_active ?? true,
        trigger_type: workflow.trigger_type || 'manual',
        trigger_config: workflow.trigger_config || {},
        steps: workflow.steps || []
      });
    }
  }, [workflow]);

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (workflow) {
        return base44.entities.WorkflowAutomation.update(workflow.id, data);
      }
      return base44.entities.WorkflowAutomation.create(data);
    },
    onSuccess: () => {
      toast.success('Workflow saved successfully');
      onSave();
    },
    onError: (error) => {
      toast.error(`Failed to save: ${error.message}`);
    }
  });

  const addStep = () => {
    const newStep = {
      id: `step_${Date.now()}`,
      type: 'send_notification',
      config: {},
      conditions: [],
      on_success: null,
      on_failure: null
    };
    setFormData(prev => ({
      ...prev,
      steps: [...prev.steps, newStep]
    }));
  };

  const updateStep = (index, updates) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.map((step, i) => i === index ? { ...step, ...updates } : step)
    }));
  };

  const removeStep = (index) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index)
    }));
  };

  const handleSave = () => {
    if (!formData.name) {
      toast.error('Please enter a workflow name');
      return;
    }
    if (formData.steps.length === 0) {
      toast.error('Please add at least one step');
      return;
    }
    saveMutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">
            {workflow ? 'Edit Workflow' : 'Create Workflow'}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label>Workflow Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Send reminder after task completion"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="What does this workflow do?"
                rows={2}
              />
            </div>
          </div>

          {/* Trigger */}
          <Card className="p-4 bg-purple-50 border-purple-200">
            <h3 className="font-semibold text-slate-800 mb-3">Trigger</h3>
            <Label>When should this workflow run?</Label>
            <Select value={formData.trigger_type} onValueChange={(value) => setFormData(prev => ({ ...prev, trigger_type: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="event_created">When Event Created</SelectItem>
                <SelectItem value="event_updated">When Event Updated</SelectItem>
                <SelectItem value="task_completed">When Task Completed</SelectItem>
                <SelectItem value="meeting_created">When Meeting Created</SelectItem>
                <SelectItem value="conflict_detected">When Conflict Detected</SelectItem>
                <SelectItem value="daily_schedule">Daily (Scheduled)</SelectItem>
                <SelectItem value="prayer_time">At Prayer Time</SelectItem>
                <SelectItem value="manual">Manual Trigger</SelectItem>
              </SelectContent>
            </Select>
          </Card>

          {/* AI Workflow Optimizer */}
          {formData.steps.length > 0 && (
            <WorkflowOptimizer
              workflow={formData}
              onApplyOptimizations={(optimizations) => {
                // Apply AI optimizations
                if (optimizations.optimal_order) {
                  const reorderedSteps = optimizations.optimal_order.map(idx => formData.steps[idx]);
                  setFormData(prev => ({ ...prev, steps: reorderedSteps }));
                }
                toast.success('Applied AI optimizations');
              }}
            />
          )}

          {/* AI Suggestions */}
          <WorkflowAISuggestions
            triggerType={formData.trigger_type}
            existingSteps={formData.steps}
            onApplySuggestion={(step) => {
              setFormData(prev => ({
                ...prev,
                steps: [...prev.steps, step]
              }));
              toast.success('Step added from AI suggestion');
            }}
          />

          {/* Steps */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-800">Actions</h3>
              <Button onClick={addStep} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-1" />
                Add Step
              </Button>
            </div>

            <div className="space-y-3">
              {formData.steps.map((step, index) => (
                <Card key={step.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-purple-100 text-purple-700 rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center justify-between">
                        <Select 
                          value={step.type} 
                          onValueChange={(value) => updateStep(index, { type: value })}
                        >
                          <SelectTrigger className="w-64">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="send_notification">Send Notification</SelectItem>
                            <SelectItem value="send_email">Send Email</SelectItem>
                            <SelectItem value="create_event">Create Event</SelectItem>
                            <SelectItem value="update_event">Update Event</SelectItem>
                            <SelectItem value="create_task">Create Task</SelectItem>
                            <SelectItem value="invoke_function">Call Function</SelectItem>
                            <SelectItem value="wait">Wait/Delay</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeStep(index)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* AI Step Generator */}
                      <AIStepGenerator
                        stepType={step.type}
                        workflowContext={{ name: formData.name, description: formData.description }}
                        triggerType={formData.trigger_type}
                        onApply={(aiConfig) => updateStep(index, { config: { ...step.config, ...aiConfig } })}
                      />

                      {/* Step Configuration */}
                      <StepConfig step={step} onChange={(config) => updateStep(index, { config })} />
                    </div>
                  </div>
                  {index < formData.steps.length - 1 && (
                    <div className="flex justify-center mt-2">
                      <ArrowDown className="w-5 h-5 text-slate-400" />
                    </div>
                  )}
                </Card>
              ))}

              {formData.steps.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <Settings className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                  <p>No steps added yet. Click "Add Step" to begin.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t p-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleSave} 
            disabled={saveMutation.isPending}
            className="bg-gradient-to-r from-purple-500 to-pink-600"
          >
            {saveMutation.isPending ? 'Saving...' : 'Save Workflow'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function StepConfig({ step, onChange }) {
  const config = step.config || {};

  const handleChange = (key, value) => {
    onChange({ ...config, [key]: value });
  };

  switch (step.type) {
    case 'send_notification':
      return (
        <div className="space-y-2">
          <Input
            placeholder="Notification title"
            value={config.title || ''}
            onChange={(e) => handleChange('title', e.target.value)}
          />
          <Textarea
            placeholder="Message (use {{field}} for dynamic values)"
            value={config.message || ''}
            onChange={(e) => handleChange('message', e.target.value)}
            rows={2}
          />
        </div>
      );

    case 'send_email':
      return (
        <div className="space-y-2">
          <Input
            placeholder="Recipient email (or {{user_email}})"
            value={config.recipient || ''}
            onChange={(e) => handleChange('recipient', e.target.value)}
          />
          <Input
            placeholder="Email subject"
            value={config.subject || ''}
            onChange={(e) => handleChange('subject', e.target.value)}
          />
          <Textarea
            placeholder="Email body"
            value={config.body || ''}
            onChange={(e) => handleChange('body', e.target.value)}
            rows={3}
          />
        </div>
      );

    case 'create_event':
      return (
        <div className="space-y-2">
          <Input
            placeholder="Event title"
            value={config.title || ''}
            onChange={(e) => handleChange('title', e.target.value)}
          />
          <Textarea
            placeholder="Description"
            value={config.description || ''}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={2}
          />
        </div>
      );

    case 'create_task':
      return (
        <div className="space-y-2">
          <Input
            placeholder="Task title"
            value={config.title || ''}
            onChange={(e) => handleChange('title', e.target.value)}
          />
          <Select value={config.priority || 'medium'} onValueChange={(v) => handleChange('priority', v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low Priority</SelectItem>
              <SelectItem value="medium">Medium Priority</SelectItem>
              <SelectItem value="high">High Priority</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );

    case 'invoke_function':
      return (
        <Input
          placeholder="Function name (e.g., sendHealthNudges)"
          value={config.function_name || ''}
          onChange={(e) => handleChange('function_name', e.target.value)}
        />
      );

    case 'wait':
      return (
        <Input
          type="number"
          placeholder="Delay in milliseconds (e.g., 5000 = 5 seconds)"
          value={config.duration_ms || ''}
          onChange={(e) => handleChange('duration_ms', parseInt(e.target.value))}
        />
      );

    default:
      return <p className="text-sm text-slate-500">Configure this step</p>;
  }
}