import React, { useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign, Plus, TrendingDown, AlertCircle, 
  Plane, Hotel, Utensils, MapPin, ShoppingBag, Car, MoreHorizontal,
  Trash2, Edit3, X, Users, Sparkles, Loader2
} from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORY_ICONS = {
  flights: Plane,
  accommodation: Hotel,
  food: Utensils,
  activities: MapPin,
  shopping: ShoppingBag,
  transport: Car,
  other: MoreHorizontal
};

const CATEGORY_COLORS = {
  flights: 'bg-blue-500',
  accommodation: 'bg-purple-500',
  food: 'bg-orange-500',
  activities: 'bg-green-500',
  shopping: 'bg-pink-500',
  transport: 'bg-yellow-500',
  other: 'bg-slate-500'
};

export default function BudgetTracker({ holiday }) {
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [formData, setFormData] = useState({
    category: 'food',
    title: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    split_type: 'none',
    split_with: []
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [categorizingExpense, setCategorizingExpense] = useState(false);

  const queryClient = useQueryClient();

  React.useEffect(() => {
    SDK.auth.me().then(setCurrentUser);
  }, []);

  const { data: shares = [] } = useQuery({
    queryKey: ['holiday-shares', holiday?.id],
    queryFn: () => SDK.entities.HolidayShare.filter({ holiday_id: holiday.id, status: 'accepted' }),
    enabled: !!holiday?.id
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['holiday-expenses', holiday?.id],
    queryFn: () => SDK.entities.HolidayExpense.filter({ holiday_id: holiday.id }),
    enabled: !!holiday?.id
  });

  const createMutation = useMutation({
    mutationFn: (data) => SDK.entities.HolidayExpense.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holiday-expenses'] });
      resetForm();
      toast.success('Expense added');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => SDK.entities.HolidayExpense.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holiday-expenses'] });
      resetForm();
      toast.success('Expense updated');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => SDK.entities.HolidayExpense.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holiday-expenses'] });
      toast.success('Expense deleted');
    }
  });

  const resetForm = () => {
    setFormData({
      category: 'food',
      title: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      notes: '',
      split_type: 'none',
      split_with: []
    });
    setShowForm(false);
    setEditingExpense(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!currentUser) return;

    let splitWithData = [];
    if (formData.split_type === 'equal' && formData.split_with.length > 0) {
      const splitAmount = parseFloat(formData.amount) / (formData.split_with.length + 1);
      splitWithData = formData.split_with.map(email => ({
        email,
        amount: splitAmount,
        paid: false
      }));
    } else if (formData.split_type === 'custom') {
      splitWithData = formData.split_with;
    }

    const expenseData = {
      holiday_id: holiday.id,
      category: formData.category,
      title: formData.title,
      amount: parseFloat(formData.amount),
      date: formData.date,
      notes: formData.notes,
      paid_by: currentUser.email,
      split_type: formData.split_type,
      split_with: splitWithData
    };

    if (editingExpense) {
      updateMutation.mutate({ id: editingExpense.id, data: expenseData });
    } else {
      createMutation.mutate(expenseData);
    }
  };

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setFormData({
      category: expense.category,
      title: expense.title,
      amount: expense.amount.toString(),
      date: expense.date,
      notes: expense.notes || '',
      split_type: expense.split_type || 'none',
      split_with: expense.split_with || []
    });
    setShowForm(true);
  };

  const toggleSplitWith = (email) => {
    if (formData.split_type !== 'equal') return;
    setFormData(prev => ({
      ...prev,
      split_with: prev.split_with.includes(email)
        ? prev.split_with.filter(e => e !== email)
        : [...prev.split_with, email]
    }));
  };

  const autoCategorizeExpense = async () => {
    if (!formData.title || !formData.amount) {
      toast.error('Please enter description and amount first');
      return;
    }

    setCategorizingExpense(true);
    try {
      const { data } = await SDK.functions.invoke('categorizeExpense', {
        title: formData.title,
        amount: parseFloat(formData.amount),
        notes: formData.notes
      });

      setFormData(prev => ({
        ...prev,
        category: data.category,
        title: data.suggested_title || prev.title
      }));
      toast.success('Expense categorized by AI!');
    } catch (error) {
      toast.error('Failed to categorize expense');
    } finally {
      setCategorizingExpense(false);
    }
  };

  const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const budget = holiday?.budget || 0;
  const remaining = budget - totalSpent;
  const percentUsed = budget > 0 ? (totalSpent / budget) * 100 : 0;

  const expensesByCategory = expenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
    return acc;
  }, {});

  const isOverBudget = totalSpent > budget && budget > 0;

  return (
    <Card className="p-4 bg-white border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-600" />
          <h3 className="font-semibold text-slate-800">Budget Tracker</h3>
        </div>
        <Button
          size="sm"
          onClick={() => setShowForm(!showForm)}
          variant={showForm ? "outline" : "default"}
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </Button>
      </div>

      {/* Budget Overview */}
      <div className="mb-4 p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-600">Total Budget</span>
          <span className="text-2xl font-bold text-slate-800">${budget.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-600">Spent</span>
          <span className={`text-lg font-semibold ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
            ${totalSpent.toLocaleString()}
          </span>
        </div>
        <Progress value={Math.min(percentUsed, 100)} className="h-2 mb-2" />
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">Remaining</span>
          <span className={`text-lg font-semibold ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
            ${Math.abs(remaining).toLocaleString()} {isOverBudget && 'over'}
          </span>
        </div>
        {isOverBudget && (
          <div className="flex items-center gap-2 mt-2 text-xs text-red-600">
            <AlertCircle className="w-4 h-4" />
            <span>You're over budget!</span>
          </div>
        )}
      </div>

      {/* Add Expense Form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSubmit}
            className="mb-4 p-4 bg-slate-50 rounded-lg space-y-3"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flights">Flights</SelectItem>
                    <SelectItem value="accommodation">Accommodation</SelectItem>
                    <SelectItem value="food">Food & Drinks</SelectItem>
                    <SelectItem value="activities">Activities</SelectItem>
                    <SelectItem value="transport">Transport</SelectItem>
                    <SelectItem value="shopping">Shopping</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  placeholder="0.00"
                  required
                  className="h-9"
                />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Description</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={autoCategorizeExpense}
                  disabled={categorizingExpense || !formData.title}
                  className="h-6 text-xs"
                >
                  {categorizingExpense ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  ) : (
                    <Sparkles className="w-3 h-3 mr-1" />
                  )}
                  AI Categorize
                </Button>
              </div>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="e.g., Dinner at restaurant"
                required
                className="h-9"
              />
            </div>
            
            {shares.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  Split Expense
                </Label>
                <Select 
                  value={formData.split_type} 
                  onValueChange={(v) => setFormData({...formData, split_type: v, split_with: []})}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Split</SelectItem>
                    <SelectItem value="equal">Split Equally</SelectItem>
                  </SelectContent>
                </Select>
                
                {formData.split_type === 'equal' && (
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500">Select collaborators to split with:</p>
                    {shares.map(share => (
                      <div key={share.id} className="flex items-center gap-2 p-2 bg-white rounded border">
                        <Checkbox
                          checked={formData.split_with.includes(share.shared_with)}
                          onCheckedChange={() => toggleSplitWith(share.shared_with)}
                        />
                        <span className="text-xs">{share.shared_with}</span>
                      </div>
                    ))}
                    {formData.split_with.length > 0 && (
                      <p className="text-xs text-slate-500">
                        Each person pays: ${(parseFloat(formData.amount || 0) / (formData.split_with.length + 1)).toFixed(2)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
            
            <div className="flex gap-2">
              <Button type="submit" size="sm" className="flex-1">
                {editingExpense ? 'Update' : 'Add'} Expense
              </Button>
              {editingExpense && (
                <Button type="button" size="sm" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              )}
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Category Breakdown */}
      {Object.keys(expensesByCategory).length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-slate-600 mb-2">Spending by Category</p>
          <div className="space-y-2">
            {Object.entries(expensesByCategory)
              .sort((a, b) => b[1] - a[1])
              .map(([category, amount]) => {
                const Icon = CATEGORY_ICONS[category];
                const color = CATEGORY_COLORS[category];
                const percent = budget > 0 ? (amount / budget) * 100 : 0;
                
                return (
                  <div key={category} className="flex items-center gap-2">
                    <div className={`p-1.5 rounded ${color} bg-opacity-20`}>
                      <Icon className={`w-3 h-3 ${color.replace('bg-', 'text-')}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-xs mb-0.5">
                        <span className="text-slate-700 capitalize">{category}</span>
                        <span className="font-medium">${amount.toLocaleString()}</span>
                      </div>
                      <Progress value={Math.min(percent, 100)} className="h-1" />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Expense List */}
      {expenses.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-600">Recent Expenses</p>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {expenses.slice().reverse().map((expense) => {
              const Icon = CATEGORY_ICONS[expense.category];
              
              return (
                <div
                  key={expense.id}
                  className="flex items-center justify-between p-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Icon className="w-4 h-4 text-slate-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-800 truncate">{expense.title}</p>
                      <p className="text-xs text-slate-500">{expense.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800">
                      ${expense.amount.toLocaleString()}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(expense)}
                      className="h-7 w-7 p-0"
                    >
                      <Edit3 className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(expense.id)}
                      className="h-7 w-7 p-0 text-red-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {expenses.length === 0 && !showForm && (
        <div className="text-center py-6 text-slate-400">
          <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No expenses tracked yet</p>
        </div>
      )}
    </Card>
  );
}