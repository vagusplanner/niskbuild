import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Sparkles, 
  Clock, 
  Flag, 
  Tag, 
  CheckSquare, 
  Plus,
  Loader2,
  Lightbulb
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const priorityColors = {
  low: 'text-slate-500',
  medium: 'text-blue-500',
  high: 'text-orange-500',
  urgent: 'text-red-600'
};

const categoryColors = {
  work: 'bg-blue-50 text-blue-700 border-blue-200',
  personal: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  health: 'bg-rose-50 text-rose-700 border-rose-200',
  shopping: 'bg-amber-50 text-amber-700 border-amber-200',
  learning: 'bg-purple-50 text-purple-700 border-purple-200',
  home: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  other: 'bg-slate-50 text-slate-700 border-slate-200'
};

export default function AITaskGenerator({ onTasksGenerated, onClose }) {
  const [goal, setGoal] = useState('');
  const [context, setContext] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTasks, setGeneratedTasks] = useState([]);
  const [tips, setTips] = useState([]);
  const [selectedTasks, setSelectedTasks] = useState(new Set());

  const handleGenerate = async () => {
    if (!goal.trim()) {
      toast.error('Please enter a goal');
      return;
    }

    setIsGenerating(true);
    try {
      const { data } = await base44.functions.invoke('generateTasksFromGoal', {
        goal: goal.trim(),
        context: context.trim()
      });

      if (data.success) {
        setGeneratedTasks(data.tasks);
        setTips(data.tips || []);
        // Select all tasks by default
        setSelectedTasks(new Set(data.tasks.map((_, idx) => idx)));
        toast.success(`Generated ${data.tasks.length} tasks!`);
      } else {
        toast.error('Failed to generate tasks');
      }
    } catch (error) {
      console.error('Task generation error:', error);
      toast.error('Failed to generate tasks');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleTaskSelection = (index) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedTasks(newSelected);
  };

  const handleAddTasks = () => {
    const tasksToAdd = generatedTasks.filter((_, idx) => selectedTasks.has(idx));
    onTasksGenerated(tasksToAdd);
    toast.success(`Added ${tasksToAdd.length} tasks`);
  };

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card className="border-2 border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-teal-600" />
            AI Task Generator
          </CardTitle>
          <CardDescription>
            Describe your goal and let AI break it down into actionable tasks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="goal">What do you want to accomplish? *</Label>
            <Input
              id="goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g., Launch a new website, Plan a vacation, Learn Spanish"
              className="bg-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="context">Additional context (optional)</Label>
            <Textarea
              id="context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Add any relevant details, constraints, or preferences..."
              rows={3}
              className="bg-white"
            />
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !goal.trim()}
            className="w-full bg-teal-600 hover:bg-teal-700"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating tasks...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Tasks
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Generated Tasks */}
      <AnimatePresence>
        {generatedTasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* Tips */}
            {tips.length > 0 && (
              <Card className="bg-amber-50 border-amber-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2 text-amber-900">
                    <Lightbulb className="w-4 h-4" />
                    Tips for Success
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm text-amber-800">
                    {tips.map((tip, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-amber-600 mt-0.5">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Task List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Generated Tasks</h3>
                <span className="text-sm text-slate-600">
                  {selectedTasks.size} of {generatedTasks.length} selected
                </span>
              </div>

              {generatedTasks.map((task, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className={cn(
                    "transition-all cursor-pointer",
                    selectedTasks.has(index) 
                      ? "border-2 border-teal-500 bg-teal-50" 
                      : "border-slate-200 hover:border-slate-300"
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedTasks.has(index)}
                          onCheckedChange={() => toggleTaskSelection(index)}
                          className="mt-1"
                        />
                        
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-semibold text-slate-900">{task.title}</h4>
                          </div>

                          <p className="text-sm text-slate-600">{task.description}</p>

                          <div className="flex flex-wrap gap-2">
                            <Badge 
                              variant="outline" 
                              className={cn("text-xs", categoryColors[task.category])}
                            >
                              <Tag className="w-3 h-3 mr-1" />
                              {task.category}
                            </Badge>

                            <Badge 
                              variant="outline" 
                              className={cn("text-xs", priorityColors[task.priority])}
                            >
                              <Flag className="w-3 h-3 mr-1" />
                              {task.priority}
                            </Badge>

                            {task.estimated_minutes && (
                              <Badge variant="outline" className="text-xs">
                                <Clock className="w-3 h-3 mr-1" />
                                {task.estimated_minutes}m
                              </Badge>
                            )}

                            {task.subtasks?.length > 0 && (
                              <Badge variant="outline" className="text-xs">
                                <CheckSquare className="w-3 h-3 mr-1" />
                                {task.subtasks.length} subtasks
                              </Badge>
                            )}
                          </div>

                          {task.subtasks?.length > 0 && (
                            <div className="pl-4 space-y-1 mt-2">
                              {task.subtasks.map((subtask, subIdx) => (
                                <div key={subIdx} className="flex items-center gap-2 text-xs text-slate-600">
                                  <span className="w-1 h-1 rounded-full bg-slate-400" />
                                  {subtask.title}
                                </div>
                              ))}
                            </div>
                          )}

                          {task.notes && (
                            <p className="text-xs text-slate-500 italic mt-2">
                              💡 {task.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddTasks}
                disabled={selectedTasks.size === 0}
                className="flex-1 bg-teal-600 hover:bg-teal-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add {selectedTasks.size} Task{selectedTasks.size !== 1 ? 's' : ''}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}