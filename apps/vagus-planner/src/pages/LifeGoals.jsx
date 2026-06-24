import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Filter, TrendingUp, Target, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import LifeGoalCard from '@/components/lifegoals/LifeGoalCard';
import LifeGoalForm from '@/components/lifegoals/LifeGoalForm';
import LifeGoalDetails from '@/components/lifegoals/LifeGoalDetails';

export default function LifeGoals() {
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const queryClient = useQueryClient();

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['lifeGoals'],
    queryFn: () => base44.entities.LifeGoal.list('-created_date')
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.LifeGoal.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['lifeGoals']);
      toast.success('Life goal created successfully!');
      setShowForm(false);
    },
    onError: () => {
      toast.error('Failed to create goal');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LifeGoal.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['lifeGoals']);
      toast.success('Goal updated successfully!');
      setShowForm(false);
      setEditingGoal(null);
    },
    onError: () => {
      toast.error('Failed to update goal');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LifeGoal.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['lifeGoals']);
      toast.success('Goal deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete goal');
    }
  });

  const handleSubmit = (data) => {
    if (editingGoal) {
      updateMutation.mutate({ id: editingGoal.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (goal) => {
    setEditingGoal(goal);
    setShowForm(true);
  };

  const handleDelete = (goalId) => {
    if (confirm('Are you sure you want to delete this goal?')) {
      deleteMutation.mutate(goalId);
    }
  };

  const handleUpdateFromDetails = (updatedGoal) => {
    updateMutation.mutate({ id: updatedGoal.id, data: updatedGoal });
    setSelectedGoal(updatedGoal);
  };

  const filteredGoals = goals.filter(goal => {
    const matchesSearch = goal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         goal.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || goal.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || goal.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const stats = {
    total: goals.length,
    inProgress: goals.filter(g => g.status === 'in_progress').length,
    completed: goals.filter(g => g.status === 'completed').length,
    avgProgress: goals.length > 0 
      ? Math.round(goals.reduce((sum, g) => sum + (g.progress_percentage || 0), 0) / goals.length)
      : 0
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your life goals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Target className="w-8 h-8 text-primary" />
            Life Goals
          </h1>
          <p className="text-muted-foreground mt-1">
            Define, track, and achieve your long-term objectives
          </p>
        </div>
        <Button onClick={() => { setEditingGoal(null); setShowForm(true); }} size="lg">
          <Plus className="w-5 h-5 mr-2" />
          New Goal
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Goals</p>
              <p className="text-3xl font-bold mt-1">{stats.total}</p>
            </div>
            <Target className="w-12 h-12 text-blue-200 opacity-50" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">In Progress</p>
              <p className="text-3xl font-bold mt-1">{stats.inProgress}</p>
            </div>
            <TrendingUp className="w-12 h-12 text-orange-200 opacity-50" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Completed</p>
              <p className="text-3xl font-bold mt-1">{stats.completed}</p>
            </div>
            <CheckCircle2 className="w-12 h-12 text-green-200 opacity-50" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Avg Progress</p>
              <p className="text-3xl font-bold mt-1">{stats.avgProgress}%</p>
            </div>
            <div className="w-12 h-12 rounded-full border-4 border-purple-200 flex items-center justify-center">
              <span className="text-xs font-bold">{stats.avgProgress}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search goals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="spiritual">🕊️ Spiritual</SelectItem>
            <SelectItem value="professional">💼 Professional</SelectItem>
            <SelectItem value="fitness">💪 Fitness</SelectItem>
            <SelectItem value="financial">💰 Financial</SelectItem>
            <SelectItem value="personal">⭐ Personal</SelectItem>
            <SelectItem value="education">📚 Education</SelectItem>
            <SelectItem value="relationships">❤️ Relationships</SelectItem>
            <SelectItem value="creativity">🎨 Creativity</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="not_started">Not Started</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="on_hold">On Hold</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Goals Grid */}
      {filteredGoals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGoals.map((goal) => (
            <LifeGoalCard
              key={goal.id}
              goal={goal}
              onEdit={() => handleEdit(goal)}
              onDelete={() => handleDelete(goal.id)}
              onClick={() => setSelectedGoal(goal)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <Target className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-semibold mb-2">No goals found</h3>
          <p className="text-muted-foreground mb-6">
            {searchQuery || categoryFilter !== 'all' || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Start by creating your first life goal'}
          </p>
          {!searchQuery && categoryFilter === 'all' && statusFilter === 'all' && (
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Goal
            </Button>
          )}
        </div>
      )}

      {/* Modals */}
      <LifeGoalForm
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingGoal(null); }}
        onSubmit={handleSubmit}
        goal={editingGoal}
      />
      
      <LifeGoalDetails
        goal={selectedGoal}
        isOpen={!!selectedGoal}
        onClose={() => setSelectedGoal(null)}
        onUpdate={handleUpdateFromDetails}
      />
    </div>
  );
}