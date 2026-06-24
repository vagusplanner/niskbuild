import React, { useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Share2,
  Users,
  Eye,
  Edit,
  Shield,
  X,
  Plus,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function CalendarSharingManager() {
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [sharePermission, setSharePermission] = useState('view');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => SDK.auth.me()
  });

  const { data: shares = [] } = useQuery({
    queryKey: ['calendarShares'],
    queryFn: () => SDK.entities.CalendarShare.filter({ 
      shared_by: currentUser?.email,
      status: 'active'
    }),
    enabled: !!currentUser
  });

  const { data: sharedWithMe = [] } = useQuery({
    queryKey: ['sharedCalendars'],
    queryFn: () => SDK.entities.CalendarShare.filter({ 
      shared_with: currentUser?.email,
      status: 'active'
    }),
    enabled: !!currentUser
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['myTeams'],
    queryFn: async () => {
      const members = await SDK.entities.TeamMember.filter({ 
        user_email: currentUser?.email,
        status: 'active'
      });
      const teamIds = members.map(m => m.team_id);
      if (teamIds.length === 0) return [];
      const teams = await SDK.entities.Team.list();
      return teams.filter(t => teamIds.includes(t.id));
    },
    enabled: !!currentUser
  });

  const createShareMutation = useMutation({
    mutationFn: (data) => SDK.entities.CalendarShare.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarShares'] });
      setShowShareDialog(false);
      setShareEmail('');
      setSelectedCategories([]);
      toast.success('Calendar shared successfully');
    }
  });

  const revokeShareMutation = useMutation({
    mutationFn: (id) => SDK.entities.CalendarShare.update(id, { status: 'revoked' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarShares'] });
      toast.success('Access revoked');
    }
  });

  const updatePermissionMutation = useMutation({
    mutationFn: ({ id, permission }) => 
      SDK.entities.CalendarShare.update(id, { permission }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarShares'] });
      toast.success('Permission updated');
    }
  });

  const categories = ['work', 'personal', 'health', 'prayer', 'holiday', 'family', 'social', 'other'];

  const handleShare = () => {
    if (!shareEmail) {
      toast.error('Please enter an email');
      return;
    }

    createShareMutation.mutate({
      shared_by: currentUser.email,
      shared_with: shareEmail,
      share_type: 'user',
      permission: sharePermission,
      include_categories: selectedCategories.length > 0 ? selectedCategories : categories,
      status: 'active'
    });
  };

  const handleShareWithTeam = (teamId) => {
    createShareMutation.mutate({
      shared_by: currentUser.email,
      shared_with: teamId,
      share_type: 'team',
      permission: sharePermission,
      include_categories: selectedCategories.length > 0 ? selectedCategories : categories,
      status: 'active'
    });
  };

  const toggleCategory = (category) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const permissionIcons = {
    view: Eye,
    edit: Edit,
    manage: Shield
  };

  const permissionColors = {
    view: 'bg-blue-100 text-blue-800',
    edit: 'bg-green-100 text-green-800',
    manage: 'bg-purple-100 text-purple-800'
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Calendar Sharing</h2>
        <Button onClick={() => setShowShareDialog(true)}>
          <Share2 className="w-4 h-4 mr-2" />
          Share Calendar
        </Button>
      </div>

      {/* My Shares */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Shared by Me</h3>
        {shares.length === 0 ? (
          <p className="text-slate-500 text-sm">You haven't shared your calendar yet</p>
        ) : (
          <div className="space-y-3">
            {shares.map(share => {
              const PermIcon = permissionIcons[share.permission];
              return (
                <motion.div
                  key={share.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {share.share_type === 'team' ? (
                      <Users className="w-5 h-5 text-slate-400" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-emerald-700">
                          {share.shared_with.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-slate-800">
                        {share.shared_with.split('@')[0]}
                      </p>
                      {share.include_categories && (
                        <p className="text-xs text-slate-500">
                          {share.include_categories.join(', ')}
                        </p>
                      )}
                    </div>
                    <Select
                      value={share.permission}
                      onValueChange={(value) => 
                        updatePermissionMutation.mutate({ id: share.id, permission: value })
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="view">View</SelectItem>
                        <SelectItem value="edit">Edit</SelectItem>
                        <SelectItem value="manage">Manage</SelectItem>
                      </SelectContent>
                    </Select>
                    <Badge className={permissionColors[share.permission]}>
                      <PermIcon className="w-3 h-3 mr-1" />
                      {share.permission}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => revokeShareMutation.mutate(share.id)}
                  >
                    <X className="w-4 h-4 text-slate-400" />
                  </Button>
                </motion.div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Shared with Me */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Shared with Me</h3>
        {sharedWithMe.length === 0 ? (
          <p className="text-slate-500 text-sm">No calendars shared with you</p>
        ) : (
          <div className="space-y-3">
            {sharedWithMe.map(share => {
              const PermIcon = permissionIcons[share.permission];
              return (
                <motion.div
                  key={share.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-700">
                        {share.shared_by.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">
                        {share.shared_by.split('@')[0]}'s Calendar
                      </p>
                      {share.include_categories && (
                        <p className="text-xs text-slate-500">
                          {share.include_categories.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge className={permissionColors[share.permission]}>
                    <PermIcon className="w-3 h-3 mr-1" />
                    {share.permission}
                  </Badge>
                </motion.div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Share Your Calendar</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Share with User */}
            <div>
              <Label className="mb-2 block">Share with User</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter email address"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  type="email"
                />
                <Select value={sharePermission} onValueChange={setSharePermission}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">View</SelectItem>
                    <SelectItem value="edit">Edit</SelectItem>
                    <SelectItem value="manage">Manage</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleShare}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Share with Teams */}
            {teams.length > 0 && (
              <div>
                <Label className="mb-2 block">Share with Team</Label>
                <div className="space-y-2">
                  {teams.map(team => (
                    <div key={team.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-slate-400" />
                        <span className="font-medium">{team.name}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleShareWithTeam(team.id)}
                      >
                        Share
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Categories */}
            <div>
              <Label className="mb-3 block">Select Categories to Share (optional)</Label>
              <div className="grid grid-cols-2 gap-3">
                {categories.map(category => (
                  <div key={category} className="flex items-center space-x-2">
                    <Checkbox
                      id={category}
                      checked={selectedCategories.includes(category)}
                      onCheckedChange={() => toggleCategory(category)}
                    />
                    <Label htmlFor={category} className="capitalize cursor-pointer">
                      {category}
                    </Label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Leave empty to share all categories
              </p>
            </div>

            {/* Permissions Info */}
            <Card className="p-4 bg-slate-50">
              <h4 className="font-medium text-sm mb-2">Permission Levels:</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <Eye className="w-4 h-4 text-blue-600 mt-0.5" />
                  <div>
                    <span className="font-medium">View:</span>
                    <span className="text-slate-600"> Can see events but not edit</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Edit className="w-4 h-4 text-green-600 mt-0.5" />
                  <div>
                    <span className="font-medium">Edit:</span>
                    <span className="text-slate-600"> Can create and modify events</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-purple-600 mt-0.5" />
                  <div>
                    <span className="font-medium">Manage:</span>
                    <span className="text-slate-600"> Full access including sharing permissions</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}