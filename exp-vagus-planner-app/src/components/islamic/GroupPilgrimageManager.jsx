import React, { useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Users, MessageSquare, CheckSquare, DollarSign, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import GroupItineraryShare from './GroupItineraryShare';
import GroupTaskBoard from './GroupTaskBoard';
import GroupExpenseTracker from './GroupExpenseTracker';
import RealTimeGroupChat from '../collaboration/RealTimeGroupChat';

export default function GroupPilgrimageManager() {
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [newGroup, setNewGroup] = useState({
    name: '',
    pilgrimage_type: 'umrah',
    start_date: '',
    duration: '7'
  });

  const queryClient = useQueryClient();

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['pilgrimageGroups'],
    queryFn: async () => {
      const allGroups = await SDK.entities.PilgrimageGroup.list('-created_date');
      const user = await SDK.auth.me();
      return allGroups.filter(g => 
        g.admin_email === user?.email || 
        g.members?.some(m => (m.email || m) === user?.email)
      );
    }
  });

  const createGroupMutation = useMutation({
    mutationFn: async (data) => {
      const user = await SDK.auth.me();
      return SDK.entities.PilgrimageGroup.create({
        ...data,
        admin_email: user.email,
        members: [{ email: user.email, name: user.full_name, role: 'admin', status: 'accepted' }],
        status: 'planning'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pilgrimageGroups'] });
      setShowCreateGroup(false);
      setNewGroup({ name: '', pilgrimage_type: 'umrah', start_date: '', duration: '7' });
      toast.success('Group created! Invite members to join.');
    }
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (id) => SDK.entities.PilgrimageGroup.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pilgrimageGroups'] });
      setSelectedGroup(null);
      toast.success('Group deleted');
    }
  });

  const handleCreateGroup = () => {
    if (!newGroup.name || !newGroup.start_date) {
      toast.error('Please fill in required fields');
      return;
    }
    createGroupMutation.mutate(newGroup);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!selectedGroup) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Your Group Pilgrimages
          </h3>
          <Button onClick={() => setShowCreateGroup(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Group
          </Button>
        </div>

        {groups.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-600 mb-4">No group pilgrimages yet</p>
              <Button onClick={() => setShowCreateGroup(true)}>
                Create First Group
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groups.map(group => (
              <Card 
                key={group.id} 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setSelectedGroup(group)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{group.name}</CardTitle>
                      <CardDescription className="capitalize">
                        {group.pilgrimage_type} • {new Date(group.start_date).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <Badge className="bg-emerald-600">{group.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Users className="w-4 h-4" />
                    {group.members?.length || 0} member{(group.members?.length || 0) !== 1 ? 's' : ''}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckSquare className="w-4 h-4" />
                    {group.duration} days
                  </div>
                  {group.shared_budget && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <DollarSign className="w-4 h-4" />
                      Budget: ${group.shared_budget}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create Group Dialog */}
        {showCreateGroup && (
          <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Group Pilgrimage</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Group Name</Label>
                  <Input
                    placeholder="e.g., Family Umrah 2026"
                    value={newGroup.name}
                    onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Pilgrimage Type</Label>
                  <Select value={newGroup.pilgrimage_type} onValueChange={(v) => setNewGroup({ ...newGroup, pilgrimage_type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="umrah">Umrah</SelectItem>
                      <SelectItem value="hajj">Hajj</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={newGroup.start_date}
                      onChange={(e) => setNewGroup({ ...newGroup, start_date: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label>Duration (days)</Label>
                    <Input
                      type="number"
                      value={newGroup.duration}
                      onChange={(e) => setNewGroup({ ...newGroup, duration: e.target.value })}
                      min="3"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowCreateGroup(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateGroup}
                    disabled={createGroupMutation.isPending}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  >
                    Create Group
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    );
  }

  const memberEmails = selectedGroup.members?.map(m => m.email || m) || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => setSelectedGroup(null)}>
          ← Back to Groups
        </Button>
        <h2 className="text-xl font-bold text-slate-900">{selectedGroup.name}</h2>
        <Button 
          variant="ghost" 
          onClick={() => deleteGroupMutation.mutate(selectedGroup.id)}
          className="text-red-600 hover:text-red-700"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Group Info */}
      <Card className="bg-gradient-to-r from-emerald-50 to-teal-50">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-slate-600">Type</p>
              <p className="font-semibold capitalize">{selectedGroup.pilgrimage_type}</p>
            </div>
            <div>
              <p className="text-xs text-slate-600">Duration</p>
              <p className="font-semibold">{selectedGroup.duration} days</p>
            </div>
            <div>
              <p className="text-xs text-slate-600">Members</p>
              <p className="font-semibold">{memberEmails.length}</p>
            </div>
            <div>
              <p className="text-xs text-slate-600">Status</p>
              <Badge className="capitalize">{selectedGroup.status}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="itinerary" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="itinerary">Itinerary</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
        </TabsList>

        <TabsContent value="itinerary" className="space-y-4">
          <GroupItineraryShare 
            group={selectedGroup}
            itinerary={selectedGroup.shared_itinerary}
          />
        </TabsContent>

        <TabsContent value="tasks">
          <GroupTaskBoard 
            group={selectedGroup}
            members={memberEmails}
          />
        </TabsContent>

        <TabsContent value="expenses">
          <GroupExpenseTracker 
            group={selectedGroup}
            members={memberEmails}
          />
        </TabsContent>

        <TabsContent value="chat">
          <RealTimeGroupChat 
            groupId={selectedGroup.id}
            contextType="pilgrimage"
            members={memberEmails}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}