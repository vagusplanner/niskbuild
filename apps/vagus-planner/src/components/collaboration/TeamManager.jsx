import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Users, Plus, Mail, Trash2, Crown, UserCheck, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from 'sonner';

export default function TeamManager({ isOpen, onClose }) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [selectedTeam, setSelectedTeam] = useState(null);

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list('-created_date')
  });

  const { data: allMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list()
  });

  const createTeamMutation = useMutation({
    mutationFn: async (data) => {
      const team = await base44.entities.Team.create(data);
      await base44.entities.TeamMember.create({
        team_id: team.id,
        user_email: user.email,
        role: 'admin',
        status: 'active'
      });
      return team;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
      setShowCreateForm(false);
      setNewTeamName('');
      setNewTeamDesc('');
      toast.success('Team created!');
    }
  });

  const inviteMemberMutation = useMutation({
    mutationFn: (data) => base44.entities.TeamMember.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
      setInviteEmail('');
      toast.success('Invitation sent!');
    }
  });

  const removeMemberMutation = useMutation({
    mutationFn: (id) => base44.entities.TeamMember.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
      toast.success('Member removed');
    }
  });

  const handleCreateTeam = () => {
    if (!newTeamName.trim()) return;
    createTeamMutation.mutate({
      name: newTeamName,
      description: newTeamDesc,
      created_by: user.email
    });
  };

  const handleInvite = (teamId) => {
    if (!inviteEmail.trim()) return;
    inviteMemberMutation.mutate({
      team_id: teamId,
      user_email: inviteEmail,
      role: 'member',
      status: 'invited'
    });
  };

  const myTeams = teams.filter(t => 
    t.created_by === user?.email || 
    allMembers.some(m => m.team_id === t.id && m.user_email === user?.email)
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            Manage Teams
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!showCreateForm ? (
            <Button onClick={() => setShowCreateForm(true)} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Create New Team
            </Button>
          ) : (
            <Card>
              <CardContent className="p-4 space-y-3">
                <Input
                  placeholder="Team name"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                />
                <Input
                  placeholder="Description (optional)"
                  value={newTeamDesc}
                  onChange={(e) => setNewTeamDesc(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button onClick={handleCreateTeam} disabled={createTeamMutation.isPending}>
                    Create
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            {myTeams.map((team) => {
              const members = allMembers.filter(m => m.team_id === team.id);
              const isAdmin = team.created_by === user?.email;
              
              return (
                <Card key={team.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                          <Users className="w-4 h-4 text-indigo-600" />
                        </div>
                        {team.name}
                      </div>
                      {isAdmin && <Badge variant="outline">Admin</Badge>}
                    </CardTitle>
                    {team.description && (
                      <p className="text-sm text-slate-500">{team.description}</p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      {members.map((member) => (
                        <div key={member.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <UserCheck className="w-3 h-3 text-slate-400" />
                            <span>{member.user_email}</span>
                            {member.role === 'admin' && <Crown className="w-3 h-3 text-amber-500" />}
                            <Badge variant="outline" className="text-xs">
                              {member.status}
                            </Badge>
                          </div>
                          {isAdmin && member.user_email !== user?.email && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeMemberMutation.mutate(member.id)}
                            >
                              <Trash2 className="w-3 h-3 text-red-500" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>

                    {isAdmin && (
                      <div className="flex gap-2 pt-2 border-t">
                        <Input
                          placeholder="Email to invite"
                          value={selectedTeam === team.id ? inviteEmail : ''}
                          onChange={(e) => {
                            setSelectedTeam(team.id);
                            setInviteEmail(e.target.value);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleInvite(team.id);
                          }}
                          className="text-sm"
                        />
                        <Button 
                          size="sm" 
                          onClick={() => handleInvite(team.id)}
                          disabled={inviteMemberMutation.isPending}
                        >
                          <Mail className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}