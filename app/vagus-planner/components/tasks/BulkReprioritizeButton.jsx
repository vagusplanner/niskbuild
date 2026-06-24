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

export default function BulkReprioritizeButton({ taskIds, taskTitles }) {
  const [isOpen, setIsOpen] = useState(false);
  const [context, setContext] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const queryClient = useQueryClient();

  const handleReprioritize = async () => {
    setIsProcessing(true);
    try {
      const { data } = await base44.functions.invoke('reprioritizeTasks', {
        task_ids: taskIds,
        context: context.trim()
      });

      if (data.success) {
        setResults(data);
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        toast.success(`Updated ${data.changes_made} task priorities`);
      } else if (data.limit_exceeded) {
        toast.error(data.error);
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Reprioritization error:', error);
      toast.error('Failed to re-prioritize tasks');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        size="sm"
        disabled={!taskIds || taskIds.length === 0}
      >
        <Sparkles className="w-4 h-4 mr-2" />
        AI Re-prioritize ({taskIds?.length || 0})
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              AI Task Re-prioritization
            </DialogTitle>
            <DialogDescription>
              AI will analyze {taskIds?.length} tasks and suggest optimal priorities
            </DialogDescription>
          </DialogHeader>

          {!results ? (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm font-medium mb-2">Selected tasks:</p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {taskTitles?.map((title, idx) => (
                    <div key={idx} className="text-sm text-slate-600 flex items-start gap-2">
                      <span className="text-slate-400">•</span>
                      {title}
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