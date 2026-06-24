import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { Search, Trash2, Plus, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { CATEGORY_LABELS, TYPE_COLORS } from './SmartExpenseForm';

const TYPE_SIGN = { expense: '-', income: '+', saving: '', zakat: '', sadaqa: '' };
const TYPE_TEXT_COLOR = { expense: 'text-red-600', income: 'text-emerald-600', saving: 'text-blue-600', zakat: 'text-amber-600', sadaqa: 'text-purple-600' };

export default function FinanceHistory({ onAddEntry }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [catFilter, setCatFilter] = useState('all');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch (error) {
        console.error('Error fetching user:', error);
        return null;
      }
    },
  });

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      try {
        const list = await base44.entities.Expense.filter({ created_by: user.email }, '-date', 500);
        return list ?? [];
      } catch (error) {
        console.error('Error fetching expenses:', error);
        return [];
      }
    },
    enabled: !!user?.email,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Expense.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Entry deleted');
    },
  });

  const filtered = (expenses ?? []).filter(e => {
    const matchSearch = !search || (e.description?.toLowerCase().includes(search.toLowerCase()) || e.category?.includes(search.toLowerCase()));
    const matchType = typeFilter === 'all' || e.type === typeFilter;
    const matchCat = catFilter === 'all' || e.category === catFilter;
    return matchSearch && matchType && matchCat;
  });

  const allCategories = [...new Set(expenses.map(e => e.category).filter(Boolean))];

  return (
    <div className="space-y-4 mt-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search transactions..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-36">
            <Filter className="w-3.5 h-3.5 mr-1.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
            <SelectItem value="income">Income</SelectItem>
            <SelectItem value="saving">Saving</SelectItem>
            <SelectItem value="zakat">Zakat</SelectItem>
            <SelectItem value="sadaqa">Sadaqa</SelectItem>
          </SelectContent>
        </Select>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {allCategories.map(c => (
              <SelectItem key={c} value={c}>{CATEGORY_LABELS[c] || c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="text-xs text-slate-400 font-medium">{filtered.length} transactions</div>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-8 text-slate-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <p className="text-slate-500 mb-4">{expenses.length === 0 ? 'No transactions yet.' : 'No results match your filters.'}</p>
            {expenses.length === 0 && (
              <Button onClick={onAddEntry} size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4 mr-1" /> Add First Entry
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(exp => (
            <Card key={exp.id} className="hover:shadow-md transition-shadow group">
              <CardContent className="p-3.5 flex items-center gap-3">
                <div className={`w-1.5 h-10 rounded-full flex-shrink-0 ${TYPE_COLORS[exp.type] || 'bg-slate-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                    {exp.description || CATEGORY_LABELS[exp.category] || exp.category}
                  </p>
                  <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <span>{format(new Date(exp.date), 'MMM d, yyyy')}</span>
                    <span>·</span>
                    <span className="capitalize">{CATEGORY_LABELS[exp.category]?.replace(/^.*? /, '') || exp.category}</span>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className={`text-base font-black ${TYPE_TEXT_COLOR[exp.type] || 'text-slate-700'}`}>
                    {TYPE_SIGN[exp.type]}${exp.amount?.toFixed(2)}
                  </p>
                  <button
                    onClick={() => deleteMutation.mutate(exp.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 transition-all rounded-lg hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}