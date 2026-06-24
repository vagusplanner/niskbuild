import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { Link2, ArrowRight, X, GitBranch, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const DEPENDENCY_TYPES = {
  blocks: { label: 'Blocks', icon: ArrowRight, color: 'text-red-600', description: 'This task must finish before the other starts' },
  required_by: { label: 'Required by', icon: GitBranch, color: 'text-orange-600', description: 'Required for the other task to complete' },
  related: { label: 'Related to', icon: Link2, color: 'text-blue-600', description: 'Related tasks that can run in parallel' }
};

export default function TaskDependencyManager({ task, isOpen, onClose, onSave }) {
  const [dependencies, setDependencies] = useState(task?.dependencies || []);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [dependencyType, setDependencyType] = useState('blocks');

  const { data: allTasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => SDK.entities.Task.list()
  });

  const availableTasks = allTasks.filter(t => 
    t.id !== task?.id && 
    !dependencies.some(d => d.task_id === t.id)
  );

  const addDependency = () => {
    if (!selectedTaskId) return;
    
    const selectedTask = allTasks.find(t => t.id === selectedTaskId);
    setDependencies([...dependencies, {
      task_id: selectedTaskId,
      task_title: selectedTask?.title,
      type: dependencyType
    }]);
    setSelectedTaskId('');
  };

  const removeDependency = (taskId) => {
    setDependencies(dependencies.filter(d => d.task_id !== taskId));
  };

  const handleSave = () => {
    onSave(dependencies);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-teal-600" />
            Manage Task Dependencies
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-4 bg-teal-50 dark:bg-teal-950 rounded-lg border border-teal-200 dark:border-teal-800">
            <p className="text-sm text-teal-700 dark:text-teal-300">
              Link tasks to show dependencies. Tasks marked as "blocked" won't be available until their dependencies are completed.
            </p>
          </div>

          {/* Current Task */}
          <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-teal-600" />
              <span className="font-semibold">{task?.title}</span>
              <Badge variant="outline" className="ml-auto">Current Task</Badge>
            </div>
          </div>

          {/* Add New Dependency */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Add Dependency</h4>
            <div className="flex gap-2">
              <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a task..." />
                </SelectTrigger>
                <SelectContent>
                  {availableTasks.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={dependencyType} onValueChange={setDependencyType}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DEPENDENCY_TYPES).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button onClick={addDependency} disabled={!selectedTaskId}>
                <Link2 className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              {DEPENDENCY_TYPES[dependencyType]?.description}
            </p>
          </div>

          {/* Existing Dependencies */}
          {dependencies.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Current Dependencies</h4>
              <div className="space-y-2">
                {dependencies.map((dep) => {
                  const config = DEPENDENCY_TYPES[dep.type];
                  const Icon = config.icon;
                  
                  return (
                    <div
                      key={dep.task_id}
                      className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-lg border"
                    >
                      <Icon className={cn("w-4 h-4", config.color)} />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{dep.task_title}</p>
                        <p className="text-xs text-slate-500">{config.label}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDependency(dep.task_id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {dependencies.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              <GitBranch className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No dependencies added yet</p>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} className="flex-1 bg-teal-600 hover:bg-teal-700">
            Save Dependencies
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}