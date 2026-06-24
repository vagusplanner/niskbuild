import React, { useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useMutation, useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, GitBranch, ArrowRight, AlertTriangle, CheckCircle2, Zap, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function AITaskDependencyAnalyzer({ taskId, onApplyDependencies }) {
  const [analysis, setAnalysis] = useState(null);

  const { data: allTasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => SDK.entities.Task.list()
  });

  const analyzeMutation = useMutation({
    mutationFn: () => SDK.functions.invoke('analyzeTaskDependencies', {
      task_id: taskId,
      all_tasks: allTasks
    }),
    onSuccess: (response) => {
      setAnalysis(response.data.analysis);
      toast.success('AI analyzed task dependencies!');
    },
    onError: () => {
      toast.error('Failed to analyze dependencies');
    }
  });

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'urgent': return 'text-red-700 bg-red-200';
      case 'medium': return 'text-amber-600 bg-amber-100';
      default: return 'text-blue-600 bg-blue-100';
    }
  };

  return (
    <Card className="border-indigo-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="w-5 h-5 text-indigo-600" />
          AI Dependency Analyzer
        </CardTitle>
        <p className="text-xs text-slate-600">
          Identify task dependencies and optimal sequencing
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!analysis ? (
          <Button
            onClick={() => analyzeMutation.mutate()}
            disabled={analyzeMutation.isPending}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600"
          >
            {analyzeMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing {allTasks?.length || 0} tasks...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Analyze Dependencies
              </>
            )}
          </Button>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {/* Dependencies */}
            {analysis.dependencies?.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-indigo-600" />
                  Task Dependencies
                </h4>
                {analysis.dependencies.map((dep, idx) => (
                  <Card key={idx} className="bg-gradient-to-br from-indigo-50 to-purple-50">
                    <CardContent className="p-3 space-y-2">
                      <p className="font-semibold text-slate-800 text-sm">{dep.task_title}</p>
                      
                      {dep.blocked_by?.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-slate-600">Blocked by:</p>
                          {dep.blocked_by.map((blocker, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs bg-white/70 p-2 rounded">
                              <ArrowRight className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />
                              <div>
                                <span className="font-medium">{blocker.task_title}</span>
                                <p className="text-slate-600">{blocker.reason}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {dep.blocks?.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-slate-600">Blocks:</p>
                          {dep.blocks.map((blocked, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs bg-white/70 p-2 rounded">
                              <ArrowRight className="w-3 h-3 text-blue-500 mt-0.5 flex-shrink-0" />
                              <div>
                                <span className="font-medium">{blocked.task_title}</span>
                                <p className="text-slate-600">{blocked.reason}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Optimal Sequence */}
            {analysis.optimal_sequence?.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  Optimal Sequence
                </h4>
                <div className="space-y-2">
                  {analysis.optimal_sequence.map((seq, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex items-start gap-3 p-3 bg-green-50 rounded-lg"
                    >
                      <div className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {seq.order}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-slate-800 text-sm">{seq.task_title}</p>
                        <p className="text-xs text-slate-600 mt-1">{seq.reason}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Critical Path */}
            {analysis.critical_path?.length > 0 && (
              <Card className="bg-amber-50 border-amber-200">
                <CardContent className="p-3">
                  <h4 className="text-sm font-semibold text-amber-900 mb-2 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Critical Path (Highest Priority)
                  </h4>
                  <div className="space-y-1">
                    {analysis.critical_path.map((taskTitle, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-amber-800">
                        <CheckCircle2 className="w-3 h-3" />
                        {taskTitle}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Conflicts */}
            {analysis.conflicts?.length > 0 && (
              <Card className="bg-red-50 border-red-200">
                <CardContent className="p-3">
                  <h4 className="text-sm font-semibold text-red-900 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Conflicts Detected
                  </h4>
                  <div className="space-y-2">
                    {analysis.conflicts.map((conflict, idx) => (
                      <div key={idx} className="text-xs text-red-800 bg-white/50 p-2 rounded">
                        <p className="font-medium">{conflict.description}</p>
                        <p className="text-red-600 mt-1">
                          Affects: {conflict.affected_tasks.join(', ')}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recommendations */}
            {analysis.recommendations?.length > 0 && (
              <div className="space-y-1">
                <h4 className="text-xs font-semibold text-slate-700">💡 Recommendations:</h4>
                {analysis.recommendations.map((rec, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                    <CheckCircle2 className="w-3 h-3 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={() => onApplyDependencies && onApplyDependencies(analysis)}
                className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600"
                size="sm"
              >
                Apply Dependencies
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => analyzeMutation.mutate()}
              >
                <Sparkles className="w-3 h-3" />
              </Button>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}