import React from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery } from '@tanstack/react-query';
import { X, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function WorkflowExecutionHistory({ workflow, onClose }) {
  const [expandedLog, setExpandedLog] = React.useState(null);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['workflow-logs', workflow.id],
    queryFn: () => SDK.entities.WorkflowExecutionLog.filter({ workflow_id: workflow.id }, '-created_date', 50)
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'running':
        return <Clock className="w-4 h-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-700';
      case 'failed': return 'bg-red-100 text-red-700';
      case 'running': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Execution History</h2>
            <p className="text-sm text-slate-600">{workflow.name}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-8 text-slate-500">Loading...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-16 h-16 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500">No execution history yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <Card key={log.id} className="p-4">
                  <div 
                    className="flex items-start justify-between cursor-pointer"
                    onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                  >
                    <div className="flex items-start gap-3 flex-1">
                      {getStatusIcon(log.status)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={getStatusColor(log.status)}>
                            {log.status}
                          </Badge>
                          <span className="text-sm text-slate-600">
                            {format(new Date(log.created_date), 'MMM d, yyyy HH:mm')}
                          </span>
                          {log.duration_ms && (
                            <span className="text-xs text-slate-400">
                              ({log.duration_ms}ms)
                            </span>
                          )}
                        </div>
                        {log.error_message && (
                          <p className="text-sm text-red-600">{log.error_message}</p>
                        )}
                      </div>
                    </div>
                    {expandedLog === log.id ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </div>

                  {expandedLog === log.id && (
                    <div className="mt-4 pt-4 border-t space-y-2">
                      <h4 className="font-semibold text-sm text-slate-700 mb-2">Steps Executed:</h4>
                      {log.steps_executed?.map((step, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm">
                          <div className="bg-purple-100 text-purple-700 rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                            {idx + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-700">{step.step_type}</span>
                              <Badge className={getStatusColor(step.status)} variant="outline">
                                {step.status}
                              </Badge>
                            </div>
                            {step.error && (
                              <p className="text-xs text-red-600 mt-1">{step.error}</p>
                            )}
                            {step.duration_ms && (
                              <p className="text-xs text-slate-400 mt-1">{step.duration_ms}ms</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}