import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Target, Plus, TrendingUp, X, Pin, PinOff } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { motion, AnimatePresence } from 'framer-motion';
import GoalProgressTracker from './GoalProgressTracker';
import GoalForm from './GoalForm';

export default function GoalCalendarPanel({ isOpen, onClose, isPinned, onTogglePin, events = [], tasks = [] }) {
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);

  const { data: goals = [], refetch } = useQuery({
    queryKey: ['goals'],
    queryFn: () => SDK.entities.Goal.list(),
    enabled: isOpen
  });

  // Link events and tasks to goals
  const goalsWithLinks = goals.map(goal => {
    const linkedEvents = events.filter(e => e.goal_id === goal.id);
    const linkedTasks = tasks.filter(t => t.goal_id === goal.id);
    return { ...goal, linkedEvents, linkedTasks };
  });

  const activeGoals = goalsWithLinks.filter(g => g.status === 'active');

  if (!isOpen && !isPinned) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className={`fixed right-0 top-16 lg:top-0 bottom-16 lg:bottom-0 w-full sm:w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-40 overflow-hidden flex flex-col`}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-purple-600 to-pink-600 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              <h3 className="font-semibold">Goals</h3>
              <Badge variant="secondary" className="bg-white/20 text-white border-white/40">
                {activeGoals.length}
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={onTogglePin}
                className="text-white hover:bg-white/20 h-8 w-8"
              >
                {isPinned ? <Pin className="w-4 h-4" /> : <PinOff className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white hover:bg-white/20 h-8 w-8"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Add Goal Button */}
          <Button
            onClick={() => {
              setEditingGoal(null);
              setShowForm(true);
            }}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Goal
          </Button>

          {/* Overall Progress */}
          {activeGoals.length > 0 && (
            <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200 dark:border-purple-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Overall Progress
                  </span>
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                </div>
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round(
                    activeGoals.reduce((sum, g) => {
                      const progress = g.type === 'habit'
                        ? Math.min((g.linkedEvents.filter(e => e.completed).length / g.target_count) * 100, 100)
                        : g.type === 'milestone'
                        ? g.linkedTasks.length > 0
                          ? (g.linkedTasks.filter(t => t.status === 'completed').length / g.linkedTasks.length) * 100
                          : 0
                        : g.progress || 0;
                      return sum + progress;
                    }, 0) / activeGoals.length
                  )}%
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Across {activeGoals.length} active goal{activeGoals.length !== 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Goals List */}
          {activeGoals.length === 0 ? (
            <div className="text-center py-12">
              <Target className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No active goals yet
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Create your first goal to start tracking
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {goalsWithLinks
                .filter(g => g.status === 'active')
                .map(goal => (
                  <GoalProgressTracker
                    key={goal.id}
                    goal={goal}
                    linkedEvents={goal.linkedEvents}
                    linkedTasks={goal.linkedTasks}
                    onViewDetails={() => {
                      setEditingGoal(goal);
                      setShowForm(true);
                    }}
                  />
                ))}
            </div>
          )}
        </div>

        {/* Goal Form Modal */}
        {showForm && (
          <GoalForm
            isOpen={showForm}
            onClose={() => {
              setShowForm(false);
              setEditingGoal(null);
            }}
            goal={editingGoal}
            onSave={() => {
              refetch();
              setShowForm(false);
              setEditingGoal(null);
            }}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}