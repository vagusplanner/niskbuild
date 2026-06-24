import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Target, 
  CheckCircle2, 
  Plus, 
  Edit2, 
  Trash2, 
  Calendar,
  Flag,
  ListTodo,
  Lightbulb,
  AlertTriangle,
  Package
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function LifeGoalDetails({ goal, isOpen, onClose, onUpdate }) {
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [newMilestone, setNewMilestone] = useState({ title: '', description: '', target_date: '' });
  const [newTask, setNewTask] = useState({ title: '', description: '', due_date: '', milestone_id: '' });
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);

  if (!goal) return null;

  const completedMilestones = goal.milestones?.filter(m => m.completed).length || 0;
  const totalMilestones = goal.milestones?.length || 0;
  const completedTasks = goal.action_tasks?.filter(t => t.completed).length || 0;
  const totalTasks = goal.action_tasks?.length || 0;

  const handleAddMilestone = () => {
    if (!newMilestone.title.trim()) return;
    
    const milestone = {
      id: Date.now().toString(),
      ...newMilestone,
      completed: false
    };
    
    const updatedGoal = {
      ...goal,
      milestones: [...(goal.milestones || []), milestone]
    };
    
    onUpdate(updatedGoal);
    setNewMilestone({ title: '', description: '', target_date: '' });
    setShowAddMilestone(false);
  };

  const handleToggleMilestone = (milestoneId) => {
    const updatedMilestones = goal.milestones.map(m => 
      m.id === milestoneId 
        ? { ...m, completed: !m.completed, completed_date: !m.completed ? new Date().toISOString() : null }
        : m
    );
    
    const completedCount = updatedMilestones.filter(m => m.completed).length;
    const progress = totalMilestones > 0 ? Math.round((completedCount / totalMilestones) * 100) : 0;
    
    onUpdate({
      ...goal,
      milestones: updatedMilestones,
      progress_percentage: progress
    });
  };

  const handleDeleteMilestone = (milestoneId) => {
    const updatedMilestones = goal.milestones.filter(m => m.id !== milestoneId);
    const updatedTasks = goal.action_tasks.filter(t => t.milestone_id !== milestoneId);
    
    const completedCount = updatedMilestones.filter(m => m.completed).length;
    const progress = updatedMilestones.length > 0 ? Math.round((completedCount / updatedMilestones.length) * 100) : 0;
    
    onUpdate({
      ...goal,
      milestones: updatedMilestones,
      action_tasks: updatedTasks,
      progress_percentage: progress
    });
  };

  const handleAddTask = () => {
    if (!newTask.title.trim()) return;
    
    const task = {
      id: Date.now().toString(),
      ...newTask,
      completed: false
    };
    
    onUpdate({
      ...goal,
      action_tasks: [...(goal.action_tasks || []), task]
    });
    
    setNewTask({ title: '', description: '', due_date: '', milestone_id: '' });
    setShowAddTask(false);
  };

  const handleToggleTask = (taskId) => {
    const updatedTasks = goal.action_tasks.map(t => 
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    
    onUpdate({
      ...goal,
      action_tasks: updatedTasks
    });
  };

  const handleDeleteTask = (taskId) => {
    onUpdate({
      ...goal,
      action_tasks: goal.action_tasks.filter(t => t.id !== taskId)
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-3">
            <span className="text-3xl">{goal.category === 'spiritual' ? '🕊️' : goal.category === 'professional' ? '💼' : goal.category === 'fitness' ? '💪' : goal.category === 'financial' ? '💰' : goal.category === 'education' ? '📚' : goal.category === 'relationships' ? '❤️' : goal.category === 'creativity' ? '🎨' : '⭐'}</span>
            {goal.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Overall Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Completion</span>
                  <span className="text-muted-foreground">{goal.progress_percentage || 0}%</span>
                </div>
                <Progress 
                  value={goal.progress_percentage || 0} 
                  className="h-4"
                  indicatorClassName={cn(
                    goal.progress_percentage === 100 ? "bg-green-500" : "bg-blue-500"
                  )}
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4 pt-2">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{completedMilestones}/{totalMilestones}</div>
                  <div className="text-sm text-muted-foreground">Milestones</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{completedTasks}/{totalTasks}</div>
                  <div className="text-sm text-muted-foreground">Tasks</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{goal.target_date ? format(new Date(goal.target_date), 'MMM d') : 'TBD'}</div>
                  <div className="text-sm text-muted-foreground">Target Date</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="milestones" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="milestones">
                <Target className="w-4 h-4 mr-2" />
                Milestones
              </TabsTrigger>
              <TabsTrigger value="tasks">
                <ListTodo className="w-4 h-4 mr-2" />
                Tasks
              </TabsTrigger>
              <TabsTrigger value="insights">
                <Lightbulb className="w-4 h-4 mr-2" />
                Insights
              </TabsTrigger>
              <TabsTrigger value="resources">
                <Package className="w-4 h-4 mr-2" />
                Resources
              </TabsTrigger>
            </TabsList>

            <TabsContent value="milestones" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Major Milestones</h3>
                <Button size="sm" onClick={() => setShowAddMilestone(!showAddMilestone)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Milestone
                </Button>
              </div>

              {showAddMilestone && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-4 space-y-3">
                    <Input
                      placeholder="Milestone title"
                      value={newMilestone.title}
                      onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
                    />
                    <Textarea
                      placeholder="Description (optional)"
                      value={newMilestone.description}
                      onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
                      rows={2}
                    />
                    <Input
                      type="date"
                      value={newMilestone.target_date}
                      onChange={(e) => setNewMilestone({ ...newMilestone, target_date: e.target.value })}
                    />
                    <div className="flex gap-2">
                      <Button onClick={handleAddMilestone} size="sm">Add</Button>
                      <Button variant="outline" size="sm" onClick={() => setShowAddMilestone(false)}>Cancel</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-3">
                {goal.milestones?.map((milestone) => (
                  <Card key={milestone.id} className={cn(
                    "transition-all",
                    milestone.completed && "bg-green-50 dark:bg-green-950/20 border-green-200"
                  )}>
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={milestone.completed}
                          onCheckedChange={() => handleToggleMilestone(milestone.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className={cn(
                            "font-medium",
                            milestone.completed && "line-through text-muted-foreground"
                          )}>
                            {milestone.title}
                          </div>
                          {milestone.description && (
                            <p className="text-sm text-muted-foreground mt-1">{milestone.description}</p>
                          )}
                          {milestone.target_date && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                              <Calendar className="w-3 h-3" />
                              Target: {format(new Date(milestone.target_date), 'MMM d, yyyy')}
                            </div>
                          )}
                          {milestone.completed && milestone.completed_date && (
                            <div className="flex items-center gap-2 text-xs text-green-600 mt-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Completed: {format(new Date(milestone.completed_date), 'MMM d, yyyy')}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500"
                          onClick={() => handleDeleteMilestone(milestone.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {(!goal.milestones || goal.milestones.length === 0) && !showAddMilestone && (
                  <div className="text-center py-8 text-muted-foreground">
                    No milestones yet. Add your first milestone to track progress!
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="tasks" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Action Tasks</h3>
                <Button size="sm" onClick={() => setShowAddTask(!showAddTask)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Task
                </Button>
              </div>

              {showAddTask && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-4 space-y-3">
                    <Input
                      placeholder="Task title"
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    />
                    <Textarea
                      placeholder="Description (optional)"
                      value={newTask.description}
                      onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                      rows={2}
                    />
                    <Input
                      type="date"
                      value={newTask.due_date}
                      onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                    />
                    <div className="flex gap-2">
                      <Button onClick={handleAddTask} size="sm">Add</Button>
                      <Button variant="outline" size="sm" onClick={() => setShowAddTask(false)}>Cancel</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-2">
                {goal.action_tasks?.map((task) => (
                  <Card key={task.id} className={cn(
                    task.completed && "bg-green-50 dark:bg-green-950/20 border-green-200"
                  )}>
                    <CardContent className="pt-3 pb-3">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={task.completed}
                          onCheckedChange={() => handleToggleTask(task.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className={cn(
                            "font-medium text-sm",
                            task.completed && "line-through text-muted-foreground"
                          )}>
                            {task.title}
                          </div>
                          {task.description && (
                            <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                          )}
                          {task.due_date && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Due: {format(new Date(task.due_date), 'MMM d, yyyy')}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500"
                          onClick={() => handleDeleteTask(task.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {(!goal.action_tasks || goal.action_tasks.length === 0) && !showAddTask && (
                  <div className="text-center py-8 text-muted-foreground">
                    No tasks yet. Break down your goal into actionable steps!
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="insights" className="space-y-4">
              {goal.motivation && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-yellow-500" />
                      Why This Matters
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{goal.motivation}</p>
                  </CardContent>
                </Card>
              )}
              
              {goal.obstacles && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-500" />
                      Potential Obstacles
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{goal.obstacles}</p>
                  </CardContent>
                </Card>
              )}
              
              {goal.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Notes & Reflections</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{goal.notes}</p>
                  </CardContent>
                </Card>
              )}
              
              {goal.tags && goal.tags.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Tags</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {goal.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="resources" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Resources Needed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {goal.resources_needed && goal.resources_needed.length > 0 ? (
                    <ul className="space-y-2">
                      {goal.resources_needed.map((resource, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>{resource}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No resources specified</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}