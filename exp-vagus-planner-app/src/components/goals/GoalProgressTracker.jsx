import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Target, TrendingUp, Calendar, CheckCircle2, Clock, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { format, differenceInDays, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

export default function GoalProgressTracker({ goal, linkedEvents = [], linkedTasks = [], onViewDetails }) {
  const calculateProgress = () => {
    if (goal.type === 'habit') {
      const completedCount = linkedEvents.filter(e => 
        new Date(e.start_date) < new Date() && e.completed
      ).length;
      return Math.min((completedCount / goal.target_count) * 100, 100);
    }
    
    if (goal.type === 'milestone') {
      const completedTasks = linkedTasks.filter(t => t.status === 'completed').length;
      const totalTasks = linkedTasks.length;
      return totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    }
    
    return goal.progress || 0;
  };

  const getDaysRemaining = () => {
    if (!goal.deadline) return null;
    return differenceInDays(parseISO(goal.deadline), new Date());
  };

  const progress = calculateProgress();
  const daysRemaining = getDaysRemaining();
  const isComplete = progress >= 100;
  const isOverdue = daysRemaining !== null && daysRemaining < 0;

  const categoryColors = {
    health: 'from-green-500 to-emerald-600',
    career: 'from-blue-500 to-indigo-600',
    personal: 'from-purple-500 to-pink-600',
    financial: 'from-yellow-500 to-orange-600',
    learning: 'from-cyan-500 to-teal-600'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <Card className={cn(
        "overflow-hidden cursor-pointer transition-all hover:shadow-lg",
        isComplete && "border-green-500 bg-green-50 dark:bg-green-950/20"
      )}
      onClick={onViewDetails}
      >
        <div className={`h-1 bg-gradient-to-r ${categoryColors[goal.category] || categoryColors.personal}`} />
        
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className={cn(
                  "w-5 h-5",
                  isComplete ? "text-green-600" : "text-slate-600"
                )} />
                {goal.title}
              </CardTitle>
              {goal.description && (
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                  {goal.description}
                </p>
              )}
            </div>
            {isComplete && (
              <Badge className="bg-green-600 text-white">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Complete
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">Progress</span>
              <span className={cn(
                "font-semibold",
                isComplete ? "text-green-600" : "text-slate-800 dark:text-slate-200"
              )}>
                {Math.round(progress)}%
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {goal.type === 'habit' && (
              <div className="text-center p-2 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <div className="text-xs text-slate-500 mb-1">Completed</div>
                <div className="font-semibold text-slate-800 dark:text-slate-200">
                  {linkedEvents.filter(e => e.completed).length}/{goal.target_count}
                </div>
              </div>
            )}
            
            {goal.type === 'milestone' && (
              <div className="text-center p-2 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <div className="text-xs text-slate-500 mb-1">Tasks</div>
                <div className="font-semibold text-slate-800 dark:text-slate-200">
                  {linkedTasks.filter(t => t.status === 'completed').length}/{linkedTasks.length}
                </div>
              </div>
            )}

            <div className="text-center p-2 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <div className="text-xs text-slate-500 mb-1">Events</div>
              <div className="font-semibold text-slate-800 dark:text-slate-200">
                {linkedEvents.length}
              </div>
            </div>

            {daysRemaining !== null && (
              <div className={cn(
                "text-center p-2 rounded-lg",
                isOverdue 
                  ? "bg-red-50 dark:bg-red-950/20" 
                  : daysRemaining < 7
                  ? "bg-amber-50 dark:bg-amber-950/20"
                  : "bg-slate-50 dark:bg-slate-900"
              )}>
                <div className="text-xs text-slate-500 mb-1">
                  {isOverdue ? 'Overdue' : 'Days Left'}
                </div>
                <div className={cn(
                  "font-semibold",
                  isOverdue ? "text-red-600" : daysRemaining < 7 ? "text-amber-600" : "text-slate-800 dark:text-slate-200"
                )}>
                  {Math.abs(daysRemaining)}
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 pt-2">
            <Badge variant="outline" className="text-xs">
              {goal.category}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {goal.type}
            </Badge>
            {goal.recurring_pattern && (
              <Badge variant="outline" className="text-xs">
                <Calendar className="w-3 h-3 mr-1" />
                {goal.recurring_pattern}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}