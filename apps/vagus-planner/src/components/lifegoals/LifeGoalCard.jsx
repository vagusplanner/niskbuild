import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  Target, 
  Calendar, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Flag,
  TrendingUp,
  Edit,
  Trash2,
  ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const CATEGORY_COLORS = {
  spiritual: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  professional: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  fitness: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  financial: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  personal: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  education: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  relationships: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200',
  creativity: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
};

const CATEGORY_ICONS = {
  spiritual: '🕊️',
  professional: '💼',
  fitness: '💪',
  financial: '💰',
  personal: '⭐',
  education: '📚',
  relationships: '❤️',
  creativity: '🎨'
};

const PRIORITY_COLORS = {
  low: 'text-gray-500',
  medium: 'text-blue-500',
  high: 'text-orange-500',
  critical: 'text-red-500'
};

const STATUS_CONFIG = {
  not_started: { icon: Circle, color: 'text-gray-400', label: 'Not Started' },
  in_progress: { icon: Clock, color: 'text-blue-500', label: 'In Progress' },
  completed: { icon: CheckCircle2, color: 'text-green-500', label: 'Completed' },
  on_hold: { icon: Flag, color: 'text-orange-500', label: 'On Hold' }
};

export default function LifeGoalCard({ goal, onEdit, onDelete, onClick }) {
  const completedMilestones = goal.milestones?.filter(m => m.completed).length || 0;
  const totalMilestones = goal.milestones?.length || 0;
  const completedTasks = goal.action_tasks?.filter(t => t.completed).length || 0;
  const totalTasks = goal.action_tasks?.length || 0;
  
  const StatusIcon = STATUS_CONFIG[goal.status]?.icon || Circle;
  
  return (
    <Card 
      className="hover:shadow-lg transition-all cursor-pointer border-l-4" 
      style={{ borderLeftColor: goal.status === 'completed' ? '#10b981' : '#3b82f6' }}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="text-3xl">{CATEGORY_ICONS[goal.category]}</div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg mb-2 truncate">{goal.title}</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Badge className={CATEGORY_COLORS[goal.category]}>
                  {goal.category}
                </Badge>
                <Badge variant="outline" className={STATUS_CONFIG[goal.status]?.color}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {STATUS_CONFIG[goal.status]?.label}
                </Badge>
                {goal.priority !== 'medium' && (
                  <Badge variant="outline" className={PRIORITY_COLORS[goal.priority]}>
                    <Flag className="w-3 h-3 mr-1" />
                    {goal.priority}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onEdit}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-500 hover:text-red-600"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {goal.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{goal.description}</p>
        )}
        
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Overall Progress</span>
            <span className="text-muted-foreground">{goal.progress_percentage || 0}%</span>
          </div>
          <Progress 
            value={goal.progress_percentage || 0} 
            className="h-3"
            indicatorClassName={cn(
              goal.progress_percentage === 100 ? "bg-green-500" : "bg-blue-500"
            )}
          />
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="flex items-center gap-2 text-sm">
            <Target className="w-4 h-4 text-blue-500" />
            <span className="text-muted-foreground">Milestones:</span>
            <span className="font-semibold">{completedMilestones}/{totalMilestones}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-muted-foreground">Tasks:</span>
            <span className="font-semibold">{completedTasks}/{totalTasks}</span>
          </div>
        </div>
        
        {goal.target_date && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
            <Calendar className="w-4 h-4" />
            <span>Target: {format(new Date(goal.target_date), 'MMM d, yyyy')}</span>
          </div>
        )}
        
        <div className="flex items-center justify-end pt-2">
          <Button variant="ghost" size="sm" className="gap-2">
            View Details
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}