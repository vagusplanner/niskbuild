import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Play, 
  Pause, 
  Edit, 
  Trash2, 
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import WorkflowBuilder from '@/components/workflows/WorkflowBuilder';
import WorkflowExecutionHistory from '@/components/workflows/WorkflowExecutionHistory';
import AIWorkflowTemplates from '@/components/workflows/AIWorkflowTemplates';
import PullToRefresh from '@/components/mobile/PullToRefresh';
import { Sparkles, X } from 'lucide-react';

export default function WorkflowsPage() {
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const queryClient = useQueryClient();

  const { data: workflows = [], isLoading } = useQuery({
    queryKey: ['workflows'],
    queryFn: () => base44.entities.WorkflowAutomation.list('-updated_date')
  });

  const toggleWorkflowMutation = useMutation({
    mutationFn: ({ id, is_active }) => 
      base44.entities.WorkflowAutomation.update(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    }
  });

  const deleteWorkflowMutation = useMutation({
    mutationFn: (id) => base44.entities.WorkflowAutomation.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    }
  });

  const executeWorkflowMutation = useMutation({
    mutationFn: (workflow_id) => 
      base44.functions.invoke('executeWorkflow', { workflow_id, trigger_data: { user_email: 'manual_trigger' } })
  });

  const getTriggerLabel = (type) => {
    const labels = {
      event_created: 'Event Created',
      event_updated: 'Event Updated',
      task_completed: 'Task Completed',
      meeting_created: 'Meeting Created',
      conflict_detected: 'Conflict Detected',
      daily_schedule: 'Daily Schedule',
      prayer_time: 'Prayer Time',
      manual: 'Manual Trigger'
    };
    return labels[type] || type;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-700';
      case 'failed': return 'bg-red-100 text-red-700';
      case 'partial': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['workflows'] });
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-pink-50/50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                <Zap className="w-8 h-8 text-purple-600" />
                Workflow Automations
              </h1>
              <p className="text-slate-600 mt-1">
                Automate tasks when events occur: send emails, create follow-ups, schedule meetings
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowTemplates(true)}
                className="gap-2 border-purple-300 text-purple-700 hover:bg-purple-50"
              >
                <Sparkles className="w-4 h-4" />
                AI Templates
              </Button>
              <Button
                onClick={() => {
                  setEditingWorkflow(null);
                  setShowBuilder(true);
                }}
                className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Workflow
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Workflows Grid */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="h-48" />
              </Card>
            ))}
          </div>
        ) : workflows.length === 0 ? (
          <Card className="p-12 text-center">
            <Zap className="w-16 h-16 text-purple-200 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">No workflows yet</h3>
            <p className="text-slate-500 mb-4">Automate repetitive tasks with custom workflows</p>
            <div className="text-sm text-slate-600 mb-6 max-w-md mx-auto">
              <p className="mb-2">✨ <strong>Examples:</strong></p>
              <ul className="text-left space-y-1">
                <li>• Send reminder email 1 day before meetings</li>
                <li>• Create follow-up task after completing events</li>
                <li>• Auto-schedule team sync when conflicts detected</li>
              </ul>
            </div>
            <Button
              onClick={() => setShowBuilder(true)}
              className="bg-gradient-to-r from-purple-500 to-pink-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Workflow
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {workflows.map((workflow, idx) => (
              <motion.div
                key={workflow.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-1">{workflow.name}</CardTitle>
                        <Badge variant="outline" className="text-xs">
                          {getTriggerLabel(workflow.trigger_type)}
                        </Badge>
                      </div>
                      <Switch
                        checked={workflow.is_active}
                        onCheckedChange={(checked) => 
                          toggleWorkflowMutation.mutate({ id: workflow.id, is_active: checked })
                        }
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-slate-600 line-clamp-2">
                      {workflow.description || 'No description'}
                    </p>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        {workflow.steps?.length || 0} steps
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {workflow.execution_count || 0} runs
                      </div>
                    </div>

                    {/* Last execution status */}
                    {workflow.last_execution_status && (
                      <Badge className={getStatusColor(workflow.last_execution_status)}>
                        {workflow.last_execution_status === 'success' && <CheckCircle className="w-3 h-3 mr-1" />}
                        {workflow.last_execution_status === 'failed' && <XCircle className="w-3 h-3 mr-1" />}
                        Last: {workflow.last_execution_status}
                      </Badge>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => executeWorkflowMutation.mutate(workflow.id)}
                        disabled={!workflow.is_active || executeWorkflowMutation.isPending}
                        className="flex-1"
                      >
                        <Play className="w-3 h-3 mr-1" />
                        Test Run
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingWorkflow(workflow);
                          setShowBuilder(true);
                        }}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedWorkflow(workflow)}
                      >
                        <Activity className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (confirm('Delete this workflow?')) {
                            deleteWorkflowMutation.mutate(workflow.id);
                          }
                        }}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Workflow Builder Modal */}
        {showBuilder && (
          <WorkflowBuilder
            workflow={editingWorkflow}
            onClose={() => {
              setShowBuilder(false);
              setEditingWorkflow(null);
            }}
            onSave={() => {
              setShowBuilder(false);
              setEditingWorkflow(null);
              queryClient.invalidateQueries({ queryKey: ['workflows'] });
            }}
          />
        )}

        {/* Execution History Modal */}
        {selectedWorkflow && (
          <WorkflowExecutionHistory
            workflow={selectedWorkflow}
            onClose={() => setSelectedWorkflow(null)}
          />
        )}

        {/* AI Templates Modal */}
        {showTemplates && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-auto">
              <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800">AI Workflow Templates</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowTemplates(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="p-6">
                <AIWorkflowTemplates
                  onSelectTemplate={(template) => {
                    // Convert AI template to workflow format
                    const newWorkflow = {
                      name: template.name,
                      description: template.description,
                      trigger_type: template.trigger_type,
                      trigger_config: { conditions: template.trigger_conditions || [] },
                      steps: template.steps?.map((s, i) => ({
                        id: `step_${Date.now()}_${i}`,
                        type: s.type,
                        config: s.config || {},
                        conditions: [],
                        on_success: null,
                        on_failure: null
                      })) || [],
                      is_active: true
                    };
                    setEditingWorkflow(newWorkflow);
                    setShowTemplates(false);
                    setShowBuilder(true);
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </PullToRefresh>
  );
}