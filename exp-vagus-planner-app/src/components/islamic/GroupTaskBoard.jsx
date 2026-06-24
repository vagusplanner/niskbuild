import React, { useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckSquare, Plus, Trash2, Edit2, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const TASK_TYPES = [
  { value: 'flight_booking', label: '✈️ Flight Booking' },
  { value: 'accommodation', label: '🏨 Accommodation' },
  { value: 'visa', label: '📋 Visa Documentation' },
  { value: 'documentation', label: '📄 Other Documentation' },
  { value: 'packing', label: '🎒 Packing' },
  { value: 'other', label: '✓ Other' }
];

const PRIORITY_COLORS = {
  high: 'bg-red-100 text-red-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-blue-100 text-blue-800'
};

const STATUS_COLORS = {
  pending: 'bg-slate-100 text-slate-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  blocked: 'bg-red-100 text-red-800'
};

export default function GroupTaskBoard({ group, members = [] }) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    task_type: 'other',
    assigned_to: '',
    due_date: '',
    priority: 'medium'
  });

  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['groupTasks', group.id],
    queryFn: async () => {
      const allTasks = await SDK.entities.HajjGroupTask.list();
      return allTasks.filter(t => t.group_id === group.id);
    }
  });

  const createTaskMutation = useMutation({
    mutationFn: (data) => SDK.entities.HajjGroupTask.create({
      ...data,
      group_id: group.id,
      assigned_by: (group.admin_email || '')
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groupTasks', group.id] });
      setShowCreateForm(false);
      setNewTask({ title: '', description: '', task_type: 'other', assigned_to: '', due_date: '', priority: 'medium' });
      toast.success('Task created!');
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => SDK.entities.HajjGroupTask.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groupTasks', group.id] });
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id) => SDK.entities.HajjGroupTask.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groupTasks', group.id] });
      toast.success('Task deleted');
    }
  });

  const handleCreateTask = () => {
    if (!newTask.title || !newTask.assigned_to) {
      toast.error('Please fill in required fields');
      return;
    }
    createTaskMutation.mutate(newTask);
  };

  const memberEmails = members?.map(m => m.email || m) || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <CheckSquare className="w-5 h-5" />
          Group Tasks
        </h3>
        <Button onClick={() => setShowCreateForm(true)} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          New Task
        </Button>
      </div>

      {/* Status Columns */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {['pending', 'in_progress', 'completed', 'blocked'].map(status => (
          <div key={status} className="space-y-3">
            <h4 className="font-semibold text-sm text-slate-700 capitalize">{status.replace('_', ' ')}</h4>
            <div className="space-y-2">
              {tasks.filter(t => t.status === status).map(task => (
                <Card key={task.id} className="bg-gradient-to-br from-slate-50 to-slate-100">
                  <CardContent className="p-3">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h5 className="font-medium text-sm text-slate-900">{task.title}</h5>
                        <button
                          onClick={() => deleteTaskMutation.mutate(task.id)}
                          className="text-red-500 hover:text-red-700 text-xs"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {task.description && (
                        <p className="text-xs text-slate-600">{task.description}</p>
                      )}

                      <div className="flex flex-wrap gap-1">
                        <Badge className="text-xs" variant="outline">
                          {TASK_TYPES.find(t => t.value === task.task_type)?.label}
                        </Badge>
                        <Badge className={`text-xs ${PRIORITY_COLORS[task.priority]}`}>
                          {task.priority}
                        </Badge>
                      </div>

                      {task.due_date && (
                        <p className="text-xs text-slate-500">Due: {new Date(task.due_date).toLocaleDateString()}</p>
                      )}

                      <div className="text-xs text-slate-600">
                        Assigned to: <strong>{task.assigned_to}</strong>
                      </div>

                      {status !== 'completed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateTaskMutation.mutate({
                            id: task.id,
                            data: { status: status === 'pending' ? 'in_progress' : 'completed' }
                          })}
                          className="w-full mt-2 text-xs"
                        >
                          {status === 'pending' ? 'Start' : 'Complete'}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Create Task Dialog */}
      {showCreateForm && (
        <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Group Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Task Title</Label>
                <Input
                  placeholder="e.g., Book flights from NYC"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  placeholder="Add details..."
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Task Type</Label>
                  <Select value={newTask.task_type} onValueChange={(v) => setNewTask({ ...newTask, task_type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Priority</Label>
                  <Select value={newTask.priority} onValueChange={(v) => setNewTask({ ...newTask, priority: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Assign to</Label>
                  <Select value={newTask.assigned_to} onValueChange={(v) => setNewTask({ ...newTask, assigned_to: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select member" />
                    </SelectTrigger>
                    <SelectContent>
                      {memberEmails.map(email => (
                        <SelectItem key={email} value={email}>{email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={newTask.due_date}
                    onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowCreateForm(false)} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateTask}
                  disabled={createTaskMutation.isPending}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  Create Task
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}