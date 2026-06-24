import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Target, Filter, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import GoalCard from './GoalCard';
import GoalFormModal from './GoalFormModal';
import GoalProgressSummary from './GoalProgressSummary';

export default function GoalsPanel() {
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: () => base44.entities.Goal.list('-created_date')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Goal.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast.success('Goal deleted');
    }
  });

  const filtered = goals.filter(g => {
    if (filterStatus !== 'all' && g.status !== filterStatus) return false;
    if (filterCategory !== 'all' && g.category !== filterCategory) return false;
    if (search && !g.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleEdit = (goal) => { setEditingGoal(goal); setShowForm(true); };
  const handleClose = () => { setShowForm(false); setEditingGoal(null); };

  return (
    <div className="space-y-4">
      <GoalProgressSummary goals={goals} />

      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          placeholder="Search goals..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1"
        />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="not_started">Not Started</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="on_hold">On Hold</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="personal">Personal</SelectItem>
            <SelectItem value="professional">Professional</SelectItem>
            <SelectItem value="health">Health</SelectItem>
            <SelectItem value="learning">Learning</SelectItem>
            <SelectItem value="spiritual">Spiritual</SelectItem>
            <SelectItem value="financial">Financial</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => { setEditingGoal(null); setShowForm(true); }} className="bg-teal-600 hover:bg-teal-700 whitespace-nowrap">
          <Plus className="w-4 h-4 mr-1" /> New Goal
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {[1,2,3].map(i => <div key={i} className="h-36 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Trophy className="w-16 h-16 mx-auto mb-3 text-slate-300" />
          <p className="text-slate-500 font-medium">No goals found</p>
          <p className="text-sm text-slate-400 mt-1">Create your first goal to get started</p>
          <Button onClick={() => setShowForm(true)} className="mt-4 bg-teal-600 hover:bg-teal-700">
            <Plus className="w-4 h-4 mr-1" /> Create Goal
          </Button>
        </div>
      ) : (
        <motion.div
          className="grid gap-3 md:grid-cols-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {filtered.map(goal => (
            <motion.div key={goal.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <GoalCard goal={goal} onEdit={handleEdit} onDelete={id => deleteMutation.mutate(id)} />
            </motion.div>
          ))}
        </motion.div>
      )}

      <GoalFormModal isOpen={showForm} onClose={handleClose} goal={editingGoal} />
    </div>
  );
}