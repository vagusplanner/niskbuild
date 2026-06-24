import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DollarSign, Plus, Trash2, TrendingUp, Users } from 'lucide-react';
import { toast } from 'sonner';

const EXPENSE_TYPES = [
  { value: 'flight', label: '✈️ Flights' },
  { value: 'accommodation', label: '🏨 Accommodation' },
  { value: 'food', label: '🍽️ Food & Meals' },
  { value: 'transportation', label: '🚕 Local Transport' },
  { value: 'misc', label: '📦 Miscellaneous' }
];

export default function GroupExpenseTracker({ group, members = [] }) {
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [newExpense, setNewExpense] = useState({
    expense_type: 'food',
    description: '',
    amount: '',
    paid_by: '',
    date: new Date().toISOString().split('T')[0]
  });

  const queryClient = useQueryClient();

  const { data: expenses = [] } = useQuery({
    queryKey: ['groupExpenses', group.id],
    queryFn: async () => {
      const allExpenses = await base44.entities.HajjGroupExpense.list();
      return allExpenses.filter(e => e.group_id === group.id);
    }
  });

  const createExpenseMutation = useMutation({
    mutationFn: (data) => {
      const splitAmong = members.map(m => ({
        email: m.email || m,
        share: parseFloat(data.amount) / members.length
      }));

      return base44.entities.HajjGroupExpense.create({
        ...data,
        group_id: group.id,
        split_among: splitAmong,
        status: 'split'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groupExpenses', group.id] });
      setShowAddExpense(false);
      setNewExpense({ expense_type: 'food', description: '', amount: '', paid_by: '', date: new Date().toISOString().split('T')[0] });
      toast.success('Expense added!');
    }
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: (id) => base44.entities.HajjGroupExpense.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groupExpenses', group.id] });
      toast.success('Expense removed');
    }
  });

  const handleAddExpense = () => {
    if (!newExpense.description || !newExpense.amount || !newExpense.paid_by) {
      toast.error('Please fill in all fields');
      return;
    }
    createExpenseMutation.mutate(newExpense);
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const expensesByType = EXPENSE_TYPES.map(type => ({
    ...type,
    amount: expenses.filter(e => e.expense_type === type.value).reduce((sum, e) => sum + (e.amount || 0), 0)
  })).filter(t => t.amount > 0);

  // Calculate who owes whom
  const settlements = {};
  members.forEach(member => {
    const email = member.email || member;
    const paidByMember = expenses.filter(e => e.paid_by === email).reduce((sum, e) => sum + (e.amount || 0), 0);
    const owedByMember = expenses.reduce((sum, e) => {
      const share = e.split_among?.find(s => s.email === email);
      return sum + (share?.share || 0);
    }, 0);
    settlements[email] = paidByMember - owedByMember;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Group Expenses
        </h3>
        <Button onClick={() => setShowAddExpense(true)} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Expense
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Spent</p>
                <p className="text-2xl font-bold text-slate-900">${totalExpenses.toFixed(2)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-teal-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Per Person</p>
                <p className="text-2xl font-bold text-slate-900">${(totalExpenses / (members.length || 1)).toFixed(2)}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-slate-600">Expense Types</p>
              <p className="text-2xl font-bold text-slate-900">{expensesByType.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expense Breakdown */}
      {expensesByType.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Breakdown by Category</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {expensesByType.map(type => (
              <div key={type.value} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                <span className="text-sm">{type.label}</span>
                <span className="font-semibold">${type.amount.toFixed(2)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent Expenses */}
      {expenses.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold text-sm text-slate-700">Recent Expenses</h4>
          {expenses.slice(-5).reverse().map(expense => (
            <Card key={expense.id} className="bg-gradient-to-r from-slate-50 to-slate-100">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge className="text-xs">
                        {EXPENSE_TYPES.find(t => t.value === expense.expense_type)?.label}
                      </Badge>
                      <p className="font-medium text-sm">{expense.description}</p>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Paid by {expense.paid_by} on {new Date(expense.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">${expense.amount}</p>
                    <button
                      onClick={() => deleteExpenseMutation.mutate(expense.id)}
                      className="text-red-500 hover:text-red-700 text-xs mt-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Settlement Status */}
      {Object.keys(settlements).length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-base">Settlement Summary</CardTitle>
            <CardDescription>Who owes/is owed money</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(settlements).map(([email, balance]) => (
              <div key={email} className="flex items-center justify-between">
                <span className="text-sm text-slate-700">{email}</span>
                <span className={`font-semibold ${balance > 0 ? 'text-green-600' : balance < 0 ? 'text-red-600' : 'text-slate-600'}`}>
                  {balance > 0 ? '+' : ''} ${balance.toFixed(2)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Add Expense Dialog */}
      {showAddExpense && (
        <Dialog open={showAddExpense} onOpenChange={setShowAddExpense}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Group Expense</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Description</Label>
                <Input
                  placeholder="e.g., Hotel booking for 3 nights"
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Type</Label>
                  <Select value={newExpense.expense_type} onValueChange={(v) => setNewExpense({ ...newExpense, expense_type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Amount ($)</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Paid By</Label>
                  <Select value={newExpense.paid_by} onValueChange={(v) => setNewExpense({ ...newExpense, paid_by: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select member" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map(member => {
                        const email = member.email || member;
                        return <SelectItem key={email} value={email}>{email}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={newExpense.date}
                    onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowAddExpense(false)} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddExpense}
                  disabled={createExpenseMutation.isPending}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  Add Expense
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}