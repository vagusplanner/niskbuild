import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import RecurringTaskForm from './RecurringTaskForm';
import AITaskDependencyAnalyzer from './AITaskDependencyAnalyzer';
import AIRecurringTaskHelper from './AIRecurringTaskHelper';
import AITaskGenerator from './AITaskGenerator';
import AIPrioritySuggester from './AIPrioritySuggester';
import PrayerAwareTaskScheduler from './PrayerAwareTaskScheduler';

export default function TaskForm({ isOpen, onClose, onSubmit, task = null, showAIGenerator = false }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'personal',
    priority: 'medium',
    status: 'todo',
    due_date: '',
    due_time: '',
    estimated_minutes: '',
    tags: [],
    subtasks: [],
    notes: '',
    is_recurring: false,
    recurrence_type: null,
    recurrence_interval: 1,
    recurrence_days: null,
    recurrence_end_type: 'never',
    recurrence_end_date: null,
    recurrence_occurrences: null
  });
  const [newTag, setNewTag] = useState('');
  const [newSubtask, setNewSubtask] = useState('');
  const [showAIGen, setShowAIGen] = useState(showAIGenerator);

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        category: task.category || 'personal',
        priority: task.priority || 'medium',
        status: task.status || 'todo',
        due_date: task.due_date || '',
        due_time: task.due_time || '',
        estimated_minutes: task.estimated_minutes || '',
        tags: task.tags || [],
        subtasks: task.subtasks || [],
        notes: task.notes || '',
        is_recurring: task.is_recurring || false,
        recurrence_type: task.recurrence_type || null,
        recurrence_interval: task.recurrence_interval || 1,
        recurrence_days: task.recurrence_days || null,
        recurrence_end_type: task.recurrence_end_type || 'never',
        recurrence_end_date: task.recurrence_end_date || null,
        recurrence_occurrences: task.recurrence_occurrences || null
      });
    }
  }, [task]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, newTag.trim()] }));
      setNewTag('');
    }
  };

  const removeTag = (tag) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  const addSubtask = () => {
    if (newSubtask.trim()) {
      setFormData(prev => ({ 
        ...prev, 
        subtasks: [...prev.subtasks, { title: newSubtask.trim(), completed: false }] 
      }));
      setNewSubtask('');
    }
  };

  const removeSubtask = (index) => {
    setFormData(prev => ({ 
      ...prev, 
      subtasks: prev.subtasks.filter((_, i) => i !== index) 
    }));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[calc(100%-2rem)] w-full max-w-2xl bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl z-50 max-h-[92dvh] flex flex-col"
          >
            {/* Drag handle — mobile only */}
            <div className="sm:hidden mx-auto mt-3 mb-0 h-1.5 w-12 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
            <div className="p-5 border-b bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  {task ? 'Edit Task' : 'Create New Task'}
                </h2>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-white/20 min-w-[44px] min-h-[44px] flex items-center justify-center">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-4 sm:p-6 space-y-4">
              {/* AI Task Generator */}
              {showAIGen && !task && (
                <AITaskGenerator
                  onTasksGenerated={(tasks) => {
                    // Take the first task to pre-fill the form
                    if (tasks.length > 0) {
                      setFormData(prev => ({
                        ...prev,
                        ...tasks[0]
                      }));
                      setShowAIGen(false);
                    }
                  }}
                  onClose={() => setShowAIGen(false)}
                />
              )}

              {!showAIGen && (
                <>
              <div className="space-y-2">
                <Label htmlFor="title">Task Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="What needs to be done?"
                  required
                  className="h-12 text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Add details..."
                  rows={3}
                  className="text-base"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={formData.category} onValueChange={(val) => setFormData(prev => ({ ...prev, category: val }))}>
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="work">Work</SelectItem>
                      <SelectItem value="personal">Personal</SelectItem>
                      <SelectItem value="health">Health</SelectItem>
                      <SelectItem value="shopping">Shopping</SelectItem>
                      <SelectItem value="learning">Learning</SelectItem>
                      <SelectItem value="home">Home</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={formData.priority} onValueChange={(val) => setFormData(prev => ({ ...prev, priority: val }))}>
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* AI Priority Suggester */}
              {formData.title && formData.title.length > 3 && (
                <AIPrioritySuggester
                  title={formData.title}
                  description={formData.description}
                  due_date={formData.due_date}
                  due_time={formData.due_time}
                  category={formData.category}
                  currentPriority={formData.priority}
                  onApplySuggestion={(priority) => setFormData(prev => ({ ...prev, priority }))}
                />
              )}

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(val) => setFormData(prev => ({ ...prev, status: val }))}>
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="blocked">Blocked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="due_time">Time</Label>
                  <Input
                    id="due_time"
                    type="time"
                    value={formData.due_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, due_time: e.target.value }))}
                    className="h-12"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimated_minutes">Estimated Duration (minutes)</Label>
                <Input
                  id="estimated_minutes"
                  type="number"
                  value={formData.estimated_minutes}
                  onChange={(e) => setFormData(prev => ({ ...prev, estimated_minutes: e.target.value }))}
                  placeholder="e.g., 30"
                  className="h-12"
                />
              </div>

              {/* Prayer-aware AI time slot suggester — shown once title is set */}
              {formData.title && formData.title.length > 2 && (
                <PrayerAwareTaskScheduler
                  title={formData.title}
                  description={formData.description}
                  category={formData.category}
                  priority={formData.priority}
                  estimatedMinutes={formData.estimated_minutes}
                  dueDate={formData.due_date}
                  onApplySlot={(date, time) => setFormData(prev => ({
                    ...prev,
                    due_date: date,
                    due_time: time,
                  }))}
                />
              )}

              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="Add a tag..."
                  />
                  <Button type="button" onClick={addTag} variant="outline" size="icon">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.tags.map((tag, idx) => (
                      <div key={idx} className="bg-slate-100 px-2 py-1 rounded-md text-sm flex items-center gap-1">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} className="text-slate-500 hover:text-red-500">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Subtasks</Label>
                <div className="flex gap-2">
                  <Input
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSubtask())}
                    placeholder="Add a subtask..."
                  />
                  <Button type="button" onClick={addSubtask} variant="outline" size="icon">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {formData.subtasks.length > 0 && (
                  <div className="space-y-2 mt-2">
                    {formData.subtasks.map((subtask, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                        <Checkbox checked={subtask.completed} readOnly />
                        <span className="flex-1 text-sm">{subtask.title}</span>
                        <button type="button" onClick={() => removeSubtask(idx)} className="text-slate-400 hover:text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes..."
                  rows={2}
                />
              </div>

              {/* AI Dependency Analyzer */}
              {task?.id && (
                <AITaskDependencyAnalyzer
                  taskId={task.id}
                  onApplyDependencies={(analysis) => {
                    const deps = analysis.dependencies?.find(d => d.task_id === task.id);
                    if (deps?.blocked_by) {
                      const newDeps = deps.blocked_by.map(dep => ({
                        task_id: dep.task_id,
                        task_title: dep.task_title,
                        type: 'required_by'
                      }));
                      setFormData(prev => ({
                        ...prev,
                        dependencies: [...(prev.dependencies || []), ...newDeps]
                      }));
                    }
                  }}
                />
              )}

              {/* Recurring Task Options */}
              <RecurringTaskForm
                taskData={formData}
                onChange={(updates) => setFormData(prev => ({ ...prev, ...updates }))}
              />

              {/* AI Recurring Task Helper */}
              {formData.is_recurring && formData.title && (
                <AIRecurringTaskHelper
                  taskTitle={formData.title}
                  category={formData.category}
                  recurrenceType={formData.recurrence_type}
                  onApplyDescription={(aiContent) => {
                    setFormData(prev => ({
                      ...prev,
                      description: aiContent.description,
                      estimated_minutes: aiContent.estimated_minutes,
                      subtasks: aiContent.subtasks || prev.subtasks,
                      notes: prev.notes ? `${prev.notes}\n\n💡 AI Tips:\n${aiContent.tips?.join('\n')}` : `💡 AI Tips:\n${aiContent.tips?.join('\n')}`
                    }));
                  }}
                />
              )}

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={onClose} className="flex-1 h-12">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-base">
                  {task ? 'Update Task' : 'Create Task'}
                </Button>
              </div>
              </>
              )}
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}