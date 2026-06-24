import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, X, Plus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function NewGroupModal({ open, onOpenChange, currentUser, onGroupCreated }) {
  const [groupName, setGroupName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [members, setMembers] = useState([]);
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: () =>
      base44.entities.GroupChat.create({
        name: groupName.trim(),
        context_type: 'general',
        members: [...members, currentUser.email],
        created_by: currentUser.email
      }),
    onSuccess: (group) => {
      toast.success(`Group "${groupName}" created!`);
      queryClient.invalidateQueries({ queryKey: ['groupChats'] });
      onGroupCreated?.(group);
      onOpenChange(false);
      setGroupName('');
      setMembers([]);
    }
  });

  const addMember = () => {
    const email = memberEmail.trim().toLowerCase();
    if (!email || members.includes(email) || email === currentUser.email) return;
    setMembers(prev => [...prev, email]);
    setMemberEmail('');
  };

  const removeMember = (email) => setMembers(prev => prev.filter(e => e !== email));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-600" />
            New Group Chat
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <Label>Group Name</Label>
            <Input
              placeholder="e.g. Ramadan Study Circle"
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label>Add Members</Label>
            <div className="flex gap-2 mt-1">
              <Input
                placeholder="member@email.com"
                value={memberEmail}
                onChange={e => setMemberEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addMember()}
              />
              <Button size="icon" variant="outline" onClick={addMember}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {members.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {members.map(email => (
                <div key={email} className="flex items-center gap-1 bg-teal-50 text-teal-700 text-xs px-2 py-1 rounded-full border border-teal-200">
                  {email.split('@')[0]}
                  <button onClick={() => removeMember(email)}>
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="text-xs text-slate-400">
            You + {members.length} member{members.length !== 1 ? 's' : ''}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              className="flex-1 bg-teal-600 hover:bg-teal-700"
              onClick={() => createMutation.mutate()}
              disabled={!groupName.trim() || members.length === 0 || createMutation.isPending}
            >
              Create Group
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}