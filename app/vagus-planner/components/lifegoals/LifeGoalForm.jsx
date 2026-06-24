import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, Plus, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  { value: 'spiritual', label: '🕊️ Spiritual', emoji: '🕊️' },
  { value: 'professional', label: '💼 Professional', emoji: '💼' },
  { value: 'fitness', label: '💪 Fitness', emoji: '💪' },
  { value: 'financial', label: '💰 Financial', emoji: '💰' },
  { value: 'personal', label: '⭐ Personal', emoji: '⭐' },
  { value: 'education', label: '📚 Education', emoji: '📚' },
  { value: 'relationships', label: '❤️ Relationships', emoji: '❤️' },
  { value: 'creativity', label: '🎨 Creativity', emoji: '🎨' }
];

export default function LifeGoalForm({ isOpen, onClose, onSubmit, goal }) {
  const [formData, setFormData] = useState(goal || {
    title: '',
    description: '',
    category: 'personal',
    priority: 'medium',
    status: 'not_started',
    target_date: '',
    motivation: '',
    obstacles: '',
    tags: [],
    resources_needed: [],
    progress_percentage: 0
  });
  
  const [newTag, setNewTag] = useState('');
  const [newResource, setNewResource] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const addTag = () => {
    if (newTag.trim()) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (index) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index)
    }));
  };

  const addResource = () => {
    if (newResource.trim()) {
      setFormData(prev => ({
        ...prev,
        resources_needed: [...(prev.resources_needed || []), newResource.trim()]
      }));
      setNewResource('');
    }
  };

  const removeResource = (index) => {
    setFormData(prev => ({
      ...prev,
      resources_needed: prev.resources_needed.filter((_, i) => i !== index)
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto z-[200]">
        <DialogHeader>
          <DialogTitle>{goal ? 'Edit Life Goal' : 'Create New Life Goal'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="title">Goal Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Complete Quran Memorization"
                required
              />
            </div>
            
            <div className="col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What does achieving this goal look like?"
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="category">Category *</Label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select 
                value={formData.priority} 
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="status">Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_started">Not Started</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Target Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.target_date ? format(new Date(formData.target_date), 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.target_date ? new Date(formData.target_date) : undefined}
                    onSelect={(date) => setFormData({ ...formData, target_date: date?.toISOString().split('T')[0] })}
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="col-span-2">
              <Label htmlFor="motivation">Why This Goal Matters</Label>
              <Textarea
                id="motivation"
                value={formData.motivation}
                onChange={(e) => setFormData({ ...formData, motivation: e.target.value })}
                placeholder="What motivates you to achieve this?"
                rows={2}
              />
            </div>
            
            <div className="col-span-2">
              <Label htmlFor="obstacles">Potential Obstacles</Label>
              <Textarea
                id="obstacles"
                value={formData.obstacles}
                onChange={(e) => setFormData({ ...formData, obstacles: e.target.value })}
                placeholder="What challenges might you face and how will you overcome them?"
                rows={2}
              />
            </div>
            
            <div className="col-span-2">
              <Label>Tags</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add a tag"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                />
                <Button type="button" onClick={addTag} size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tags?.map((tag, index) => (
                  <div key={index} className="flex items-center gap-1 bg-secondary px-2 py-1 rounded-md text-sm">
                    {tag}
                    <button type="button" onClick={() => removeTag(index)} className="ml-1">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="col-span-2">
              <Label>Resources Needed</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newResource}
                  onChange={(e) => setNewResource(e.target.value)}
                  placeholder="Add a resource"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addResource())}
                />
                <Button type="button" onClick={addResource} size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-1">
                {formData.resources_needed?.map((resource, index) => (
                  <div key={index} className="flex items-center gap-2 bg-secondary px-3 py-2 rounded-md text-sm">
                    <span className="flex-1">{resource}</span>
                    <button type="button" onClick={() => removeResource(index)}>
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {goal ? 'Update Goal' : 'Create Goal'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}