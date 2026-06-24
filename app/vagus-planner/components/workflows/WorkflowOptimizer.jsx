import React from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Sparkles, Loader2, AlertTriangle, Lightbulb, TrendingUp, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function WorkflowOptimizer({ workflow, onApplyOptimizations }) {
  const [optimizations, setOptimizations] = React.useState(null);

  const optimizeMutation = useMutation({
    mutationFn: () => base44.functions.invoke('optimizeWorkflowSequence', {
      workflow_name: workflow.name,
      trigger_type: workflow.trigger_type,
      steps: workflow.steps || [],
      goal: workflow.description
    }),
    onSuccess: (response) => {
      setOptimizations(response.data.optimizations);
      toast.success('AI analyzed your workflow!');
    },
    onError: () => {
      toast.error('Failed to optimize workflow');
    }
  });

  return (
    <Card className="border-purple-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="w-4 h-4 text-purple-600" />
          AI Workflow Optimizer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!optimizations ? (
          <Button
            onClick={() => optimizeMutation.mutate()}
            disabled={optimizeMutation.isPending}
            variant="outline"
            size="sm"
            className="w-full border-purple-300"
          >
            {optimizeMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Get AI Recommendations
              </>
            )}
          </Button>
        ) : (
          <div className="space-y-4">
            {/* Overall Score */}
            {optimizations.overall_score && (
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
                <span className="text-sm font-medium">Workflow Quality Score</span>
                <Badge className="text-lg bg-purple-600">
                  {optimizations.overall_score}/10
                </Badge>
              </div>
            )}

            {/* Improvements */}
            {optimizations.improvements?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  Recommended Improvements
                </h4>
                <div className="space-y-2">
                  {optimizations.improvements.map((improvement, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="p-3 bg-white border border-slate-200 rounded-lg"
                    >
                      <div className="flex items-start gap-2">
                        <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="font-medium text-sm text-slate-800">
                            {improvement.title}
                          </div>
                          <div className="text-xs text-slate-600 mt-1">
                            {improvement.description}
                          </div>
                          {improvement.impact && (
                            <Badge variant="outline" className="mt-2 text-xs">
                              Impact: {improvement.impact}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Missing Steps */}
            {optimizations.missing_steps?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-blue-600" />
                  Suggested Additional Steps
                </h4>
                <div className="space-y-2">
                  {optimizations.missing_steps.map((step, idx) => (
                    <div key={idx} className="p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                      <div className="font-medium text-blue-900">
                        {step.type} (after step {step.position})
                      </div>
                      <div className="text-blue-700 mt-1">{step.reason}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Potential Issues */}
            {optimizations.potential_issues?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  Potential Issues
                </h4>
                <div className="space-y-1">
                  {optimizations.potential_issues.map((issue, idx) => (
                    <div key={idx} className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                      {issue}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Wait Times */}
            {optimizations.wait_times?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-600" />
                  Recommended Wait Times
                </h4>
                <div className="space-y-1">
                  {optimizations.wait_times.map((wait, idx) => (
                    <div key={idx} className="p-2 bg-purple-50 border border-purple-200 rounded text-xs">
                      <span className="font-medium">After step {wait.after_step}: </span>
                      <span className="text-purple-700">
                        Wait {wait.duration_ms}ms - {wait.reason}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              onClick={() => onApplyOptimizations(optimizations)}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-600"
              size="sm"
            >
              Apply Recommendations
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}