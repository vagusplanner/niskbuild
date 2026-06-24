import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, Settings, Share2, Trash2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import CalendarSharingModal from './CalendarSharingModal';

const GROUP_TYPES = [
  { value: 'family', label: 'Family', icon: '👨‍👩‍👧‍👦', color: '#f59e0b' },
  { value: 'team', label: 'Team', icon: '💼', color: '#3b82f6' },
  { value: 'project', label: 'Project', icon: '📋', color: '#8b5cf6' },
  { value: 'custom', label: 'Custom', icon: '⭐', color: '#10b981' }
];

export default function GroupCalendarManager({ isOpen, onClose }) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showSharingModal, setShowSharingModal] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    type: 'custom',
    color: '#3b82f6',
    default_permission: 'view'
  });

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: myGroups = [] } = useQuery({
    queryKey: ['my-group-calendars', user?.email],
    queryFn: () => base44.entities.GroupCalendar.filter({ 
      owner_email: user.email,
      is_active: true 
    }),
    enabled: !!user
  });

  const { data: sharedGroups = [] } = useQuery({
    queryKey: ['shared-group-calendars', user?.email],
    queryFn: async () => {
      const shares = await base44.entities.SharedCalendar.filter({ 
        shared_with_email: user.email,
        calendar_type: 'group'
      });
      const groupIds = shares.map(s => s.group_calendar_id).filter(Boolean);
      if (groupIds.length === 0) return [];
      
      const groups = await Promise.all(
        groupIds.map(id => base44.entities.GroupCalendar.filter({ id }))
      );
      return groups.flat();
    },
    enabled: !!user
  });

  const createGroupMutation = useMutation({
    mutationFn: (data) => base44.entities.GroupCalendar.create({
      ...data,
      owner_email: user.email
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-group-calendars'] });
      setShowCreateForm(false);
      setNewGroup({
        name: '',
        description: '',
        type: 'custom',
        color: '#3b82f6',
        default_permission: 'view'
      });
      toast.success('Group calendar created!');
    }
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (id) => base44.entities.GroupCalendar.update(id, { is_active: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-group-calendars'] });
      toast.success('Group calendar deleted');
    }
  });

  const handleCreate = () => {
    if (!newGroup.name) {
      toast.error('Please enter a name');
      return;
    }
    createGroupMutation.mutate(newGroup);
  };

  const openSharingModal = (groupId) => {
    setSelectedGroupId(groupId);
    setShowSharingModal(true);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-teal-600" />
              Group Calendars
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Create New Group */}
            {!showCreateForm ? (
              <Button
                onClick={() => setShowCreateForm(true)}
                className="w-full bg-teal-600 hover:bg-teal-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Group Calendar
              </Button>
            ) : (
              <Card className="border-teal-200 dark:border-teal-800">
                <CardHeader>
                  <CardTitle className="text-lg">New Group Calendar</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Name *</Label>
                    <Input
                      value={newGroup.name}
                      onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                      placeholder="e.g., Family Calendar, Work Team"
                    />
                  </div>

                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={newGroup.description}
                      onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                      placeholder="What is this calendar for?"
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Type</Label>
                      <Select value={newGroup.type} onValueChange={(v) => setNewGroup({ ...newGroup, type: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {GROUP_TYPES.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              <span>{type.icon} {type.label}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Default Permission</Label>
                      <Select value={newGroup.default_permission} onValueChange={(v) => setNewGroup({ ...newGroup, default_permission: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="view">View Only</SelectItem>
                          <SelectItem value="edit">Edit</SelectItem>
                          <SelectItem value="invite">Full Access</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleCreate}
                      disabled={createGroupMutation.isPending}
                      className="flex-1 bg-teal-600 hover:bg-teal-700"
                    >
                      Create
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowCreateForm(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* My Group Calendars */}
            {myGroups.length > 0 && (
              <div className="space-y-3">
                <Label className="text-base font-semibold">My Group Calendars</Label>
                <div className="grid gap-3">
                  <AnimatePresence>
                    {myGroups.map((group) => {
                      const groupType = GROUP_TYPES.find(t => t.value === group.type);
                      return (
                        <motion.div
                          key={group.id}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                        >
                          <Card>
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3 flex-1">
                                  <div className="text-2xl">{groupType?.icon}</div>
                                  <div className="flex-1">
                                    <h3 className="font-semibold text-lg">{group.name}</h3>
                                    {group.description && (
                                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                        {group.description}
                                      </p>
                                    )}
                                    <div className="flex items-center gap-2 mt-2">
                                      <Badge variant="secondary" className="text-xs">
                                        {groupType?.label}
                                      </Badge>
                                      <Badge variant="outline" className="text-xs">
                                        <Users className="w-3 h-3 mr-1" />
                                        {group.member_count} member{group.member_count !== 1 ? 's' : ''}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => openSharingModal(group.id)}
                                    className="h-8 w-8"
                                  >
                                    <Share2 className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      if (confirm('Delete this group calendar?')) {
                                        deleteGroupMutation.mutate(group.id);
                                      }
                                    }}
                                    className="h-8 w-8 text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Shared With Me */}
            {sharedGroups.length > 0 && (
              <div className="space-y-3">
                <Label className="text-base font-semibold">Shared With Me</Label>
                <div className="grid gap-3">
                  {sharedGroups.map((group) => {
                    const groupType = GROUP_TYPES.find(t => t.value === group.type);
                    return (
                      <Card key={group.id} className="border-blue-200 dark:border-blue-800">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="text-2xl">{groupType?.icon}</div>
                            <div className="flex-1">
                              <h3 className="font-semibold">{group.name}</h3>
                              <p className="text-xs text-slate-600 dark:text-slate-400">
                                Shared by {group.owner_email}
                              </p>
                            </div>
                            <Badge variant="secondary">Shared</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Sharing Modal */}
      <CalendarSharingModal
        isOpen={showSharingModal}
        onClose={() => {
          setShowSharingModal(false);
          setSelectedGroupId(null);
        }}
        groupCalendarId={selectedGroupId}
      />
    </>
  );
}