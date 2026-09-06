import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, TrendingUp, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { requireVpAiFunctions } from '@/lib/vp-registered-functions';
import { batchSuggestTaskPriorities } from '@/lib/suggest-task-priority';

/**
 * Batch mode for suggestTaskPriority (registered).
 * Accepts either full task objects or parallel id/title arrays.
 */
export default function BulkReprioritizeButton({ tasks, taskIds, taskTitles }) {
  const available = requireVpAiFunctions('suggestTaskPriority');
  const [isOpen, setIsOpen] = useState(false);
  const [context, setContext] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const queryClient = useQueryClient();

  const resolvedTasks = Array.isArray(tasks) && tasks.length
    ? tasks
    : (taskIds || []).map((id, idx) => ({
        id,
        title: taskTitles?.[idx] || `Task ${idx + 1}`,
        priority: 'medium',
        status: 'pending',
      }));

  const handleReprioritize = async () => {
    setIsProcessing(true);
    try {
      let taskPayload = resolvedTasks;
      // If we only have ids, fetch current task rows so priority diffs are real
      if ((!tasks || !tasks.length) && taskIds?.length) {
        const all = await base44.entities.Task.list('-updated_date', 200).catch(() => []);
        const byId = new Map((all || []).map((t) => [t.id, t]));
        taskPayload = taskIds.map((id, idx) => byId.get(id) || {
          id,
          title: taskTitles?.[idx] || `Task ${idx + 1}`,
          priority: 'medium',
          status: 'pending',
        });
      }

      const batch = await batchSuggestTaskPriorities(taskPayload, { context });
      if (!batch.success) {
        toast.error(batch.error || 'Failed to re-prioritize tasks');
        if (batch.limit_exceeded) setIsOpen(false);
        return;
      }

      for (const update of batch.updates) {
        if (!update.task_id) continue;
        await base44.entities.Task.update(update.task_id, { priority: update.new_priority });
      }

      setResults({
        success: true,
        changes_made: batch.changes_made,
        updates: batch.updates,
        recommendations: batch.recommendations,
      });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success(
        batch.changes_made > 0
          ? `Updated ${batch.changes_made} task priorities`
          : 'Priorities already look optimal'
      );
    } catch (error) {
      console.error('Reprioritization error:', error);
      toast.error(error?.message || 'Failed to re-prioritize tasks');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!available) return null;

  const count = resolvedTasks.length;

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        size="sm"
        disabled={count === 0}
      >
        <Sparkles className="w-4 h-4 mr-2" />
        AI Re-prioritize ({count})
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              AI Task Re-prioritization
            </DialogTitle>
            <DialogDescription>
              Uses suggestTaskPriority for each of {count} tasks (same engine as Task Form)
            </DialogDescription>
          </DialogHeader>

          {!results ? (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm font-medium mb-2">Selected tasks:</p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {resolvedTasks.map((t, idx) => (
                    <div key={t.id || idx} className="text-sm text-slate-600 flex items-start gap-2">
                      <span className="text-slate-400">•</span>
                      {t.title}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Context (optional)</Label>
                <Textarea
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="E.g., 'Project deadline moved up by 2 weeks' or 'Client meeting tomorrow'"
                  rows={3}
                />
                <p className="text-xs text-slate-500">
                  Provide any new information that might affect task priorities
                </p>
              </div>

              <Button
                onClick={handleReprioritize}
                disabled={isProcessing}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing tasks...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Re-prioritize Tasks
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {results.changes_made === 0 ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <p className="text-green-700 font-medium">All priorities are optimal!</p>
                  <p className="text-sm text-green-600 mt-1">No changes needed</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-purple-900">
                      Updated {results.changes_made} task{results.changes_made !== 1 ? 's' : ''}
                    </p>
                  </div>

                  {results.updates.map((update, idx) => (
                    <div key={idx} className="bg-white border rounded-lg p-3 space-y-2">
                      <div className="font-medium text-sm">{update.task_title}</div>
                      <div className="flex items-center gap-2 text-sm">
                        <Badge variant="outline" className="capitalize">
                          {update.old_priority}
                        </Badge>
                        <TrendingUp className="w-4 h-4 text-slate-400" />
                        <Badge className="capitalize bg-purple-100 text-purple-700">
                          {update.new_priority}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600">{update.reasoning}</p>
                    </div>
                  ))}
                </div>
              )}

              {results.recommendations?.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-900 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Recommendations
                  </p>
                  <ul className="space-y-1">
                    {results.recommendations.map((rec, idx) => (
                      <li key={idx} className="text-sm text-blue-700">• {rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              <Button
                onClick={() => {
                  setResults(null);
                  setContext('');
                  setIsOpen(false);
                }}
                className="w-full"
              >
                Done
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
