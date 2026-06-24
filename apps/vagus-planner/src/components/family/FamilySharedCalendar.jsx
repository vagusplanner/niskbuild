import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, Calendar, CheckSquare } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const FAMILY_MEMBER_COLORS = [
  'bg-pink-100 text-pink-800 border-pink-200',
  'bg-blue-100 text-blue-800 border-blue-200',
  'bg-green-100 text-green-800 border-green-200',
  'bg-purple-100 text-purple-800 border-purple-200',
  'bg-orange-100 text-orange-800 border-orange-200'
];

export default function FamilySharedCalendar() {
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: familyEvents = [] } = useQuery({
    queryKey: ['familyEvents'],
    queryFn: async () => {
      const events = await base44.entities.Event.filter({ category: 'family' });
      return events;
    }
  });

  const { data: familyTasks = [] } = useQuery({
    queryKey: ['familyTasks'],
    queryFn: async () => {
      const tasks = await base44.entities.Task.filter({ category: 'family' });
      return tasks;
    }
  });

  const inviteMutation = useMutation({
    mutationFn: async (email) => {
      await base44.users.inviteUser(email, 'user');
    },
    onSuccess: () => {
      toast.success('Family member invited!');
      setNewMemberEmail('');
      setShowAddMember(false);
    }
  });

  const assignTaskMutation = useMutation({
    mutationFn: async ({ taskId, memberEmail }) => {
      const task = familyTasks.find(t => t.id === taskId);
      await base44.entities.Task.update(taskId, {
        ...task,
        assigned_to: memberEmail
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['familyTasks'] });
      toast.success('Task assigned!');
    }
  });

  // Group tasks by assignee
  const tasksByMember = familyTasks.reduce((acc, task) => {
    const assignee = task.assigned_to || 'unassigned';
    if (!acc[assignee]) acc[assignee] = [];
    acc[assignee].push(task);
    return acc;
  }, {});

  return (
    <Card className="bg-gradient-to-br from-pink-50 to-rose-50 border-pink-200">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-pink-600" />
            Family Calendar
          </div>
          <Button
            size="sm"
            onClick={() => setShowAddMember(!showAddMember)}
            className="bg-pink-600 hover:bg-pink-700"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Member
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Member Form */}
        {showAddMember && (
          <div className="p-4 bg-white rounded-lg border border-pink-200 space-y-3">
            <Input
              value={newMemberEmail}
              onChange={(e) => setNewMemberEmail(e.target.value)}
              placeholder="Family member email"
              type="email"
            />
            <div className="flex gap-2">
              <Button
                onClick={() => inviteMutation.mutate(newMemberEmail)}
                disabled={!newMemberEmail || inviteMutation.isPending}
                className="flex-1"
              >
                Invite
              </Button>
              <Button
                onClick={() => setShowAddMember(false)}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Shared Events */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-600" />
            <h4 className="font-semibold text-slate-800">Shared Events</h4>
            <Badge variant="outline">{familyEvents.length}</Badge>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {familyEvents.slice(0, 5).map((event) => (
              <div key={event.id} className="p-3 bg-white rounded-lg border border-pink-200">
                <p className="font-medium text-slate-800 text-sm">{event.title}</p>
                <p className="text-xs text-slate-500">
                  {new Date(event.start_date).toLocaleDateString()} at{' '}
                  {new Date(event.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Tasks by Member */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-slate-600" />
            <h4 className="font-semibold text-slate-800">Family Tasks</h4>
          </div>
          <div className="space-y-3">
            {Object.entries(tasksByMember).map(([assignee, tasks], idx) => (
              <div key={assignee} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className={FAMILY_MEMBER_COLORS[idx % FAMILY_MEMBER_COLORS.length]}>
                    {assignee === 'unassigned' ? 'Unassigned' : assignee.split('@')[0]}
                  </Badge>
                  <span className="text-xs text-slate-500">{tasks.length} tasks</span>
                </div>
                {tasks.slice(0, 3).map((task) => (
                  <div key={task.id} className="pl-4 p-2 bg-white rounded border border-slate-200">
                    <p className="text-sm text-slate-700">{task.title}</p>
                    {task.due_date && (
                      <p className="text-xs text-slate-500">
                        Due: {new Date(task.due_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}