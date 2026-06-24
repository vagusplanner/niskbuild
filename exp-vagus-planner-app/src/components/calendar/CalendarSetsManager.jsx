import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Layers, 
  Plus, 
  Edit2, 
  Trash2, 
  Briefcase, 
  Home, 
  Users, 
  Heart,
  CheckCircle2
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const ICON_MAP = {
  briefcase: Briefcase,
  home: Home,
  users: Users,
  heart: Heart
};

export default function CalendarSetsManager({ onSetChange }) {
  const [showDialog, setShowDialog] = useState(false);
  const [editingSet, setEditingSet] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3b82f6',
    icon: 'briefcase',
    included_categories: []
  });

  const queryClient = useQueryClient();

  const { data: sets = [] } = useQuery({
    queryKey: ['calendarSets'],
    queryFn: () => SDK.entities.CalendarSet.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => SDK.entities.CalendarSet.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['calendarSets']);
      toast.success('Calendar set created');
      setShowDialog(false);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => SDK.entities.CalendarSet.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['calendarSets']);
      toast.success('Calendar set updated');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => SDK.entities.CalendarSet.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['calendarSets']);
      toast.success('Calendar set deleted');
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: '#3b82f6',
      icon: 'briefcase',
      included_categories: []
    });
    setEditingSet(null);
  };

  const handleToggleSet = (set) => {
    updateMutation.mutate({
      id: set.id,
      data: { is_active: !set.is_active }
    });
    onSetChange?.(sets.filter(s => s.is_active || s.id === set.id));
  };

  const handleSave = () => {
    if (editingSet) {
      updateMutation.mutate({ id: editingSet.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const activeSets = sets.filter(s => s.is_active);

  return (
    <>
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Calendar Sets</h3>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setShowDialog(true);
            }}
            size="sm"
            variant="outline"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Set
          </Button>
        </div>

        <div className="space-y-2">
          {sets.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">
              No calendar sets. Create one to organize your events.
            </p>
          ) : (
            sets.map((set) => {
              const Icon = ICON_MAP[set.icon] || Briefcase;
              return (
                <motion.div
                  key={set.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: set.color + '20' }}
                    >
                      <Icon className="w-5 h-5" style={{ color: set.color }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-800 dark:text-slate-100">{set.name}</span>
                        {set.is_active && (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        )}
                      </div>
                      {set.description && (
                        <p className="text-xs text-slate-500">{set.description}</p>
                      )}
                      {set.included_categories?.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {set.included_categories.map(cat => (
                            <Badge key={cat} variant="outline" className="text-xs">
                              {cat}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={set.is_active}
                      onCheckedChange={() => handleToggleSet(set)}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditingSet(set);
                        setFormData(set);
                        setShowDialog(true);
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (confirm('Delete this calendar set?')) {
                          deleteMutation.mutate(set.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {activeSets.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Showing {activeSets.length} active set{activeSets.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSet ? 'Edit' : 'Create'} Calendar Set</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Work, Personal, Family"
              />
            </div>

            <div>
              <Label>Description (optional)</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What does this set include?"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Color</Label>
                <Input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                />
              </div>
              
              <div>
                <Label>Icon</Label>
                <select
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                >
                  <option value="briefcase">Briefcase (Work)</option>
                  <option value="home">Home (Personal)</option>
                  <option value="users">Users (Family)</option>
                  <option value="heart">Heart (Health)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700">
                {editingSet ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}