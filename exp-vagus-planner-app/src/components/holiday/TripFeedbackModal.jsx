import React, { useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Star, Heart, DollarSign, Plus, X, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

export default function TripFeedbackModal({ holiday, open, onClose }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    destination_rating: 0,
    destination_review: '',
    accommodation_rating: 0,
    accommodation_review: '',
    activities_rating: 0,
    activities_review: '',
    would_return: false,
    highlights: [],
    budget_accuracy: 'on_budget',
    budget_feedback: '',
    unexpected_expenses: [],
    recommendations_for_others: ''
  });
  const [newHighlight, setNewHighlight] = useState('');
  const [newExpense, setNewExpense] = useState({ category: '', description: '', amount: '' });

  const { data: expenses = [] } = useQuery({
    queryKey: ['holiday-expenses', holiday?.id],
    queryFn: () => SDK.entities.HolidayExpense.filter({ holiday_id: holiday.id }),
    enabled: !!holiday?.id && open
  });

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const budgetDiff = holiday?.budget ? totalSpent - holiday.budget : 0;

  const createFeedbackMutation = useMutation({
    mutationFn: (data) => SDK.entities.TripFeedback.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip-feedback'] });
      toast.success('Thank you for your feedback! This will help improve future suggestions.');
      onClose();
    }
  });

  const handleSubmit = () => {
    if (formData.destination_rating === 0) {
      toast.error('Please rate your destination');
      return;
    }

    createFeedbackMutation.mutate({
      holiday_id: holiday.id,
      ...formData
    });
  };

  const StarRating = ({ value, onChange, label }) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="transition-transform hover:scale-110"
          >
            <Star
              className={`w-8 h-8 ${
                star <= value
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-slate-300'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );

  const addHighlight = () => {
    if (newHighlight.trim()) {
      setFormData(prev => ({
        ...prev,
        highlights: [...prev.highlights, newHighlight.trim()]
      }));
      setNewHighlight('');
    }
  };

  const removeHighlight = (index) => {
    setFormData(prev => ({
      ...prev,
      highlights: prev.highlights.filter((_, i) => i !== index)
    }));
  };

  const addExpense = () => {
    if (newExpense.category && newExpense.amount) {
      setFormData(prev => ({
        ...prev,
        unexpected_expenses: [...prev.unexpected_expenses, {
          ...newExpense,
          amount: parseFloat(newExpense.amount)
        }]
      }));
      setNewExpense({ category: '', description: '', amount: '' });
    }
  };

  const removeExpense = (index) => {
    setFormData(prev => ({
      ...prev,
      unexpected_expenses: prev.unexpected_expenses.filter((_, i) => i !== index)
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="w-6 h-6 text-purple-600" />
            Trip Feedback: {holiday?.title}
          </DialogTitle>
          <p className="text-sm text-slate-600">
            Help us improve future travel suggestions by sharing your experience
          </p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Step 1: Destination & Experience */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <h3 className="font-semibold text-slate-800 mb-3">Destination Review</h3>
                
                <StarRating
                  value={formData.destination_rating}
                  onChange={(v) => setFormData({ ...formData, destination_rating: v })}
                  label="How would you rate this destination?"
                />

                <div className="mt-4 space-y-2">
                  <Label className="text-sm">Share your experience</Label>
                  <Textarea
                    value={formData.destination_review}
                    onChange={(e) => setFormData({ ...formData, destination_review: e.target.value })}
                    placeholder="What did you love about this destination? What could be improved?"
                    className="h-24"
                  />
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <Checkbox
                    checked={formData.would_return}
                    onCheckedChange={(checked) => setFormData({ ...formData, would_return: checked })}
                  />
                  <Label className="text-sm cursor-pointer">I would visit this destination again</Label>
                  <Heart className={`w-4 h-4 ml-2 ${formData.would_return ? 'fill-red-500 text-red-500' : 'text-slate-400'}`} />
                </div>
              </div>

              <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
                <h3 className="font-semibold text-slate-800 mb-3">Accommodation</h3>
                <StarRating
                  value={formData.accommodation_rating}
                  onChange={(v) => setFormData({ ...formData, accommodation_rating: v })}
                  label="Rate your accommodation"
                />
                <div className="mt-4 space-y-2">
                  <Textarea
                    value={formData.accommodation_review}
                    onChange={(e) => setFormData({ ...formData, accommodation_review: e.target.value })}
                    placeholder="Details about your stay..."
                    className="h-20"
                  />
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-slate-800 mb-3">Activities & Experiences</h3>
                <StarRating
                  value={formData.activities_rating}
                  onChange={(v) => setFormData({ ...formData, activities_rating: v })}
                  label="Rate your activities"
                />
                <div className="mt-4 space-y-2">
                  <Textarea
                    value={formData.activities_review}
                    onChange={(e) => setFormData({ ...formData, activities_review: e.target.value })}
                    placeholder="What activities did you do? What were the highlights?"
                    className="h-20"
                  />
                </div>
              </div>

              <Button onClick={() => setStep(2)} className="w-full bg-purple-600 hover:bg-purple-700">
                Continue to Budget Review
              </Button>
            </motion.div>
          )}

          {/* Step 2: Budget & Highlights */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  Budget Accuracy
                </h3>

                {holiday?.budget && (
                  <div className="mb-4 p-3 bg-white rounded border">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Planned Budget:</span>
                      <span className="font-medium">${holiday.budget.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Actual Spent:</span>
                      <span className="font-medium">${totalSpent.toFixed(2)}</span>
                    </div>
                    <div className={`flex justify-between text-sm font-semibold ${budgetDiff > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      <span>Difference:</span>
                      <span>{budgetDiff > 0 ? '+' : ''}{budgetDiff.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-sm">How accurate was your budget?</Label>
                  <Select
                    value={formData.budget_accuracy}
                    onValueChange={(v) => setFormData({ ...formData, budget_accuracy: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="under_budget">Under Budget 👍</SelectItem>
                      <SelectItem value="on_budget">On Budget ✅</SelectItem>
                      <SelectItem value="over_budget">Over Budget 📈</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="mt-4 space-y-2">
                  <Label className="text-sm">Budget feedback</Label>
                  <Textarea
                    value={formData.budget_feedback}
                    onChange={(e) => setFormData({ ...formData, budget_feedback: e.target.value })}
                    placeholder="Were there categories you under/overestimated? Any surprises?"
                    className="h-20"
                  />
                </div>

                <div className="mt-4 space-y-2">
                  <Label className="text-sm">Unexpected expenses</Label>
                  <div className="space-y-2">
                    {formData.unexpected_expenses.map((exp, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-white rounded border">
                        <span className="text-xs flex-1">{exp.category}: {exp.description} (${exp.amount})</span>
                        <button onClick={() => removeExpense(idx)} className="text-red-500">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Category"
                      value={newExpense.category}
                      onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                      className="flex-1"
                    />
                    <Input
                      placeholder="Description"
                      value={newExpense.description}
                      onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="Amount"
                      value={newExpense.amount}
                      onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                      className="w-24"
                    />
                    <Button size="sm" onClick={addExpense} variant="outline">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <h3 className="font-semibold text-slate-800 mb-3">Trip Highlights</h3>
                <div className="space-y-2 mb-3">
                  {formData.highlights.map((highlight, idx) => (
                    <Badge key={idx} className="mr-2 mb-2">
                      {highlight}
                      <button onClick={() => removeHighlight(idx)} className="ml-2">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a highlight..."
                    value={newHighlight}
                    onChange={(e) => setNewHighlight(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addHighlight()}
                  />
                  <Button size="sm" onClick={addHighlight} variant="outline">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Recommendations for future travelers</Label>
                <Textarea
                  value={formData.recommendations_for_others}
                  onChange={(e) => setFormData({ ...formData, recommendations_for_others: e.target.value })}
                  placeholder="What advice would you give to someone planning a similar trip?"
                  className="h-24"
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={() => setStep(1)} variant="outline" className="flex-1">
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={createFeedbackMutation.isPending}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  {createFeedbackMutation.isPending ? 'Submitting...' : 'Submit Feedback'}
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}