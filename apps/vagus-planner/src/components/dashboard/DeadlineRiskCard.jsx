import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, AlertCircle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

const riskColors = {
  critical: 'bg-red-100 text-red-700 border-red-300',
  high: 'bg-orange-100 text-orange-700 border-orange-300',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  low: 'bg-blue-100 text-blue-700 border-blue-300'
};

export default function DeadlineRiskCard({ data, isLoading, expanded = false }) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || !data.success) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-6">
          <p className="text-amber-700 text-center">Unable to predict deadline risks</p>
        </CardContent>
      </Card>
    );
  }

  const criticalTasks = data.at_risk_tasks?.filter(t => t.risk_level === 'critical') || [];
  const highRiskTasks = data.at_risk_tasks?.filter(t => t.risk_level === 'high') || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card className="bg-gradient-to-br from-red-50 to-orange-50 border-red-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Deadline Risk Analysis
            </CardTitle>
            <Badge variant="destructive">
              {criticalTasks.length + highRiskTasks.length} at risk
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Overall Assessment */}
          {data.overall_assessment && (
            <div className="bg-white/60 rounded-lg p-3">
              <p className="text-sm text-slate-700">{data.overall_assessment}</p>
            </div>
          )}

          {/* Immediate Actions */}
          {data.immediate_actions?.length > 0 && (
            <div className="bg-red-100 border border-red-300 rounded-lg p-3">
              <h4 className="font-semibold text-sm text-red-900 mb-2">Immediate Actions Required</h4>
              <ul className="space-y-1">
                {data.immediate_actions.map((action, idx) => (
                  <li key={idx} className="text-xs text-red-700">• {action}</li>
                ))}
              </ul>
            </div>
          )}

          {/* At Risk Tasks */}
          {data.at_risk_tasks?.length > 0 ? (
            <div className="space-y-3">
              {data.at_risk_tasks
                .sort((a, b) => {
                  const riskOrder = { critical: 0, high: 1, medium: 2, low: 3 };
                  return riskOrder[a.risk_level] - riskOrder[b.risk_level];
                })
                .slice(0, expanded ? undefined : 5)
                .map((task, idx) => (
                  <div key={idx} className={`border-2 rounded-lg p-3 space-y-2 ${riskColors[task.risk_level]}`}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm">{task.task_title}</p>
                      <Badge className={riskColors[task.risk_level]}>
                        {task.risk_level}
                      </Badge>
                    </div>

                    {task.risk_factors?.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium">Risk Factors:</p>
                        <ul className="space-y-0.5">
                          {task.risk_factors.map((factor, fIdx) => (
                            <li key={fIdx} className="text-xs flex items-start gap-1">
                              <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              {factor}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {task.mitigation_actions?.length > 0 && (
                      <div className="bg-white/40 rounded p-2 space-y-1">
                        <p className="text-xs font-medium">Mitigation:</p>
                        <ul className="space-y-0.5">
                          {task.mitigation_actions.slice(0, 2).map((action, aIdx) => (
                            <li key={aIdx} className="text-xs">→ {action}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {task.suggested_new_deadline && (
                      <div className="flex items-center gap-2 text-xs">
                        <Clock className="w-3 h-3" />
                        <span>Suggested: {task.suggested_new_deadline}</span>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p>No tasks at risk - great work!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}