import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Bug, Lightbulb, Send, Upload, X, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const FEEDBACK_TYPES = [
  { value: 'feedback', label: 'General Feedback', icon: MessageSquare, color: 'blue' },
  { value: 'bug_report', label: 'Bug Report', icon: Bug, color: 'red' },
  { value: 'feature_request', label: 'Feature Request', icon: Lightbulb, color: 'amber' }
];

const CATEGORIES = [
  'calendar', 'islamic', 'tasks', 'travel', 'ui', 'performance', 'other'
];

export default function FeedbackSubmissionForm({ isOpen, onClose, initialType = 'feedback' }) {
  const [formData, setFormData] = useState({
    type: initialType,
    title: '',
    description: '',
    category: 'other'
  });
  const [submitted, setSubmitted] = useState(false);
  const queryClient = useQueryClient();

  const submitMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      return base44.entities.Feedback.create({
        ...data,
        user_email: user.email,
        user_name: user.full_name || user.email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
      setSubmitted(true);
      setTimeout(() => {
        onClose();
        setSubmitted(false);
        setFormData({ type: 'feedback', title: '', description: '', category: 'other' });
      }, 2000);
    },
    onError: () => {
      toast.error('Failed to submit feedback');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    submitMutation.mutate(formData);
  };

  const selectedType = FEEDBACK_TYPES.find(t => t.value === formData.type);
  const TypeIcon = selectedType?.icon || MessageSquare;

  if (submitted) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Thank You!</h3>
            <p className="text-slate-600">
              Your feedback has been submitted successfully. We'll review it shortly.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TypeIcon className={`w-5 h-5 text-${selectedType?.color}-600`} />
            Submit Feedback
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Type Selection */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-3 block">
              Feedback Type
            </label>
            <div className="grid grid-cols-3 gap-3">
              {FEEDBACK_TYPES.map((type) => {
                const Icon = type.icon;
                const isSelected = formData.type === type.value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, type: type.value })}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      isSelected
                        ? `border-${type.color}-500 bg-${type.color}-50`
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Icon className={`w-6 h-6 mx-auto mb-2 text-${type.color}-600`} />
                    <p className="text-xs font-medium text-slate-800">{type.label}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Category
            </label>
            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Title <span className="text-red-500">*</span>
            </label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Brief summary of your feedback"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Description <span className="text-red-500">*</span>
            </label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Provide detailed information..."
              rows={6}
              required
            />
            {formData.type === 'bug_report' && (
              <p className="text-xs text-slate-500 mt-2">
                💡 For bugs, please include: What you expected to happen, what actually happened, and steps to reproduce.
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              type="submit"
              className="flex-1 bg-teal-600 hover:bg-teal-700"
              disabled={submitMutation.isPending}
            >
              {submitMutation.isPending ? (
                <>Submitting...</>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Feedback
                </>
              )}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}