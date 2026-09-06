import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Loader2, Sparkles, TrendingUp, Calendar, Flag } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { batchSuggestTaskPriorities } from '@/lib/suggest-task-priority';
import { requireVpAiFunctions } from '@/lib/vp-registered-functions';

/**
 * Multi-task prioritizer modal — same registered `suggestTaskPriority` handler as AIPrioritySuggester.
 */
export default function AITaskPrioritizer({ isOpen, onClose, tasks, onApplyPrioritization }) {
  const available = requireVpAiFunctions('suggestTaskPriority');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recommendations, setRecommendations] = useState(null);

  if (!isOpen || !available) return null;

  const incompleteTasks = (tasks || []).filter((t) => t.status !== 'completed' && t.status !== 'done');

  const analyzeTasks = async () => {
    setIsAnalyzing(true);
    try {
      const batch = await batchSuggestTaskPriorities(incompleteTasks);
      if (!batch.success) {
        toast.error(batch.error || 'Failed to analyze tasks');
        return;
      }
      setRecommendations(batch);
      toast.success('AI analysis complete!');
    } catch (error) {
      toast.error(error?.message || 'Failed to analyze tasks');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applyRecommendations = () => {
    if (!recommendations?.prioritized_tasks) return;
    const updatedTasks = incompleteTasks.map((task, index) => {
      const rec = recommendations.prioritized_tasks.find(
        (r) => r.task_id === task.id || r.task_index === index
      );
      if (rec) {
        return {
          ...task,
          priority: rec.recommended_priority,
          due_date: rec.suggested_due_date || task.due_date,
        };
      }
      return task;
    });

    onApplyPrioritization?.(updatedTasks);
    toast.success('Priorities applied');
    onClose?.();
  };

  const priorityColors = {
    low: 'bg-blue-100 text-blue-800',
    medium: 'bg-amber-100 text-amber-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800'
  };

  const timeIcons = {
    morning: '🌅',
    afternoon: '☀️',
    evening: '🌙'
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto"
      >
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 rounded-t-2xl z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Brain className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">AI Task Prioritizer</h2>
                <p className="text-purple-100 text-sm">Uses the same suggestTaskPriority engine as Task Form</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
              ×
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {!recommendations ? (
            <div className="text-center py-12">
              <Brain className="w-16 h-16 text-purple-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-800 mb-2">
                Analyze Your Tasks
              </h3>
              <p className="text-slate-600 mb-6 max-w-md mx-auto">
                AI will analyze {incompleteTasks.length} incomplete tasks via suggestTaskPriority
              </p>
              <Button
                onClick={analyzeTasks}
                disabled={isAnalyzing || incompleteTasks.length === 0}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Analyze Tasks
                  </>
                )}
              </Button>
            </div>
          ) : (
            <>
              <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                    AI Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-700">{recommendations.overall_advice}</p>
                </CardContent>
              </Card>

              <div className="space-y-3">
                {recommendations.prioritized_tasks.map((rec) => {
                  const task = incompleteTasks.find((t) => t.id === rec.task_id)
                    || incompleteTasks[rec.task_index];
                  if (!task) return null;

                  return (
                    <Card key={rec.task_id || rec.task_index} className="border-slate-200">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="font-semibold text-slate-800 mb-2">{task.title}</h4>
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                              <Badge className={priorityColors[rec.recommended_priority]}>
                                <Flag className="w-3 h-3 mr-1" />
                                {rec.recommended_priority}
                              </Badge>
                              {rec.suggested_due_date && (
                                <Badge variant="outline">
                                  <Calendar className="w-3 h-3 mr-1" />
                                  {format(new Date(rec.suggested_due_date), 'MMM d')}
                                </Badge>
                              )}
                              <Badge variant="outline">
                                {timeIcons[rec.best_time]} {rec.best_time}
                              </Badge>
                              <Badge variant="outline">
                                ⏱️ {rec.estimated_minutes} min
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-600">{rec.reasoning}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={applyRecommendations}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Apply Recommendations
                </Button>
                <Button onClick={onClose} variant="outline">
                  Cancel
                </Button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
