import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Check } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';

export default function ShareWithTeam({ 
  isOpen, 
  onClose, 
  entityType, 
  entityId,
  currentShares = []
}) {
  const [selectedTeams, setSelectedTeams] = useState([]);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list()
  });

  const { data: allMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list()
  });

  const shareWithTeamMutation = useMutation({
    mutationFn: async (teamId) => {
      const members = allMembers.filter(m => m.team_id === teamId && m.status === 'active');
      const shareEntity = entityType === 'event' ? 'EventShare' : 'TaskShare';
      
      await Promise.all(members.map(member => 
        base44.entities[shareEntity].create({
          [`${entityType}_id`]: entityId,
          shared_by: user.email,
          shared_with: member.user_email,
          permission: 'edit',
          status: 'accepted'
        })
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventShares'] });
      queryClient.invalidateQueries({ queryKey: ['taskShares'] });
      toast.success('Shared with team!');
      onClose();
    }
  });

  const myTeams = teams.filter(t => 
    allMembers.some(m => m.team_id === t.id && m.user_email === user?.email)
  );

  const handleShare = async () => {
    for (const teamId of selectedTeams) {
      await shareWithTeamMutation.mutateAsync(teamId);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Share with Team
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {myTeams.map((team) => {
            const isSelected = selectedTeams.includes(team.id);
            const memberCount = allMembers.filter(m => m.team_id === team.id).length;
            
            return (
              <button
                key={team.id}
                onClick={() => {
                  setSelectedTeams(prev => 
                    isSelected 
                      ? prev.filter(id => id !== team.id)
                      : [...prev, team.id]
                  );
                }}
                className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                  isSelected 
                    ? 'border-indigo-500 bg-indigo-50' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-slate-800 mb-1">{team.name}</div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {memberCount} members
                      </Badge>
                    </div>
                  </div>
                  {isSelected && <Check className="w-5 h-5 text-indigo-600" />}
                </div>
              </button>
            );
          })}

          {myTeams.length === 0 && (
            <p className="text-center text-slate-500 py-8">
              No teams available. Create a team first!
            </p>
          )}
        </div>

        <div className="flex gap-2 pt-4">
          <Button 
            onClick={handleShare} 
            disabled={selectedTeams.length === 0 || shareWithTeamMutation.isPending}
            className="flex-1"
          >
            Share with {selectedTeams.length} team{selectedTeams.length !== 1 ? 's' : ''}
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}