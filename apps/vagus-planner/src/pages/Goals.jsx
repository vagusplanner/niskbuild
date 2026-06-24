import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Filter, TrendingUp, Target, CheckCircle2, Moon, Heart, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import LifeGoalCard from '@/components/lifegoals/LifeGoalCard';
import LifeGoalForm from '@/components/lifegoals/LifeGoalForm';
import LifeGoalDetails from '@/components/lifegoals/LifeGoalDetails';
import SpiritualGoalsManager from '@/components/profile/SpiritualGoalsManager';
import AIGoalAssistant from '@/components/profile/AIGoalAssistant';
import AIGoalPlanner from '@/components/goals/AIGoalPlanner';
import PullToRefresh from '@/components/mobile/PullToRefresh';

export default function Goals() {
  const { t } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('life');
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  
  const queryClient = useQueryClient();

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['lifeGoals'],
    queryFn: async () => {
      try {
        const list = await base44.entities.LifeGoal.list('-created_date');
        return list ?? [];
      } catch (error) {
        console.error('Error fetching goals:', error);
        return [];
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.LifeGoal.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['lifeGoals']);
      toast.success('Goal created!');
      setShowForm(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LifeGoal.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['lifeGoals']);
      setShowForm(false);
      setEditingGoal(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LifeGoal.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['lifeGoals']);
      toast.success('Goal deleted');
    }
  });

  const handleSubmit = (data) => {
    if (editingGoal) {
      updateMutation.mutate({ id: editingGoal.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['lifeGoals'] });
  };

  const filteredGoals = (goals ?? []).filter(goal => {
    const matchesSearch = goal.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         goal.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || goal.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || goal.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const stats = {
    total: (goals ?? []).length,
    inProgress: (goals ?? []).filter(g => g.status === 'in_progress').length,
    completed: (goals ?? []).filter(g => g.status === 'completed').length,
    avgProgress: (goals ?? []).length > 0
      ? Math.round((goals ?? []).reduce((sum, g) => sum + (g?.progress || 0), 0) / goals.length)
      : 0
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-2xl p-5 shadow-lg" style={{background:'linear-gradient(135deg, #1B2A4A 0%, #0D4F6C 55%, #1D6FB8 100%)', border:'1px solid rgba(41,171,226,0.3)'}}>
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{background:'linear-gradient(90deg, #E8B84B, #29ABE2, #1D6FB8)'}} />
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-12 translate-x-12" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-5 h-5" style={{color:'#E8B84B'}} />
            <span className="text-xs font-bold uppercase tracking-widest" style={{color:'#A8C8E8'}}>Goals & Aspirations</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Goals & Aspirations</h1>
          <p className="text-sm mt-1" style={{color:'#A8C8E8'}}>Life, spiritual, and personal growth objectives</p>
          <div className="mt-3 h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
        {[
          { id: 'life', label: 'Life Goals', icon: Target, color: 'text-[#1D6FB8]' },
          { id: 'spiritual', label: 'Spiritual Goals', icon: Moon, color: 'text-[#E8B84B]' },
          { id: 'planner', label: 'AI Goal Planner', icon: Zap, color: 'text-[#29ABE2]' },
          { id: 'ai', label: 'AI Assistant', icon: Zap, color: 'text-[#4A55A2]' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === tab.id
                ? 'border-[#1D6FB8] text-[#1D6FB8]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? tab.color : ''}`} />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'life' && (
          <motion.div key="life" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { label: 'Total', value: stats.total, icon: Target, color: 'from-[#1D6FB8] to-[#29ABE2]' },
                { label: 'In Progress', value: stats.inProgress, icon: TrendingUp, color: 'from-[#2980B9] to-[#1D6FB8]' },
                { label: 'Completed', value: stats.completed, icon: CheckCircle2, color: 'from-[#0D4F6C] to-[#1B2A4A]' },
                { label: 'Avg Progress', value: `${stats.avgProgress}%`, icon: Zap, color: 'from-[#4A55A2] to-[#1D6FB8]' }
              ].map((stat, i) => (
                <div key={i} className={`bg-gradient-to-br ${stat.color} text-white rounded-xl p-6 shadow-lg`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/70 text-sm font-medium">{stat.label}</p>
                      <p className="text-3xl font-bold mt-1">{stat.value}</p>
                    </div>
                    <stat.icon className="w-12 h-12 opacity-30" />
                  </div>
                </div>
              ))}
            </div>

            {/* Filters & Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search goals..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="spiritual">🕊️ Spiritual</SelectItem>
                  <SelectItem value="professional">💼 Professional</SelectItem>
                  <SelectItem value="fitness">💪 Fitness</SelectItem>
                  <SelectItem value="financial">💰 Financial</SelectItem>
                  <SelectItem value="personal">⭐ Personal</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => { setEditingGoal(null); setShowForm(true); }} className="bg-[#1D6FB8] hover:bg-[#2980B9]">
                <Plus className="w-4 h-4 mr-2" /> New Goal
              </Button>
            </div>

            {/* Goals Grid */}
            {filteredGoals.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredGoals.map((goal) => (
                  <LifeGoalCard
                    key={goal.id}
                    goal={goal}
                    onEdit={() => { setEditingGoal(goal); setShowForm(true); }}
                    onDelete={() => { if (confirm('Delete?')) deleteMutation.mutate(goal.id); }}
                    onClick={() => setSelectedGoal(goal)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-slate-50 dark:bg-slate-900/30 rounded-2xl">
                <Target className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-600">No goals yet</h3>
                <p className="text-slate-400 mt-1">Create your first goal to get started</p>
                <Button onClick={() => setShowForm(true)} className="mt-4 bg-[#1D6FB8] hover:bg-[#2980B9]">
                  <Plus className="w-4 h-4 mr-2" /> Create Goal
                </Button>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'planner' && (
          <motion.div key="planner" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <AIGoalPlanner />
          </motion.div>
        )}

        {activeTab === 'spiritual' && (
          <motion.div key="spiritual" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <SpiritualGoalsManager />
          </motion.div>
        )}

        {activeTab === 'ai' && (
          <motion.div key="ai" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#4A55A2]" />
              AI Goal Assistant
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">Get personalized recommendations and track progress with AI insights</p>
            <Button onClick={() => setShowAIAssistant(true)} className="bg-[#4A55A2] hover:bg-[#1D6FB8]">
              <Zap className="w-4 h-4 mr-2" /> Open AI Assistant
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

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
        onUpdate={(updated) => updateMutation.mutate({ id: updated.id, data: updated })}
      />
      <AIGoalAssistant isOpen={showAIAssistant} onClose={() => setShowAIAssistant(false)} />
    </div>
    </PullToRefresh>
  );
}